import { apiUser } from "@/lib/apiAuth";
import { isGameKey, recordStarted, recordWin } from "@/lib/gameData";

/*
 * POST { event: "started" }                       -> one more game played
 * POST { event: "won", seconds: n, moves: n }     -> a win, keeping the best time and move count
 * The numbers come from the player's browser, so treat them as honest-player stats, not a leaderboard.
 */

type Ctx = { params: Promise<{ game: string }> };

const count = (n: unknown) => (Number.isInteger(n) && (n as number) >= 0 && (n as number) < 10_000_000 ? (n as number) : null);

export async function POST(req: Request, ctx: Ctx) {
  const { game } = await ctx.params;
  if (!isGameKey(game)) return Response.json({ error: "Unknown game." }, { status: 404 });
  const user = await apiUser(req, true);
  if (user instanceof Response) return user;

  let body: { event?: unknown; seconds?: unknown; moves?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (body.event === "started") {
    await recordStarted(user.id, game);
  } else if (body.event === "won") {
    const seconds = count(body.seconds);
    const moves = count(body.moves);
    if (seconds === null || moves === null) return Response.json({ error: "Bad numbers." }, { status: 400 });
    await recordWin(user.id, game, seconds, moves);
  } else {
    return Response.json({ error: "Unknown event." }, { status: 400 });
  }
  return new Response(null, { status: 204 });
}
