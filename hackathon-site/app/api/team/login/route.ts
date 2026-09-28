import { verifyCode } from "@/lib/codes";
import { db } from "@/lib/db";
import { clientInfo, fail, ok, readJsonBody } from "@/lib/http";
import { startSession } from "@/lib/session";

const MAX_ATTEMPTS = 5; // then locked for 10 minutes (plan §7)

export async function POST(req: Request) {
  try {
    const body = await readJsonBody<{ teamNumber?: unknown; code?: unknown }>(req);
    if (!body) return fail(400, "Bad request.");
    const teamNumber = Number(String(body.teamNumber ?? "").trim());
    const code = String(body.code ?? "");
    if (!Number.isInteger(teamNumber) || teamNumber <= 0 || code.replace(/[^A-Za-z0-9]/g, "").length < 6) {
      return fail(400, "Enter your team number and the login code from your chit.");
    }

    const sql = db();
    const { ip, userAgent } = clientInfo(req);
    const log = (success: boolean, teamId: string | null) =>
      sql`insert into login_events (kind, team_id, identifier, success, ip, user_agent)
          values ('team', ${teamId}, ${String(teamNumber)}, ${success}, ${ip}, ${userAgent})`;

    const [team] = await sql<{ id: string; login_code_hash: string; locked_until: Date | null }[]>`
      select id, login_code_hash, locked_until from teams where team_number = ${teamNumber}`;

    if (!team) {
      await log(false, null);
      return fail(401, "That team number and code don't match. Check your chit or ask an organizer.");
    }

    if (team.locked_until && team.locked_until.getTime() > Date.now()) {
      await log(false, team.id);
      const mins = Math.ceil((team.locked_until.getTime() - Date.now()) / 60000);
      return fail(429, `Too many wrong attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}, or ask an organizer.`);
    }

    if (!verifyCode(code, team.login_code_hash)) {
      const [after] = await sql<{ failed_attempts: number; locked_until: Date | null }[]>`
        update teams set
          failed_attempts = case when failed_attempts + 1 >= ${MAX_ATTEMPTS} then 0 else failed_attempts + 1 end,
          locked_until    = case when failed_attempts + 1 >= ${MAX_ATTEMPTS} then now() + interval '10 minutes' else null end
        where id = ${team.id}
        returning failed_attempts, locked_until`;
      await log(false, team.id);
      if (after.locked_until) return fail(429, "Too many wrong attempts. This team is locked for 10 minutes.");
      const left = MAX_ATTEMPTS - after.failed_attempts;
      return fail(401, `That code isn't right. ${left} attempt${left === 1 ? "" : "s"} left before a 10-minute lock.`);
    }

    await sql`update teams set failed_attempts = 0, locked_until = null where id = ${team.id}`;
    await log(true, team.id);
    await startSession("team", team.id);
    return ok();
  } catch (err) {
    console.error("[team login]", err);
    return fail(500, "Login is having trouble. Try again in a moment, or ask an organizer.");
  }
}
