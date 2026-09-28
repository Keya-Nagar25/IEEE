import { db } from "@/lib/db";
import { parseRepoUrl } from "@/lib/github";
import { fail, ok, readJsonBody } from "@/lib/http";
import { getTeamSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export async function POST(req: Request) {
  try {
    const session = await getTeamSession();
    if (!session) return fail(401, "Your session expired. Log in again.");
    const body = await readJsonBody<{ url?: unknown }>(req);
    if (!body) return fail(400, "Bad request.");

    const parsed = parseRepoUrl(String(body.url ?? ""));
    if (!parsed) return fail(400, "Paste the repo link, like https://github.com/your-team/project.");

    const { submissionDeadline } = await getSettings();
    if (Date.now() >= Date.parse(submissionDeadline)) return fail(403, "The submission deadline has passed.");

    const sql = db();
    const rows = await sql`
      update teams set github_repo_url = ${parsed.url}, github_status = null, github_note = null,
        first_commit_at = null, github_checked_at = null
      where id = ${session.teamId} and submission_status = 'building'
      returning id`;
    if (!rows.length) {
      const [t] = await sql<{ submission_status: string }[]>`select submission_status from teams where id = ${session.teamId}`;
      if (!t) return fail(401, "Team not found.");
      return fail(409, t.submission_status === "submitted"
        ? "You've already submitted. Ask an organizer if the repo link needs to change."
        : "This team can't change its submission.");
    }
    return ok({ url: parsed.url });
  } catch (err) {
    console.error("[team repo]", err);
    return fail(500, "Couldn't save the repo link. Try again.");
  }
}
