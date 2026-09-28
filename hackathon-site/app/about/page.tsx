import type { Metadata } from "next";
import InnerShell from "@/components/InnerShell";
import { Lock, Sparkle } from "@/components/icons";
import { headerCta } from "@/lib/cta";
import { event } from "@/lib/event";
import { formatDateRange, formatDateTime } from "@/lib/format";
import { getSettingsSafe, phaseOf } from "@/lib/settings";

export const revalidate = 300;
export const metadata: Metadata = { title: "About", description: event.about.intro };

export default async function AboutPage() {
  const s = await getSettingsSafe();
  const dates = formatDateRange(s.eventStart, s.submissionDeadline);
  const revealed = s.themeRevealed && s.themeTitle.trim();

  return (
    <InnerShell current="/about" cta={headerCta(phaseOf(s))} dates={dates}>
      <div className="page-head">
        <span className="badge">
          <Sparkle />
          About the event
        </span>
        <h1 className="page-title">
          Twenty-four hours to <em>build it for real</em>
        </h1>
        <p className="page-lede">{event.about.intro}</p>
      </div>

      <section className="section">
        <div className="section-label">Theme</div>
        {revealed ? (
          <div className="theme-reveal">
            <div className="panel-title">Theme</div>
            <div className="theme-reveal-title">{s.themeTitle}</div>
            {s.themeDescription && <p>{s.themeDescription}</p>}
          </div>
        ) : (
          <div className="theme-reveal">
            <div className="theme-locked">
              <Lock />
              <div>
                <div className="section-title" style={{ margin: 0 }}>
                  Revealed at <em>kick-off</em>
                </div>
                <p className="muted" style={{ marginTop: 4 }}>
                  The theme drops at {formatDateTime(s.eventStart)}. Everyone hears it at the same time.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-label">Format</div>
        <ol className="steps">
          {event.about.format.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <section className="section">
        <div className="section-label">Eligibility</div>
        <ul className="ticks">
          {event.about.eligibility.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="section">
        <div className="section-label">Prizes</div>
        <div className="prizes">
          {event.about.prizes.map((p) => (
            <div className="prize" key={p.place}>
              <div className="prize-place">{p.place}</div>
              <div className="prize-reward">{p.reward}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-label">When &amp; where</div>
        <dl className="kv">
          <dt>Dates</dt>
          <dd>{dates}</dd>
          <dt>Kick-off</dt>
          <dd>{formatDateTime(s.eventStart)}</dd>
          <dt>Deadline</dt>
          <dd>{formatDateTime(s.submissionDeadline)}</dd>
          <dt>Venue</dt>
          <dd>{event.venue}</dd>
        </dl>
      </section>
    </InnerShell>
  );
}
