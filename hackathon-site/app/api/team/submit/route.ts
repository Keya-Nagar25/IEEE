import { after } from "next/server";
import { db, iso } from "@/lib/db";
import { checkTeamRepo } from "@/lib/github";
import { fail, ok, readJsonBody } from "@/lib/http";
import { getTeamSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";

/**
 * Plan §10: the write is synchronous and instant; the GitHub first-commit check runs
 * after the response is sent, so a deadline rush never waits on GitHub.
 */
export async function POST(req: Request) {
  try {
    const session = await getTeamSession();
    if (!session) return fail(401, "Your session expired. Log in again.");
    if ((await readJsonBody(req)) === null) return fail(400, "Bad request.");

    const { submissionDeadline } = await getSettings();
    if (Date.now() >= Date.parse(submissionDeadline)) return fail(403, "The submission deadline has passed.");

    const sql = db();
    const [row] = await sql<{ submitted_at: Date }[]>`
      update teams set submitted_at = now(), submission_status = 'submitted'
      where id = ${session.teamId} and submission_status = 'building' and github_repo_url is not null
      returning submitted_at`;

    if (!row) {
      const [t] = await sql<{ submission_status: string; github_repo_url: string | null }[]>`
        select submission_status, github_repo_url from teams where id = ${session.teamId}`;
      if (!t) return fail(401, "Team not found.");
      if (t.submission_status === "submitted") return fail(409, "Already submitted.");
      if (t.submission_status === "disqualified") return fail(403, "This team can't submit.");
      return fail(400, "Save your GitHub repo link first.");
    }

    after(() => checkTeamRepo(session.teamId));
    return ok({ submittedAt: iso(row.submitted_at) });
  } catch (err) {
    console.error("[team submit]", err);
    return fail(500, "Submission didn't go through. Try again — nothing was lost.");
  }
}
