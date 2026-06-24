"use client";

import { useMemo, useState } from "react";
import { useStore, descendantCampaignIds } from "@/lib/plus/store";
import { useRequireRole } from "@/lib/plus/useAuth";
import AppShell from "@/components/plus/AppShell";
import ThemeRoot from "@/components/plus/ThemeRoot";
import ManagerNav from "@/components/plus/ManagerNav";
import { Modal, Field, Input } from "@/components/plus/ui";

export default function ManagerCallersPage() {
  const session = useRequireRole(["manager"]);
  const campaigns = useStore((s) => s.campaigns);
  const callerGroups = useStore((s) => s.callerGroups);
  const leads = useStore((s) => s.leads);
  const addCallerGroup = useStore((s) => s.addCallerGroup);
  const removeCallerGroup = useStore((s) => s.removeCallerGroup);

  const rootId = session?.campaign_id ?? campaigns.find((c) => c.parent_campaign_id === null)?.id ?? null;
  const root = campaigns.find((c) => c.id === rootId);
  // Flat campaign → the manager manages callers directly (no coordinators).
  // Hierarchical → callers belong to branches and are added by each coordinator;
  // the manager only views them here.
  const canManage = root?.style === "flat";

  const treeIds = useMemo(() => (rootId ? descendantCampaignIds(campaigns, rootId) : []), [campaigns, rootId]);
  const subCampaigns = campaigns.filter((c) => c.parent_campaign_id === rootId);
  const groups = canManage ? (root ? [root] : []) : subCampaigns;

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", link: "", goal: "50000" });

  if (!session || !root) return null;

  const total = callerGroups.filter((c) => treeIds.includes(c.campaign_id)).length;

  return (
    <ThemeRoot campaignId={rootId}>
      <AppShell subtitle="ניהול טלפנים">
        <ManagerNav />
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-lg">טלפנים ({total})</h2>
          {canManage && (
            <button onClick={() => setShowAdd(true)} className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold">+ טלפן</button>
          )}
        </div>

        {!canManage && (
          <div className="card p-3 mb-3 text-xs text-muted">
            בקמפיין היררכי הטלפנים מתווספים ומנוהלים ע״י הרכז של כל סניף — כאן תצוגה בלבד.
          </div>
        )}

        {groups.map((sc) => {
          const cgs = callerGroups.filter((c) => c.campaign_id === sc.id);
          return (
            <div key={sc.id} className="mb-4">
              {!canManage && <div className="text-sm font-semibold mb-2 text-muted">{sc.name}</div>}
              <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
                {cgs.length === 0 && <div className="p-3 text-sm text-muted">אין טלפנים{canManage ? "" : " בסניף זה"}.</div>}
                {cgs.map((c) => {
                  const n = leads.filter((l) => l.assigned_caller_group_id === c.id).length;
                  return (
                    <div key={c.id} className="flex items-center gap-3 p-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{c.display_name}</div>
                        <div className="text-xs text-muted truncate">{c.caller_email} · {n} לידים · יעד {c.personal_goal.toLocaleString("he-IL")} ₪</div>
                      </div>
                      {canManage && <button onClick={() => removeCallerGroup(c.id)} className="text-sm text-red-500">הסר</button>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {canManage && (
          <Modal open={showAdd} onClose={() => setShowAdd(false)} title="הוספת טלפן">
            <Field label="שם"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="אימייל"><Input type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="קישור תרומה"><Input dir="ltr" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} /></Field>
            <Field label="יעד (₪)"><Input type="number" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} /></Field>
            <button disabled={!form.name || !form.email} onClick={() => { addCallerGroup(root.id, form.email, form.name, form.link, Number(form.goal)); setShowAdd(false); setForm({ name: "", email: "", link: "", goal: "50000" }); }} className="btn-primary w-full py-2.5 rounded-lg font-semibold disabled:opacity-50">צור</button>
          </Modal>
        )}
      </AppShell>
    </ThemeRoot>
  );
}
