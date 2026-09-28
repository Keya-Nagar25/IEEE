import type { CSSProperties } from "react";
import Countdown from "@/components/Countdown";
import { Sparkle, StatAvatars, StatDownload, StatWorkflow } from "@/components/icons";
import SiteHeader from "@/components/SiteHeader";
import { headerCta } from "@/lib/cta";
import { event } from "@/lib/event";
import { formatDateRange } from "@/lib/format";
import { getSettingsSafe, phaseOf } from "@/lib/settings";

// Served from the CDN; regenerated at most every 5 minutes, or immediately when an admin changes settings.
export const revalidate = 300;

const HERO_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260818_072341_50851634-bbc3-4c33-9acc-7647d4db44aa.mp4";

// Raw HTML so `muted`/`playsinline` are in the server markup and autoplay starts before hydration.
const VIDEO_HTML = `<video src="${HERO_VIDEO}" autoplay muted loop playsinline preload="auto" disablepictureinpicture disableremoteplayback></video>`;

const d = (delay: string) => ({ "--d": delay }) as CSSProperties;
const STAT_ICONS = [StatWorkflow, StatDownload, StatAvatars];
const STAT_DELAYS = ["1.12s", "1.28s", "1.44s"];

export default async function Home() {
  const settings = await getSettingsSafe();
  const phase = phaseOf(settings);
  const dates = formatDateRange(settings.eventStart, settings.submissionDeadline);
  const { hero } = event;

  const actions =
    phase === "pre"
      ? [
          { label: hero.primaryCta, href: event.registerUrl, external: true },
          { label: hero.secondaryCta, href: event.whatsappUrl, external: true },
        ]
      : [
          { label: "Team Login", href: "/team/login", external: false },
          { label: "Live Leaderboard", href: "/leaderboard", external: false },
        ];
  const ext = (external: boolean) => (external ? { target: "_blank", rel: "noopener noreferrer" } : {});

  return (
    <>
      <div className="hero-photo" aria-hidden="true" dangerouslySetInnerHTML={{ __html: VIDEO_HTML }} />

      <div className="page page--landing">
        <div className="menu-backdrop" aria-hidden="true" />

        <SiteHeader animate logoHref="#top" cta={headerCta(phase)} />

        <main className="hero" id="top">
          <div className="hero-copy">
            <span className="badge appear appear--pop" style={d("0.22s")}>
              <Sparkle />
              <Countdown
                start={settings.eventStart}
                deadline={settings.submissionDeadline}
                fallback={`${dates} · ${hero.badgeFallback}`}
              />
            </span>

            <h1>
              <span className="headline-line">
                <span className="headline-text appear appear--mask" style={d("0.42s")}>
                  {hero.line1.before}
                  <em>{hero.line1.em}</em>
                  {hero.line1.after}
                </span>
              </span>
              <span className="headline-line">
                <span className="headline-text appear appear--mask" style={d("0.62s")}>
                  {hero.line2}
                </span>
              </span>
            </h1>

            <p className="lede appear appear--soft" style={d("0.82s")}>
              {hero.lede}
            </p>

            <div className="hero-actions">
              <a className="btn btn-solid appear appear--btn" style={d("0.96s")} href={actions[0].href} {...ext(actions[0].external)}>
                {actions[0].label}
              </a>
              <a className="btn btn-ghost appear appear--side" style={d("1.10s")} href={actions[1].href} {...ext(actions[1].external)}>
                {actions[1].label}
              </a>
            </div>
          </div>
        </main>

        <footer className="stats">
          {event.stats.map((label, i) => {
            const Icon = STAT_ICONS[i % STAT_ICONS.length];
            return (
              <span key={label} className="stat appear appear--stat" style={d(STAT_DELAYS[i % 3])}>
                <Icon />
                {label}
              </span>
            );
          })}
        </footer>
      </div>
    </>
  );
}
