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
      <div className="w-full max-w-3xl mx-auto p-3 sm:p-4">
        <header className="kp-header flex items-center justify-between gap-3 px-4 py-3.5 mb-4 kp-fade">
          <div className="flex items-center gap-3 min-w-0">
            <Logo url={branding?.logo_url} name={branding?.campaign_name ?? "Kafool+"} size={42} />
            <div className="min-w-0">
              <div className="font-extrabold truncate leading-tight">{branding?.campaign_name ?? "Kafool+"}</div>
              {subtitle && <div className="text-xs truncate" style={{ color: "#aebbd6" }}>{subtitle}</div>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {right}
            {session && (
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-sm font-semibold">{session.display_name}</span>
                <span className="text-[11px]" style={{ color: "#aebbd6" }}>{ROLE_LABEL[session.role]}</span>
              </div>
            )}
            <button
              onClick={async () => {
                logout();
                await createClient().auth.signOut();
                router.push("/kafool-plus-login");
              }}
              className="text-sm px-3 py-1.5 rounded-lg font-semibold transition-colors"
              style={{ background: "rgba(255,255,255,.12)", color: "#fff" }}
            >
              יציאה
            </button>
          </div>
        </header>
        {branding?.banner_url && (
          // top-of-page banner — shown on mobile
          // eslint-disable-next-line @next/next/no-img-element
          <img src={branding.banner_url} alt="" className="md:hidden w-full rounded-2xl mb-4 object-cover kp-fade" style={{ maxHeight: 160 }} />
        )}
        <main className="flex-1 w-full">{children}</main>
      </div>
    </div>
  );
}
