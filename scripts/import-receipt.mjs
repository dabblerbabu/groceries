import Database from "better-sqlite3";
import { join } from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const root = join(fileURLToPath(import.meta.url), "../..");
const db = new Database(join(root, "data/groceries.db"));
db.pragma("foreign_keys = ON");

// Copy image to public/uploads
const srcImage = process.argv[2];
let imagePath = null;
if (srcImage && fs.existsSync(srcImage)) {
  const filename = `manual-${Date.now()}.jpg`;
  const dest = join(root, "public/uploads", filename);
  fs.mkdirSync(join(root, "public/uploads"), { recursive: true });
  fs.copyFileSync(srcImage, dest);
  imagePath = `/uploads/${filename}`;
}

const receipt = {
  store_name: "Target",
  store_address: "925 Bishop Dr, San Ramon, CA 94583",
  date: "2026-06-10",
  subtotal: 6.57,
  tax: 0.00,
  total: 6.57,
  items: [
    { name: "GG Sauce", quantity: 1, unit_price: 2.69, total_price: 2.69, category: "condiments" },
    { name: "Baral (GG)", quantity: 1, unit_price: 1.89, total_price: 1.89, category: "condiments" },
    { name: "GG Cheese", quantity: 1, unit_price: 1.99, total_price: 1.99, category: "dairy" },
  ],
};

const existingStore = db.prepare("SELECT id FROM stores WHERE name = ?").get(receipt.store_name);
let storeId;
if (existingStore) {
  storeId = existingStore.id;
} else {
  storeId = db.prepare("INSERT INTO stores (name, address) VALUES (?, ?)").run(receipt.store_name, receipt.store_address).lastInsertRowid;
}

const receiptId = db.prepare(
  "INSERT INTO receipts (store_id, date, total, subtotal, tax, image_path) VALUES (?, ?, ?, ?, ?, ?)"
).run(storeId, receipt.date, receipt.total, receipt.subtotal, receipt.tax, imagePath).lastInsertRowid;

const insertItem = db.prepare(
  "INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category) VALUES (?, ?, ?, ?, ?, ?)"
);
for (const item of receipt.items) {
  insertItem.run(receiptId, item.name, item.quantity, item.unit_price, item.total_price, item.category);
}

console.log(`Inserted receipt #${receiptId}: ${receipt.store_name} on ${receipt.date}, $${receipt.total}`);
console.log(`Items: ${receipt.items.map(i => i.name).join(", ")}`);
db.close();
