"use client";

import { useState } from "react";
import { api } from "./api";

export default function LogoutButton({ kind, className = "btn btn-ghost header-cta" }: { kind: "team" | "admin"; className?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await api(`/api/${kind}/logout`);
        window.location.href = kind === "team" ? "/team/login" : "/admin/login";
      }}
    >
      Log out
    </button>
  );
}
