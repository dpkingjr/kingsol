import Link from "next/link";
import { Suspense } from "react";
import { UserMenu } from "./UserMenu";
import { WithSessionUser } from "./WithSessionUser";

/** Toolbar for the non-game pages (login, account, admin). The user menu streams in. */
export function PageHeader({ title }: { title: string }) {
  return (
    <header className="toolbar">
      <div className="toolbar-left">
        <Link href="/" className="home-link">
          ← Games
        </Link>
        <h1>{title}</h1>
      </div>
      <div className="toolbar-actions">
        <Suspense fallback={null}>
          <WithSessionUser>
            <UserMenu />
          </WithSessionUser>
        </Suspense>
      </div>
    </header>
  );
}
