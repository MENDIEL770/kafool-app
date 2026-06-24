"use client";

import { useMemo, useState } from "react";
import { useStore, descendantCampaignIds } from "@/lib/plus/store";
import { useRequireRole } from "@/lib/plus/useAuth";
import AppShell from "@/components/plus/AppShell";
import ThemeRoot from "@/components/plus/ThemeRoot";
import ManagerNav from "@/components/plus/ManagerNav";
import { StatusBadge } from "@/components/plus/ui";

export default function AssignPage() {
  const session = useRequireRole(["manager"]);
  const rootId = session?.campaign_id ?? null;
  const campaigns = useStore((s) => s.campaigns);
  const callerGroups = useStore((s) => s.callerGroups);
  const leads = useStore((s) => s.leads);
  const assignLead = useStore((s) => s.assignLead);
  const assignLeadsEvenly = useStore((s) => s.assignLeadsEvenly);

  const treeIds = useMemo(() => (rootId ? descendantCampaignIds(campaigns, rootId) : []), [campaigns, rootId]);
  const [branchFilter, setBranchFilter] = useState<string>(rootId ?? "");
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetCg, setTargetCg] = useState("");

  const subCampaigns = campaigns.filter((c) => c.parent_campaign_id === rootId);
  const branchCallers = callerGroups.filter((c) => c.campaign_id === (branchFilter === rootId ? c.campaign_id : branchFilter) && treeIds.includes(c.campaign_id));
  const callersForBranch = branchFilter === rootId ? callerGroups.filter((c) => treeIds.includes(c.campaign_id)) : callerGroups.filter((c) => c.campaign_id === branchFilter);

  // leads to call (yes) and unassigned
  const toAssign = leads.filter(
    (l) => treeIds.includes(l.campaign_id) && l.call_decision !== "no" && l.assigned_caller_group_id === null
  );

  if (!session) return null;

  const toggle = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const doManual = () => {
    if (!targetCg) return;
    selected.forEach((id) => assignLead(id, targetCg));
    setSelected(new Set());
  };

  const autoTargets = (branchFilter === rootId ? callerGroups.filter((c) => treeIds.includes(c.campaign_id)) : callersForBranch).map((c) => c.id);

  return (
    <ThemeRoot campaignId={rootId}>
      <AppShell subtitle="שיוך לידים לטלפנים">
        <ManagerNav />

        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="px-3 py-2 rounded-lg border bg-transparent" style={{ borderColor: "var(--border)" }}>
            <option value={rootId ?? ""}>כל הסניפים</option>
            {subCampaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)" }}>
            <button onClick={() => setMode("auto")} className="px-4 py-2 text-sm font-medium" style={{ background: mode === "auto" ? "var(--primary)" : "transparent", color: mode === "auto" ? "#fff" : "var(--text)" }}>אוטומטי</button>
            <button onClick={() => setMode("manual")} className="px-4 py-2 text-sm font-medium" style={{ background: mode === "manual" ? "var(--primary)" : "transparent", color: mode === "manual" ? "#fff" : "var(--text)" }}>ידני</button>
          </div>
          <span className="text-sm text-muted">{toAssign.length} לידים ממתינים לשיוך</span>
        </div>

        {mode === "auto" ? (
          <div className="card p-6 text-center">
            <div className="text-3xl mb-2">⚖️</div>
            <h2 className="font-bold text-lg mb-1">חלוקה שווה אוטומטית</h2>
            <p className="text-sm text-muted mb-4">
              {toAssign.length} לידים יחולקו שווה בין {autoTargets.length} טלפנים
              {branchFilter !== rootId ? " בסניף הנבחר" : " בכל הרשת"}.
            </p>
            <button
              disabled={autoTargets.length === 0 || toAssign.length === 0}
              onClick={() => {
                const targetCampaigns = branchFilter === rootId ? treeIds : [branchFilter];
                targetCampaigns.forEach((cid) => {
                  const cgs = callerGroups.filter((c) => c.campaign_id === cid).map((c) => c.id);
                  if (cgs.length) assignLeadsEvenly(cid, cgs);
                });
                // also distribute root-level unassigned across all callers
                if (branchFilter === rootId) assignLeadsEvenly(rootId!, autoTargets);
              }}
              className="btn-primary px-6 py-3 rounded-xl font-semibold disabled:opacity-50"
            >
              חלק עכשיו
            </button>
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap gap-2 mb-3 items-center sticky top-16 z-10 p-2 rounded-lg" style={{ background: "var(--surface)" }}>
              <select value={targetCg} onChange={(e) => setTargetCg(e.target.value)} className="px-3 py-2 rounded-lg border bg-transparent flex-1" style={{ borderColor: "var(--border)" }}>
                <option value="">בחר טלפן יעד...</option>
                {callersForBranch.map((c) => <option key={c.id} value={c.id}>{c.display_name}</option>)}
              </select>
              <button disabled={!targetCg || selected.size === 0} onClick={doManual} className="btn-primary px-4 py-2 rounded-lg font-semibold disabled:opacity-50">
                שייך {selected.size} נבחרים
              </button>
            </div>
            <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
              {toAssign.length === 0 && <div className="p-6 text-center text-muted">אין לידים לשיוך.</div>}
              {toAssign.map((l) => (
                <label key={l.id} className="flex items-center gap-3 p-3 cursor-pointer">
                  <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} className="w-5 h-5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{l.full_name} {l.is_vip && "⭐"}</div>
                    <div className="text-xs text-muted" dir="ltr">{l.phone}</div>
                  </div>
                  <StatusBadge status={l.status} />
                </label>
              ))}
            </div>
          </div>
        )}
      </AppShell>
    </ThemeRoot>
  );
}
