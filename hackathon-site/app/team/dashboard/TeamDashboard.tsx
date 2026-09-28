"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/api";
import { formatClock, formatLong, useNow } from "@/components/Countdown";
import { Sparkle } from "@/components/icons";
import { useLiveVersion } from "@/components/useLiveVersion";
import { event } from "@/lib/event";
import { formatDateTime, formatScore, formatTime } from "@/lib/format";
import type { TeamView } from "@/lib/team";

const STATUS = {
  building: { label: "Building", cls: "pill--warn" },
  submitted: { label: "Submitted", cls: "pill--ok" },
  disqualified: { label: "Disqualified", cls: "pill--bad" },
} as const;

export default function TeamDashboard({ initial }: { initial: TeamView }) {
  const [view, setView] = useState(initial);
  const [repo, setRepo] = useState(initial.team.repoUrl ?? "");
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState<"" | "save" | "submit">("");
  const { version } = useLiveVersion();
  const now = useNow();

  // Leaderboard published / scores changed → refresh our own result.
  useEffect(() => {
    if (!version) return;
    fetch("/api/team/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((v: TeamView | null) => v && setView(v));
  }, [version]);

  const { team, result } = view;
  const start = Date.parse(view.eventStart);
  const deadline = Date.parse(view.deadline);
  const closed = now != null && now >= deadline;
  const locked = team.status !== "building" || closed;
  const savedRepo = team.repoUrl ?? "";

  async function saveRepo() {
    setBusy("save");
    setMsg(null);
    const res = await api<{ url: string }>("/api/team/repo", { url: repo });
    setBusy("");
    if (!res.ok) return setMsg({ kind: "error", text: res.error });
    setRepo(res.data.url);
    setView((v) => ({ ...v, team: { ...v.team, repoUrl: res.data.url } }));
    setMsg({ kind: "ok", text: "Repo link saved. Submit when you're done building." });
  }

  async function submit() {
    if (!window.confirm("Submit your project now? The repo link is locked after you submit.")) return;
    setBusy("submit");
    setMsg(null);
    const res = await api<{ submittedAt: string }>("/api/team/submit");
    setBusy("");
    if (!res.ok) return setMsg({ kind: "error", text: res.error });
    setView((v) => ({ ...v, team: { ...v.team, status: "submitted", submittedAt: res.data.submittedAt } }));
    setMsg({ kind: "ok", text: `Submitted at ${formatTime(res.data.submittedAt)}. Nice work.` });
  }

  let clockLabel = "Submissions close in";
  let clockValue = "—";
  if (now != null) {
    if (now < start) {
      clockLabel = "Build starts in";
      clockValue = formatLong(start - now);
    } else if (now < deadline) {
      clockValue = formatClock(deadline - now);
    } else {
      clockLabel = "Submissions";
      clockValue = "Closed";
    }
  }

  return (
    <>
      <div className="page-head">
        <span className="badge">
          <Sparkle />
          Team #{team.teamNumber}
        </span>
        <h1 className="page-title">
          Hey, <em>{team.name}</em>
        </h1>
        <p className="page-lede">
          Save your GitHub repo link, keep building, and hit submit before the deadline. Only one person needs to do this.
        </p>
      </div>

      <div className="dash">
        <section className="panel span-4">
          <div className="panel-title">Status</div>
          <span className={`pill ${STATUS[team.status].cls}`}>{STATUS[team.status].label}</span>
          <p className="form-note" style={{ marginTop: 12 }}>
            {team.submittedAt ? (
              <>
                Submitted <span className="mono">{formatDateTime(team.submittedAt)}</span>
              </>
            ) : team.status === "disqualified" ? (
              "Talk to an organizer if you think this is a mistake."
            ) : (
              "Not submitted yet."
            )}
          </p>
        </section>

        <section className="panel span-8">
          <div className="panel-title">
            {clockLabel}
            <span className="mono">Deadline {formatDateTime(view.deadline)}</span>
          </div>
          <div className="big-number mono">{clockValue}</div>
        </section>

        <section className="panel span-7">
          <div className="panel-title">GitHub repo</div>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              void saveRepo();
            }}
          >
            <input
              className="input mono"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="https://github.com/your-team/project"
              disabled={locked}
              aria-label="GitHub repo URL"
              spellCheck={false}
            />
            <div className="row">
              <button className="btn btn-ghost" disabled={locked || busy !== "" || !repo.trim() || repo.trim() === savedRepo}>
                {busy === "save" ? "Saving…" : "Save link"}
              </button>
              <button
                type="button"
                className="btn btn-solid"
                onClick={submit}
                disabled={locked || busy !== "" || !savedRepo || repo.trim() !== savedRepo}
              >
                {busy === "submit" ? "Submitting…" : team.status === "submitted" ? "Submitted" : "Submit project"}
              </button>
            </div>
            {msg && (
              <p className={msg.kind === "ok" ? "form-ok" : "form-error"} role="status">
                {msg.text}
              </p>
            )}
            <p className="form-note">
              Keep the repo private during the build and add <span className="code-chip">{event.reviewerGithub}</span> as a
              collaborator. Make it public at evaluation time.
            </p>
          </form>
        </section>

        <section className="panel span-5">
          <div className="panel-title">Results</div>
          {result ? (
            result.rank ? (
              <>
                <div className="big-number">
                  #{result.rank} <small>of {result.ranked}</small>
                </div>
                {"score" in result && (
                  <p className="form-note" style={{ marginTop: 8 }}>
                    Score <span className="mono">{formatScore(result.score ?? null)}</span> / 10
                  </p>
                )}
              </>
            ) : (
              <p className="form-note">The leaderboard is live, but your team hasn&rsquo;t been scored yet.</p>
            )
          ) : (
            <p className="form-note">Your rank shows up here as soon as organizers publish the leaderboard.</p>
          )}
        </section>

        <section className="panel span-12">
          <div className="panel-title">Team</div>
          <dl className="kv">
            <dt>Leader</dt>
            <dd>
              {team.leaderName || "—"}
              {team.leaderEmail && <span className="muted"> · {team.leaderEmail}</span>}
            </dd>
            {team.college && (
              <>
                <dt>College</dt>
                <dd>{team.college}</dd>
              </>
            )}
            <dt>Members</dt>
            <dd>{view.members.length ? view.members.map((m) => m.name).join(", ") : "—"}</dd>
          </dl>
        </section>
      </div>
    </>
  );
}
