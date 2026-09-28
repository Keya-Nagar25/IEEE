import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { FAVICON, Grain } from "@/components/icons";
import { event } from "@/lib/event";
import { siteUrl } from "@/lib/format";
import "./landing.css";
import "./site.css";

const title = `${event.name} — ${event.shortTagline}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: title, template: `%s — ${event.name}` },
  description: event.description,
  icons: { icon: FAVICON },
  openGraph: { type: "website", siteName: event.name, title, description: event.description },
  twitter: { card: "summary_large_image", title, description: event.description },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
  colorScheme: "dark",
};

const FONTS =
  "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900&family=Instrument+Serif:ital@1&display=swap";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Force black before any stylesheet loads so the page can never flash white. */}
        <style dangerouslySetInnerHTML={{ __html: "html,body{background:#000000!important;color:#ffffff}" }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS} />
      </head>
      <body style={{ background: "#000", color: "#fff" }}>
        <Grain />
        {children}
      </body>
    </html>
  );
}
