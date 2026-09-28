"use client";

import Link from "next/link";
import Papa from "papaparse";
import { useMemo, useRef, useState } from "react";
import { api } from "@/components/api";
import { downloadText, downloadXlsx } from "@/components/sheets";

type Csv = { headers: string[]; rows: Record<string, string>[]; fileName: string };
type Field = "teamNumber" | "teamName" | "leaderName" | "leaderEmail" | "college" | "personName" | "personEmail" | "role";
type Mapping = Record<Field, string>;
type Team = {
  teamNumber: number | null;
  name: string;
  leaderName: string;
  leaderEmail: string;
  college: string;
  members: { name: string; email: string }[];
};
type PreviewRow = {
  index: number;
  name: string;
  leaderName: string;
  leaderEmail: string;
  memberCount: number;
  status: "new" | "existing" | "duplicate" | "invalid";
  reason: string;
  teamNumber: number | null;
};
type Summary = { found: number; new: number; existing: number; duplicate: number; invalid: number };
type Created = { teamNumber: number; name: string; leaderName: string; leaderEmail: string; code: string };

const FIELDS: { key: Field; label: string; hint: string; test: RegExp }[] = [
  { key: "teamName", label: "Team name", hint: "required", test: /^team\s*name$|^team$|^name of (the )?team$/ },
  { key: "teamNumber", label: "Team number", hint: "optional — auto-assigned if blank", test: /^team\s*(no\.?|number|id|#)$|^team_?id$/ },
  { key: "leaderName", label: "Leader name", hint: "", test: /(leader|captain|lead)\s*name|name.*(leader|captain)/ },
  { key: "leaderEmail", label: "Leader email", hint: "", test: /(leader|captain|lead).*e-?mail|e-?mail.*(leader|captain)/ },
  { key: "college", label: "College", hint: "", test: /college|institute|university|organi[sz]ation|school/ },
  { key: "personName", label: "Participant name", hint: "for one-row-per-person exports", test: /^(name|full name|participant name|candidate name|member name)$/ },
  { key: "personEmail", label: "Participant email", hint: "for one-row-per-person exports", test: /^(e-?mail|email address|participant e-?mail|candidate e-?mail)$/ },
  { key: "role", label: "Role column", hint: "rows containing “leader” become the leader", test: /^(role|type|designation|participant type)$/ },
];

const SAMPLE = `Team Name,Leader Name,Leader Email,Member 1 Name,Member 1 Email,Member 2 Name,Member 2 Email,College
Team Alpha,Asha Rao,asha@example.com,Ravi Kumar,ravi@example.com,Meera Nair,meera@example.com,ABC Institute of Technology
Null Pointers,Kabir Shah,kabir@example.com,Isha Patel,isha@example.com,,,XYZ College of Engineering
`;

function guessMapping(headers: string[]): Mapping {
  const m = {} as Mapping;
  for (const f of FIELDS) m[f.key] = headers.find((h) => f.test.test(h.trim().toLowerCase())) ?? "";
  return m;
}

function buildTeams(csv: Csv, map: Mapping) {
  const memberCols = new Map<number, { name?: string; email?: string }>();
  for (const h of csv.headers) {
    const m = h.toLowerCase().match(/member\s*(\d+).*?(name|e-?mail)/);
    if (!m) continue;
    const slot = memberCols.get(Number(m[1])) ?? {};
    if (m[2].startsWith("name")) slot.name = h;
    else slot.email = h;
    memberCols.set(Number(m[1]), slot);
  }

  const teams = new Map<string, Team>();
  let skipped = 0;
  const get = (row: Record<string, string>, col: string) => (col ? String(row[col] ?? "").trim() : "");

  for (const row of csv.rows) {
    const name = get(row, map.teamName);
    if (!name) {
      skipped++;
      continue;
    }
    const key = name.toLowerCase();
    let team = teams.get(key);
    if (!team) {
      const num = get(row, map.teamNumber);
      team = {
        teamNumber: num && /^\d+$/.test(num) ? Number(num) : null,
        name,
        leaderName: get(row, map.leaderName),
        leaderEmail: get(row, map.leaderEmail),
        college: get(row, map.college),
        members: [],
      };
      teams.set(key, team);
    }
    const push = (p: { name: string; email: string }) => {
      if (!p.name && !p.email) return;
      const dup = team!.members.some((m) => (p.email && m.email === p.email) || (!p.email && m.name === p.name));
      const isLeader = p.email ? p.email === team!.leaderEmail : p.name === team!.leaderName;
      if (!dup && !isLeader) team!.members.push(p);
    };

    if (map.personName || map.personEmail) {
      const person = { name: get(row, map.personName), email: get(row, map.personEmail) };
      const leaderRow = map.role && /lead|captain/i.test(get(row, map.role));
      if (leaderRow && !team.leaderName && !team.leaderEmail) {
        team.leaderName = person.name;
        team.leaderEmail = person.email;
        team.members = team.members.filter((m) => m.email !== person.email || !person.email);
      } else push(person);
    }
    for (const [, cols] of [...memberCols.entries()].sort((a, b) => a[0] - b[0])) {
      push({ name: get(row, cols.name ?? ""), email: get(row, cols.email ?? "") });
    }
    if (!team.college) team.college = get(row, map.college);
  }

  // One-row-per-person export without a role column: first person leads.
  for (const t of teams.values()) {
    if (!t.leaderName && !t.leaderEmail && t.members.length) {
      const first = t.members.shift()!;
      t.leaderName = first.name;
      t.leaderEmail = first.email;
    }
  }
  return { teams: [...teams.values()], skipped };
}

const STATUS_PILL: Record<PreviewRow["status"], string> = {
  new: "pill--ok",
  existing: "pill--idle",
  duplicate: "pill--warn",
  invalid: "pill--bad",
};

export default function ImportWizard() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState<Csv | null>(null);
  const [map, setMap] = useState<Mapping | null>(null);
  const [preview, setPreview] = useState<{ rows: PreviewRow[]; summary: Summary } | null>(null);
  const [update, setUpdate] = useState<Set<string>>(new Set());
  const [created, setCreated] = useState<{ created: Created[]; updated: number } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  const built = useMemo(() => (csv && map ? buildTeams(csv, map) : null), [csv, map]);

  function load(file: File) {
    setError("");
    setPreview(null);
    setCreated(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      complete: (res) => {
        const headers = (res.meta.fields ?? []).filter(Boolean);
        if (!headers.length || !res.data.length) return setError("That file has no rows. Is it the Unstop CSV export?");
        setCsv({ headers, rows: res.data, fileName: file.name });
        setMap(guessMapping(headers));
      },
      error: (err) => setError(err.message),
    });
  }

  async function runPreview() {
    if (!built) return;
    if (!map?.teamName) return setError("Pick which column holds the team name.");
    setBusy(true);
    setError("");
    const res = await api<{ rows: PreviewRow[]; summary: Summary }>("/api/admin/import", { teams: built.teams, dryRun: true });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setPreview(res.data);
    setUpdate(new Set());
  }

  async function commit() {
    if (!built || !preview) return;
    setBusy(true);
    setError("");
    const res = await api<{ created: Created[]; updated: number }>("/api/admin/import", {
      teams: built.teams,
      update: [...update],
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setCreated(res.data);
    setPreview(null);
  }

  if (created) {
    return (
      <div className="stack-lg admin-section">
        <div className="notice notice--ok">
          Created {created.created.length} team{created.created.length === 1 ? "" : "s"}
          {created.updated ? `, updated ${created.updated}` : ""}. Codes are also viewable any time on the Teams page.
        </div>
        <div className="row">
          <button
            type="button"
            className="btn btn-solid"
            onClick={() =>
              downloadXlsx("team-credentials.xlsx", [
                {
                  name: "Credentials",
                  rows: created.created.map((c) => ({
                    "Team Number": c.teamNumber,
                    "Team Name": c.name,
                    "Leader Name": c.leaderName,
                    "Leader Email": c.leaderEmail,
                    "Login Code": c.code,
                  })),
                },
              ])
            }
            disabled={!created.created.length}
          >
            Download credentials (.xlsx)
          </button>
          <Link href="/admin/print" className="btn btn-ghost">
            Print chits
          </Link>
          <Link href="/admin/teams" className="btn btn-ghost">
            Go to Teams
          </Link>
          <button type="button" className="btn btn-ghost" onClick={() => { setCreated(null); setCsv(null); setMap(null); }}>
            Import another file
          </button>
        </div>
        {created.created.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Team #</th>
                  <th>Team</th>
                  <th>Leader</th>
                  <th>Login code</th>
                </tr>
              </thead>
              <tbody>
                {created.created.map((c) => (
                  <tr key={c.teamNumber}>
                    <td className="mono">{c.teamNumber}</td>
                    <td>{c.name}</td>
                    <td>
                      {c.leaderName} <span className="muted">{c.leaderEmail}</span>
                    </td>
                    <td>
                      <span className="code-chip">{c.code}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="stack-lg admin-section">
      <div
        className={`dropzone${over ? " is-over" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => fileInput.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileInput.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files[0];
          if (f) load(f);
        }}
      >
        <strong>{csv ? csv.fileName : "Drop the Unstop CSV here"}</strong>
        <span>{csv ? `${csv.rows.length} rows · ${csv.headers.length} columns — click to choose another file` : "or click to choose a file"}</span>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) load(f);
            e.target.value = "";
          }}
        />
      </div>
      {!csv && (
        <p className="form-note">
          Expected columns: Team Name, Leader Name, Leader Email, Member N Name/Email, College — header names don&rsquo;t need
          to match exactly.{" "}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => downloadText("sample-unstop.csv", SAMPLE)}>
            Download a sample CSV
          </button>
        </p>
      )}

      {csv && map && (
        <section className="panel">
          <div className="panel-title">Column mapping (auto-detected — fix anything that looks wrong)</div>
          <div className="grid-2">
            {FIELDS.map((f) => (
              <label className="field" key={f.key}>
                <span className="label">
                  {f.label} {f.hint && <span className="muted">· {f.hint}</span>}
                </span>
                <select
                  className="input input--sm"
                  value={map[f.key]}
                  onChange={(e) => {
                    setMap({ ...map, [f.key]: e.target.value });
                    setPreview(null);
                  }}
                >
                  <option value="">— not in this file —</option>
                  {csv.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="row" style={{ marginTop: 16 }}>
            <button type="button" className="btn btn-solid" onClick={runPreview} disabled={busy || !map.teamName}>
              {busy && !preview ? "Checking…" : `Preview ${built?.teams.length ?? 0} teams`}
            </button>
            {built && built.skipped > 0 && <span className="form-note">{built.skipped} rows without a team name will be skipped.</span>}
          </div>
        </section>
      )}

      {error && <div className="notice notice--bad">{error}</div>}

      {preview && (
        <section className="stack">
          <div className="notice">
            <strong>{preview.summary.found}</strong> teams found · <strong>{preview.summary.existing}</strong> already exist ·{" "}
            <strong>{preview.summary.new}</strong> will be created
            {preview.summary.duplicate ? ` · ${preview.summary.duplicate} duplicated in file` : ""}
            {preview.summary.invalid ? ` · ${preview.summary.invalid} invalid` : ""}
            {update.size ? ` · ${update.size} existing will be updated` : ""}
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Team #</th>
                  <th>Team</th>
                  <th>Leader</th>
                  <th className="num">Members</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.index}>
                    <td>
                      <span className={`pill ${STATUS_PILL[r.status]}`}>{r.status}</span>
                    </td>
                    <td className="mono">{r.teamNumber ?? (r.status === "new" ? "auto" : "—")}</td>
                    <td>{r.name || <span className="muted">(blank)</span>}</td>
                    <td>
                      {r.leaderName || "—"} <span className="muted">{r.leaderEmail}</span>
                    </td>
                    <td className="num mono">{r.memberCount}</td>
                    <td>
                      {r.status === "existing" ? (
                        <label className="row" style={{ gap: 6, fontSize: 13 }}>
                          <input
                            type="checkbox"
                            checked={update.has(r.name.toLowerCase())}
                            onChange={(e) => {
                              const next = new Set(update);
                              if (e.target.checked) next.add(r.name.toLowerCase());
                              else next.delete(r.name.toLowerCase());
                              setUpdate(next);
                            }}
                          />
                          Update leader &amp; members (keeps code)
                        </label>
                      ) : (
                        <span className="muted">{r.reason}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row">
            <button
              type="button"
              className="btn btn-solid"
              onClick={commit}
              disabled={busy || (preview.summary.new === 0 && update.size === 0)}
            >
              {busy ? "Importing…" : `Create ${preview.summary.new} teams${update.size ? ` & update ${update.size}` : ""}`}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setPreview(null)} disabled={busy}>
              Back
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
