"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatTime } from "@/lib/format";
import { useSessionUser } from "./SessionUser";
import { UserMenu } from "./UserMenu";

interface Props {
  title: string;
  seed: number;
  moves: number;
  elapsedSeconds: number;
  won: boolean;
  canUndo: boolean;
  autoSave: boolean;
  onToggleAutoSave: (on: boolean) => void;
  onUndo: () => void;
  onNewGame: () => void;
  onRestart: () => void;
  options?: React.ReactNode;
  status?: React.ReactNode;
  message?: string | null;
  boardClass: string;
  rules: React.ReactNode;
  children: React.ReactNode;
}

export function GameShell({
  title,
  seed,
  moves,
  elapsedSeconds,
  won,
  canUndo,
  autoSave,
  onToggleAutoSave,
  onUndo,
  onNewGame,
  onRestart,
  options,
  status,
  message,
  boardClass,
  rules,
  children,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        onUndo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onUndo]);

  // The board sizes its cards to the space below the toolbar, which wraps to more lines on narrow screens.
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(56);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeaderHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const where = useSessionUser() ? "to your account" : "in this browser";

  return (
    <div className="game-page" style={{ "--header-h": `${headerHeight}px` } as React.CSSProperties}>
      <header className="toolbar" ref={headerRef}>
        <div className="toolbar-left">
          <Link href="/" className="home-link" aria-label="All games">
            ← Games
          </Link>
          <h1>{title}</h1>
          {seed > 0 && <span className="seed">#{seed}</span>}
        </div>
        <div className="toolbar-stats" aria-live="polite">
          <span>
            Moves <strong>{moves}</strong>
          </span>
          <span>
            Time <strong>{formatTime(elapsedSeconds)}</strong>
          </span>
          {status}
        </div>
        <div className="toolbar-actions">
          {options}
          <label
            className="check"
            title={
              autoSave
                ? `Your game is saved ${where} after every move. Turning this off deletes saved games.`
                : `Save your game ${where} after every move and pick up where you left off.`
            }
          >
            <input type="checkbox" checked={autoSave} onChange={(e) => onToggleAutoSave(e.target.checked)} />
            Auto-save
          </label>
          <button onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl/⌘+Z)">
            Undo
          </button>
          <button onClick={onRestart} title="Replay this deal from the start">
            Restart
          </button>
          <button className="primary" onClick={onNewGame}>
            New game
          </button>
          <UserMenu />
        </div>
      </header>

      {message && <div className="toast">{message}</div>}

      <main className={`board table ${boardClass}`}>{children}</main>

      <details className="rules">
        <summary>How to play</summary>
        {rules}
      </details>

      {won && (
        <div className="win-overlay" role="dialog" aria-label="You won">
          <div className="win-box">
            <h2>You won!</h2>
            <p>
              {moves} moves · {formatTime(elapsedSeconds)}
            </p>
            <button className="primary" onClick={onNewGame}>
              Play again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
