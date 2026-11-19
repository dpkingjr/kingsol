import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { BASE_PATH } from "./basePath";
import { query } from "./db";

/*
 * Database sessions. The browser gets a random 256-bit token in an httpOnly cookie;
 * the database stores only its SHA-256, so a leaked sessions table can't be replayed.
 */

const COOKIE = "kingsol_session";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const COOKIE_PATH = BASE_PATH || "/";

export type Role = "admin" | "player";

/** The narrow user shape the app works with. Never includes the password hash. */
export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  mustChangePassword: boolean;
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

async function currentTokenHash(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? hashToken(token) : null;
}

/** Start a session for `userId` and set the cookie. Call only from a Server Action or Route Handler. */
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + TTL_MS);
  await query("DELETE FROM sessions WHERE user_id = $1 AND expires_at < now()", [userId]);
  await query("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)", [
    hashToken(token),
    userId,
    expires,
  ]);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    // Secure in production unless explicitly served over plain HTTP (SESSION_COOKIE_SECURE=false)
    secure: process.env.NODE_ENV === "production" && process.env.SESSION_COOKIE_SECURE !== "false",
    sameSite: "lax",
    // scoped to the app's own path, so the cookie isn't sent to the rest of the domain
    path: COOKIE_PATH,
    expires,
  });
}

/** End the current session (sign out). */
export async function deleteSession() {
  const hash = await currentTokenHash();
  if (hash) await query("DELETE FROM sessions WHERE token_hash = $1", [hash]);
  (await cookies()).delete({ name: COOKIE, path: COOKIE_PATH });
}

/** Sign the user out everywhere except this browser (after a password change). */
export async function deleteOtherSessions(userId: string) {
  const hash = await currentTokenHash();
  await query("DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2", [userId, hash ?? ""]);
}

/**
 * The signed-in user, or null. Reads the cookie and the database on every request, so a role
 * change, password reset or deleted account takes effect immediately. Memoized per render.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const hash = await currentTokenHash();
  if (!hash) return null;
  const rows = await query<{
    id: string;
    username: string;
    display_name: string;
    role: Role;
    must_change_password: boolean;
  }>(
    `SELECT u.id, u.username, u.display_name, u.role, u.must_change_password
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hash],
  );
  const u = rows[0];
  if (!u) return null;
  return {
    id: String(u.id),
    username: u.username,
    displayName: u.display_name,
    role: u.role,
    mustChangePassword: u.must_change_password,
  };
});
