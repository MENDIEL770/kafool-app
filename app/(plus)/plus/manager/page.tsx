"use client";

import { useMemo, useState } from "react";
import { useStore, descendantCampaignIds } from "@/lib/plus/store";
import { useRequireRole } from "@/lib/plus/useAuth";
import AppShell from "@/components/plus/AppShell";
import ThemeRoot from "@/components/plus/ThemeRoot";
import ManagerNav from "@/components/plus/ManagerNav";
import { StatCard, Progress, Modal, Field, Input } from "@/components/plus/ui";

export default function ManagerDashboard() {
  const session = useRequireRole(["manager"]);

  const campaigns = useStore((s) => s.campaigns);
  const callerGroups = useStore((s) => s.callerGroups);
  const leads = useStore((s) => s.leads);
  const promises = useStore((s) => s.promises);
  const calls = useStore((s) => s.calls);
  const branding = useStore((s) => s.branding);
  const addSubCampaign = useStore((s) => s.addSubCampaign);
  const addMasterCampaign = useStore((s) => s.addMasterCampaign);
  const updateCampaignStyle = useStore((s) => s.updateCampaignStyle);

  // root = the manager's campaign, else the org's first master campaign
  const topLevel = useMemo(() => campaigns.filter((c) => c.parent_campaign_id === null), [campaigns]);
  const rootId = session?.campaign_id ?? topLevel[0]?.id ?? null;
  const root = campaigns.find((c) => c.id === rootId);
  const brand = branding.find((b) => b.campaign_id === rootId) ?? branding[0];
  const subCampaigns = useMemo(() => campaigns.filter((c) => c.parent_campaign_id === rootId), [campaigns, rootId]);
  const treeIds = useMemo(() => (rootId ? descendantCampaignIds(campaigns, rootId) : []), [campaigns, rootId]);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", goal: "300000" });
  const [firstForm, setFirstForm] = useState<{ name: string; goal: string; style: "hierarchical" | "flat" }>({ name: "", goal: "1000000", style: "hierarchical" });

  if (!session) return null;

  // No master campaign yet → onboarding: create the first one.
  if (!root) {
    return (
      <ThemeRoot>
        <AppShell subtitle="מנהל ראשי">
          <div className="card p-8 max-w-md mx-auto mt-8 text-center">
            <div className="text-4xl mb-2">🚀</div>
            <h2 className="font-bold text-lg mb-1">בוא נתחיל</h2>
            <p className="text-sm text-muted mb-4">עדיין אין קמפיין מוקד לארגון. צור קמפיין-על ראשון כדי לפתוח את לוח הבקרה.</p>
            <div className="text-right">
              <Field label="שם הקמפיין"><Input value={firstForm.name} onChange={(e) => setFirstForm({ ...firstForm, name: e.target.value })} placeholder="לדוג׳ — גיוס שנתי" /></Field>
              <Field label="יעד (₪)"><Input type="number" value={firstForm.goal} onChange={(e) => setFirstForm({ ...firstForm, goal: e.target.value })} dir="ltr" /></Field>
              <div className="mb-3">
                <span className="block text-sm font-medium mb-1">סגנון הקמפיין</span>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setFirstForm({ ...firstForm, style: "hierarchical" })}
                    className={`rounded-xl border p-2.5 text-right transition-colors ${firstForm.style === "hierarchical" ? "border-2" : ""}`}
                    style={{ borderColor: firstForm.style === "hierarchical" ? "var(--primary)" : "var(--border)", background: firstForm.style === "hierarchical" ? "var(--bg)" : "transparent" }}>
                    <span className="block text-sm font-bold">היררכי</span>
                    <span className="block text-[11px] text-muted">סניפים + רכזים</span>
                  </button>
                  <button type="button" onClick={() => setFirstForm({ ...firstForm, style: "flat" })}
                    className={`rounded-xl border p-2.5 text-right transition-colors ${firstForm.style === "flat" ? "border-2" : ""}`}
                    style={{ borderColor: firstForm.style === "flat" ? "var(--primary)" : "var(--border)", background: firstForm.style === "flat" ? "var(--bg)" : "transparent" }}>
                    <span className="block text-sm font-bold">שטוח</span>
                    <span className="block text-[11px] text-muted">קמפיין בודד</span>
                  </button>
                </div>
              </div>
              <button
                disabled={!firstForm.name.trim()}
                onClick={() => addMasterCampaign(firstForm.name.trim(), Number(firstForm.goal) || 0, firstForm.style)}
                className="btn-primary w-full py-2.5 rounded-lg font-semibold disabled:opacity-50"
              >
                צור קמפיין
              </button>
            </div>
          </div>
        </AppShell>
      </ThemeRoot>
    );
  }

  const allPromised = promises.reduce((s, p) => s + p.amount, 0);
  const totalLeads = leads.filter((l) => treeIds.includes(l.campaign_id)).length;
  const totalCalls = calls.length;
  const totalDonated = leads.filter((l) => treeIds.includes(l.campaign_id) && l.status === "donated").length;
  const vipCount = leads.filter((l) => treeIds.includes(l.campaign_id) && l.is_vip).length;

  const branchRanking = subCampaigns
    .map((sc) => {
      const cgs = callerGroups.filter((c) => c.campaign_id === sc.id);
      const promised = promises.filter((p) => cgs.some((c) => c.id === p.caller_group_id)).reduce((s, p) => s + p.amount, 0);
      return { sc, callers: cgs.length, promised };
    })
    .sort((a, b) => b.promised - a.promised);

  return (
    <ThemeRoot campaignId={rootId}>
      <AppShell branding={brand} subtitle="מנהל ראשי · לוח בקרה ארצי">
        <ManagerNav />

        <div className="card p-4 mb-4">
          <div className="text-sm font-medium mb-2">קצב גיוס ארצי</div>
          <Progress value={allPromised} goal={root.goal_amount} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          <StatCard label="סניפים" value={subCampaigns.length} />
          <StatCard label="טלפנים" value={callerGroups.length} />
          <StatCard label="לידים" value={totalLeads} />
          <StatCard label="שיחות" value={totalCalls} />
          <StatCard label="תרמו" value={totalDonated} accent />
          <StatCard label="VIP" value={vipCount} />
        </div>

        {/* campaign style + switcher */}
        <div className="card p-3 mb-4 flex items-center justify-between gap-2">
          <div className="text-sm">
            <span className="text-muted">סגנון קמפיין: </span>
            <span className="font-bold">{root.style === "flat" ? "שטוח (קמפיין בודד)" : "היררכי (סניפים + רכזים)"}</span>
          </div>
          <button
            onClick={() => { if (confirm(root.style === "flat" ? "להפוך לקמפיין היררכי (עם סניפים ורכזים)?" : "להפוך לקמפיין שטוח? הניהול יעבור למנהל ישירות.")) updateCampaignStyle(root.id, root.style === "flat" ? "hierarchical" : "flat"); }}
            className="btn-ghost text-xs px-3 py-1.5 rounded-lg font-medium" style={{ borderColor: "var(--border)" }}
          >
            שנה לסגנון {root.style === "flat" ? "היררכי" : "שטוח"}
          </button>
        </div>

        {root.style === "flat" ? (
          <div className="card p-6 text-center text-muted">
            קמפיין שטוח — ניהול הטלפנים, הסינון והשיוך מתבצע ישירות מהלשוניות למעלה.
          </div>
        ) : (
        <>
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-lg">דירוג סניפים</h2>
          <button onClick={() => setShowAdd(true)} className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold">+ סניף חדש</button>
        </div>

        <div className="card overflow-hidden">
          {branchRanking.length === 0 ? (
            <div className="p-6 text-center text-muted">אין סניפים. צור את הראשון.</div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {branchRanking.map((r, i) => (
                <div key={r.sc.id} className="p-4 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: i === 0 ? "var(--accent)" : "var(--secondary)" }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{r.sc.name}</div>
                    <div className="text-xs text-muted truncate">{r.callers} טלפנים · רכז: {r.sc.coordinator_email ?? "—"}</div>
                  </div>
                  <div className="text-left min-w-[120px]">
                    <div className="font-bold">{r.promised.toLocaleString("he-IL")} ₪</div>
                    <div className="text-xs text-muted">מתוך {r.sc.goal_amount.toLocaleString("he-IL")}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Modal open={showAdd} onClose={() => setShowAdd(false)} title="הקמת תת-קמפיין (סניף)">
          <Field label="שם הסניף"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="אימייל הרכז (Google)"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" /></Field>
          <Field label="יעד הסניף (₪)"><Input type="number" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} /></Field>
          <button
            disabled={!form.name}
            onClick={() => { addSubCampaign(rootId!, form.name, form.email, Number(form.goal)); setShowAdd(false); setForm({ name: "", email: "", goal: "300000" }); }}
            className="btn-primary w-full py-2.5 rounded-lg font-semibold disabled:opacity-50"
          >
            צור סניף + הזמן רכז
          </button>
        </Modal>
        </>
        )}
      </AppShell>
    </ThemeRoot>
  );
}
