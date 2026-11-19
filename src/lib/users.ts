import "server-only";
import { query } from "./db";
import { hashPassword, timingDummyHash, verifyPassword } from "./password";
import type { Role } from "./session";

/*
 * User data access. Callers authorize first (see auth.ts); these functions only touch data.
 */

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

export interface UserRow {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  mustChangePassword: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  locked: boolean;
}

export type AuthResult = { ok: true; userId: string; mustChangePassword: boolean } | { ok: false; error: string };

const GENERIC_FAILURE = "Wrong username or password.";

/**
 * Check a username and password. After 5 failures in a row the account is locked for 15 minutes.
 * Unknown usernames take as long as known ones and get the same message, so accounts can't be probed.
 */
export async function authenticate(username: string, password: string): Promise<AuthResult> {
  const rows = await query<{
    id: string;
    password_hash: string;
    must_change_password: boolean;
    locked: boolean;
  }>(
    `SELECT id, password_hash, must_change_password, (locked_until IS NOT NULL AND locked_until > now()) AS locked
       FROM users WHERE lower(username) = lower($1)`,
    [username],
  );
  const user = rows[0];
  if (!user) {
    await verifyPassword(password, await timingDummyHash());
    return { ok: false, error: GENERIC_FAILURE };
  }
  if (user.locked) {
    return { ok: false, error: `Too many failed attempts. Try again in ${LOCK_MINUTES} minutes.` };
  }
  if (!(await verifyPassword(password, user.password_hash))) {
    await query(
      // a lock that has run out starts the count over
      `UPDATE users
          SET failed_logins = CASE WHEN locked_until <= now() THEN 1 ELSE failed_logins + 1 END,
              locked_until = CASE
                WHEN (CASE WHEN locked_until <= now() THEN 1 ELSE failed_logins + 1 END) >= $2
                THEN now() + make_interval(mins => $3)
              END
        WHERE id = $1`,
      [user.id, MAX_FAILED, LOCK_MINUTES],
    );
    return { ok: false, error: GENERIC_FAILURE };
  }
  await query("UPDATE users SET failed_logins = 0, locked_until = NULL, last_login_at = now() WHERE id = $1", [user.id]);
  return { ok: true, userId: String(user.id), mustChangePassword: user.must_change_password };
}

export async function checkPassword(userId: string, password: string): Promise<boolean> {
  const rows = await query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [userId]);
  return !!rows[0] && verifyPassword(password, rows[0].password_hash);
}

/** Set a password. `mustChange` makes the user pick a new one after signing in (admin resets). */
export async function setPassword(userId: string, password: string, mustChange: boolean) {
  await query(
    `UPDATE users SET password_hash = $2, must_change_password = $3, failed_logins = 0, locked_until = NULL
      WHERE id = $1`,
    [userId, await hashPassword(password), mustChange],
  );
}

export async function listUsers(): Promise<UserRow[]> {
  const rows = await query<{
    id: string;
    username: string;
    display_name: string;
    role: Role;
    must_change_password: boolean;
    created_at: Date;
    last_login_at: Date | null;
    locked: boolean;
  }>(
    `SELECT id, username, display_name, role, must_change_password, created_at, last_login_at,
            (locked_until IS NOT NULL AND locked_until > now()) AS locked
       FROM users ORDER BY lower(username)`,
  );
  return rows.map((r) => ({
    id: String(r.id),
    username: r.username,
    displayName: r.display_name,
    role: r.role,
    mustChangePassword: r.must_change_password,
    createdAt: r.created_at.toISOString(),
    lastLoginAt: r.last_login_at?.toISOString() ?? null,
    locked: r.locked,
  }));
}

export async function usernameTaken(username: string): Promise<boolean> {
  const rows = await query("SELECT 1 FROM users WHERE lower(username) = lower($1)", [username]);
  return rows.length > 0;
}

/** New accounts must choose their own password on first sign-in. */
export async function createUser(input: { username: string; displayName: string; password: string; role: Role }) {
  await query(
    `INSERT INTO users (username, display_name, password_hash, role, must_change_password)
     VALUES ($1, $2, $3, $4, TRUE)`,
    [input.username, input.displayName, await hashPassword(input.password), input.role],
  );
}

export async function updateUser(userId: string, changes: { displayName: string; role: Role }) {
  await query("UPDATE users SET display_name = $2, role = $3 WHERE id = $1", [userId, changes.displayName, changes.role]);
}

export async function unlockUser(userId: string) {
  await query("UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = $1", [userId]);
}

export async function deleteUser(userId: string) {
  await query("DELETE FROM users WHERE id = $1", [userId]);
}

export async function signOutEverywhere(userId: string) {
  await query("DELETE FROM sessions WHERE user_id = $1", [userId]);
}

export async function adminCount(): Promise<number> {
  const rows = await query<{ n: string }>("SELECT count(*) AS n FROM users WHERE role = 'admin'");
  return Number(rows[0].n);
}

export async function getUserRole(userId: string): Promise<Role | null> {
  const rows = await query<{ role: Role }>("SELECT role FROM users WHERE id = $1", [userId]);
  return rows[0]?.role ?? null;
}
