import type { Metadata } from "next";
import InnerShell from "@/components/InnerShell";
import { Sparkle } from "@/components/icons";
import { headerCta } from "@/lib/cta";
import { event } from "@/lib/event";
import { formatDateRange } from "@/lib/format";
import { getSettingsSafe, phaseOf } from "@/lib/settings";
import LiveLeaderboard from "./LiveLeaderboard";

// The shell is static; rankings stream in on the client from the cached API.
export const revalidate = 300;
export const metadata: Metadata = { title: "Leaderboard", description: `Live team rankings for ${event.name}.` };

export default async function LeaderboardPage() {
  const s = await getSettingsSafe();
  return (
    <InnerShell current="/leaderboard" cta={headerCta(phaseOf(s))} dates={formatDateRange(s.eventStart, s.submissionDeadline)}>
      <div className="page-head">
        <span className="badge">
          <Sparkle />
          Live leaderboard
        </span>
        <h1 className="page-title">
          Who&rsquo;s <em>on top</em>
        </h1>
        <p className="page-lede">Rankings update on their own as scores come in. No need to refresh.</p>
      </div>
      <LiveLeaderboard />
    </InnerShell>
  );
}
