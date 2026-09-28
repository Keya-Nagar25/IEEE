import type { Metadata } from "next";
import { redirect } from "next/navigation";
import InnerShell from "@/components/InnerShell";
import LogoutButton from "@/components/LogoutButton";
import { getTeamSession } from "@/lib/session";
import { getTeamView } from "@/lib/team";
import TeamDashboard from "./TeamDashboard";

export const metadata: Metadata = { title: "Team dashboard", robots: { index: false } };

export default async function DashboardPage() {
  const session = await getTeamSession();
  if (!session) redirect("/team/login");
  const view = await getTeamView(session.teamId);

  return (
    <InnerShell ctaNode={<LogoutButton kind="team" />}>
      {view ? (
        <TeamDashboard initial={view} />
      ) : (
        <div className="panel board-empty">
          <h1 className="page-title">
            Team <em>not found</em>
          </h1>
          <p>This login no longer matches a team. Log out and sign in again, or ask an organizer.</p>
        </div>
      )}
    </InnerShell>
  );
}
