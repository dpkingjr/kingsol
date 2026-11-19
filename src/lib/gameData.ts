import "server-only";
import { query } from "./db";

/* Per-user saved games and statistics. Callers pass the id of the already-verified user. */

export const GAME_KEYS = ["klondike", "freecell", "spider", "pyramid"] as const;
export type GameKey = (typeof GAME_KEYS)[number];

export const GAME_NAMES: Record<GameKey, string> = {
  klondike: "Klondike",
  freecell: "FreeCell",
  spider: "Spider",
  pyramid: "Pyramid",
};

export const isGameKey = (g: string): g is GameKey => (GAME_KEYS as readonly string[]).includes(g);

/** Largest save accepted, in bytes of JSON (a long Spider game with full undo history is ~1 MB). */
export const MAX_SAVE_BYTES = 2_000_000;

export async function getSave(userId: string, game: GameKey): Promise<unknown | null> {
  const rows = await query<{ data: unknown }>("SELECT data FROM game_saves WHERE user_id = $1 AND game = $2", [
    userId,
    game,
  ]);
  return rows[0]?.data ?? null;
}

export async function putSave(userId: string, game: GameKey, json: string) {
  await query(
    `INSERT INTO game_saves (user_id, game, data, updated_at) VALUES ($1, $2, $3::jsonb, now())
     ON CONFLICT (user_id, game) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [userId, game, json],
  );
}

export async function deleteSave(userId: string, game?: GameKey) {
  if (game) await query("DELETE FROM game_saves WHERE user_id = $1 AND game = $2", [userId, game]);
  else await query("DELETE FROM game_saves WHERE user_id = $1", [userId]);
}

export async function recordStarted(userId: string, game: GameKey) {
  await query(
    `INSERT INTO game_stats (user_id, game, played) VALUES ($1, $2, 1)
     ON CONFLICT (user_id, game) DO UPDATE SET played = game_stats.played + 1`,
    [userId, game],
  );
}

export async function recordWin(userId: string, game: GameKey, seconds: number, moves: number) {
  await query(
    `INSERT INTO game_stats (user_id, game, played, won, best_seconds, best_moves) VALUES ($1, $2, 1, 1, $3, $4)
     ON CONFLICT (user_id, game) DO UPDATE SET
       won = game_stats.won + 1,
       best_seconds = LEAST(COALESCE(game_stats.best_seconds, $3), $3),
       best_moves = LEAST(COALESCE(game_stats.best_moves, $4), $4)`,
    [userId, game, seconds, moves],
  );
}

export interface GameStats {
  game: GameKey;
  played: number;
  won: number;
  bestSeconds: number | null;
  bestMoves: number | null;
}

export async function getStats(userId: string): Promise<GameStats[]> {
  const rows = await query<{
    game: GameKey;
    played: number;
    won: number;
    best_seconds: number | null;
    best_moves: number | null;
  }>("SELECT game, played, won, best_seconds, best_moves FROM game_stats WHERE user_id = $1", [userId]);
  return GAME_KEYS.map((game) => {
    const r = rows.find((x) => x.game === game);
    return {
      game,
      played: r?.played ?? 0,
      won: r?.won ?? 0,
      bestSeconds: r?.best_seconds ?? null,
      bestMoves: r?.best_moves ?? null,
    };
  });
}
