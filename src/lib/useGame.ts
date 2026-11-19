"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { randomSeed } from "./cards";
import {
  MAX_SAVED_HISTORY,
  clearGame,
  loadGame,
  onAutoSaveChange,
  readAutoSave,
  storeGame,
  writeAutoSave,
  type SavedGame,
} from "./saveGame";
import { useSessionUser } from "@/components/SessionUser";
import { beaconRemote, deleteRemote, loadRemote, postStat, putRemote } from "./remoteSave";

interface GameRecord<S> {
  seed: number;
  initial: S;
  history: S[];
  moves: number;
  startedAt: number | null;
  finishedAt: number | null;
}

function fresh<S>(seed: number, factory: (seed: number) => S): GameRecord<S> {
  const initial = factory(seed);
  return { seed, initial, history: [initial], moves: 0, startedAt: null, finishedAt: null };
}

/**
 * Holds a game's state with undo history, a move counter, a timer and optional auto-save
 * (to the player's account when signed in, otherwise to this browser).
 * The first deal (or the saved game) loads after mount, so the random shuffle and
 * browser storage never run during server render.
 *
 * @param saveKey identifies this game's save slot, e.g. "klondike"
 */
export function useGame<S>(saveKey: string, create: (seed: number) => S, isWon: (s: S) => boolean) {
  const [game, setGame] = useState<GameRecord<S> | null>(null);
  const [now, setNow] = useState(0);
  // The preference lives in localStorage and can change in another tab; off during server render.
  const autoSave = useSyncExternalStore(onAutoSaveChange, readAutoSave, () => false);
  const [notice, setNotice] = useState<string | null>(null);
  const factory = useRef(create);
  const winCheck = useRef(isWon);
  const latest = useRef<GameRecord<S> | null>(null);
  // Signed-in players save to their account; guests save in this browser.
  const userId = useSessionUser()?.id ?? null;

  useEffect(() => {
    winCheck.current = isWon;
    latest.current = game;
  });

  /** The game as a save record, with the timer as of right now. */
  const snapshot = (g: GameRecord<S>): SavedGame<S> => ({
    seed: g.seed,
    initial: g.initial,
    history: g.history.slice(-MAX_SAVED_HISTORY),
    moves: g.moves,
    elapsedMs: g.startedAt ? Date.now() - g.startedAt : 0,
    savedAt: Date.now(),
  });

  /*
   * Load: with auto-save on, a signed-in player's game comes from their account, a guest's from
   * this browser. A guest save left in this browser is moved to the account the first time.
   */
  useEffect(() => {
    let cancelled = false;
    const restore = (saved: SavedGame<S> | null, message: string) => {
      if (cancelled) return;
      if (saved && !winCheck.current(saved.history[saved.history.length - 1])) {
        const t = Date.now();
        setGame({
          seed: saved.seed,
          initial: saved.initial,
          history: saved.history,
          moves: saved.moves,
          startedAt: saved.moves > 0 || saved.elapsedMs > 0 ? t - saved.elapsedMs : null,
          finishedAt: null,
        });
        setNotice(message);
      } else {
        setGame(fresh(randomSeed(), factory.current));
      }
    };

    if (!readAutoSave()) {
      restore(null, "");
    } else if (!userId) {
      restore(loadGame<S>(saveKey), "Restored your saved game.");
    } else {
      loadRemote<S>(saveKey)
        .then((saved) => {
          if (saved) return restore(saved, "Restored your saved game.");
          const local = loadGame<S>(saveKey);
          if (local) clearGame(saveKey);
          restore(local, "Moved this browser's saved game to your account.");
        })
        .catch(() => {
          restore(null, "");
          if (!cancelled) setNotice("Couldn't load your saved game. Starting a new one.");
        });
    }
    return () => {
      cancelled = true;
    };
  }, [saveKey, userId]);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(id);
  }, [notice]);

  // Save after every change (debounced for the server), and once more when the page is hidden
  // so the timer is current.
  const flushOnUnmount = useRef<(() => void) | null>(null);
  useEffect(() => {
    flushOnUnmount.current = null;
    if (!autoSave || !game) return;
    latest.current = game;

    if (!userId) {
      const save = () => {
        const g = latest.current ?? game;
        if (g.finishedAt) clearGame(saveKey);
        else storeGame(saveKey, snapshot(g));
      };
      save();
      const onHide = () => document.visibilityState === "hidden" && save();
      window.addEventListener("pagehide", save);
      document.addEventListener("visibilitychange", onHide);
      return () => {
        window.removeEventListener("pagehide", save);
        document.removeEventListener("visibilitychange", onHide);
      };
    }

    if (game.finishedAt) {
      deleteRemote(saveKey);
      return;
    }
    const timer = setTimeout(() => {
      flushOnUnmount.current = null;
      putRemote(saveKey, snapshot(game));
    }, 600);
    // leaving the page by in-app navigation before the timer fires: save right away
    flushOnUnmount.current = () => putRemote(saveKey, snapshot(game));
    const beacon = () => beaconRemote(saveKey, snapshot(latest.current ?? game));
    const onHide = () => document.visibilityState === "hidden" && beacon();
    window.addEventListener("pagehide", beacon);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pagehide", beacon);
      document.removeEventListener("visibilitychange", onHide);
    };
    // snapshot only reads its argument
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSave, game, saveKey, userId]);

  useEffect(() => () => flushOnUnmount.current?.(), []);

  // Account statistics: a game counts as played at its first move, and a win records time and moves.
  const statsPrev = useRef<GameRecord<S> | null>(null);
  useEffect(() => {
    const prev = statsPrev.current;
    statsPrev.current = game;
    if (!userId || !game || !prev || prev.initial !== game.initial) return;
    if (!prev.startedAt && game.startedAt) postStat(saveKey, { event: "started" });
    if (!prev.finishedAt && game.finishedAt && game.startedAt) {
      postStat(saveKey, {
        event: "won",
        seconds: Math.round((game.finishedAt - game.startedAt) / 1000),
        moves: game.moves,
      });
    }
  }, [game, saveKey, userId]);

  const setAutoSave = useCallback(
    (on: boolean) => {
      writeAutoSave(on); // turning it off also deletes every saved game in this browser...
      if (!on && userId) deleteRemote(); // ...and on the account
    },
    [userId],
  );

  const newGame = useCallback((seed?: number, nextFactory?: (seed: number) => S) => {
    if (nextFactory) factory.current = nextFactory;
    setGame(fresh(seed ?? randomSeed(), factory.current));
  }, []);

  const apply = useCallback((next: S | null, countsAsMove = true) => {
    if (!next) return false;
    setGame((g) => {
      if (!g || g.finishedAt) return g;
      const t = Date.now();
      return {
        ...g,
        history: [...g.history, next],
        moves: g.moves + (countsAsMove ? 1 : 0),
        startedAt: g.startedAt ?? t,
        finishedAt: winCheck.current(next) ? t : null,
      };
    });
    return true;
  }, []);

  const undo = useCallback(() => {
    setGame((g) => {
      if (!g || g.history.length < 2 || g.finishedAt) return g;
      return { ...g, history: g.history.slice(0, -1), moves: g.moves + 1 };
    });
  }, []);

  const restart = useCallback(() => {
    setGame((g) =>
      g ? { seed: g.seed, initial: g.initial, history: [g.initial], moves: 0, startedAt: null, finishedAt: null } : g,
    );
  }, []);

  const running = !!game?.startedAt && !game.finishedAt;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [running]);

  const state = game ? game.history[game.history.length - 1] : null;
  let elapsed = 0;
  if (game?.startedAt) elapsed = Math.max(0, (game.finishedAt ?? Math.max(now, game.startedAt)) - game.startedAt);

  return {
    state,
    seed: game?.seed ?? 0,
    moves: game?.moves ?? 0,
    elapsedSeconds: Math.floor(elapsed / 1000),
    won: !!game?.finishedAt,
    canUndo: !!game && game.history.length > 1 && !game.finishedAt,
    autoSave,
    setAutoSave,
    notice,
    apply,
    undo,
    restart,
    newGame,
  };
}

export { formatTime } from "./format";
