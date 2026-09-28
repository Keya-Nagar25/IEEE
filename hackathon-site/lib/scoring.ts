import "server-only";
import { db, iso } from "./db";

export type RankedTeam = {
  id: string;
  rank: number | null; // null = not scored yet
  teamNumber: number;
  name: string;
  status: "building" | "submitted" | "disqualified";
  submittedAt: string | null;
  score: number | null; // 0–10, weighted
  criteriaScored: number;
  githubStatus: "clean" | "review" | "flagged" | null;
};

/**
 * team_score = Σ (average judge score for criterion × criterion weight %)   (plan §9)
 * Ranks: highest score first, ties broken by earlier submission. Unscored teams
 * are listed after ranked ones with rank = null. Disqualified teams are excluded
 * unless `includeDisqualified` (admin views).
 */
export async function getRanking({ includeDisqualified = false } = {}): Promise<{
  teams: RankedTeam[];
  criteriaCount: number;
}> {
  const sql = db();
  const [rows, [{ n }]] = await Promise.all([
    sql<
      {
        id: string;
        team_number: number;
        name: string;
        submission_status: RankedTeam["status"];
        submitted_at: Date | null;
        github_status: RankedTeam["githubStatus"];
        score: number | null;
        criteria_scored: number;
      }[]
    >`
      with per_criterion as (
        select s.team_id, s.criterion_id, avg(s.value) as v
        from scores s group by s.team_id, s.criterion_id
      ),
      per_team as (
        select pc.team_id, sum(pc.v * c.weight / 100.0)::float8 as score, count(*)::int as criteria_scored
        from per_criterion pc join criteria c on c.id = pc.criterion_id
        group by pc.team_id
      )
      select t.id, t.team_number, t.name, t.submission_status, t.submitted_at, t.github_status,
             pt.score, coalesce(pt.criteria_scored, 0) as criteria_scored
      from teams t left join per_team pt on pt.team_id = t.id
      where ${includeDisqualified} or t.submission_status <> 'disqualified'
      order by (t.submission_status = 'disqualified'), pt.score desc nulls last,
               t.submitted_at asc nulls last, t.team_number asc`,
    sql<{ n: number }[]>`select count(*)::int as n from criteria`,
  ]);

  let next = 1;
  const teams = rows.map((r) => ({
    id: r.id,
    rank: r.score != null && r.submission_status !== "disqualified" ? next++ : null,
    teamNumber: r.team_number,
    name: r.name,
    status: r.submission_status,
    submittedAt: iso(r.submitted_at),
    score: r.score == null ? null : Math.round(r.score * 100) / 100,
    criteriaScored: r.criteria_scored,
    githubStatus: r.github_status,
  }));
  return { teams, criteriaCount: n };
}

export async function getLiveVersion() {
  const [row] = await db()<{ bumped_at: Date }[]>`select bumped_at from live_signals where key = 'leaderboard'`;
  return iso(row?.bumped_at) ?? "0";
}
