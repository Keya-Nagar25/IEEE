"use client";

/** Excel helpers (SheetJS), loaded on demand so they never weigh down other pages. */
export async function downloadXlsx(filename: string, sheets: { name: string; rows: Record<string, unknown>[] }[]) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.rows);
    const keys = Object.keys(s.rows[0] ?? {});
    ws["!cols"] = keys.map((k) => ({ wch: Math.max(k.length + 2, ...s.rows.map((r) => String(r[k] ?? "").length + 2)) }));
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  }
  XLSX.writeFile(wb, filename);
}

/** Reads the first sheet of a workbook into an array of rows keyed by header. */
export async function readFirstSheet(file: File) {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: true });
}

export function downloadText(filename: string, text: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
