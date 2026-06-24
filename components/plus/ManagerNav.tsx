"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/plus/manager", label: "לוח בקרה" },
  { href: "/plus/manager/import", label: "1. ייבוא אקסל" },
  { href: "/plus/manager/callers", label: "2. טלפנים" },
  { href: "/plus/manager/filter", label: "3. סינון" },
  { href: "/plus/manager/assign", label: "4. שיוך" },
  { href: "/plus/manager/branding", label: "🎨 מיתוג" },
  { href: "/plus/manager/members", label: "הרשאות" },
];

export default function ManagerNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-2 overflow-x-auto no-scrollbar mb-4 -mx-4 px-4">
      {TABS.map((t) => {
        const active = path === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className="whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium transition"
            style={{
              background: active ? "var(--primary)" : "var(--surface)",
              color: active ? "#fff" : "var(--text)",
              border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`,
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
