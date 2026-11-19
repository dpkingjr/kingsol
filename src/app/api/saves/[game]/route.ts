import { apiUser } from "@/lib/apiAuth";
import { MAX_SAVE_BYTES, deleteSave, getSave, isGameKey, putSave } from "@/lib/gameData";

/*
 * The signed-in player's auto-save for one game.
 *   GET     -> { save: SavedGame | null }
 *   PUT     -> store the JSON body (POST does the same, for navigator.sendBeacon on page hide)
 *   DELETE  -> remove it
 */

type Ctx = { params: Promise<{ game: string }> };

async function resolve(req: Request, ctx: Ctx, mutating: boolean) {
  const { game } = await ctx.params;
  if (!isGameKey(game)) return Response.json({ error: "Unknown game." }, { status: 404 });
  const user = await apiUser(req, mutating);
  if (user instanceof Response) return user;
  return { user, game };
}

export async function GET(req: Request, ctx: Ctx) {
  const r = await resolve(req, ctx, false);
  if (r instanceof Response) return r;
  return Response.json(
    { save: await getSave(r.user.id, r.game) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

async function store(req: Request, ctx: Ctx) {
  const r = await resolve(req, ctx, true);
  if (r instanceof Response) return r;
  const text = await req.text();
  if (text.length > MAX_SAVE_BYTES) return Response.json({ error: "Save is too large." }, { status: 413 });
  let body: { seed?: unknown; history?: unknown; initial?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (typeof body.seed !== "number" || !Array.isArray(body.history) || body.history.length === 0 || !body.initial) {
    return Response.json({ error: "Not a saved game." }, { status: 400 });
  }
  await putSave(r.user.id, r.game, text);
  return new Response(null, { status: 204 });
}

export const PUT = store;
export const POST = store;

export async function DELETE(req: Request, ctx: Ctx) {
  const r = await resolve(req, ctx, true);
  if (r instanceof Response) return r;
  await deleteSave(r.user.id, r.game);
  return new Response(null, { status: 204 });
}
