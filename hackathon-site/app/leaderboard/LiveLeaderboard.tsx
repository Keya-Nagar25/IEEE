"use client";

import { useEffect, useState } from "react";
import { useLiveVersion } from "@/components/useLiveVersion";
import { formatScore, formatTime } from "@/lib/format";

type Row = {
  rank: number | null;
  teamNumber: number;
  name: string;
  status: "building" | "submitted";
  submittedAt: string | null;
  score?: number | null;
};

type Data =
  | { visible: false }
  | { visible: true; scoresVisible: boolean; teams: Row[]; totals: { teams: number; submitted: number } };

export default function LiveLeaderboard() {
  const { version, mode } = useLiveVersion();
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const v = attempt ? `${version}-r${attempt}` : version;
    fetch(`/api/leaderboard${v ? `?v=${encodeURIComponent(v)}` : ""}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: Data) => {
        if (cancelled) return;
        setData(d);
        setFailed(false);
        setUpdatedAt(new Date().toISOString());
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        retry = setTimeout(() => setAttempt((n) => n + 1), 10_000);
      });
    return () => {
      cancelled = true;
      clearTimeout(retry);
    };
  }, [version, attempt]);

  if (!data) {
    return (
      <div className="panel board-empty" style={{ marginTop: 48 }}>
        <p>{failed ? "Couldn’t reach the leaderboard. Retrying automatically…" : "Loading the leaderboard…"}</p>
      </div>
    );
  }

  if (!data.visible) {
    return (
      <div className="panel board-empty" style={{ marginTop: 48 }}>
        <h2 className="page-title">
          Under <em>wraps</em>
        </h2>
        <p>Rankings go live after judging. Keep this page open — it will update the moment organizers flip the switch.</p>
      </div>
    );
  }

  const { teams, scoresVisible, totals } = data;

  return (
    <>
      <div className="board-head">
        <div className="board-meta">
          <span className={`pill ${mode === "live" ? "pill--ok pill--live" : "pill--idle"}`}>
            {mode === "live" ? "Live" : mode === "polling" ? "Auto-refresh" : "Connecting"}
          </span>
          {updatedAt && <span className="mono">Updated {formatTime(updatedAt)}</span>}
          {failed && <span className="pill pill--warn">Reconnecting</span>}
        </div>
        <div className="board-meta">
          <span className="mono">
            {totals.submitted}/{totals.teams}
          </span>
          submitted
        </div>
      </div>

      {teams.length === 0 ? (
        <div className="panel board-empty">
          <p>No teams yet.</p>
        </div>
      ) : (
        <ol className="board">
          {teams.map((t, i) => (
            <li
              key={t.teamNumber}
              className={`board-row${t.rank && t.rank <= 3 ? ` board-row--${t.rank}` : ""}`}
              style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
            >
              <span className={`board-rank${t.rank ? "" : " board-rank--none"}`}>
                {t.rank ? String(t.rank).padStart(2, "0") : "—"}
              </span>
              <div style={{ minWidth: 0 }}>
                <div className="board-name">{t.name}</div>
                <div className="board-sub mono">Team #{t.teamNumber}</div>
              </div>
              <div className="board-score">
                {scoresVisible && t.score != null ? (
                  <>
                    {formatScore(t.score ?? null)}
                    <small>/10</small>
                    <div className="score-bar" aria-hidden="true">
                      <span style={{ width: `${((t.score ?? 0) / 10) * 100}%` }} />
                    </div>
                  </>
                ) : (
                  <span className="muted" style={{ fontSize: 14 }}>
                    {t.rank ? "Ranked" : "Awaiting score"}
                  </span>
                )}
              </div>
              <div className="board-status">
                <span className={`pill ${t.status === "submitted" ? "pill--ok" : "pill--idle"}`}>
                  {t.status === "submitted" ? "Submitted" : "Building"}
                </span>
                <span className="board-sub mono">{t.submittedAt ? formatTime(t.submittedAt) : "—"}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
