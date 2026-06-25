// One-time backfill: assign all pre-auth rows (user_id IS NULL) to an owner.
// Local file DB:  DATABASE_URL=file:data/groceries.db node scripts/backfill-user.mjs <userId>
// Production:     node --env-file=.env.local scripts/backfill-user.mjs <userId>   (DATABASE_URL must be the Turso url)
import { createClient } from "@libsql/client";

const userId = process.argv[2];
if (!userId) throw new Error("usage: node scripts/backfill-user.mjs <clerk-user-id>");

const db = createClient({
  url: process.env.DATABASE_URL ?? "file:data/groceries.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

console.log(`Assigning orphaned rows to ${userId} in ${process.env.DATABASE_URL ?? "file:data/groceries.db"}`);
for (const table of ["receipts", "catalog_items", "shopping_list"]) {
  const r = await db.execute({ sql: `UPDATE ${table} SET user_id = ? WHERE user_id IS NULL`, args: [userId] });
  console.log(`  ${table}: ${r.rowsAffected} rows assigned`);
}
