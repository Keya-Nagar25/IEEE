"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api } from "@/components/api";
import { downloadXlsx, readFirstSheet } from "@/components/sheets";
import type { Criterion } from "@/lib/criteria";

type Payload = { sheetRow: number; teamNumber: unknown; judge: string; values: Record<string, unknown>; notes: string };
type CheckedRow = { index: number; teamNumber: number; teamName: string; judge: string; values: unknown[]; problems: string[] };
type Summary = { rows: number; valid: number; invalid: number; scores: number; teams: number };

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export default function ScoreImporter({ criteria, teams }: { criteria: Criterion[]; teams: { teamNumber: number; name: string }[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [payload, setPayload] = useState<Payload[] | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [preview, setPreview] = useState<{ summary: Summary; rows: CheckedRow[] } | null>(null);
  const [replaceAll, setReplaceAll] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  function downloadTemplate() {
    downloadXlsx("score-template.xlsx", [
      {
        name: "Scores",
        rows: teams.map((t) => ({
          "Team Number": t.teamNumber,
          "Team Name": t.name,
          Judge: "",
          ...Object.fromEntries(criteria.map((c) => [c.name, ""])),
          Notes: "",
        })),
      },
    ]);
  }

  async function load(file: File) {
    setMsg(null);
    setPreview(null);
    setFileName(file.name);
    let rows: Record<string, unknown>[];
    try {
      rows = await readFirstSheet(file);
    } catch {
      return setMsg({ kind: "error", text: "Couldn't read that file. Upload the .xlsx template (or a CSV with the same columns)." });
    }
    const headers = Object.keys(rows[0] ?? {});
    const find = (re: RegExp) => headers.find((h) => re.test(norm(h))) ?? "";
    const teamCol = find(/^team\s*(number|no\.?|#|id)$/);
    const judgeCol = find(/^judge/);
    const notesCol = find(/^notes?$/);
    const critCols = criteria.map((c) => ({ id: c.id, col: headers.find((h) => norm(h) === norm(c.name)) ?? "" }));
    setMissing(criteria.filter((c, i) => !critCols[i].col).map((c) => c.name));
    if (!teamCol) {
      setPayload(null);
      return setMsg({ kind: "error", text: "No “Team Number” column found. Start from the downloaded template." });
    }

    const built = rows
      .map((r, i) => ({
        sheetRow: i + 2, // header is row 1
        teamNumber: r[teamCol],
        judge: judgeCol ? String(r[judgeCol] ?? "").trim() : "",
        notes: notesCol ? String(r[notesCol] ?? "").trim() : "",
        values: Object.fromEntries(critCols.filter((c) => c.col).map((c) => [c.id, r[c.col]])),
      }))
      // Template rows nobody filled in are skipped rather than reported as errors.
      .filter((r) => Object.values(r.values).some((v) => v !== "" && v != null));
    if (!built.length) {
      setPayload(null);
      return setMsg({ kind: "error", text: "No filled-in score rows found in that file." });
    }
    setPayload(built);
    setBusy(true);
    const res = await api<{ summary: Summary; rows: CheckedRow[] }>("/api/admin/scores", { rows: built, dryRun: true });
    setBusy(false);
    if (!res.ok) return setMsg({ kind: "error", text: res.error });
    setPreview(res.data);
  }

  async function commit() {
    if (!payload) return;
    if (replaceAll && !window.confirm("Delete every existing score before importing this file?")) return;
    setBusy(true);
    const res = await api<{ imported: number }>("/api/admin/scores", { rows: payload, replaceAll });
    setBusy(false);
    if (!res.ok) return setMsg({ kind: "error", text: res.error });
    setMsg({ kind: "ok", text: `Imported ${res.data.imported} scores. The leaderboard updates live if it's published.` });
    setPreview(null);
    setPayload(null);
    setFileName("");
    router.refresh();
  }

  const problems = preview?.rows.filter((r) => r.problems.length) ?? [];

  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="btn btn-ghost btn-sm" onClick={downloadTemplate} disabled={!teams.length}>
          Download Excel template
        </button>
        <button type="button" className="btn btn-solid btn-sm" onClick={() => input.current?.click()} disabled={busy}>
          {busy && !preview ? "Reading…" : "Upload filled sheet"}
        </button>
        <input
          ref={input}
          type="file"
          accept=".xlsx,.xls,.csv"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void load(f);
            e.target.value = "";
          }}
        />
      </div>
      <p className="form-note">
        Template columns: Team Number, Team Name, Judge, {criteria.map((c) => c.name).join(", ")}, Notes. Scores are 0–10. Use
        one row per team per judge; leave Judge blank if there&rsquo;s only one set of scores.
      </p>

      {fileName && <p className="form-note">File: {fileName}</p>}
      {missing.length > 0 && payload && (
        <div className="notice">No column found for: {missing.join(", ")}. Those criteria won&rsquo;t be imported from this file.</div>
      )}

      {preview && (
        <>
          <div className={`notice ${preview.summary.invalid ? "" : "notice--ok"}`}>
            {preview.summary.valid} valid rows → {preview.summary.scores} scores for {preview.summary.teams} teams
            {preview.summary.invalid ? ` · ${preview.summary.invalid} rows have problems and will be skipped` : ""}
          </div>
          {problems.length > 0 && (
            <ul className="status-list" style={{ fontSize: 13 }}>
              {problems.slice(0, 20).map((r) => (
                <li key={r.index}>
                  <span className="mono">
                    Row {payload?.[r.index]?.sheetRow ?? r.index + 2}
                    {r.judge ? ` · ${r.judge}` : ""}
                  </span>
                  <span className="form-error">{r.problems.join("; ")}</span>
                </li>
              ))}
            </ul>
          )}
          <label className="switch" style={{ fontSize: 13.5 }}>
            <input type="checkbox" checked={replaceAll} onChange={(e) => setReplaceAll(e.target.checked)} />
            <span className="switch-track" />
            Replace all existing scores
          </label>
          <div>
            <button type="button" className="btn btn-solid btn-sm" onClick={commit} disabled={busy || !preview.summary.valid}>
              {busy ? "Importing…" : `Import ${preview.summary.scores} scores`}
            </button>
          </div>
        </>
      )}
      {msg && <p className={msg.kind === "ok" ? "form-ok" : "form-error"}>{msg.text}</p>}
    </div>
  );
}
