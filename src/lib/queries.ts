import { getDb } from "./db";
import type { Receipt, Item, StoreSpending, CategorySpending, MonthlySpending, TopItem, SpendingStats, CatalogItem, ShoppingListItem } from "./types";

export async function upsertStore(name: string, address?: string): Promise<number> {
  const db = await getDb();
  const existing = await db.execute({ sql: "SELECT id FROM stores WHERE name = ?", args: [name] });
  if (existing.rows.length) return Number(existing.rows[0].id);
  const result = await db.execute({ sql: "INSERT INTO stores (name, address) VALUES (?, ?)", args: [name, address ?? null] });
  return Number(result.lastInsertRowid);
}

export async function insertReceipt(data: {
  store_id: number;
  date: string;
  total: number;
  subtotal?: number;
  tax?: number;
  image_path?: string;
}): Promise<number> {
  const db = await getDb();
  const result = await db.execute({
    sql: `INSERT INTO receipts (store_id, date, total, subtotal, tax, image_path)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [data.store_id, data.date, data.total, data.subtotal ?? null, data.tax ?? null, data.image_path ?? null],
  });
  return Number(result.lastInsertRowid);
}

export async function insertItems(items: { receipt_id: number; name: string; quantity?: number; unit_price?: number; total_price: number; category?: string }[]) {
  if (items.length === 0) return;
  const db = await getDb();
  // batch(..., "write") runs all inserts in a single transaction.
  await db.batch(
    items.map((row) => ({
      sql: `INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [row.receipt_id, row.name, row.quantity ?? 1, row.unit_price ?? null, row.total_price, row.category ?? "uncategorized"],
    })),
    "write",
  );
}

export async function getReceipts(): Promise<Receipt[]> {
  const db = await getDb();
  const result = await db.execute(`
    SELECT r.*, s.name as store_name
    FROM receipts r
    LEFT JOIN stores s ON r.store_id = s.id
    ORDER BY r.date DESC, r.created_at DESC
  `);
  return result.rows as unknown as Receipt[];
}

export async function getReceiptWithItems(id: number): Promise<Receipt | undefined> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT r.*, s.name as store_name
          FROM receipts r LEFT JOIN stores s ON r.store_id = s.id
          WHERE r.id = ?`,
    args: [id],
  });
  if (result.rows.length === 0) return undefined;
  // Spread into a plain object so we can attach items (libSQL rows aren't extensible).
  const receipt = { ...result.rows[0] } as unknown as Receipt;
  const items = await db.execute({ sql: "SELECT * FROM items WHERE receipt_id = ? ORDER BY id", args: [id] });
  receipt.items = items.rows as unknown as Item[];
  return receipt;
}

export async function deleteReceipt(id: number) {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM receipts WHERE id = ?", args: [id] });
}

export async function getSpendingStats(): Promise<SpendingStats> {
  const db = await getDb();
  const statsRes = await db.execute(`
    SELECT
      COALESCE(SUM(r.total), 0) as totalSpent,
      COUNT(r.id) as receiptCount,
      COALESCE(AVG(r.total), 0) as avgPerTrip
    FROM receipts r
  `);
  const row = statsRes.rows[0] as unknown as { totalSpent: number; receiptCount: number; avgPerTrip: number };

  const topStoreRes = await db.execute(`
    SELECT s.name FROM receipts r
    JOIN stores s ON r.store_id = s.id
    GROUP BY r.store_id ORDER BY COUNT(*) DESC LIMIT 1
  `);
  const topStore = (topStoreRes.rows[0] as unknown as { name: string } | undefined)?.name ?? "—";

  const topCategoryRes = await db.execute(`
    SELECT category FROM items
    GROUP BY category ORDER BY SUM(total_price) DESC LIMIT 1
  `);
  const topCategory = (topCategoryRes.rows[0] as unknown as { category: string } | undefined)?.category ?? "—";

  return { ...row, topStore, topCategory };
}

export async function getStoreSpending(): Promise<StoreSpending[]> {
  const db = await getDb();
  const result = await db.execute(`
    SELECT s.name as store, SUM(r.total) as total, COUNT(r.id) as visits
    FROM receipts r JOIN stores s ON r.store_id = s.id
    GROUP BY r.store_id ORDER BY total DESC
  `);
  return result.rows as unknown as StoreSpending[];
}

export async function getCategorySpending(): Promise<CategorySpending[]> {
  const db = await getDb();
  const result = await db.execute(`
    SELECT category, SUM(total_price) as total, COUNT(*) as count
    FROM items GROUP BY category ORDER BY total DESC
  `);
  return result.rows as unknown as CategorySpending[];
}

export async function getMonthlySpending(): Promise<MonthlySpending[]> {
  const db = await getDb();
  const result = await db.execute(`
    SELECT strftime('%Y-%m', date) as month, SUM(total) as total
    FROM receipts GROUP BY month ORDER BY month ASC
  `);
  return result.rows as unknown as MonthlySpending[];
}

export async function getTopItems(limit = 20): Promise<TopItem[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `
      SELECT
        name, category,
        COUNT(*) as count,
        SUM(total_price) as total_spent,
        AVG(total_price / NULLIF(quantity, 0)) as avg_price
      FROM items
      GROUP BY lower(name)
      ORDER BY count DESC, total_spent DESC
      LIMIT ?
    `,
    args: [limit],
  });
  return result.rows as unknown as TopItem[];
}

// ── Catalog ────────────────────────────────────────────────────────────────

export async function getCatalog(): Promise<CatalogItem[]> {
  const db = await getDb();
  const result = await db.execute(`
    SELECT
      c.id, c.name, c.category, c.is_custom, c.created_at,
      MAX(r.date)  AS last_bought_at,
      s.name       AS last_bought_store,
      COUNT(i.id)  AS buy_count
    FROM catalog_items c
    LEFT JOIN items i        ON lower(i.name) = lower(c.name)
    LEFT JOIN receipts r     ON i.receipt_id = r.id
    LEFT JOIN stores s       ON r.store_id = s.id
    GROUP BY c.id
    ORDER BY buy_count DESC, c.name ASC
  `);
  return result.rows as unknown as CatalogItem[];
}

export async function addCatalogItem(name: string, category: string): Promise<number> {
  const db = await getDb();
  const existing = await db.execute({ sql: "SELECT id FROM catalog_items WHERE lower(name) = lower(?)", args: [name] });
  if (existing.rows.length) return Number(existing.rows[0].id);
  const result = await db.execute({ sql: "INSERT INTO catalog_items (name, category, is_custom) VALUES (?, ?, 1)", args: [name, category] });
  return Number(result.lastInsertRowid);
}

export async function syncCatalogFromItems() {
  const db = await getDb();
  await db.execute(`INSERT OR IGNORE INTO catalog_items (name, category, is_custom) SELECT DISTINCT name, category, 0 FROM items`);
}

// ── Shopping list ─────────────────────────────────────────────────────────

export async function getShoppingList(): Promise<ShoppingListItem[]> {
  const db = await getDb();
  const result = await db.execute(`
    SELECT
      sl.*,
      MAX(r.date)  AS last_bought_at,
      s.name       AS last_bought_store
    FROM shopping_list sl
    LEFT JOIN items i    ON lower(i.name) = lower(sl.name)
    LEFT JOIN receipts r ON i.receipt_id = r.id
    LEFT JOIN stores s   ON r.store_id = s.id
    GROUP BY sl.id
    ORDER BY sl.is_checked ASC, sl.added_at DESC
  `);
  return result.rows as unknown as ShoppingListItem[];
}

export async function addShoppingListItem(data: { name: string; category: string; quantity: number; unit?: string; note?: string }): Promise<number> {
  const db = await getDb();
  const result = await db.execute({
    sql: `INSERT INTO shopping_list (name, category, quantity, unit, note)
          VALUES (?, ?, ?, ?, ?)`,
    args: [data.name, data.category, data.quantity, data.unit ?? null, data.note ?? null],
  });
  return Number(result.lastInsertRowid);
}

export async function updateShoppingListItem(id: number, data: Partial<{ quantity: number; unit: string; note: string; is_checked: number }>) {
  const db = await getDb();
  const checkedExpr = data.is_checked === 1 ? "datetime('now')" : "NULL";
  await db.execute({
    sql: `
      UPDATE shopping_list
      SET
        quantity   = COALESCE(?, quantity),
        unit       = COALESCE(?, unit),
        note       = COALESCE(?, note),
        is_checked = COALESCE(?, is_checked),
        checked_at = CASE WHEN ? IS NOT NULL THEN ${checkedExpr} ELSE checked_at END
      WHERE id = ?
    `,
    args: [data.quantity ?? null, data.unit ?? null, data.note ?? null, data.is_checked ?? null, data.is_checked ?? null, id],
  });
}

export async function deleteShoppingListItem(id: number) {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM shopping_list WHERE id = ?", args: [id] });
}

export async function clearCheckedItems() {
  const db = await getDb();
  await db.execute("DELETE FROM shopping_list WHERE is_checked = 1");
}
