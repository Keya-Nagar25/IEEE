import type { Metadata } from "next";
import Link from "next/link";
import { formatScore } from "@/lib/format";
import { getRanking } from "@/lib/scoring";
import { getSettings } from "@/lib/settings";
import VisibilityToggles from "./VisibilityToggles";

export const metadata: Metadata = { title: "Leaderboard" };
export const dynamic = "force-dynamic";

export default async function AdminLeaderboardPage() {
  const [settings, { teams }] = await Promise.all([getSettings(), getRanking()]);
  const ranked = teams.filter((t) => t.rank != null);

  return (
    <>
      <h1 className="admin-h1">
        Publish the <em>leaderboard</em>
      </h1>
      <p className="admin-sub">
        Off by default. Flip it on when judging is done — every open leaderboard and team dashboard updates within a second
        or two. You can show ranks only, or ranks with scores (plan decision 5).
      </p>

      <div className="grid-2 admin-section" style={{ alignItems: "start" }}>
        <section className="panel">
          <div className="panel-title">Visibility</div>
          <VisibilityToggles leaderboardVisible={settings.leaderboardVisible} scoresVisible={settings.scoresVisible} />
          <p className="form-note" style={{ marginTop: 14 }}>
            Public page: <Link href="/leaderboard" target="_blank" style={{ textDecoration: "underline" }}>/leaderboard</Link>
          </p>
        </section>

        <section className="panel">
          <div className="panel-title">
            What the public sees
            <span className={`pill ${settings.leaderboardVisible ? "pill--ok" : "pill--idle"}`}>
              {settings.leaderboardVisible ? "Published" : "Hidden"}
            </span>
          </div>
          {ranked.length ? (
            <ol className="status-list">
              {ranked.slice(0, 10).map((t) => (
                <li key={t.id}>
                  <span>
                    <span className="mono muted">{String(t.rank).padStart(2, "0")}</span> {t.name}
                    {t.githubStatus === "flagged" && <span className="pill pill--bad" style={{ marginLeft: 8 }}>flagged</span>}
                  </span>
                  <span className="mono">{settings.scoresVisible ? formatScore(t.score) : "score hidden"}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="form-note">No scores imported yet — the public page would list teams without ranks.</p>
          )}
        </section>
      </div>
    </>
  );
}
