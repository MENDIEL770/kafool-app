"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/lib/plus/store";
import { createClient } from "@/lib/supabase/client";
import Logo from "./Logo";
import type { CampaignBranding } from "@/lib/plus/types";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "מנהל מערכת",
  manager: "מנהל ראשי",
  coordinator: "רכז סניף",
  caller: "טלפן",
};

export default function AppShell({
  children,
  branding,
  subtitle,
  right,
}: {
  children: React.ReactNode;
  branding?: Partial<CampaignBranding>;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const router = useRouter();
  const session = useStore((s) => s.session);
  const logout = useStore((s) => s.logout);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <header
        className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 border-b border-themed surface"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Logo url={branding?.logo_url} name={branding?.campaign_name ?? "Kafool+"} size={40} />
          <div className="min-w-0">
            <div className="font-bold truncate">{branding?.campaign_name ?? "Kafool+"}</div>
            {subtitle && <div className="text-xs text-muted truncate">{subtitle}</div>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {right}
          {session && (
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-sm font-medium">{session.display_name}</span>
              <span className="text-xs text-muted">{ROLE_LABEL[session.role]}</span>
            </div>
          )}
          <button
            onClick={async () => {
              logout();
              await createClient().auth.signOut();
              router.push("/kafool-plus-login");
            }}
            className="btn-ghost text-sm px-3 py-1.5 rounded-lg"
            style={{ borderColor: "var(--border)" }}
          >
            יציאה
          </button>
        </div>
      </header>
      <main className="flex-1 w-full max-w-6xl mx-auto p-4">{children}</main>
    </div>
  );
}
