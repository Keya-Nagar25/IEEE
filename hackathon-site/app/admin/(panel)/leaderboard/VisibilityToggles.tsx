"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/components/api";

export default function VisibilityToggles(props: { leaderboardVisible: boolean; scoresVisible: boolean }) {
  const router = useRouter();
  const [state, setState] = useState(props);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function set(patch: Partial<typeof state>) {
    const next = { ...state, ...patch };
    if (patch.leaderboardVisible && !window.confirm("Publish the leaderboard to everyone now?")) return;
    setBusy(true);
    setError("");
    const res = await api("/api/admin/settings", patch, "PUT");
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setState(next);
    router.refresh();
  }

  return (
    <div className="stack">
      <label className="switch">
        <input type="checkbox" checked={state.leaderboardVisible} disabled={busy} onChange={(e) => set({ leaderboardVisible: e.target.checked })} />
        <span className="switch-track" />
        Leaderboard visible to everyone
      </label>
      <label className="switch">
        <input type="checkbox" checked={state.scoresVisible} disabled={busy} onChange={(e) => set({ scoresVisible: e.target.checked })} />
        <span className="switch-track" />
        Show scores (not just ranks)
      </label>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
