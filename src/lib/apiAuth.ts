import "server-only";
import { getSessionUser, type SessionUser } from "./session";

/**
 * Shared checks for the JSON route handlers: the caller must be signed in, and state-changing
 * requests must come from this site (the session cookie is SameSite=Lax; this is a second layer).
 * Returns the user, or a Response to send back as-is.
 */
export async function apiUser(req: Request, mutating: boolean): Promise<SessionUser | Response> {
  if (mutating && !sameOrigin(req)) return Response.json({ error: "Cross-site request refused." }, { status: 403 });
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });
  return user;
}

function sameOrigin(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}
