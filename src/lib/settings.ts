import "server-only";
import { cache } from "react";
import { query } from "./db";

/* Site-wide settings changed by admins. Callers authorize writes (see auth.ts). */

const GUEST_PLAY = "guest_play";

/**
 * Whether people who aren't signed in may play. On unless an admin turned it off.
 * Read fresh on each request (memoized within one render), so a change applies immediately.
 */
export const guestPlayAllowed = cache(async (): Promise<boolean> => {
  const rows = await query<{ value: unknown }>("SELECT value FROM settings WHERE key = $1", [GUEST_PLAY]);
  return rows[0]?.value !== false;
});

export async function setGuestPlayAllowed(allowed: boolean, adminId: string) {
  await query(
    `INSERT INTO settings (key, value, updated_at, updated_by) VALUES ($1, $2::jsonb, now(), $3)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now(), updated_by = EXCLUDED.updated_by`,
    [GUEST_PLAY, JSON.stringify(allowed), adminId],
  );
}
