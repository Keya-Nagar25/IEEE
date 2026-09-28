import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminTeams } from "@/lib/admin-teams";
import { event } from "@/lib/event";
import { siteUrl } from "@/lib/format";
import { getAdmin } from "@/lib/session";
import PrintButton from "./PrintButton";

export const metadata: Metadata = { title: "Credential chits", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Cut-out chits for check-in (plan §7): team number, name, login code, where to log in. */
export default async function PrintPage() {
  if (!(await getAdmin())) redirect("/admin/login");
  const teams = (await getAdminTeams()).filter((t) => t.status !== "disqualified");
  const loginUrl = `${siteUrl().replace(/^https?:\/\//, "")}/team/login`;

  return (
    <main className="print-page">
      <div className="row-between no-print" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="admin-h1">
            Credential <em>chits</em>
          </h1>
          <p className="admin-sub">{teams.length} teams. Print, cut along the dashed lines, hand one to each leader at check-in.</p>
        </div>
        <div className="row">
          <Link href="/admin/teams" className="btn btn-ghost">
            Back
          </Link>
          <PrintButton />
        </div>
      </div>
      <div className="print-grid">
        {teams.map((t) => (
          <div className="chit" key={t.id}>
            <div className="chit-event">{event.name} · team login</div>
            <div className="chit-team">
              #{t.teamNumber} · {t.name}
            </div>
            <div className="chit-row">
              <span>Team number</span>
              <span className="chit-code">{t.teamNumber}</span>
            </div>
            <div className="chit-row">
              <span>Login code</span>
              <span className="chit-code">{t.code ?? "regenerate"}</span>
            </div>
            <div className="chit-row">
              <span>Log in at</span>
              <span className="mono">{loginUrl}</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
