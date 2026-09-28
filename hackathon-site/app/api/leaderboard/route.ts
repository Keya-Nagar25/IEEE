import { NextResponse } from "next/server";
import { getRanking } from "@/lib/scoring";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// Browsers request /api/leaderboard?v=<signal timestamp>. Everyone asks for the same
// URL after a change, so the CDN serves the crowd and the function runs ~once per change.
const CACHE = "public, max-age=0, s-maxage=5, stale-while-revalidate=25";

export async function GET() {
  try {
    const settings = await getSettings();
    if (!settings.leaderboardVisible) {
      return NextResponse.json({ visible: false }, { headers: { "Cache-Control": CACHE } });
    }
    const { teams } = await getRanking();
    const rows = teams.map((t) => ({
      rank: t.rank,
      teamNumber: t.teamNumber,
      name: t.name,
      status: t.status,
      submittedAt: t.submittedAt,
      ...(settings.scoresVisible ? { score: t.score } : {}),
    }));
    return NextResponse.json(
      {
        visible: true,
        scoresVisible: settings.scoresVisible,
        teams: rows,
        totals: { teams: rows.length, submitted: rows.filter((r) => r.status === "submitted").length },
      },
      { headers: { "Cache-Control": CACHE } },
    );
  } catch (err) {
    console.error("[leaderboard]", err);
    return NextResponse.json(
      { error: "Leaderboard temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
