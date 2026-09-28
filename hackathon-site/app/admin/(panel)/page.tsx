import Link from "next/link";
import { db } from "@/lib/db";
import { mailConfigured } from "@/lib/mail";
import { getSettings } from "@/lib/settings";
import DangerZone from "./DangerZone";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const sql = db();
  const [[k], settings] = await Promise.all([
    sql<
      {
        teams: number;
        submitted: number;
        building: number;
        disqualified: number;
        flagged: number;
        review: number;
        scored: number;
        sent: number;
      }[]
    >`
      select count(*)::int as teams,
        count(*) filter (where submission_status = 'submitted')::int as submitted,
        count(*) filter (where submission_status = 'building')::int as building,
        count(*) filter (where submission_status = 'disqualified')::int as disqualified,
        count(*) filter (where github_status = 'flagged')::int as flagged,
        count(*) filter (where github_status = 'review')::int as review,
        (select count(distinct team_id)::int from scores) as scored,
        count(*) filter (where credentials_sent_at is not null)::int as sent
      from teams`,
    getSettings(),
  ]);

  const checks = [
    { label: "Database", ok: true, note: "Connected" },
    {
      label: "Live leaderboard (Realtime)",
      ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      note: "Falls back to 30s polling",
    },
    { label: "GitHub token", ok: Boolean(process.env.GITHUB_TOKEN), note: "60 checks/hour without it" },
    { label: "Credential emails (SMTP)", ok: mailConfigured(), note: "Use the print sheet instead" },
  ];

  const kpis = [
    { label: "Teams", value: k.teams },
    { label: "Submitted", value: k.submitted },
    { label: "Still building", value: k.building },
    { label: "Flagged repos", value: k.flagged },
    { label: "Repos to review", value: k.review },
    { label: "Teams scored", value: k.scored },
    { label: "Credentials emailed", value: k.sent },
    { label: "Disqualified", value: k.disqualified },
  ];

  return (
    <>
      <h1 className="admin-h1">
        Event <em>overview</em>
      </h1>
      <p className="admin-sub">
        Everything here writes straight to Supabase. If the site ever misbehaves on event day, the Supabase table editor
        is the fallback — it&rsquo;s the source of truth.
      </p>

      <div className="kpis">
        {kpis.map((x) => (
          <div className="kpi" key={x.label}>
            <div className="kpi-value">{x.value}</div>
            <div className="kpi-label">{x.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2 admin-section" style={{ alignItems: "start" }}>
        <section className="panel">
          <div className="panel-title">Event settings</div>
          <SettingsForm initial={settings} />
        </section>

        <div className="stack">
          <section className="panel">
            <div className="panel-title">Setup status</div>
            <ul className="status-list">
              {checks.map((c) => (
                <li key={c.label}>
                  <span>{c.label}</span>
                  <span className={`pill ${c.ok ? "pill--ok" : "pill--warn"}`}>{c.ok ? "Ready" : c.note}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel">
            <div className="panel-title">Event-day flow</div>
            <ol className="steps">
              <li>
                <Link href="/admin/import">Import the Unstop CSV</Link> — creates teams and login codes.
              </li>
              <li>
                <Link href="/admin/send-credentials">Email credentials</Link> the night before, and{" "}
                <Link href="/admin/print">print chits</Link> for check-in.
              </li>
              <li>Reveal the theme at kick-off (left).</li>
              <li>
                Watch submissions and GitHub flags in <Link href="/admin/teams">Teams</Link>.
              </li>
              <li>
                Import judges&rsquo; sheets in <Link href="/admin/scores">Scores</Link>, then{" "}
                <Link href="/admin/leaderboard">publish the leaderboard</Link>.
              </li>
            </ol>
          </section>

          <DangerZone />
        </div>
      </div>
    </>
  );
}
