// One-time data migration: local SQLite file -> Turso (libSQL).
// Run with:  node --env-file=.env.local scripts/migrate-to-turso.mjs
// Re-runnable: clears each remote table first, then copies rows preserving ids.
import { createClient } from "@libsql/client";

const local = createClient({ url: "file:data/groceries.db" });
const remote = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

if (!process.env.DATABASE_URL?.startsWith("libsql://")) {
  throw new Error(`DATABASE_URL is not a Turso url: ${process.env.DATABASE_URL}`);
}

// Order matters for FK references on insert; reverse for delete.
const TABLES = ["stores", "receipts", "items", "catalog_items", "shopping_list"];

for (const t of [...TABLES].reverse()) {
  await remote.execute(`DELETE FROM ${t}`);
}

for (const t of TABLES) {
  const res = await local.execute(`SELECT * FROM ${t}`);
  if (res.rows.length === 0) {
    console.log(`${t}: 0 rows (nothing to copy)`);
    continue;
  }
  const cols = res.columns;
  const placeholders = cols.map(() => "?").join(", ");
  const stmts = res.rows.map((row) => ({
    sql: `INSERT INTO ${t} (${cols.join(", ")}) VALUES (${placeholders})`,
    args: cols.map((c) => row[c]),
  }));
  await remote.batch(stmts, "write");
  console.log(`${t}: ${res.rows.length} rows copied`);
}

console.log("\nVerification (remote counts):");
for (const t of TABLES) {
  const r = await remote.execute(`SELECT COUNT(*) AS n FROM ${t}`);
  console.log(`  ${t}: ${Number(r.rows[0].n)}`);
}
