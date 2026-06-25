// Apply the per-user schema migration to a database (mirrors src/lib/db.ts migrate()).
// Production: node --env-file=.env.local scripts/migrate-schema.mjs   (DATABASE_URL must be the Turso url)
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.DATABASE_URL ?? "file:data/groceries.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

for (const table of ["receipts", "catalog_items", "shopping_list"]) {
  const info = await db.execute(`PRAGMA table_info(${table})`);
  if (!info.rows.some((r) => r.name === "user_id")) {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN user_id TEXT`);
    console.log(`  added ${table}.user_id`);
  } else {
    console.log(`  ${table}.user_id already present`);
  }
}
await db.execute("CREATE INDEX IF NOT EXISTS idx_receipts_user ON receipts(user_id)");
await db.execute("CREATE INDEX IF NOT EXISTS idx_shopping_user ON shopping_list(user_id)");
await db.execute("DROP INDEX IF EXISTS idx_catalog_name");
await db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_user_name ON catalog_items(user_id, lower(name))");
console.log("schema migration complete");
