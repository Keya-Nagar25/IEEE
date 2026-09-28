import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/icons";
import LogoutButton from "@/components/LogoutButton";
import { event } from "@/lib/event";
import { getAdmin } from "@/lib/session";
import AdminTabs from "./AdminTabs";

export const metadata: Metadata = { title: { default: "Admin", template: `%s · Admin — ${event.name}` }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <div className="page" style={{ gridTemplateRows: "auto 1fr" }}>
      <header className="admin-bar">
        <Link href="/admin" className="logo">
          <LogoMark />
          <span>
            {event.wordmark.main}
            <span className="logo-suffix"> Admin</span>
          </span>
        </Link>
        <AdminTabs />
        <div className="row">
          <span className="muted" style={{ fontSize: 13 }}>
            {admin.name}
          </span>
          <Link href="/" className="btn btn-ghost btn-sm">
            View site
          </Link>
          <LogoutButton kind="admin" className="btn btn-ghost btn-sm" />
        </div>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
