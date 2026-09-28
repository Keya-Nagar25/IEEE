import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { adminRoute, fail, ok } from "@/lib/http";

/** Wipes dry-run data (plan §14, step 7.5). Requires typing DELETE in the UI. */
export const POST = adminRoute<{ scope?: string; confirm?: string }>(async (_admin, body) => {
  if (body.confirm !== "DELETE") return fail(400, 'Type "DELETE" to confirm.');
  const sql = db();
  if (body.scope === "scores") {
    await sql`delete from scores`;
  } else if (body.scope === "everything") {
    await sql.begin(async (tx) => {
      await tx`delete from teams`; // cascades to members and scores
      await tx`delete from login_events where kind = 'team'`;
      await tx`update settings set value = 'false', updated_at = now()
               where key in ('leaderboard_visible', 'scores_visible', 'theme_revealed')`;
    });
    ["/", "/about", "/rules", "/schedule", "/leaderboard"].forEach((p) => revalidatePath(p));
  } else {
    return fail(400, "Unknown scope.");
  }
  return ok();
});
