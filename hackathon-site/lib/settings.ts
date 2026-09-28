import "server-only";
import { db, hasDatabase } from "./db";
import { event } from "./event";

export type Settings = {
  eventStart: string; // ISO
  submissionDeadline: string; // ISO
  leaderboardVisible: boolean;
  scoresVisible: boolean;
  themeRevealed: boolean;
  themeTitle: string;
  themeDescription: string;
};

const KEY: Record<keyof Settings, string> = {
  eventStart: "event_start_time",
  submissionDeadline: "submission_deadline",
  leaderboardVisible: "leaderboard_visible",
  scoresVisible: "scores_visible",
  themeRevealed: "theme_revealed",
  themeTitle: "theme_title",
  themeDescription: "theme_description",
};

export const defaultSettings: Settings = {
  eventStart: new Date(event.defaults.eventStart).toISOString(),
  submissionDeadline: new Date(event.defaults.submissionDeadline).toISOString(),
  leaderboardVisible: false,
  scoresVisible: false,
  themeRevealed: false,
  themeTitle: "",
  themeDescription: "",
};

function fromRows(rows: { key: string; value: string }[]): Settings {
  const raw = new Map(rows.map((r) => [r.key, r.value]));
  const str = (k: keyof Settings) => raw.get(KEY[k]) ?? "";
  const bool = (k: keyof Settings) => str(k) === "true";
  const date = (k: "eventStart" | "submissionDeadline") => {
    const v = str(k);
    return v && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : defaultSettings[k];
  };
  return {
    eventStart: date("eventStart"),
    submissionDeadline: date("submissionDeadline"),
    leaderboardVisible: bool("leaderboardVisible"),
    scoresVisible: bool("scoresVisible"),
    themeRevealed: bool("themeRevealed"),
    themeTitle: str("themeTitle"),
    themeDescription: str("themeDescription"),
  };
}

export async function getSettings(): Promise<Settings> {
  const rows = await db()<{ key: string; value: string }[]>`select key, value from settings`;
  return fromRows(rows);
}

/** For public pages: never let a database hiccup take the page down. */
export async function getSettingsSafe(): Promise<Settings> {
  if (!hasDatabase()) return defaultSettings;
  try {
    return await getSettings();
  } catch (err) {
    console.error("[settings] falling back to defaults:", (err as Error).message);
    return defaultSettings;
  }
}

export async function updateSettings(patch: Partial<Settings>) {
  const entries = (Object.keys(patch) as (keyof Settings)[])
    .filter((k) => k in KEY && patch[k] !== undefined)
    .map((k) => ({ key: KEY[k], value: String(patch[k]) }));
  if (!entries.length) return;
  const sql = db();
  await sql.begin(async (tx) => {
    for (const e of entries) {
      await tx`
        insert into settings (key, value, updated_at) values (${e.key}, ${e.value}, now())
        on conflict (key) do update set value = excluded.value, updated_at = now()`;
    }
  });
}

export type Phase = "pre" | "live" | "closed";

export function phaseOf(s: Pick<Settings, "eventStart" | "submissionDeadline">, now = Date.now()): Phase {
  if (now < Date.parse(s.eventStart)) return "pre";
  if (now < Date.parse(s.submissionDeadline)) return "live";
  return "closed";
}
