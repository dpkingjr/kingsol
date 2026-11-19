import { apiUser } from "@/lib/apiAuth";
import { deleteSave } from "@/lib/gameData";

/** DELETE: remove all of the signed-in player's saved games (auto-save switched off). */
export async function DELETE(req: Request) {
  const user = await apiUser(req, true);
  if (user instanceof Response) return user;
  await deleteSave(user.id);
  return new Response(null, { status: 204 });
}
