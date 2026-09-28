"use client";

import { useState } from "react";
import { api } from "@/components/api";
import { event } from "@/lib/event";

export default function TeamLoginForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setBusy(true);
        setError("");
        const res = await api("/api/team/login", { teamNumber: form.get("teamNumber"), code: form.get("code") });
        if (res.ok) {
          window.location.href = "/team/dashboard";
          return;
        }
        setError(res.error);
        setBusy(false);
      }}
    >
      <label className="field">
        <span className="label">Team number</span>
        <input className="input mono" name="teamNumber" inputMode="numeric" autoComplete="off" placeholder="148" required />
      </label>
      <label className="field">
        <span className="label">Login code</span>
        <input
          className="input input-code"
          name="code"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder={`${event.codePrefix}-XXXXXX`}
          required
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-solid btn-block" style={{ height: 46, marginTop: 4 }} disabled={busy}>
        {busy ? "Checking…" : "Log in"}
      </button>
    </form>
  );
}
