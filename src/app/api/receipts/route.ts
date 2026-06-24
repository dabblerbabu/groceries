import { NextRequest, NextResponse } from "next/server";
import { parseReceiptImage } from "@/lib/parse-receipt";
import { storage } from "@/lib/storage";
import { upsertStore, insertReceipt, insertItems, getReceipts, syncCatalogFromItems } from "@/lib/queries";

export async function GET() {
  const receipts = await getReceipts();
  return NextResponse.json(receipts);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("receipt") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const mediaType = file.type || "image/jpeg";

    const stored = await storage.save({
      bytes: buffer,
      contentType: mediaType,
      prefix: "receipts",
      filename: file.name,
    });

    const parsed = await parseReceiptImage(base64, mediaType);

    const storeId = await upsertStore(parsed.store_name, parsed.store_address ?? undefined);
    const receiptId = await insertReceipt({
      store_id: storeId,
      date: parsed.date,
      total: parsed.total,
      subtotal: parsed.subtotal ?? undefined,
      tax: parsed.tax ?? undefined,
      image_path: stored.url,
    });

    await insertItems(
      parsed.items.map((item) => ({
        receipt_id: receiptId,
        name: item.name,
        quantity: item.quantity ?? 1,
        unit_price: item.unit_price ?? undefined,
        total_price: item.total_price,
        category: item.category ?? "other",
      }))
    );

    await syncCatalogFromItems();

    return NextResponse.json({ id: receiptId, parsed }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to process receipt";
    console.error("Receipt upload failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
