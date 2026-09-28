import type { Metadata } from "next";
import { getCriteria } from "@/lib/criteria";
import { db } from "@/lib/db";
import { formatScore, formatTime } from "@/lib/format";
import { getRanking } from "@/lib/scoring";
import CriteriaEditor from "./CriteriaEditor";
import ScoreImporter from "./ScoreImporter";

export const metadata: Metadata = { title: "Scores" };
export const dynamic = "force-dynamic";

export default async function ScoresPage() {
  const sql = db();
  const [criteria, { teams: ranking }, teams, [stats]] = await Promise.all([
    getCriteria(),
    getRanking({ includeDisqualified: true }),
    sql<{ team_number: number; name: string }[]>`
      select team_number, name from teams where submission_status <> 'disqualified' order by team_number`,
    sql<{ scores: number; judges: number }[]>`
      select count(*)::int as scores, count(distinct judge)::int as judges from scores`,
  ]);

  return (
    <>
      <h1 className="admin-h1">
        Judging <em>scores</em>
      </h1>
      <p className="admin-sub">
        Judges score on paper → someone types the sheets into the Excel template → upload it here. Each judge&rsquo;s row
        overwrites only their own earlier scores for that team, so you can import sheets as they come in. {stats.scores} scores
        from {stats.judges} judge{stats.judges === 1 ? "" : "s"} so far.
      </p>

      <div className="grid-2 admin-section" style={{ alignItems: "start" }}>
        <section className="panel">
          <div className="panel-title">Criteria &amp; weights</div>
          <CriteriaEditor initial={criteria} />
        </section>
        <section className="panel">
          <div className="panel-title">Import scores</div>
          <ScoreImporter criteria={criteria} teams={teams.map((t) => ({ teamNumber: t.team_number, name: t.name }))} />
        </section>
      </div>

      <section className="admin-section">
        <h2>Computed ranking (organizer view — includes flags and disqualified teams)</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Team</th>
                <th className="num">Score / 10</th>
                <th className="num">Criteria scored</th>
                <th>Submitted</th>
                <th>GitHub</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((t) => (
                <tr key={t.id} style={{ opacity: t.status === "disqualified" ? 0.5 : 1 }}>
                  <td className="mono">{t.rank ?? "—"}</td>
                  <td>
                    <span className="mono muted">#{t.teamNumber}</span> {t.name}
                    {t.status === "disqualified" && <span className="pill pill--bad" style={{ marginLeft: 8 }}>disqualified</span>}
                  </td>
                  <td className="num mono">{formatScore(t.score)}</td>
                  <td className="num mono">
                    {t.criteriaScored}/{criteria.length}
                    {t.score != null && t.criteriaScored < criteria.length && (
                      <span className="pill pill--warn" style={{ marginLeft: 6 }}>incomplete</span>
                    )}
                  </td>
                  <td className="mono">{t.submittedAt ? formatTime(t.submittedAt) : "—"}</td>
                  <td>
                    {t.githubStatus === "flagged" ? (
                      <span className="pill pill--bad">flagged</span>
                    ) : t.githubStatus === "review" ? (
                      <span className="pill pill--warn">review</span>
                    ) : t.githubStatus === "clean" ? (
                      <span className="pill pill--ok">clean</span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {!ranking.length && (
                <tr>
                  <td colSpan={6} className="muted">
                    No teams yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
