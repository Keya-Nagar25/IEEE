import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { getTeamSession } from "@/lib/session";
import { getTeamView } from "@/lib/team";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getTeamSession();
    if (!session) return fail(401, "Not logged in.");
    const view = await getTeamView(session.teamId);
    if (!view) return fail(401, "Team not found.");
    return NextResponse.json(view, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[team me]", err);
    return fail(503, "Temporarily unavailable.");
  }
}
