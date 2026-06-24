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
  const rootId = session?.campaign_id ?? null;
  const campaigns = useStore((s) => s.campaigns);
  const callerGroups = useStore((s) => s.callerGroups);
  const leads = useStore((s) => s.leads);
  const addCallerGroup = useStore((s) => s.addCallerGroup);
  const removeCallerGroup = useStore((s) => s.removeCallerGroup);

  const treeIds = useMemo(() => (rootId ? descendantCampaignIds(campaigns, rootId) : []), [campaigns, rootId]);
  const subCampaigns = campaigns.filter((c) => c.parent_campaign_id === rootId);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", link: "", goal: "50000", campaign: "" });

  if (!session) return null;

  return (
    <ThemeRoot campaignId={rootId}>
      <AppShell subtitle="ניהול טלפנים">
        <ManagerNav />
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-lg">טלפנים ({callerGroups.filter((c) => treeIds.includes(c.campaign_id)).length})</h2>
          <button onClick={() => { setForm((f) => ({ ...f, campaign: subCampaigns[0]?.id ?? "" })); setShowAdd(true); }} className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold">+ טלפן</button>
        </div>

        {subCampaigns.map((sc) => {
          const cgs = callerGroups.filter((c) => c.campaign_id === sc.id);
          return (
            <div key={sc.id} className="mb-4">
              <div className="text-sm font-semibold mb-2 text-muted">{sc.name}</div>
              <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
                {cgs.length === 0 && <div className="p-3 text-sm text-muted">אין טלפנים בסניף זה.</div>}
                {cgs.map((c) => {
                  const n = leads.filter((l) => l.assigned_caller_group_id === c.id).length;
                  return (
                    <div key={c.id} className="flex items-center gap-3 p-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{c.display_name}</div>
                        <div className="text-xs text-muted truncate">{c.caller_email} · {n} לידים · יעד {c.personal_goal.toLocaleString("he-IL")} ₪</div>
                      </div>
                      <button onClick={() => removeCallerGroup(c.id)} className="text-sm text-red-500">הסר</button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <Modal open={showAdd} onClose={() => setShowAdd(false)} title="הוספת טלפן">
          <Field label="סניף">
            <select value={form.campaign} onChange={(e) => setForm({ ...form, campaign: e.target.value })} className="w-full px-3 py-2 rounded-lg border bg-transparent" style={{ borderColor: "var(--border)" }}>
              {subCampaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="שם"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="אימייל"><Input type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="קישור תרומה"><Input dir="ltr" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} /></Field>
          <Field label="יעד (₪)"><Input type="number" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} /></Field>
          <button disabled={!form.name || !form.email || !form.campaign} onClick={() => { addCallerGroup(form.campaign, form.email, form.name, form.link, Number(form.goal)); setShowAdd(false); setForm({ name: "", email: "", link: "", goal: "50000", campaign: subCampaigns[0]?.id ?? "" }); }} className="btn-primary w-full py-2.5 rounded-lg font-semibold disabled:opacity-50">צור</button>
        </Modal>
      </AppShell>
    </ThemeRoot>
  );
}
