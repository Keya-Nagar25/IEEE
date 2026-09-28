import Link from "next/link";

export default function NotFound() {
  return (
    <main className="auth" style={{ minHeight: "100dvh" }}>
      <div className="auth-card" style={{ textAlign: "center" }}>
        <h1 className="page-title">
          Page <em>not found</em>
        </h1>
        <p className="page-lede" style={{ margin: "16px auto 0" }}>
          That link doesn&rsquo;t go anywhere.
        </p>
        <div className="row" style={{ justifyContent: "center", marginTop: 24 }}>
          <Link href="/" className="btn btn-solid">
            Back home
          </Link>
        </div>
      </div>
    </main>
  );
}
