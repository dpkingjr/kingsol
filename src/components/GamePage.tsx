import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { guestPlayAllowed } from "@/lib/settings";
import { SessionUserProvider } from "./SessionUser";

interface Props {
  title: string;
  boardClass: string;
  /** the game's own path, e.g. "/klondike", for returning here after sign-in */
  path: string;
  children: React.ReactNode;
}

/**
 * Wraps a game in the signed-in user (needed to know where its saves live) and enforces the
 * admin's guest-play setting. Both depend on the request, so the game streams in; the empty
 * table shows meanwhile.
 */
export function GamePage({ title, boardClass, path, children }: Props) {
  return (
    <Suspense fallback={<GameSkeleton title={title} boardClass={boardClass} />}>
      <GameGate title={title} boardClass={boardClass} path={path}>
        {children}
      </GameGate>
    </Suspense>
  );
}

async function GameGate({ title, boardClass, path, children }: Props) {
  const user = await getCurrentUser();

  // Decided on the server: a blocked guest never receives the game, only the sign-in prompt.
  if (!user && !(await guestPlayAllowed())) {
    return (
      <GameSkeleton title={title} boardClass={boardClass}>
        <div className="gate">
          <h2>Sign in to play</h2>
          <p className="muted">Guest play is turned off. Sign in with the account an administrator gave you.</p>
          <Link className="button-link primary-link" href={`/login?next=${encodeURIComponent(path)}`}>
            Sign in
          </Link>
        </div>
      </GameSkeleton>
    );
  }

  return (
    <SessionUserProvider
      user={user ? { id: user.id, username: user.username, displayName: user.displayName, role: user.role } : null}
    >
      {children}
    </SessionUserProvider>
  );
}

function GameSkeleton({ title, boardClass, children }: { title: string; boardClass: string; children?: React.ReactNode }) {
  return (
    <div className="game-page">
      <header className="toolbar">
        <div className="toolbar-left">
          <Link href="/" className="home-link">
            ← Games
          </Link>
          <h1>{title}</h1>
        </div>
      </header>
      <main className={`board table ${boardClass}`} aria-busy={children ? undefined : "true"}>
        {children}
      </main>
    </div>
  );
}
