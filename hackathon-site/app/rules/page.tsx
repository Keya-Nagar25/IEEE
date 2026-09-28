import type { Metadata } from "next";
import Link from "next/link";
import InnerShell from "@/components/InnerShell";
import { Sparkle } from "@/components/icons";
import { getCriteriaSafe } from "@/lib/criteria";
import { headerCta } from "@/lib/cta";
import { event } from "@/lib/event";
import { formatDateRange, formatDateTime } from "@/lib/format";
import { getSettingsSafe, phaseOf } from "@/lib/settings";

export const revalidate = 300;
export const metadata: Metadata = { title: "Rules", description: `Rules and judging criteria for ${event.name}.` };

export default async function RulesPage() {
  const [s, criteria] = await Promise.all([getSettingsSafe(), getCriteriaSafe()]);
  const dates = formatDateRange(s.eventStart, s.submissionDeadline);

  return (
    <InnerShell current="/rules" cta={headerCta(phaseOf(s))} dates={dates}>
      <div className="page-head">
        <span className="badge">
          <Sparkle />
          Rules &amp; judging
        </span>
        <h1 className="page-title">
          Build fair, <em>ship fast</em>
        </h1>
        <p className="page-lede">
          Short rules, applied the same way to every team. Read them once before kick-off — the judges will.
        </p>
      </div>

      <section className="section">
        <div className="section-label">Rules</div>
        <ol className="steps">
          {event.rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ol>
      </section>

      <section className="section">
        <div className="section-label">Judging criteria</div>
        <div className="stack">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Criterion</th>
                  <th className="num">Weight</th>
                </tr>
              </thead>
              <tbody>
                {criteria.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td className="num mono">{c.weight}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="form-note">
            Each judge scores every criterion from 0 to 10. Your score is the weighted sum of the judges&rsquo; average per
            criterion, out of 10. Ties go to the team that submitted first.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="section-label">Key times</div>
        <dl className="kv">
          <dt>Build starts</dt>
          <dd>{formatDateTime(s.eventStart)}</dd>
          <dt>Submissions close</dt>
          <dd>{formatDateTime(s.submissionDeadline)}</dd>
          <dt>Full timeline</dt>
          <dd>
            <Link href="/schedule" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
              Schedule
            </Link>
          </dd>
        </dl>
      </section>
    </InnerShell>
  );
}
