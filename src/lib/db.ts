import { Pool, type QueryResultRow } from "pg";

/*
 * Shared PostgreSQL pool. Deliberately free of `server-only` so the CLI scripts in
 * /scripts can import it too; app code reaches it only through server-only modules.
 */

declare global {
  // Reuse one pool across hot reloads in development.
  var __kingsolPool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local (see README).");
  }
  return new Pool({
    connectionString,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
    max: 10,
  });
}

export function pool(): Pool {
  globalThis.__kingsolPool ??= createPool();
  return globalThis.__kingsolPool;
}

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await pool().query<T>(text, params);
  return result.rows;
}
