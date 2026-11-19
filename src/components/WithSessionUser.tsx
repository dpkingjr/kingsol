import { getCurrentUser } from "@/lib/auth";
import { SessionUserProvider } from "./SessionUser";

/**
 * Reads the session and hands a narrow user object to client components below.
 * It reads the request cookie, so always render it inside a <Suspense> boundary.
 */
export async function WithSessionUser({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <SessionUserProvider
      user={user ? { id: user.id, username: user.username, displayName: user.displayName, role: user.role } : null}
    >
      {children}
    </SessionUserProvider>
  );
}
