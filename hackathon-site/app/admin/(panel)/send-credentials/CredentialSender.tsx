"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/components/api";
import { formatDateTime } from "@/lib/format";

type Team = { id: string; teamNumber: number; name: string; email: string; sentAt: string | null };
type Batch = { sent: number[]; failed: { teamNumber: number; error: string }[]; remaining: number };

export default function CredentialSender({ teams, enabled }: { teams: Team[]; enabled: boolean }) {
  const router = useRouter();
  const [progress, setProgress] = useState("");
  const [failures, setFailures] = useState<Batch["failed"]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const unsent = teams.filter((t) => !t.sentAt && t.email).length;
  const noEmail = teams.filter((t) => !t.email).length;

  async function sendAll() {
    if (!window.confirm(`Email login codes to ${unsent} team leaders now?`)) return;
    setBusy(true);
    setError("");
    setFailures([]);
    let sent = 0;
    const failed: Batch["failed"] = [];
    const seenFailures = new Set<number>();
    // Loop batches until nothing is left or a batch makes no progress (all failing).
    for (;;) {
      const res = await api<Batch>("/api/admin/credentials", {});
      if (!res.ok) {
        setError(res.error);
        break;
      }
      sent += res.data.sent.length;
      res.data.failed.forEach((f) => !seenFailures.has(f.teamNumber) && (seenFailures.add(f.teamNumber), failed.push(f)));
      setProgress(`Sent ${sent} · ${res.data.remaining} remaining`);
      if (res.data.remaining === 0 || res.data.sent.length === 0) break;
    }
    setFailures(failed);
    setBusy(false);
    router.refresh();
  }

  async function resend(team: Team) {
    if (!window.confirm(`Resend the login code to ${team.email}?`)) return;
    setBusy(true);
    const res = await api<Batch>("/api/admin/credentials", { ids: [team.id] });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    if (res.data.failed.length) setFailures(res.data.failed);
    router.refresh();
  }

  return (
    <div className="stack-lg admin-section">
      <div className="row">
        <button type="button" className="btn btn-solid" onClick={sendAll} disabled={!enabled || busy || unsent === 0}>
          {busy ? "Sending…" : unsent ? `Email ${unsent} unsent team${unsent === 1 ? "" : "s"}` : "Everyone has been emailed"}
        </button>
        {progress && <span className="form-note">{progress}</span>}
        {noEmail > 0 && <span className="pill pill--warn">{noEmail} without a leader email</span>}
      </div>
      {error && <div className="notice notice--bad">{error}</div>}
      {failures.length > 0 && (
        <div className="notice notice--bad">
          {failures.map((f) => (
            <div key={f.teamNumber}>
              Team {f.teamNumber}: {f.error}
            </div>
          ))}
        </div>
      )}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>Leader email</th>
              <th>Emailed</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.id}>
                <td className="mono">{t.teamNumber}</td>
                <td>{t.name}</td>
                <td>{t.email || <span className="muted">—</span>}</td>
                <td>{t.sentAt ? <span className="pill pill--ok">{formatDateTime(t.sentAt)}</span> : <span className="pill pill--idle">not yet</span>}</td>
                <td className="num">
                  {t.email && (
                    <button type="button" className="btn btn-ghost btn-sm" disabled={!enabled || busy} onClick={() => resend(t)}>
                      {t.sentAt ? "Resend" : "Send"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!teams.length && (
              <tr>
                <td colSpan={5} className="muted">
                  No teams yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
