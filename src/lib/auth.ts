import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "./session";

/*
 * Authorization helpers: the one place pages, Server Actions and Route Handlers check who is
 * asking. Every mutation calls one of these itself rather than trusting what the UI showed.
 */

export { getSessionUser as getCurrentUser } from "./session";

/** The signed-in user, or a redirect to the login page. */
export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

/** The signed-in admin, or a redirect (to login when signed out, home when not an admin). */
export async function requireAdmin(next?: string): Promise<SessionUser> {
  const user = await requireUser(next);
  if (user.role !== "admin") redirect("/");
  return user;
}

/** Only allow same-site paths after login, so ?next= can't send people to another site. */
export function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
    ? next
    : "/";
}
