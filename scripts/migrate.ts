/**
 * Apply db/schema.sql to DATABASE_URL. Idempotent.
 * Usage: npm run db:migrate
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pool } from "../src/lib/db";

async function main() {
  const sql = readFileSync(join(import.meta.dirname, "..", "db", "schema.sql"), "utf8");
  await pool().query(sql);
  console.log("Database schema is up to date.");
}

main()
  .catch((err) => {
    console.error("Migration failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => pool().end());
