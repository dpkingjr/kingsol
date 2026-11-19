"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { useSessionUser } from "./SessionUser";

/** "Sign in" for guests; for signed-in players, a menu with account, admin and sign-out. */
export function UserMenu() {
  const user = useSessionUser();
  const pathname = usePathname();

  if (!user) {
    const next = pathname && pathname !== "/login" ? `?next=${encodeURIComponent(pathname)}` : "";
    return (
      <Link className="button-link" href={`/login${next}`}>
        Sign in
      </Link>
    );
  }

  return (
    <details className="user-menu">
      <summary aria-label={`Account menu for ${user.displayName}`}>
        <span className="avatar" aria-hidden>
          {user.displayName.slice(0, 1).toUpperCase()}
        </span>
        <span className="user-name">{user.displayName}</span>
      </summary>
      <div className="menu" role="menu">
        <p className="menu-who">
          Signed in as <strong>{user.username}</strong>
          {user.role === "admin" && <span className="badge">admin</span>}
        </p>
        <Link href="/account" role="menuitem">
          Account &amp; stats
        </Link>
        {user.role === "admin" && (
          <Link href="/admin/users" role="menuitem">
            Manage users
          </Link>
        )}
        <form action={logout}>
          <button type="submit" role="menuitem">
            Sign out
          </button>
        </form>
      </div>
    </details>
  );
}
