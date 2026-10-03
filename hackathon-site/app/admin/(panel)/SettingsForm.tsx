"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/components/api";
import { toLocalInput } from "@/lib/format";
import type { Settings } from "@/lib/settings";

export default function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [start, setStart] = useState("");
  const [deadline, setDeadline] = useState("");
  useEffect(() => {
    setStart(toLocalInput(initial.eventStart));
    setDeadline(toLocalInput(initial.submissionDeadline));
  }, [initial.eventStart, initial.submissionDeadline]);
  const [themeTitle, setThemeTitle] = useState(initial.themeTitle);
  const [themeDescription, setThemeDescription] = useState(initial.themeDescription);
  const [themeRevealed, setThemeRevealed] = useState(initial.themeRevealed);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        const res = await api(
          "/api/admin/settings",
          {
            eventStart: new Date(start).toISOString(),
            submissionDeadline: new Date(deadline).toISOString(),
            themeTitle,
            themeDescription,
            themeRevealed,
          },
          "PUT",
        );
        setBusy(false);
        setMsg(res.ok ? { kind: "ok", text: "Saved. Public pages update within seconds." } : { kind: "error", text: res.error });
        if (res.ok) router.refresh();
      }}
    >
      <div className="grid-2">
        <label className="field">
          <span className="label">Event start (build window opens)</span>
          <input className="input" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
        </label>
        <label className="field">
          <span className="label">Submission deadline</span>
          <input className="input" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
        </label>
      </div>
      <p className="form-note">
        Times are in your browser&rsquo;s timezone. The event start is also the GitHub first-commit baseline.
      </p>

      <label className="field">
        <span className="label">Theme title (hidden until revealed)</span>
        <input className="input" value={themeTitle} onChange={(e) => setThemeTitle(e.target.value)} placeholder="e.g. Tech for Climate" />
      </label>
      <label className="field">
        <span className="label">Theme description</span>
        <textarea className="input" value={themeDescription} onChange={(e) => setThemeDescription(e.target.value)} />
      </label>
      <label className="switch">
        <input type="checkbox" checked={themeRevealed} onChange={(e) => setThemeRevealed(e.target.checked)} />
        <span className="switch-track" />
        Reveal theme on the About page
      </label>

      {msg && <p className={msg.kind === "ok" ? "form-ok" : "form-error"}>{msg.text}</p>}
      <div>
        <button className="btn btn-solid" disabled={busy}>
          {busy ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
