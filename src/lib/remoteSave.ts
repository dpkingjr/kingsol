"use client";

import { withBase } from "./basePath";
import type { SavedGame } from "./saveGame";

/* Browser-side calls to the account save/stats API used by signed-in players. */

/** sendBeacon and keepalive requests are capped at 64 KB by browsers. */
const BEACON_LIMIT = 60_000;

export async function loadRemote<S>(game: string): Promise<SavedGame<S> | null> {
  const res = await fetch(withBase(`/api/saves/${game}`), { cache: "no-store" });
  if (!res.ok) throw new Error(`Load failed (${res.status})`);
  const { save } = (await res.json()) as { save: SavedGame<S> | null };
  if (!save || !Array.isArray(save.history) || save.history.length === 0 || !save.initial) return null;
  return save;
}

export function putRemote<S>(game: string, save: SavedGame<S>) {
  return fetch(withBase(`/api/saves/${game}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(save),
  }).catch(() => {
    // offline or server unavailable: the next move tries again
  });
}

/**
 * Last-chance save while the page is being hidden or closed. Beacons are size-limited, so a long
 * undo history is trimmed; the regular saves before this already stored the full history.
 */
export function beaconRemote<S>(game: string, save: SavedGame<S>) {
  let body = JSON.stringify(save);
  for (const keep of [20, 5, 1]) {
    if (body.length <= BEACON_LIMIT) break;
    body = JSON.stringify({ ...save, history: save.history.slice(-keep) });
  }
  if (body.length > BEACON_LIMIT) return;
  navigator.sendBeacon(withBase(`/api/saves/${game}`), new Blob([body], { type: "application/json" }));
}

export function deleteRemote(game?: string) {
  return fetch(withBase(game ? `/api/saves/${game}` : "/api/saves"), { method: "DELETE" }).catch(() => {});
}

export function postStat(game: string, body: { event: "started" } | { event: "won"; seconds: number; moves: number }) {
  return fetch(withBase(`/api/stats/${game}`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {});
}
