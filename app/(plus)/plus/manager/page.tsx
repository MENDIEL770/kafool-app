"use client";

import { useMemo, useState } from "react";
import { useStore, descendantCampaignIds } from "@/lib/plus/store";
import { useRequireRole } from "@/lib/plus/useAuth";
import AppShell from "@/components/plus/AppShell";
import ThemeRoot from "@/components/plus/ThemeRoot";
import ManagerNav from "@/components/plus/ManagerNav";
import { StatCard, Progress, Modal, Field, Input } from "@/components/plus/ui";
import { renameCampaign, updateBranchCoordinator, reassignCoordinator } from "@/lib/plus/actions";

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
  const refresh = useStore((s) => s.refresh);

  // root = the manager's campaign, else the org's first master campaign
  const topLevel = useMemo(() => campaigns.filter((c) => c.parent_campaign_id === null), [campaigns]);
  const rootId = session?.campaign_id ?? topLevel[0]?.id ?? null;
  const root = campaigns.find((c) => c.id === rootId);
  const brand = branding.find((b) => b.campaign_id === rootId) ?? branding[0];
  const subCampaigns = useMemo(() => campaigns.filter((c) => c.parent_campaign_id === rootId), [campaigns, rootId]);
  const treeIds = useMemo(() => (rootId ? descendantCampaignIds(campaigns, rootId) : []), [campaigns, rootId]);

  const [showAdd, setShowAdd] = useState(false);
  const [coordSearch, setCoordSearch] = useState("");
  const [editBranch, setEditBranch] = useState<{ id: string; name: string; email: string; goal: string; moveTo: string } | null>(null);
  const [savingBranch, setSavingBranch] = useState(false);
  const [editName, setEditName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
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
  const treeLeads = leads.filter((l) => treeIds.includes(l.campaign_id));
  const totalDonated = treeLeads.filter((l) => l.status === "donated").length;
  const vipCount = treeLeads.filter((l) => l.is_vip).length;
  // actually raised — from Charidy donations matched to leads (reconciliation)
  const actualRaised = treeLeads.reduce((s, l) => s + Number((l.custom_fields as { charidy_amount?: number } | undefined)?.charidy_amount || 0), 0);

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
          {editName ? (
            <div className="flex items-center gap-2">
              <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} placeholder="שם הקמפיין" autoFocus />
              <button
                disabled={savingName || !nameDraft.trim()}
                onClick={async () => { setSavingName(true); await renameCampaign(root.id, nameDraft.trim()).catch(() => {}); await refresh(); setSavingName(false); setEditName(false); }}
                className="btn-primary px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 whitespace-nowrap"
              >
                {savingName ? "שומר…" : "שמור"}
              </button>
              <button onClick={() => setEditName(false)} className="btn-ghost px-3 py-2 rounded-lg text-sm" style={{ borderColor: "var(--border)" }}>ביטול</button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs text-muted">שם הקמפיין</div>
                <div className="font-extrabold text-lg truncate">{brand?.campaign_name || root.name}</div>
              </div>
              <button onClick={() => { setNameDraft(brand?.campaign_name || root.name); setEditName(true); }} className="btn-ghost text-xs px-3 py-1.5 rounded-lg font-medium shrink-0" style={{ borderColor: "var(--border)" }}>
                ✏️ שנה שם
              </button>
            </div>
          )}
        </div>

        <div className="card p-4 mb-4">
          <div className="text-sm font-medium mb-2">קצב גיוס ארצי</div>
          <Progress value={allPromised} goal={root.goal_amount} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          <StatCard label="סניפים" value={subCampaigns.length} />
          <StatCard label="טלפנים" value={callerGroups.length} />
          <StatCard label="לידים" value={totalLeads} />
          <StatCard label="שיחות" value={totalCalls} />
          <StatCard label="תרמו" value={totalDonated} />
          <StatCard label="גויס בפועל" value={`${actualRaised.toLocaleString("he-IL")} ₪`} accent />
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

        <Input
          value={coordSearch}
          onChange={(e) => setCoordSearch(e.target.value)}
          placeholder="🔍 חיפוש רכז או סניף — שם / אימייל"
          className="mb-3"
        />

        <div className="card overflow-hidden">
          {(() => {
            const q = coordSearch.trim().toLowerCase();
            const filtered = q
              ? branchRanking.filter((r) => (r.sc.name || "").toLowerCase().includes(q) || (r.sc.coordinator_email || "").toLowerCase().includes(q))
              : branchRanking;
            if (branchRanking.length === 0) return <div className="p-6 text-center text-muted">אין סניפים. צור את הראשון.</div>;
            if (filtered.length === 0) return <div className="p-6 text-center text-muted">לא נמצא רכז/סניף תואם.</div>;
            return (
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {filtered.map((r) => {
                  const rank = branchRanking.indexOf(r);
                  return (
                    <div key={r.sc.id} className="p-4 flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: rank === 0 ? "var(--accent)" : "var(--secondary)" }}>
                        {rank + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{r.sc.name}</div>
                        <div className="text-xs text-muted truncate">{r.callers} טלפנים · רכז: {r.sc.coordinator_email ?? "—"}</div>
                      </div>
                      <div className="text-left min-w-[110px]">
                        <div className="font-bold">{r.promised.toLocaleString("he-IL")} ₪</div>
                        <div className="text-xs text-muted">מתוך {r.sc.goal_amount.toLocaleString("he-IL")}</div>
                      </div>
                      <button
                        onClick={() => setEditBranch({ id: r.sc.id, name: r.sc.name, email: r.sc.coordinator_email ?? "", goal: String(r.sc.goal_amount ?? 0), moveTo: "" })}
                        className="btn-ghost text-xs px-2.5 py-1.5 rounded-lg shrink-0" style={{ borderColor: "var(--border)" }}
                      >
                        ✏️
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })()}
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

        {/* edit coordinator / branch */}
        <Modal open={!!editBranch} onClose={() => setEditBranch(null)} title="עריכת רכז / סניף">
          {editBranch && (
            <>
              <Field label="שם הסניף"><Input value={editBranch.name} onChange={(e) => setEditBranch({ ...editBranch, name: e.target.value })} /></Field>
              <Field label="אימייל הרכז (Google)"><Input type="email" value={editBranch.email} onChange={(e) => setEditBranch({ ...editBranch, email: e.target.value })} dir="ltr" placeholder="coordinator@gmail.com" /></Field>
              <Field label="יעד הסניף (₪)"><Input type="number" value={editBranch.goal} onChange={(e) => setEditBranch({ ...editBranch, goal: e.target.value })} /></Field>
              <p className="text-[11px] text-muted -mt-2 mb-2">שינוי האימייל יאפס את ההתחברות — הרכז החדש יתבע את הסניף בכניסה הבאה עם Google.</p>

              <Field label="העברת הרכז לסניף אחר">
                <select
                  value={editBranch.moveTo}
                  onChange={(e) => setEditBranch({ ...editBranch, moveTo: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border bg-transparent" style={{ borderColor: "var(--border)" }}
                >
                  <option value="">— השאר בסניף הנוכחי —</option>
                  {subCampaigns.filter((sc) => sc.id !== editBranch.id).map((sc) => (
                    <option key={sc.id} value={sc.id}>{sc.name}{sc.coordinator_email ? ` (תפוס: ${sc.coordinator_email})` : ""}</option>
                  ))}
                </select>
              </Field>

              <button
                disabled={savingBranch}
                onClick={async () => {
                  setSavingBranch(true);
                  try {
                    await updateBranchCoordinator(editBranch.id, { name: editBranch.name, email: editBranch.email, goal: Number(editBranch.goal) || 0 });
                    if (editBranch.moveTo) await reassignCoordinator(editBranch.id, editBranch.moveTo);
                    await refresh();
                    setEditBranch(null);
                  } catch (err) { alert(err instanceof Error ? err.message : "השמירה נכשלה"); }
                  setSavingBranch(false);
                }}
                className="btn-primary w-full py-2.5 rounded-lg font-semibold disabled:opacity-50"
              >
                {savingBranch ? "שומר…" : "שמור שינויים"}
              </button>
            </>
          )}
        </Modal>
        </>
        )}
      </AppShell>
    </ThemeRoot>
  );
}
