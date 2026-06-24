import Database from "better-sqlite3";
import { join } from "path";
import { fileURLToPath } from "url";

const root = join(fileURLToPath(import.meta.url), "../..");
const db = new Database(join(root, "data/groceries.db"));
db.pragma("foreign_keys = ON");

const upsertStore = (name, address) => {
  const existing = db.prepare("SELECT id FROM stores WHERE name = ?").get(name);
  if (existing) return existing.id;
  return db.prepare("INSERT INTO stores (name, address) VALUES (?, ?)").run(name, address).lastInsertRowid;
};

const insertReceipt = (storeId, date, total, subtotal, tax) =>
  db.prepare("INSERT INTO receipts (store_id, date, total, subtotal, tax) VALUES (?, ?, ?, ?, ?)")
    .run(storeId, date, total, subtotal, tax).lastInsertRowid;

const insertItems = (receiptId, items) => {
  const stmt = db.prepare(
    "INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category) VALUES (?, ?, ?, ?, ?, ?)"
  );
  for (const i of items) stmt.run(receiptId, i.name, i.qty ?? 1, i.unit ?? null, i.price, i.cat);
};

// ── Receipt 1: Vijetha Indian Super Market ──────────────────────────────────
const vijethaId = upsertStore(
  "Vijetha Indian Super Market",
  "2556 Sanramon Valley Blvd, San Ramon, CA 94568"
);
const vijethaReceiptId = insertReceipt(vijethaId, "2026-06-10", 78.87, 78.87, 0.00);
insertItems(vijethaReceiptId, [
  { name: "Anand Byadgi Chilli 400g",      price: 7.99,  cat: "condiments"  },
  { name: "Kulfi Pop",                      price: 2.99,  cat: "frozen"      },
  { name: "Dosakai",       qty: 1.93, unit: 1.99, price: 3.84,  cat: "produce"    },
  { name: "Indian Okra",   qty: 1.74, unit: 2.99, price: 5.20,  cat: "produce"    },
  { name: "Organic Ginger",qty: 0.54, unit: 3.99, price: 2.15,  cat: "produce"    },
  { name: "Cauliflower",                    price: 1.99,  cat: "produce"    },
  { name: "Saba Banana",   qty: 4.52, unit: 1.99, price: 8.99,  cat: "produce"    },
  { name: "Verka Organic Paneer 10oz",      price: 8.99,  cat: "dairy"      },
  { name: "Verka Organic Paneer 10oz",      price: 8.99,  cat: "dairy"      },
  { name: "Verka Organic Paneer 10oz",      price: 8.99,  cat: "dairy"      },
  { name: "Green Beans Cut",qty: 1.40,unit: 3.99, price: 5.59,  cat: "produce"    },
  { name: "Morton Iodised Salt",            price: 2.99,  cat: "condiments" },
  { name: "Green Mango",   qty: 0.62, unit: 4.99, price: 3.09,  cat: "produce"    },
  { name: "Red Leaves",                     price: 2.99,  cat: "produce"    },
  { name: "Morton Iodised Salt (small)",    price: 0.10,  cat: "condiments" },
  { name: "Reusable Bags",                  price: 3.99,  cat: "household"  },
]);
console.log(`Vijetha receipt #${vijethaReceiptId}: $78.87 — ${16} items`);

// ── Receipt 2: Costco ────────────────────────────────────────────────────────
const costcoId = upsertStore(
  "Costco",
  "Pastoria Way, Danville, CA 94526"
);
const costcoReceiptId = insertReceipt(costcoId, "2026-06-10", 185.04, 179.66, 5.38);
insertItems(costcoReceiptId, [
  { name: "Bounty Paper Towels",            price: 28.19, cat: "household"  },
  { name: "Organic Ataulfo Mango",          price: 7.99,  cat: "produce"    },
  { name: "Charki (Kirkland)",              price: 32.99, cat: "snacks"     },
  { name: "Bananas",                        price: 1.99,  cat: "produce"    },
  { name: "Basmati Rice",                   price: 21.99, cat: "grains"     },
  { name: "Organic Strawberries",           price: 9.79,  cat: "produce"    },
  { name: "Mini Cucumbers",                 price: 6.49,  cat: "produce"    },
  { name: "Organic Spinach",                price: 4.99,  cat: "produce"    },
  { name: "Fresh Guava",                    price: 7.99,  cat: "produce"    },
  { name: "Organic Toor Dal",               price: 17.99, cat: "grains"     },
  { name: "Organic Carrots 6LB",            price: 5.49,  cat: "produce"    },
  { name: "Verka Yogurt",                   price: 7.49,  cat: "dairy"      },
  { name: "KS Unsalted Pistachios",         price: 16.99, cat: "snacks"     },
  { name: "Organic Mediterranean Blend",    price: 8.99,  cat: "condiments" },
]);
console.log(`Costco receipt #${costcoReceiptId}: $185.04 — ${14} items`);

db.close();
console.log("\nDone. Run: curl http://localhost:3000/api/stats to verify.");
