"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/components/api";
import type { Criterion } from "@/lib/criteria";

type Row = { id?: string; name: string; weight: string };

export default function CriteriaEditor({ initial }: { initial: Criterion[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial.map((c) => ({ id: c.id, name: c.name, weight: String(c.weight) })));
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const total = rows.reduce((s, r) => s + (Number(r.weight) || 0), 0);
  const removedExisting = initial.filter((c) => !rows.some((r) => r.id === c.id));

  const set = (i: number, patch: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        if (removedExisting.length && !window.confirm(`Removing ${removedExisting.map((c) => c.name).join(", ")} also deletes their imported scores. Continue?`)) return;
        setBusy(true);
        setMsg(null);
        const res = await api("/api/admin/criteria", { criteria: rows.map((r) => ({ id: r.id, name: r.name, weight: Number(r.weight) })) }, "PUT");
        setBusy(false);
        setMsg(res.ok ? { kind: "ok", text: "Criteria saved. Re-download the template if you changed names." } : { kind: "error", text: res.error });
        if (res.ok) router.refresh();
      }}
    >
      {rows.map((r, i) => (
        <div className="row" key={r.id ?? `new-${i}`} style={{ flexWrap: "nowrap" }}>
          <input className="input input--sm" value={r.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="Criterion name" aria-label="Criterion name" />
          <input
            className="input input--sm mono"
            style={{ width: 90, textAlign: "right" }}
            value={r.weight}
            inputMode="decimal"
            onChange={(e) => set(i, { weight: e.target.value })}
            aria-label={`${r.name} weight percent`}
          />
          <span className="muted">%</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRows(rows.filter((_, j) => j !== i))} disabled={rows.length === 1} aria-label={`Remove ${r.name}`}>
            ✕
          </button>
        </div>
      ))}
      <div className="row-between">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRows([...rows, { name: "", weight: "0" }])} disabled={rows.length >= 12}>
          + Add criterion
        </button>
        <span className={Math.abs(total - 100) < 0.01 ? "form-ok" : "form-error"}>Total {Math.round(total * 100) / 100}%</span>
      </div>
      {msg && <p className={msg.kind === "ok" ? "form-ok" : "form-error"}>{msg.text}</p>}
      <div>
        <button className="btn btn-solid btn-sm" disabled={busy || Math.abs(total - 100) > 0.01}>
          {busy ? "Saving…" : "Save criteria"}
        </button>
      </div>
    </form>
  );
}
