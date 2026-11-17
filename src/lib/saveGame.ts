/**
 * Browser-local persistence for in-progress games and the auto-save preference.
 * Every access is wrapped in try/catch: storage can be unavailable (private mode, blocked site data).
 */

const SETTING_KEY = "kingsol:autosave";
const SAVE_PREFIX = "kingsol:save:v1:";
const SETTING_EVENT = "kingsol:autosave-change";

/** Undo history kept in a save; older states are dropped so a long game stays well under storage limits. */
export const MAX_SAVED_HISTORY = 150;

export interface SavedGame<S> {
  seed: number;
  /** the deal as deal() produced it, kept so Restart works even when old history was trimmed */
  initial: S;
  history: S[];
  moves: number;
  elapsedMs: number;
  savedAt: number;
}

export function readAutoSave(): boolean {
  try {
    return localStorage.getItem(SETTING_KEY) !== "off"; // on by default
  } catch {
    return false;
  }
}

export function writeAutoSave(on: boolean) {
  try {
    localStorage.setItem(SETTING_KEY, on ? "on" : "off");
    if (!on) clearAllSaves();
  } catch {
    // storage unavailable: the toggle still applies for this page view
  }
  window.dispatchEvent(new CustomEvent(SETTING_EVENT, { detail: on }));
}

/** Subscribe to auto-save changes from this tab and from other tabs. */
export function onAutoSaveChange(cb: (on: boolean) => void): () => void {
  const local = (e: Event) => cb((e as CustomEvent<boolean>).detail);
  const remote = (e: StorageEvent) => {
    if (e.key === SETTING_KEY) cb(e.newValue !== "off");
  };
  window.addEventListener(SETTING_EVENT, local);
  window.addEventListener("storage", remote);
  return () => {
    window.removeEventListener(SETTING_EVENT, local);
    window.removeEventListener("storage", remote);
  };
}

export function loadGame<S>(key: string): SavedGame<S> | null {
  try {
    const raw = localStorage.getItem(SAVE_PREFIX + key);
    if (!raw) return null;
    const g = JSON.parse(raw) as SavedGame<S>;
    if (!Array.isArray(g.history) || g.history.length === 0 || !g.initial || typeof g.seed !== "number") return null;
    return g;
  } catch {
    return null;
  }
}

export function storeGame<S>(key: string, game: SavedGame<S>) {
  try {
    localStorage.setItem(SAVE_PREFIX + key, JSON.stringify(game));
  } catch {
    // quota exceeded or storage unavailable: try again without the undo history
    try {
      const last = game.history[game.history.length - 1];
      localStorage.setItem(SAVE_PREFIX + key, JSON.stringify({ ...game, history: [last] }));
    } catch {
      // give up quietly; the game keeps working without a save
    }
  }
}

export function clearGame(key: string) {
  try {
    localStorage.removeItem(SAVE_PREFIX + key);
  } catch {
    // nothing to clear
  }
}

function clearAllSaves() {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(SAVE_PREFIX)) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}
