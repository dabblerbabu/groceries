import { createClient, type Client } from "@libsql/client";
import path from "path";
import fs from "fs";

// Local dev uses a SQLite file; Phase 2 points DATABASE_URL at Turso (libSQL).
const DATABASE_URL = process.env.DATABASE_URL ?? "file:data/groceries.db";
const AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN;

if (DATABASE_URL.startsWith("file:")) {
  const DB_DIR = path.join(process.cwd(), "data");
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
}

const client = createClient({ url: DATABASE_URL, authToken: AUTH_TOKEN });

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    address TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL,
    date TEXT NOT NULL,
    total REAL NOT NULL,
    subtotal REAL,
    tax REAL,
    image_path TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_id INTEGER NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity REAL DEFAULT 1,
    unit_price REAL,
    total_price REAL NOT NULL,
    category TEXT DEFAULT 'uncategorized'
  );

  CREATE TABLE IF NOT EXISTS catalog_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'other',
    is_custom INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_name ON catalog_items(lower(name));

  CREATE TABLE IF NOT EXISTS shopping_list (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'other',
    quantity REAL DEFAULT 1,
    unit TEXT,
    note TEXT,
    is_checked INTEGER DEFAULT 0,
    added_at TEXT DEFAULT (datetime('now')),
    checked_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(date);
  CREATE INDEX IF NOT EXISTS idx_items_receipt ON items(receipt_id);
  CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);

  INSERT OR IGNORE INTO catalog_items (name, category, is_custom)
  SELECT DISTINCT name, category, 0 FROM items;
`;

// Run schema setup exactly once, memoized. Every query awaits getDb() so the
// schema is guaranteed to exist before the first statement runs.
// NOTE (Phase 2): on serverless this runs per cold start — move schema setup to
// a one-time migration step once the DB is hosted.
let ready: Promise<void> | null = null;
function ensureSchema(): Promise<void> {
  if (!ready) ready = client.executeMultiple(SCHEMA);
  return ready;
}

export async function getDb(): Promise<Client> {
  await ensureSchema();
  return client;
}
