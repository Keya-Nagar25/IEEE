import type { Metadata } from "next";
import { redirect } from "next/navigation";
import InnerShell from "@/components/InnerShell";
import { Sparkle } from "@/components/icons";
import { event } from "@/lib/event";
import { getTeamSession } from "@/lib/session";
import TeamLoginForm from "./TeamLoginForm";

export const metadata: Metadata = { title: "Team login", robots: { index: false } };

export default async function TeamLoginPage() {
  if (await getTeamSession()) redirect("/team/dashboard");

  return (
    <InnerShell cta={{ label: "Leaderboard", href: "/leaderboard" }} mainClassName="auth">
      <div className="auth-card">
        <span className="badge">
          <Sparkle />
          Team portal
        </span>
        <h1 className="page-title" style={{ marginTop: 20 }}>
          Log in to <em>your team</em>
        </h1>
        <p className="page-lede" style={{ fontSize: 15.5 }}>
          Use the team number and login code from your chit or email (looks like {event.codePrefix}-X7P2M9).
        </p>
        <TeamLoginForm />
        <p className="form-note" style={{ marginTop: 18 }}>
          Lost your code? Find an organizer at the help desk — they can look it up in seconds.
        </p>
      </div>
    </InnerShell>
  );
}
