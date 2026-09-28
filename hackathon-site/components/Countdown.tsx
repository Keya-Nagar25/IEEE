"use client";

import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

export function splitDuration(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(t / 86400), h: Math.floor((t % 86400) / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 };
}

/** 12d 04h 33m 09s */
export function formatLong(ms: number) {
  const { d, h, m, s } = splitDuration(ms);
  return `${d ? `${d}d ` : ""}${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}

/** 05:12:44 (hours can exceed 24) */
export function formatClock(ms: number) {
  const { d, h, m, s } = splitDuration(ms);
  return `${pad(d * 24 + h)}:${pad(m)}:${pad(s)}`;
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Badge text on the landing page: counts down to kick-off, then to the deadline. */
export default function Countdown({ start, deadline, fallback }: { start: string; deadline: string; fallback: string }) {
  const now = useNow();
  if (now == null) return <span>{fallback}</span>;
  const s = Date.parse(start);
  const e = Date.parse(deadline);
  if (now < s) return <span>Starts in {formatLong(s - now)}</span>;
  if (now < e) return <span>Live now · submissions close in {formatClock(e - now)}</span>;
  return <span>Submissions closed · results soon</span>;
}
