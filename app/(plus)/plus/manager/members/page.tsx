"use client";

import { useMemo, useState } from "react";
import { useStore, descendantCampaignIds } from "@/lib/plus/store";
import { useRequireRole } from "@/lib/plus/useAuth";
import AppShell from "@/components/plus/AppShell";
import ThemeRoot from "@/components/plus/ThemeRoot";
import ManagerNav from "@/components/plus/ManagerNav";
import { Modal, Field, Input, Textarea } from "@/components/plus/ui";

const ROLE_LABEL: Record<string, string> = { super_admin: "מנהל מערכת", manager: "מנהל ראשי", coordinator: "רכז", caller: "טלפן" };

export default function MembersPage() {
  const session = useRequireRole(["manager"]);
  const rootId = session?.campaign_id ?? null;
  const campaigns = useStore((s) => s.campaigns);
  const members = useStore((s) => s.members);
  const approveToPool = useStore((s) => s.approveToPool);
  const rejectMember = useStore((s) => s.rejectMember);
  const addEmailPool = useStore((s) => s.addEmailPool);
  const addMember = useStore((s) => s.addMember);

  const treeIds = useMemo(() => (rootId ? descendantCampaignIds(campaigns, rootId) : []), [campaigns, rootId]);
  const subCampaigns = campaigns.filter((c) => c.parent_campaign_id === rootId);

  const scoped = members.filter((m) => (m.campaign_id && treeIds.includes(m.campaign_id)) || m.campaign_id === rootId);
  const pending = scoped.filter((m) => m.status === "pending");
  const active = scoped.filter((m) => m.status === "active");
  // pool = active callers not yet assigned to a branch (waiting for a coordinator)
  const pool = active.filter((m) => m.role === "caller" && !m.caller_group_id);
  const assigned = active.filter((m) => !(m.role === "caller" && !m.caller_group_id));

  const [showPool, setShowPool] = useState(false);
  const [poolText, setPoolText] = useState("");
  const [poolResult, setPoolResult] = useState<{ added: number; skipped: number } | null>(null);
  const [showCoord, setShowCoord] = useState(false);
  const [coord, setCoord] = useState({ email: "", campaign: "" });

  if (!session) return null;

  const campName = (id?: string | null) => campaigns.find((c) => c.id === id)?.name ?? "—";

  return (
    <ThemeRoot campaignId={rootId}>
      <AppShell subtitle="הרשאות ומאגר מיילים">
        <ManagerNav />

        <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
          <h2 className="font-bold text-lg">הרשאות</h2>
          <div className="flex gap-2">
            <button onClick={() => { setPoolResult(null); setPoolText(""); setShowPool(true); }} className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold">+ הוסף מאגר מיילים</button>
            <button onClick={() => { setCoord({ email: "", campaign: subCampaigns[0]?.id ?? "" }); setShowCoord(true); }} className="btn-ghost px-4 py-2 rounded-xl text-sm font-semibold" style={{ borderColor: "var(--border)" }}>+ הוסף רכז</button>
          </div>
        </div>

        <p className="text-xs text-muted mb-4">
          המנהל מכניס מיילים למאגר ומאשר בקשות — <b>השיוך לסניף נעשה ע״י הרכז</b> במסך שלו.
        </p>

        {/* pending requests → one-click approve into the pool */}
        {pending.length > 0 && (
          <div className="card p-4 mb-4" style={{ borderColor: "var(--accent)", borderWidth: 2 }}>
            <div className="font-semibold mb-2">⏳ בקשות הצטרפות ({pending.length})</div>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {pending.map((m) => (
                <div key={m.id} className="flex items-center gap-2 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate" dir="ltr">{m.email}</div>
                    <div className="text-xs text-muted">ביקש: {campName(m.campaign_id)}</div>
                  </div>
                  <button onClick={() => approveToPool(m.id)} className="btn-primary px-3 py-1.5 rounded-lg text-sm">אשר למאגר</button>
                  <button onClick={() => rejectMember(m.id)} className="text-sm text-red-500 px-2">דחה</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* email pool — waiting for a coordinator to assign */}
        {pool.length > 0 && (
          <div className="card p-4 mb-4">
            <div className="font-semibold mb-1">📥 מאגר מיילים — ממתינים לשיוך ע״י רכז ({pool.length})</div>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {pool.map((m) => (
                <div key={m.id} className="flex items-center gap-2 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate" dir="ltr">{m.email}</div>
                    <div className="text-xs text-muted">{campName(m.campaign_id)}</div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full text-white whitespace-nowrap" style={{ background: "var(--accent)", color: "#1a1a1a" }}>במאגר</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* assigned / staff */}
        <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
          {assigned.map((m) => (
            <div key={m.id} className="flex items-center gap-2 p-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate" dir="ltr">{m.email}</div>
                <div className="text-xs text-muted">{ROLE_LABEL[m.role]} · {campName(m.campaign_id)}</div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--bg)" }}>פעיל</span>
            </div>
          ))}
        </div>

        {/* bulk email pool modal */}
        <Modal open={showPool} onClose={() => setShowPool(false)} title="הוספת מאגר מיילים">
          {poolResult ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-2">📥</div>
              <p>נוספו למאגר <b>{poolResult.added}</b> מיילים{poolResult.skipped > 0 ? ` · ${poolResult.skipped} כבר קיימים/לא תקינים` : ""}.</p>
              <p className="text-sm text-muted mt-1">הרכזים ישייכו אותם לסניפים שלהם.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted mb-3">הדבק רשימת מיילים — מופרדים בפסיק, רווח או שורה חדשה.</p>
              <Field label="מיילים">
                <Textarea rows={6} value={poolText} onChange={(e) => setPoolText(e.target.value)} dir="ltr" placeholder={"caller1@gmail.com\ncaller2@gmail.com\ncaller3@gmail.com"} />
              </Field>
              <button
                disabled={!poolText.trim()}
                onClick={() => {
                  const emails = poolText.split(/[\s,;]+/).filter(Boolean);
                  setPoolResult(addEmailPool(rootId!, emails));
                }}
                className="btn-primary w-full py-2.5 rounded-lg font-semibold disabled:opacity-50"
              >
                הוסף למאגר
              </button>
            </>
          )}
        </Modal>

        {/* add coordinator (manager's job) */}
        <Modal open={showCoord} onClose={() => setShowCoord(false)} title="הוספת רכז לסניף">
          <p className="text-sm text-muted mb-3">כשהרכז יתחבר עם Google באותו מייל — ייכנס ישר כרכז הסניף.</p>
          <Field label="אימייל הרכז"><Input type="email" dir="ltr" value={coord.email} onChange={(e) => setCoord({ ...coord, email: e.target.value })} /></Field>
          <Field label="סניף">
            <select value={coord.campaign} onChange={(e) => setCoord({ ...coord, campaign: e.target.value })} className="w-full px-3 py-2 rounded-lg border bg-transparent" style={{ borderColor: "var(--border)" }}>
              {subCampaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <button
            disabled={!coord.email || !coord.campaign}
            onClick={() => {
              addMember({ organization_id: session.organization_id, email: coord.email, user_id: null, role: "coordinator", campaign_id: coord.campaign, caller_group_id: null, status: "active", auth_provider: "google", is_active: true });
              setShowCoord(false);
            }}
            className="btn-primary w-full py-2.5 rounded-lg font-semibold disabled:opacity-50"
          >
            הוסף רכז
          </button>
        </Modal>
      </AppShell>
    </ThemeRoot>
  );
}
