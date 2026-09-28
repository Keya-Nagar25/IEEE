import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { event } from "@/lib/event";
import { LogoMark } from "./icons";
import PageEnhancer from "./PageEnhancer";

export type Cta = { label: string; href: string; external?: boolean };

const delay = (d: string) => ({ "--d": d }) as CSSProperties;
const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

// Entrance motion per nav slot (prompt: scale / soft / scale / soft, 0.16s → 0.52s).
const NAV_MOTION = [
  ["appear--scale", "0.16s"],
  ["appear--soft", "0.28s"],
  ["appear--scale", "0.40s"],
  ["appear--soft", "0.52s"],
];

export default function SiteHeader({
  animate = false,
  current,
  cta,
  ctaNode,
  logoHref = "/",
}: {
  animate?: boolean; // landing entrance motion
  current?: string; // marks the active nav link
  cta?: Cta;
  ctaNode?: ReactNode; // replaces the CTA link (e.g. a log-out button)
  logoHref?: string;
}) {
  const motion = (mod: string, d: string) =>
    animate ? { className: `appear ${mod}`, style: delay(d) } : { className: "", style: undefined };

  const logo = motion("appear--scale", "0.08s");
  const ctaMotion = motion("appear--scale", "0.34s");
  const logoInner = (
    <>
      <LogoMark />
      <span>
        {event.wordmark.main}
        <span className="logo-suffix">{event.wordmark.suffix}</span>
      </span>
    </>
  );

  return (
    <header className="header">
      {logoHref.startsWith("#") ? (
        <a href={logoHref} className={cx("logo", logo.className)} style={logo.style} aria-label={event.name}>
          {logoInner}
        </a>
      ) : (
        <Link href={logoHref} className={cx("logo", logo.className)} style={logo.style} aria-label={event.name}>
          {logoInner}
        </Link>
      )}

      <nav id="site-nav" className="nav" aria-label="Primary">
        {event.nav.map((item, i) => {
          const m = motion(NAV_MOTION[i % 4][0], NAV_MOTION[i % 4][1]);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cx("nav-link", m.className)}
              style={m.style}
              aria-current={current === item.href ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {ctaNode ??
        (cta &&
          (cta.external ? (
            <a
              href={cta.href}
              target="_blank"
              rel="noopener noreferrer"
              className={cx("btn btn-solid header-cta", ctaMotion.className)}
              style={ctaMotion.style}
            >
              {cta.label}
            </a>
          ) : (
            <Link href={cta.href} className={cx("btn btn-solid header-cta", ctaMotion.className)} style={ctaMotion.style}>
              {cta.label}
            </Link>
          )))}

      <button
        type="button"
        className={cx("burger", ctaMotion.className)}
        style={ctaMotion.style}
        aria-controls="site-nav"
        aria-expanded="false"
        aria-label="Open menu"
      >
        <span className="burger-bars" aria-hidden="true">
          <span className="burger-bar" />
          <span className="burger-bar" />
          <span className="burger-bar" />
        </span>
      </button>

      <PageEnhancer />
    </header>
  );
}
