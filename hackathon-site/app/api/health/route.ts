import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Keep-alive + status check. Vercel Cron (vercel.json) and cron-job.org hit this so
 * the Supabase free project never sees 7 idle days (plan §5). It touches the
 * database directly and through Supabase's REST API, so both count as activity.
 */
export async function GET() {
  const status: Record<string, string> = {};
  try {
    await db()`select 1`;
    status.db = "up";
  } catch (err) {
    status.db = "down";
    console.error("[health] db", (err as Error).message);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    try {
      const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/live_signals?select=key&limit=1`, {
        headers: { apikey: key },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      status.api = res.ok ? "up" : `http ${res.status}`;
    } catch {
      status.api = "down";
    }
  }

  const healthy = status.db === "up";
  return NextResponse.json(
    { ok: healthy, ...status, at: new Date().toISOString() },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
