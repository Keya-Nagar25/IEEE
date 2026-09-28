import type { Metadata } from "next";
import Link from "next/link";
import { db, iso } from "@/lib/db";
import { mailConfigured } from "@/lib/mail";
import CredentialSender from "./CredentialSender";

export const metadata: Metadata = { title: "Credentials" };
export const dynamic = "force-dynamic";

export default async function SendCredentialsPage() {
  const rows = await db()<
    { id: string; team_number: number; name: string; leader_email: string; credentials_sent_at: Date | null }[]
  >`select id, team_number, name, leader_email, credentials_sent_at from teams order by team_number`;
  const teams = rows.map((r) => ({
    id: r.id,
    teamNumber: r.team_number,
    name: r.name,
    email: r.leader_email,
    sentAt: iso(r.credentials_sent_at),
  }));

  return (
    <>
      <h1 className="admin-h1">
        Send <em>credentials</em>
      </h1>
      <p className="admin-sub">
        Emails each team leader their team number and login code. Do this the night before the event; hand out{" "}
        <Link href="/admin/print" style={{ textDecoration: "underline" }}>printed chits</Link> at check-in as the backup —
        college networks and inboxes are unreliable on the day.
      </p>
      {!mailConfigured() && (
        <div className="notice admin-section">
          Email isn&rsquo;t set up yet. Add <span className="mono">SMTP_HOST</span>, <span className="mono">SMTP_USER</span>,{" "}
          <span className="mono">SMTP_PASS</span> and <span className="mono">MAIL_FROM</span> in Vercel (a Gmail app password
          works for up to ~500 emails a day), then redeploy. Until then, use the print sheet.
        </div>
      )}
      <CredentialSender teams={teams} enabled={mailConfigured()} />
    </>
  );
}
