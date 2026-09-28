"use client";

import { useState } from "react";
import { api } from "@/components/api";

export default function AdminLoginForm() {
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
        const res = await api("/api/admin/login", { email: form.get("email"), password: form.get("password") });
        if (res.ok) {
          window.location.href = "/admin";
          return;
        }
        setError(res.error);
        setBusy(false);
      }}
    >
      <label className="field">
        <span className="label">Email</span>
        <input className="input" type="email" name="email" autoComplete="username" required />
      </label>
      <label className="field">
        <span className="label">Password</span>
        <input className="input" type="password" name="password" autoComplete="current-password" required />
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
