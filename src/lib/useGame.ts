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
} from "./saveGame";

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
 * Holds a game's state with undo history, a move counter, a timer and optional auto-save.
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

  useEffect(() => {
    winCheck.current = isWon;
    latest.current = game;
  });

  // Mount: restore the saved game when auto-save is on, otherwise deal a new one.
  useEffect(() => {
    const on = readAutoSave();
    const saved = on ? loadGame<S>(saveKey) : null;
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
      setNotice("Restored your saved game.");
    } else {
      setGame(fresh(randomSeed(), factory.current));
    }
  }, [saveKey]);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(id);
  }, [notice]);

  // Save after every change, and once more when the page is hidden so the timer is current.
  useEffect(() => {
    if (!autoSave || !game) return;
    const save = () => {
      const g = latest.current ?? game;
      if (g.finishedAt) return clearGame(saveKey);
      storeGame(saveKey, {
        seed: g.seed,
        initial: g.initial,
        history: g.history.slice(-MAX_SAVED_HISTORY),
        moves: g.moves,
        elapsedMs: g.startedAt ? Date.now() - g.startedAt : 0,
        savedAt: Date.now(),
      });
    };
    latest.current = game;
    save();
    const onHide = () => document.visibilityState === "hidden" && save();
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [autoSave, game, saveKey]);

  const setAutoSave = useCallback((on: boolean) => {
    writeAutoSave(on); // turning it off also deletes every saved game
  }, []);

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

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
