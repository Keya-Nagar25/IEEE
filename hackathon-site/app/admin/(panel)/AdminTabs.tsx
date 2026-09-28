"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/import", label: "Import" },
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/scores", label: "Scores" },
  { href: "/admin/leaderboard", label: "Leaderboard" },
  { href: "/admin/send-credentials", label: "Credentials" },
];

export default function AdminTabs() {
  const path = usePathname();
  return (
    <nav className="admin-tabs" aria-label="Admin">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className="admin-tab" aria-current={path === t.href ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
