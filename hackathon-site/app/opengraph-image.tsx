import { ImageResponse } from "next/og";
import { event } from "@/lib/event";

export const alt = `${event.name} — ${event.shortTagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Link-preview card in the same black / metal language as the site.
export default function OpengraphImage() {
  const { line1, line2 } = event.hero;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#000",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 34, fontWeight: 600, letterSpacing: -1 }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="white">
            <g transform="rotate(-30 12 12)">
              <circle cx="7.3" cy="3.2" r="1.45" />
              <rect x="5.5" y="4.7" width="3.6" height="14.6" rx="1.8" />
              <rect x="14.9" y="4.7" width="3.6" height="14.6" rx="1.8" />
              <circle cx="16.7" cy="20.8" r="1.45" />
            </g>
          </svg>
          {event.name}
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 76, fontWeight: 500, letterSpacing: -3, lineHeight: 1.1 }}>
          <div style={{ display: "flex" }}>
            {line1.before}
            <span style={{ color: "#9a9a9a", fontStyle: "italic", margin: "0 18px" }}>{line1.em}</span>
            {line1.after}
          </div>
          <div style={{ display: "flex" }}>{line2}</div>
        </div>
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            padding: "14px 22px",
            borderRadius: 8,
            fontSize: 26,
            background: "linear-gradient(90deg, #7d7d7d 0%, #2a2a2a 52%, #0a0a0a 100%)",
            color: "#f2f2f2",
          }}
        >
          {event.shortTagline} · {event.venue}
        </div>
      </div>
    ),
    size,
  );
}
