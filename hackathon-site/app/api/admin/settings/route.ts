import { revalidatePath } from "next/cache";
import { adminRoute, fail, ok } from "@/lib/http";
import { getSettings, updateSettings, type Settings } from "@/lib/settings";

const PUBLIC_PAGES = ["/", "/about", "/rules", "/schedule", "/leaderboard"];

export const PUT = adminRoute<Partial<Settings>>(async (_admin, body) => {
  const patch: Partial<Settings> = {};

  for (const k of ["eventStart", "submissionDeadline"] as const) {
    if (body[k] === undefined) continue;
    const t = Date.parse(String(body[k]));
    if (Number.isNaN(t)) return fail(400, `Invalid date for ${k}.`);
    patch[k] = new Date(t).toISOString();
  }
  for (const k of ["leaderboardVisible", "scoresVisible", "themeRevealed"] as const) {
    if (body[k] === undefined) continue;
    if (typeof body[k] !== "boolean") return fail(400, `${k} must be true or false.`);
    patch[k] = body[k];
  }
  if (body.themeTitle !== undefined) patch.themeTitle = String(body.themeTitle).trim().slice(0, 140);
  if (body.themeDescription !== undefined) patch.themeDescription = String(body.themeDescription).trim().slice(0, 4000);

  const current = await getSettings();
  const start = patch.eventStart ?? current.eventStart;
  const end = patch.submissionDeadline ?? current.submissionDeadline;
  if (Date.parse(end) <= Date.parse(start)) return fail(400, "The submission deadline must be after the event start.");
  if ((patch.themeRevealed ?? current.themeRevealed) && !(patch.themeTitle ?? current.themeTitle)) {
    return fail(400, "Add a theme title before revealing it.");
  }

  await updateSettings(patch);
  PUBLIC_PAGES.forEach((p) => revalidatePath(p));
  return ok({ settings: await getSettings() });
});
