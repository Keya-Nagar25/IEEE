import type { ReactNode } from "react";
import SiteFooter from "./SiteFooter";
import SiteHeader, { type Cta } from "./SiteHeader";

export default function InnerShell({
  current,
  cta,
  ctaNode,
  dates,
  mainClassName = "inner",
  children,
}: {
  current?: string;
  cta?: Cta;
  ctaNode?: ReactNode;
  dates?: string;
  mainClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="page">
      <div className="menu-backdrop" aria-hidden="true" />
      <SiteHeader current={current} cta={cta} ctaNode={ctaNode} />
      <main className={mainClassName}>{children}</main>
      <SiteFooter dates={dates} />
    </div>
  );
}
