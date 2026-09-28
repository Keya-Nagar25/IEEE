import { newCredential } from "@/lib/codes";
import { db } from "@/lib/db";
import { checkTeamRepo } from "@/lib/github";
import { adminRoute, fail, ok } from "@/lib/http";

const ACTIONS = [
  "recheck-github",
  "disqualify",
  "reinstate",
  "unlock",
  "reset-submission",
  "regenerate-code",
  "delete",
] as const;
type Action = (typeof ACTIONS)[number];

const UUID = /^[0-9a-f-]{36}$/i;

export const POST = adminRoute<{ action?: string; ids?: string[] }>(async (_admin, body) => {
  const action = body.action as Action;
  if (!ACTIONS.includes(action)) return fail(400, "Unknown action.");
  const ids = (Array.isArray(body.ids) ? body.ids : []).filter((id) => typeof id === "string" && UUID.test(id));
  if (!ids.length) return fail(400, "No teams selected.");
  const sql = db();

  switch (action) {
    case "recheck-github": {
      if (ids.length > 15) return fail(400, "Re-check at most 15 teams per request.");
      const results: Record<string, unknown> = {};
      // Small concurrency keeps us polite to GitHub and inside the function time limit.
      for (let i = 0; i < ids.length; i += 3) {
        const chunk = ids.slice(i, i + 3);
        const out = await Promise.all(chunk.map((id) => checkTeamRepo(id)));
        chunk.forEach((id, j) => (results[id] = out[j]));
      }
      return ok({ results });
    }
    case "disqualify":
      await sql`update teams set submission_status = 'disqualified' where id = any(${ids}::uuid[])`;
      return ok();
    case "reinstate":
      await sql`update teams set submission_status = case when submitted_at is null then 'building' else 'submitted' end
                where id = any(${ids}::uuid[]) and submission_status = 'disqualified'`;
      return ok();
    case "unlock":
      await sql`update teams set failed_attempts = 0, locked_until = null where id = any(${ids}::uuid[])`;
      return ok();
    case "reset-submission":
      await sql`update teams set submitted_at = null, submission_status = 'building'
                where id = any(${ids}::uuid[]) and submission_status = 'submitted'`;
      return ok();
    case "regenerate-code": {
      if (ids.length !== 1) return fail(400, "Regenerate one code at a time.");
      const cred = newCredential();
      await sql`update teams set login_code_hash = ${cred.hash}, login_code_enc = ${cred.enc},
                  credentials_sent_at = null, failed_attempts = 0, locked_until = null
                where id = ${ids[0]}`;
      return ok({ code: cred.code });
    }
    case "delete":
      await sql`delete from teams where id = any(${ids}::uuid[])`;
      return ok();
  }
});
