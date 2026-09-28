import { decryptCode } from "@/lib/codes";
import { db } from "@/lib/db";
import { adminRoute, fail, ok } from "@/lib/http";
import { mailConfigured, sendCredentials } from "@/lib/mail";

const BATCH = 8; // small batches keep each request well inside the serverless time limit

/**
 * Sends one batch of credential emails. The admin page calls this repeatedly until
 * `remaining` hits 0, showing progress. Each sent team is stamped so re-running
 * never double-sends.
 */
export const POST = adminRoute<{ ids?: string[] }>(async (_admin, body) => {
  if (!mailConfigured()) return fail(400, "Email isn't configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS.");
  const sql = db();
  const ids = Array.isArray(body.ids) ? body.ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id)) : null;

  type T = { id: string; team_number: number; name: string; leader_name: string; leader_email: string; login_code_enc: string };
  const batch = ids
    ? await sql<T[]>`select id, team_number, name, leader_name, leader_email, login_code_enc from teams
                     where id = any(${ids}::uuid[]) and leader_email <> '' order by team_number limit ${BATCH}`
    : await sql<T[]>`select id, team_number, name, leader_name, leader_email, login_code_enc from teams
                     where credentials_sent_at is null and leader_email <> '' order by team_number limit ${BATCH}`;

  const sent: number[] = [];
  const failed: { teamNumber: number; error: string }[] = [];
  for (const t of batch) {
    const code = decryptCode(t.login_code_enc);
    if (!code) {
      failed.push({ teamNumber: t.team_number, error: "Code can't be decrypted (CODE_SECRET changed?) — regenerate it." });
      continue;
    }
    try {
      await sendCredentials({ email: t.leader_email, leaderName: t.leader_name, teamName: t.name, teamNumber: t.team_number, code });
      await sql`update teams set credentials_sent_at = now() where id = ${t.id}`;
      sent.push(t.team_number);
    } catch (err) {
      failed.push({ teamNumber: t.team_number, error: (err as Error).message.slice(0, 200) });
    }
  }

  const [{ remaining }] = await sql<{ remaining: number }[]>`
    select count(*)::int as remaining from teams where credentials_sent_at is null and leader_email <> ''`;
  return ok({ sent, failed, remaining });
});
