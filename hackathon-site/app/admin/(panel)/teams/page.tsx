import type { Metadata } from "next";
import { getAdminTeams } from "@/lib/admin-teams";
import { getSettings } from "@/lib/settings";
import { formatDateTime } from "@/lib/format";
import TeamsTable from "./TeamsTable";

export const metadata: Metadata = { title: "Teams" };
export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const [teams, settings] = await Promise.all([getAdminTeams(), getSettings()]);
  return (
    <>
      <h1 className="admin-h1">
        All <em>teams</em>
      </h1>
      <p className="admin-sub">
        Login codes, repo links, submission state and the automated GitHub signal. A repo is flagged when its first commit
        predates the event start ({formatDateTime(settings.eventStart)}). Flags are a prompt for your reviewer, not a
        verdict — only organizers see them.
      </p>
      <TeamsTable teams={teams} />
    </>
  );
}
