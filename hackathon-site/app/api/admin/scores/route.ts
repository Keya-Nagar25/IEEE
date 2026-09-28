import { getCriteria } from "@/lib/criteria";
import { db } from "@/lib/db";
import { adminRoute, fail, ok } from "@/lib/http";

type Row = { teamNumber?: unknown; judge?: unknown; values?: Record<string, unknown>; notes?: unknown };
type Body = { rows?: Row[]; dryRun?: boolean; replaceAll?: boolean };

/**
 * Plan §9: judges' paper sheets → Excel template → upload. The browser parses the
 * workbook (SheetJS) and sends rows keyed by criterion id. One score per
 * (team, criterion, judge); re-importing a judge's sheet overwrites their scores.
 */
export const POST = adminRoute<Body>(async (_admin, body) => {
  if (!Array.isArray(body.rows) || !body.rows.length) return fail(400, "No score rows found in the file.");
  if (body.rows.length > 5000) return fail(400, "Too many rows.");

  const sql = db();
  const [criteria, teams] = await Promise.all([
    getCriteria(),
    sql<{ id: string; team_number: number; name: string }[]>`select id, team_number, name from teams`,
  ]);
  const teamByNumber = new Map(teams.map((t) => [t.team_number, t]));
  const criterionIds = new Set(criteria.map((c) => c.id));

  const checked = body.rows.map((r, index) => {
    const teamNumber = Number(r.teamNumber);
    const team = Number.isInteger(teamNumber) ? teamByNumber.get(teamNumber) : undefined;
    const judge = String(r.judge ?? "").trim().slice(0, 80);
    const notes = String(r.notes ?? "").trim().slice(0, 1000);
    const values: { criterionId: string; value: number }[] = [];
    const problems: string[] = [];
    for (const [cid, raw] of Object.entries(r.values ?? {})) {
      if (!criterionIds.has(cid)) continue;
      if (raw === null || raw === undefined || raw === "") continue;
      const v = Number(raw);
      if (!Number.isFinite(v) || v < 0 || v > 10) problems.push(`${criteria.find((c) => c.id === cid)?.name}: "${raw}" is not 0–10`);
      else values.push({ criterionId: cid, value: Math.round(v * 100) / 100 });
    }
    if (!team) problems.unshift(`Team ${String(r.teamNumber ?? "?")} not found`);
    else if (!values.length && !problems.length) problems.push("No scores in this row");
    return { index, teamNumber, teamName: team?.name ?? "", teamId: team?.id ?? null, judge, notes, values, problems };
  });

  const valid = checked.filter((r) => r.teamId && !r.problems.length);
  const summary = {
    rows: checked.length,
    valid: valid.length,
    invalid: checked.length - valid.length,
    scores: valid.reduce((n, r) => n + r.values.length, 0),
    teams: new Set(valid.map((r) => r.teamId)).size,
  };

  if (body.dryRun) {
    return ok({
      summary,
      rows: checked.map(({ teamId: _teamId, ...r }) => r),
    });
  }
  if (!valid.length) return fail(400, "No valid rows to import.");

  const records = valid.flatMap((r) =>
    r.values.map((v) => ({ team_id: r.teamId!, criterion_id: v.criterionId, judge: r.judge, value: v.value, notes: r.notes })),
  );
  // Last row wins if the same team/criterion/judge appears twice in one file.
  const deduped = [...new Map(records.map((x) => [`${x.team_id}|${x.criterion_id}|${x.judge}`, x])).values()];

  await sql.begin(async (tx) => {
    if (body.replaceAll) await tx`delete from scores`;
    await tx`
      insert into scores ${tx(deduped)}
      on conflict (team_id, criterion_id, judge)
      do update set value = excluded.value, notes = excluded.notes, imported_at = now()`;
  });

  return ok({ summary, imported: deduped.length });
});
