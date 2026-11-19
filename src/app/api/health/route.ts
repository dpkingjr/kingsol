import { connection } from "next/server";
import { query } from "@/lib/db";

/**
 * GET /api/health: 200 when the app is serving and can reach the database, 503 otherwise.
 * Used by the Docker healthcheck; reveals nothing beyond up/down.
 */
export async function GET() {
  await connection(); // always checked live, never prerendered at build time
  try {
    await query("SELECT 1");
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
