import { getDb } from "./db";
import type { Receipt, Item, StoreSpending, CategorySpending, MonthlySpending, TopItem, SpendingStats, CatalogItem, ShoppingListItem } from "./types";

// Stores are global/shared lookups (public businesses), so they are not scoped by user.
export async function upsertStore(name: string, address?: string): Promise<number> {
  const db = await getDb();
  const existing = await db.execute({ sql: "SELECT id FROM stores WHERE name = ?", args: [name] });
  if (existing.rows.length) return Number(existing.rows[0].id);
  const result = await db.execute({ sql: "INSERT INTO stores (name, address) VALUES (?, ?)", args: [name, address ?? null] });
  return Number(result.lastInsertRowid);
}

export async function insertReceipt(data: {
  user_id: string;
  store_id: number;
  date: string;
  total: number;
  subtotal?: number;
  tax?: number;
  image_path?: string;
}): Promise<number> {
  const db = await getDb();
  const result = await db.execute({
    sql: `INSERT INTO receipts (user_id, store_id, date, total, subtotal, tax, image_path)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [data.user_id, data.store_id, data.date, data.total, data.subtotal ?? null, data.tax ?? null, data.image_path ?? null],
  });
  return Number(result.lastInsertRowid);
}

// Items inherit ownership from their receipt; no per-item user_id.
export async function insertItems(items: { receipt_id: number; name: string; quantity?: number; unit_price?: number; total_price: number; category?: string }[]) {
  if (items.length === 0) return;
  const db = await getDb();
  await db.batch(
    items.map((row) => ({
      sql: `INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [row.receipt_id, row.name, row.quantity ?? 1, row.unit_price ?? null, row.total_price, row.category ?? "uncategorized"],
    })),
    "write",
  );
}

export async function getReceipts(userId: string): Promise<Receipt[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `
      SELECT r.*, s.name as store_name
      FROM receipts r
      LEFT JOIN stores s ON r.store_id = s.id
      WHERE r.user_id = ?
      ORDER BY r.date DESC, r.created_at DESC
    `,
    args: [userId],
  });
  return result.rows as unknown as Receipt[];
}

export async function getReceiptWithItems(id: number, userId: string): Promise<Receipt | undefined> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT r.*, s.name as store_name
          FROM receipts r LEFT JOIN stores s ON r.store_id = s.id
          WHERE r.id = ? AND r.user_id = ?`,
    args: [id, userId],
  });
  if (result.rows.length === 0) return undefined;
  const receipt = { ...result.rows[0] } as unknown as Receipt;
  const items = await db.execute({ sql: "SELECT * FROM items WHERE receipt_id = ? ORDER BY id", args: [id] });
  receipt.items = items.rows as unknown as Item[];
  return receipt;
}

export async function deleteReceipt(id: number, userId: string) {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM receipts WHERE id = ? AND user_id = ?", args: [id, userId] });
}

export async function getSpendingStats(userId: string): Promise<SpendingStats> {
  const db = await getDb();
  const statsRes = await db.execute({
    sql: `
      SELECT
        COALESCE(SUM(r.total), 0) as totalSpent,
        COUNT(r.id) as receiptCount,
        COALESCE(AVG(r.total), 0) as avgPerTrip
      FROM receipts r
      WHERE r.user_id = ?
    `,
    args: [userId],
  });
  const row = statsRes.rows[0] as unknown as { totalSpent: number; receiptCount: number; avgPerTrip: number };

  const topStoreRes = await db.execute({
    sql: `
      SELECT s.name FROM receipts r
      JOIN stores s ON r.store_id = s.id
      WHERE r.user_id = ?
      GROUP BY r.store_id ORDER BY COUNT(*) DESC LIMIT 1
    `,
    args: [userId],
  });
  const topStore = (topStoreRes.rows[0] as unknown as { name: string } | undefined)?.name ?? "—";

  const topCategoryRes = await db.execute({
    sql: `
      SELECT i.category FROM items i
      JOIN receipts r ON i.receipt_id = r.id
      WHERE r.user_id = ?
      GROUP BY i.category ORDER BY SUM(i.total_price) DESC LIMIT 1
    `,
    args: [userId],
  });
  const topCategory = (topCategoryRes.rows[0] as unknown as { category: string } | undefined)?.category ?? "—";

  return { ...row, topStore, topCategory };
}

export async function getStoreSpending(userId: string): Promise<StoreSpending[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `
      SELECT s.name as store, SUM(r.total) as total, COUNT(r.id) as visits
      FROM receipts r JOIN stores s ON r.store_id = s.id
      WHERE r.user_id = ?
      GROUP BY r.store_id ORDER BY total DESC
    `,
    args: [userId],
  });
  return result.rows as unknown as StoreSpending[];
}

export async function getCategorySpending(userId: string): Promise<CategorySpending[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `
      SELECT i.category, SUM(i.total_price) as total, COUNT(*) as count
      FROM items i JOIN receipts r ON i.receipt_id = r.id
      WHERE r.user_id = ?
      GROUP BY i.category ORDER BY total DESC
    `,
    args: [userId],
  });
  return result.rows as unknown as CategorySpending[];
}

export async function getMonthlySpending(userId: string): Promise<MonthlySpending[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `
      SELECT strftime('%Y-%m', date) as month, SUM(total) as total
      FROM receipts WHERE user_id = ? GROUP BY month ORDER BY month ASC
    `,
    args: [userId],
  });
  return result.rows as unknown as MonthlySpending[];
}

export async function getTopItems(userId: string, limit = 20): Promise<TopItem[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `
      SELECT
        i.name, i.category,
        COUNT(*) as count,
        SUM(i.total_price) as total_spent,
        AVG(i.total_price / NULLIF(i.quantity, 0)) as avg_price
      FROM items i JOIN receipts r ON i.receipt_id = r.id
      WHERE r.user_id = ?
      GROUP BY lower(i.name)
      ORDER BY count DESC, total_spent DESC
      LIMIT ?
    `,
    args: [userId, limit],
  });
  return result.rows as unknown as TopItem[];
}

// ── Catalog ────────────────────────────────────────────────────────────────

export async function getCatalog(userId: string): Promise<CatalogItem[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `
      SELECT
        c.id, c.name, c.category, c.is_custom, c.created_at,
        MAX(r.date)  AS last_bought_at,
        s.name       AS last_bought_store,
        COUNT(r.id)  AS buy_count
      FROM catalog_items c
      LEFT JOIN items i        ON lower(i.name) = lower(c.name)
      LEFT JOIN receipts r     ON i.receipt_id = r.id AND r.user_id = ?
      LEFT JOIN stores s       ON r.store_id = s.id
      WHERE c.user_id = ?
      GROUP BY c.id
      ORDER BY buy_count DESC, c.name ASC
    `,
    args: [userId, userId],
  });
  return result.rows as unknown as CatalogItem[];
}

export async function addCatalogItem(name: string, category: string, userId: string): Promise<number> {
  const db = await getDb();
  const existing = await db.execute({
    sql: "SELECT id FROM catalog_items WHERE lower(name) = lower(?) AND user_id = ?",
    args: [name, userId],
  });
  if (existing.rows.length) return Number(existing.rows[0].id);
  const result = await db.execute({
    sql: "INSERT INTO catalog_items (user_id, name, category, is_custom) VALUES (?, ?, ?, 1)",
    args: [userId, name, category],
  });
  return Number(result.lastInsertRowid);
}

export async function syncCatalogFromItems(userId: string) {
  const db = await getDb();
  await db.execute({
    sql: `
      INSERT OR IGNORE INTO catalog_items (user_id, name, category, is_custom)
      SELECT DISTINCT ?, i.name, i.category, 0
      FROM items i JOIN receipts r ON i.receipt_id = r.id
      WHERE r.user_id = ?
    `,
    args: [userId, userId],
  });
}

// ── Shopping list ─────────────────────────────────────────────────────────

export async function getShoppingList(userId: string): Promise<ShoppingListItem[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `
      SELECT
        sl.*,
        MAX(r.date)  AS last_bought_at,
        s.name       AS last_bought_store
      FROM shopping_list sl
      LEFT JOIN items i    ON lower(i.name) = lower(sl.name)
      LEFT JOIN receipts r ON i.receipt_id = r.id AND r.user_id = ?
      LEFT JOIN stores s   ON r.store_id = s.id
      WHERE sl.user_id = ?
      GROUP BY sl.id
      ORDER BY sl.is_checked ASC, sl.added_at DESC
    `,
    args: [userId, userId],
  });
  return result.rows as unknown as ShoppingListItem[];
}

export async function addShoppingListItem(data: { name: string; category: string; quantity: number; unit?: string; note?: string }, userId: string): Promise<number> {
  const db = await getDb();
  const result = await db.execute({
    sql: `INSERT INTO shopping_list (user_id, name, category, quantity, unit, note)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [userId, data.name, data.category, data.quantity, data.unit ?? null, data.note ?? null],
  });
  return Number(result.lastInsertRowid);
}

export async function updateShoppingListItem(id: number, data: Partial<{ quantity: number; unit: string; note: string; is_checked: number }>, userId: string) {
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
      WHERE id = ? AND user_id = ?
    `,
    args: [data.quantity ?? null, data.unit ?? null, data.note ?? null, data.is_checked ?? null, data.is_checked ?? null, id, userId],
  });
}

export async function deleteShoppingListItem(id: number, userId: string) {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM shopping_list WHERE id = ? AND user_id = ?", args: [id, userId] });
}

export async function clearCheckedItems(userId: string) {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM shopping_list WHERE user_id = ? AND is_checked = 1", args: [userId] });
}
