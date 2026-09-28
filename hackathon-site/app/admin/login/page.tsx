import type { Metadata } from "next";
import { redirect } from "next/navigation";
import InnerShell from "@/components/InnerShell";
import { Sparkle } from "@/components/icons";
import { getAdmin } from "@/lib/session";
import AdminLoginForm from "./AdminLoginForm";

export const metadata: Metadata = { title: "Admin login", robots: { index: false } };

export default async function AdminLoginPage() {
  if (await getAdmin().catch(() => null)) redirect("/admin");
  return (
    <InnerShell cta={{ label: "Back to site", href: "/" }} mainClassName="auth">
      <div className="auth-card">
        <span className="badge">
          <Sparkle />
          Organizers only
        </span>
        <h1 className="page-title" style={{ marginTop: 20 }}>
          Admin <em>panel</em>
        </h1>
        <AdminLoginForm />
      </div>
    </InnerShell>
  );
}
