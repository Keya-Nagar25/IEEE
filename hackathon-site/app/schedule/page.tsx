import type { Metadata } from "next";
import InnerShell from "@/components/InnerShell";
import { Sparkle } from "@/components/icons";
import { headerCta } from "@/lib/cta";
import { event } from "@/lib/event";
import { formatDateRange } from "@/lib/format";
import { getSettingsSafe, phaseOf } from "@/lib/settings";

export const revalidate = 300;
export const metadata: Metadata = { title: "Schedule", description: `Day-of timeline for ${event.name}.` };

export default async function SchedulePage() {
  const s = await getSettingsSafe();
  const dates = formatDateRange(s.eventStart, s.submissionDeadline);

  return (
    <InnerShell current="/schedule" cta={headerCta(phaseOf(s))} dates={dates}>
      <div className="page-head">
        <span className="badge">
          <Sparkle />
          {dates}
        </span>
        <h1 className="page-title">
          From check-in <em>to closing</em>
        </h1>
        <p className="page-lede">
          All times are local ({event.timezone.replace("_", " ")}). Announcements during the event go out on the WhatsApp
          group first.
        </p>
      </div>

      <section className="section">
        <div className="section-label">Timeline</div>
        <ol className="timeline">
          {event.schedule.map((item) => (
            <li key={`${item.day}-${item.time}-${item.title}`}>
              <div className="tl-when">
                <span className="tl-time">{item.time}</span>
                <span className="tl-day">{item.day}</span>
              </div>
              <div>
                <div className="tl-title">{item.title}</div>
                {item.detail && <div className="tl-detail">{item.detail}</div>}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </InnerShell>
  );
}
