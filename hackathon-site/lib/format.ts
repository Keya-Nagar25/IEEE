import { event } from "./event";

// Shared by server and client code, so no "server-only" here.

const tz = event.timezone;

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function formatDateTime(isoString: string | null | undefined) {
  if (!isoString) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: tz,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoString));
}

export function formatTime(isoString: string | null | undefined) {
  if (!isoString) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(isoString));
}

/** "Oct 24–25, 2026" style range for the event dates. */
export function formatDateRange(startIso: string, endIso: string) {
  // Assembled from parts: some ICU builds render { day, year } alone as "2026 (day: 25)".
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric", year: "numeric" });
  const parts = (iso: string) => {
    const p = Object.fromEntries(fmt.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
    return { m: p.month, d: p.day, y: p.year };
  };
  const s = parts(startIso);
  const e = parts(endIso);
  if (s.y !== e.y) return `${s.m} ${s.d}, ${s.y} – ${e.m} ${e.d}, ${e.y}`;
  if (s.m !== e.m) return `${s.m} ${s.d} – ${e.m} ${e.d}, ${e.y}`;
  if (s.d !== e.d) return `${s.m} ${s.d}–${e.d}, ${e.y}`;
  return `${s.m} ${s.d}, ${s.y}`;
}

/** Value for <input type="datetime-local"> in the viewer's local time. */
export function toLocalInput(isoString: string) {
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatScore(score: number | null) {
  return score == null ? "—" : score.toFixed(2);
}
