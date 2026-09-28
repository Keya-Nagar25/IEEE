import { newCredential } from "@/lib/codes";
import { db } from "@/lib/db";
import { event } from "@/lib/event";
import { adminRoute, fail, ok } from "@/lib/http";

type Member = { name: string; email: string };
type IncomingTeam = {
  teamNumber?: number | null;
  name?: string;
  leaderName?: string;
  leaderEmail?: string;
  college?: string;
  members?: Member[];
};
type Body = { teams?: IncomingTeam[]; dryRun?: boolean; update?: string[] };

export type ImportRowStatus = "new" | "existing" | "duplicate" | "invalid";

const s = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

function clean(t: IncomingTeam) {
  const n = t.teamNumber == null || (t.teamNumber as unknown) === "" ? null : Number(t.teamNumber);
  return {
    teamNumber: n != null && Number.isInteger(n) && n > 0 && n < 1_000_000 ? n : n == null ? null : NaN,
    name: s(t.name, 120),
    leaderName: s(t.leaderName),
    leaderEmail: s(t.leaderEmail).toLowerCase(),
    college: s(t.college),
    members: (Array.isArray(t.members) ? t.members : [])
      .slice(0, 12)
      .map((m) => ({ name: s(m?.name), email: s(m?.email).toLowerCase() }))
      .filter((m) => m.name || m.email),
  };
}

/**
 * Plan §8: one-way import from the Unstop CSV (parsed in the browser).
 * dryRun → classification for the preview. Otherwise creates new teams with fresh
 * login codes, optionally refreshes selected existing teams, never touches codes
 * or numbers of existing teams, and returns the plaintext codes once for printing.
 */
export const POST = adminRoute<Body>(async (_admin, body) => {
  if (!Array.isArray(body.teams) || !body.teams.length) return fail(400, "No teams in the upload.");
  if (body.teams.length > 1000) return fail(400, "That's more than 1,000 teams — split the file.");
  const teams = body.teams.map(clean);
  const updateKeys = new Set((body.update ?? []).map((k) => String(k).toLowerCase()));

  const run = async (sql: ReturnType<typeof db>) => {
    const existing = await sql<{ id: string; team_number: number; key: string }[]>`
      select id, team_number, lower(name) as key from teams`;
    const byName = new Map(existing.map((e) => [e.key, e]));
    const taken = new Set(existing.map((e) => e.team_number));
    const seenNames = new Set<string>();
    const fileNumbers = new Set<number>();

    const rows = teams.map((t, index) => {
      const key = t.name.toLowerCase();
      const base = { index, name: t.name, leaderName: t.leaderName, leaderEmail: t.leaderEmail, memberCount: t.members.length };
      if (!t.name) return { ...base, status: "invalid" as ImportRowStatus, reason: "Missing team name", teamNumber: null };
      if (seenNames.has(key)) return { ...base, status: "duplicate" as ImportRowStatus, reason: "Appears earlier in this file", teamNumber: null };
      seenNames.add(key);
      const hit = byName.get(key);
      if (hit) return { ...base, status: "existing" as ImportRowStatus, reason: "", teamNumber: hit.team_number };
      if (Number.isNaN(t.teamNumber)) return { ...base, status: "invalid" as ImportRowStatus, reason: "Team number isn't a whole number", teamNumber: null };
      if (t.teamNumber != null && (taken.has(t.teamNumber) || fileNumbers.has(t.teamNumber))) {
        return { ...base, status: "invalid" as ImportRowStatus, reason: `Team number ${t.teamNumber} is already used`, teamNumber: null };
      }
      if (t.teamNumber != null) fileNumbers.add(t.teamNumber);
      return { ...base, status: "new" as ImportRowStatus, reason: "", teamNumber: t.teamNumber };
    });
    return { rows, byName, taken, fileNumbers };
  };

  const summarize = (rows: { status: ImportRowStatus }[]) => ({
    found: rows.length,
    new: rows.filter((r) => r.status === "new").length,
    existing: rows.filter((r) => r.status === "existing").length,
    duplicate: rows.filter((r) => r.status === "duplicate").length,
    invalid: rows.filter((r) => r.status === "invalid").length,
  });

  if (body.dryRun) {
    const { rows } = await run(db());
    return ok({ rows, summary: summarize(rows) });
  }

  const result = await db().begin(async (sql) => {
    await sql`lock table teams in share row exclusive mode`; // serialize concurrent imports
    const { rows, byName, taken, fileNumbers } = await run(sql as unknown as ReturnType<typeof db>);

    let next = Math.max(event.teamNumberStart - 1, ...taken, 0) + 1;
    const nextFree = () => {
      while (taken.has(next) || fileNumbers.has(next)) next++;
      return next++;
    };

    // New teams: two bulk statements regardless of team count.
    const fresh = rows
      .filter((r) => r.status === "new")
      .map((r) => {
        const t = teams[r.index];
        return { t, teamNumber: t.teamNumber ?? nextFree(), cred: newCredential() };
      });
    if (fresh.length) {
      const inserted = await sql<{ id: string; team_number: number }[]>`
        insert into teams ${sql(
          fresh.map(({ t, teamNumber, cred }) => ({
            team_number: teamNumber,
            name: t.name,
            leader_name: t.leaderName,
            leader_email: t.leaderEmail,
            college: t.college,
            login_code_hash: cred.hash,
            login_code_enc: cred.enc,
          })),
        )}
        returning id, team_number`;
      const idByNumber = new Map(inserted.map((r) => [r.team_number, r.id]));
      const members = fresh.flatMap(({ t, teamNumber }) =>
        t.members.map((m) => ({ team_id: idByNumber.get(teamNumber)!, name: m.name || m.email, email: m.email })),
      );
      if (members.length) await sql`insert into members ${sql(members)}`;
    }

    // Existing teams the admin ticked "update" for: refresh leader/college/members only.
    let updated = 0;
    for (const row of rows) {
      const t = teams[row.index];
      if (row.status !== "existing" || !updateKeys.has(t.name.toLowerCase())) continue;
      const id = byName.get(t.name.toLowerCase())!.id;
      await sql`update teams set leader_name = ${t.leaderName}, leader_email = ${t.leaderEmail}, college = ${t.college} where id = ${id}`;
      await sql`delete from members where team_id = ${id}`;
      if (t.members.length) {
        await sql`insert into members ${sql(t.members.map((m) => ({ team_id: id, name: m.name || m.email, email: m.email })))}`;
      }
      updated++;
    }

    const created = fresh
      .map(({ t, teamNumber, cred }) => ({ teamNumber, name: t.name, leaderName: t.leaderName, leaderEmail: t.leaderEmail, code: cred.code }))
      .sort((a, b) => a.teamNumber - b.teamNumber);
    return { created, updated, summary: summarize(rows) };
  });

  return ok(result);
});
