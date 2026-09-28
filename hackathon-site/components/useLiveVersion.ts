"use client";

import { useEffect, useState } from "react";

export type LiveMode = "connecting" | "live" | "polling";

const bucket = (ms: number) => Math.floor(Date.now() / ms);

/**
 * Subscribes to the `live_signals` row through Supabase Realtime and returns its
 * latest timestamp. Components refetch `/api/leaderboard?v=<version>` whenever it
 * changes — every browser asks for the same URL, so the CDN answers almost all of
 * them. Without Realtime (env not set, socket dropped) it falls back to polling
 * every 30s using a shared time bucket, which is just as cache-friendly.
 */
export function useLiveVersion() {
  const [version, setVersion] = useState("");
  const [mode, setMode] = useState<LiveMode>("connecting");

  useEffect(() => {
    let stopped = false;
    let poll: ReturnType<typeof setInterval> | undefined;
    let teardown = () => {};

    const startPolling = () => {
      if (stopped) return;
      setMode("polling");
      clearInterval(poll);
      poll = setInterval(() => setVersion(`poll-${bucket(30_000)}`), 30_000);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") setVersion(`focus-${bucket(10_000)}`);
    };
    document.addEventListener("visibilitychange", onVisible);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      startPolling();
    } else {
      import("@supabase/supabase-js")
        .then(({ createClient }) => {
          if (stopped) return;
          const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
          const channel = sb
            .channel("leaderboard-signal")
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "live_signals", filter: "key=eq.leaderboard" },
              (payload) => {
                const v = (payload.new as { bumped_at?: string } | null)?.bumped_at;
                if (v) setVersion(v);
              },
            )
            .subscribe((status) => {
              if (status === "SUBSCRIBED") {
                clearInterval(poll);
                setMode("live");
                // We may have missed a change while (re)connecting.
                setVersion((v) => (v ? `sub-${bucket(10_000)}` : v));
              } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
                startPolling();
              }
            });
          teardown = () => void sb.removeChannel(channel);
        })
        .catch(startPolling);
    }

    return () => {
      stopped = true;
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      teardown();
    };
  }, []);

  return { version, mode };
}
