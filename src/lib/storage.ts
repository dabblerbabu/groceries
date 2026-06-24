import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { put, del } from "@vercel/blob";

/** What we persist in receipts.image_path and hand back to the client. */
export interface StoredObject {
  /** Public URL used to display the image. Stored in receipts.image_path. */
  url: string;
  /** Provider key/handle for the object (informational; remove() takes the url). */
  key: string;
}

export interface SaveInput {
  bytes: Buffer;
  contentType: string;
  /** Logical folder, e.g. "receipts". */
  prefix?: string;
  /** Original filename, used to derive an extension. */
  filename?: string;
}

/**
 * The seam. Callers depend only on this interface, never on a concrete store.
 *
 * Today: server-side save() — the route already holds the bytes (proxy-through-
 * server upload). Swapping to direct-to-storage uploads later means adding
 * `SupportsDirectUpload` (see bottom of file) + a `/api/uploads` route; anything
 * that only uses save()/remove() stays untouched.
 */
export interface Storage {
  /** Persist bytes the server already holds. Returns the public URL. */
  save(input: SaveInput): Promise<StoredObject>;
  /** Delete a previously stored object, addressed by its persisted url. */
  remove(url: string): Promise<void>;
}

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Build a collision-resistant object key like "receipts/1781234202503-abc.jpg". */
function objectKey(prefix: string, filename: string | undefined, contentType: string): string {
  const fromName = filename?.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  const ext = (fromName && fromName.length <= 5 ? fromName : undefined) ?? EXT_BY_TYPE[contentType] ?? "jpg";
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}/${id}.${ext}`;
}

const PUBLIC_DIR = "uploads"; // public/uploads -> served at /uploads/...

/** Filesystem store for local dev. Mirrors the original public/uploads behavior. */
class LocalStorage implements Storage {
  async save({ bytes, contentType, prefix = "receipts", filename }: SaveInput): Promise<StoredObject> {
    const key = objectKey(prefix, filename, contentType);
    const abs = path.join(process.cwd(), "public", PUBLIC_DIR, key);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, bytes);
    return { url: `/${PUBLIC_DIR}/${key}`, key };
  }

  async remove(url: string): Promise<void> {
    if (!url.startsWith(`/${PUBLIC_DIR}/`)) return; // not a local object — ignore
    const abs = path.join(process.cwd(), "public", url);
    await unlink(abs).catch(() => {}); // ignore already-deleted files
  }
}

/** Vercel Blob store for preview/production. Requires BLOB_READ_WRITE_TOKEN. */
class BlobStorage implements Storage {
  async save({ bytes, contentType, prefix = "receipts", filename }: SaveInput): Promise<StoredObject> {
    const key = objectKey(prefix, filename, contentType);
    const blob = await put(key, bytes, {
      access: "public",
      contentType,
      addRandomSuffix: false, // key already carries a unique id
    });
    return { url: blob.url, key };
  }

  async remove(url: string): Promise<void> {
    await del(url); // del() accepts the public blob URL
  }
}

/**
 * Driver selection (zero-config): use Blob when its token is present (i.e. on
 * Vercel with the Blob integration), otherwise the local filesystem. Override
 * explicitly with STORAGE_DRIVER=blob|local.
 */
function selectDriver(): Storage {
  const driver = process.env.STORAGE_DRIVER ?? (process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local");
  return driver === "blob" ? new BlobStorage() : new LocalStorage();
}

/** Singleton storage instance — import this everywhere instead of touching fs/Blob directly. */
export const storage: Storage = selectDriver();

// ── Future seam: direct-to-storage uploads (Phase 3.5) ──────────────────────
// When you outgrow proxy-through-server uploads, implement this on BlobStorage
// and add `POST /api/uploads` that calls @vercel/blob's handleUpload() to mint a
// short-lived client token. The client uploads bytes straight to Blob, then
// POSTs the returned URL to /api/receipts (which passes it to Claude as a URL
// image source). Nothing using save()/remove() needs to change.
//
// export interface UploadTicket { clientToken: string; }
// export interface SupportsDirectUpload {
//   createUploadTicket(meta: { prefix?: string; contentType: string }): Promise<UploadTicket>;
// }
