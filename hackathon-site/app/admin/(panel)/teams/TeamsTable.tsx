"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { api } from "@/components/api";
import { downloadXlsx } from "@/components/sheets";
import type { AdminTeam } from "@/lib/admin-teams";
import { formatDateTime } from "@/lib/format";

const GH_PILL = { clean: "pill--ok", review: "pill--warn", flagged: "pill--bad" } as const;
const STATUS_PILL = { building: "pill--idle", submitted: "pill--ok", disqualified: "pill--bad" } as const;

type Filter = "all" | "building" | "submitted" | "disqualified" | "flagged" | "review" | "unchecked";

export default function TeamsTable({ teams }: { teams: AdminTeam[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [showCodes, setShowCodes] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return teams.filter((t) => {
      if (q && !`${t.teamNumber} ${t.name} ${t.leaderName} ${t.leaderEmail}`.toLowerCase().includes(q)) return false;
      switch (filter) {
        case "all":
          return true;
        case "flagged":
        case "review":
          return t.githubStatus === filter;
        case "unchecked":
          return Boolean(t.repoUrl) && !t.githubStatus;
        default:
          return t.status === filter;
      }
    });
  }, [teams, query, filter]);

  async function act(action: string, team: AdminTeam) {
    if (action === "delete" && !window.confirm(`Delete team ${team.teamNumber} “${team.name}” and its scores? This cannot be undone.`)) return;
    if (action === "regenerate-code" && !window.confirm(`Replace the login code for team ${team.teamNumber}? The old code stops working.`)) return;
    if (action === "disqualify" && !window.confirm(`Disqualify team ${team.teamNumber}? They'll be hidden from the leaderboard.`)) return;
    setBusy(team.id);
    setMsg(null);
    const res = await api<{ code?: string; results?: Record<string, { status: string; note: string }> }>("/api/admin/teams", {
      action,
      ids: [team.id],
    });
    setBusy("");
    if (!res.ok) return setMsg({ kind: "error", text: res.error });
    if (res.data.code) setMsg({ kind: "ok", text: `New code for team ${team.teamNumber}: ${res.data.code}` });
    else if (res.data.results) {
      const r = res.data.results[team.id];
      setMsg({ kind: "ok", text: `Team ${team.teamNumber}: ${r?.status ?? "done"} — ${r?.note ?? ""}` });
    }
    router.refresh();
  }

  async function recheckAll() {
    const ids = teams.filter((t) => t.repoUrl).map((t) => t.id);
    if (!ids.length) return setMsg({ kind: "error", text: "No teams have saved a repo link yet." });
    setMsg(null);
    for (let i = 0; i < ids.length; i += 10) {
      setBusy(`all:${Math.min(i + 10, ids.length)}/${ids.length}`);
      const res = await api("/api/admin/teams", { action: "recheck-github", ids: ids.slice(i, i + 10) });
      if (!res.ok) {
        setBusy("");
        return setMsg({ kind: "error", text: res.error });
      }
    }
    setBusy("");
    setMsg({ kind: "ok", text: `Re-checked ${ids.length} repos.` });
    router.refresh();
  }

  function exportXlsx() {
    downloadXlsx("teams.xlsx", [
      {
        name: "Teams",
        rows: teams.map((t) => ({
          "Team Number": t.teamNumber,
          "Team Name": t.name,
          "Leader Name": t.leaderName,
          "Leader Email": t.leaderEmail,
          College: t.college,
          Members: t.members.join(", "),
          "Login Code": t.code ?? "",
          Repo: t.repoUrl ?? "",
          "GitHub Status": t.githubStatus ?? "",
          "GitHub Note": t.githubNote ?? "",
          "First Commit": t.firstCommitAt ?? "",
          Status: t.status,
          "Submitted At": t.submittedAt ?? "",
        })),
      },
    ]);
  }

  return (
    <>
      <div className="toolbar">
        <input className="input input--sm" placeholder="Search number, team or leader" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="input input--sm" style={{ maxWidth: 190 }} value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
          <option value="all">All teams ({teams.length})</option>
          <option value="building">Building</option>
          <option value="submitted">Submitted</option>
          <option value="disqualified">Disqualified</option>
          <option value="flagged">GitHub: flagged</option>
          <option value="review">GitHub: needs review</option>
          <option value="unchecked">GitHub: not checked</option>
        </select>
        <label className="switch" style={{ fontSize: 13.5 }}>
          <input type="checkbox" checked={showCodes} onChange={(e) => setShowCodes(e.target.checked)} />
          <span className="switch-track" />
          Show codes
        </label>
        <span className="spacer" />
        <button type="button" className="btn btn-ghost btn-sm" onClick={recheckAll} disabled={busy !== ""}>
          {busy.startsWith("all:") ? `Checking ${busy.slice(4)}…` : "Re-check all GitHub"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={exportXlsx} disabled={!teams.length}>
          Export .xlsx
        </button>
        <Link href="/admin/print" className="btn btn-ghost btn-sm">
          Print chits
        </Link>
      </div>

      {msg && <div className={`notice ${msg.kind === "ok" ? "notice--ok" : "notice--bad"}`} style={{ marginBottom: 12 }}>{msg.text}</div>}

      {teams.length === 0 ? (
        <div className="panel board-empty">
          <p>
            No teams yet. <Link href="/admin/import" style={{ textDecoration: "underline" }}>Import the Unstop CSV</Link> to create them.
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Team</th>
                <th>Code</th>
                <th>Repo &amp; GitHub check</th>
                <th>First commit</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <tr key={t.id} style={{ opacity: busy === t.id ? 0.5 : 1 }}>
                  <td className="mono">{t.teamNumber}</td>
                  <td style={{ minWidth: 200 }}>
                    <div style={{ fontWeight: 500 }}>{t.name}</div>
                    <div className="muted" style={{ fontSize: 12.5 }}>
                      {t.leaderName || "—"} · {t.leaderEmail || "no email"} · {t.members.length + 1} people
                    </div>
                  </td>
                  <td className="nowrap">
                    <span className="code-chip">{showCodes ? t.code ?? "unreadable" : "••••••••"}</span>
                    {t.locked && <span className="pill pill--warn" style={{ marginLeft: 6 }}>locked</span>}
                  </td>
                  <td style={{ minWidth: 220 }}>
                    {t.repoUrl ? (
                      <>
                        <a href={t.repoUrl} target="_blank" rel="noopener noreferrer" className="mono" style={{ fontSize: 12.5 }}>
                          {t.repoUrl.replace("https://github.com/", "")}
                        </a>
                        <div className="row" style={{ gap: 6, marginTop: 4 }}>
                          {t.githubStatus ? (
                            <span className={`pill ${GH_PILL[t.githubStatus]}`} title={t.githubNote ?? ""}>
                              {t.githubStatus}
                            </span>
                          ) : (
                            <span className="pill pill--idle">not checked</span>
                          )}
                          {t.githubNote && <span className="muted" style={{ fontSize: 12 }}>{t.githubNote}</span>}
                        </div>
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="mono nowrap">{formatDateTime(t.firstCommitAt)}</td>
                  <td className="nowrap">
                    <span className={`pill ${STATUS_PILL[t.status]}`}>{t.status}</span>
                    <div className="muted mono" style={{ fontSize: 12, marginTop: 4 }}>
                      {t.submittedAt ? formatDateTime(t.submittedAt) : ""}
                    </div>
                  </td>
                  <td>
                    <select
                      className="input input--sm"
                      style={{ width: 150 }}
                      value=""
                      disabled={busy !== ""}
                      aria-label={`Actions for team ${t.teamNumber}`}
                      onChange={(e) => e.target.value && act(e.target.value, t)}
                    >
                      <option value="">Actions…</option>
                      {t.repoUrl && <option value="recheck-github">Re-check GitHub</option>}
                      {t.status === "submitted" && <option value="reset-submission">Reopen submission</option>}
                      {t.status === "disqualified" ? (
                        <option value="reinstate">Reinstate</option>
                      ) : (
                        <option value="disqualify">Disqualify</option>
                      )}
                      {t.locked && <option value="unlock">Unlock login</option>}
                      <option value="regenerate-code">New login code</option>
                      <option value="delete">Delete team</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
