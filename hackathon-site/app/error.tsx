"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="auth" style={{ minHeight: "100dvh" }}>
      <div className="auth-card" style={{ textAlign: "center" }}>
        <h1 className="page-title">
          Something <em>slipped</em>
        </h1>
        <p className="page-lede" style={{ margin: "16px auto 0" }}>
          This page couldn&rsquo;t load — usually a brief database hiccup. Try again in a few seconds.
        </p>
        <div className="row" style={{ justifyContent: "center", marginTop: 24 }}>
          <button type="button" className="btn btn-solid" onClick={reset}>
            Try again
          </button>
          <Link href="/" className="btn btn-ghost">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
