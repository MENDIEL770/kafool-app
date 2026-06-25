"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/plus/store";
import { useRequireRole } from "@/lib/plus/useAuth";
import AppShell from "@/components/plus/AppShell";
import ThemeRoot from "@/components/plus/ThemeRoot";
import { StatCard, Progress, Modal, Field, Input, Textarea } from "@/components/plus/ui";
import LeadImport from "@/components/plus/LeadImport";
import { callbackMessage, smsLink, whatsappLink, openLink } from "@/lib/plus/notify";
import { hebrewDateShort } from "@/lib/plus/hebrewDate";
import { DEFAULT_SCRIPT } from "@/lib/plus/presets";
import { setCampaignCharidyLink, listCharidyTeamsForLink } from "@/lib/plus/actions";
import type { CallScript } from "@/lib/plus/types";
import type { CharidyTeam } from "@/lib/plus/charidyResolve";

export default function CoordinatorPage() {
  const router = useRouter();
  const session = useRequireRole(["coordinator", "manager"]);
  const campId = session?.campaign_id ?? null;

  const campaigns = useStore((s) => s.campaigns);
  const callerGroups = useStore((s) => s.callerGroups);
  const leads = useStore((s) => s.leads);
  const promises = useStore((s) => s.promises);
  const calls = useStore((s) => s.calls);
  const reminders = useStore((s) => s.reminders);
  const branding = useStore((s) => s.branding);
  const addCallerGroup = useStore((s) => s.addCallerGroup);
  const ensureCallerGroupFor = useStore((s) => s.ensureCallerGroupFor);
  const assignFromPool = useStore((s) => s.assignFromPool);
  const loginAsMember = useStore((s) => s.loginAsMember);
  const members = useStore((s) => s.members);
  const assignLeadsEvenly = useStore((s) => s.assignLeadsEvenly);
  const updateCallerGroup = useStore((s) => s.updateCallerGroup);
  const approveToPool = useStore((s) => s.approveToPool);
  const rejectMember = useStore((s) => s.rejectMember);
  const updateBranding = useStore((s) => s.updateBranding);
  const refresh = useStore((s) => s.refresh);

  const campaign = campaigns.find((c) => c.id === campId);
  const brand =
    branding.find((b) => b.campaign_id === campId) ??
    branding.find((b) => b.campaign_id === campaign?.parent_campaign_id) ??
    branding[0];

  const myCallers = useMemo(() => callerGroups.filter((c) => c.campaign_id === campId), [callerGroups, campId]);
  const myLeads = useMemo(() => leads.filter((l) => l.campaign_id === campId), [leads, campId]);
  // the coordinator's own personal caller group (they may also call)
  const myGroup = myCallers.find((c) => c.caller_email?.toLowerCase() === session?.email?.toLowerCase());

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", link: "", goal: "0" });
  // Charidy links: branch campaign link (powers the team picker) + personal group
  const [campLinkDraft, setCampLinkDraft] = useState(campaign?.charidy_campaign_link ?? "");
  const [coordLinkDraft, setCoordLinkDraft] = useState(myGroup?.donation_link ?? "");
  const [donateUrlDraft, setDonateUrlDraft] = useState(campaign?.charidy_donate_url ?? "");
  const [charidyTeams, setCharidyTeams] = useState<CharidyTeam[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [savingLinks, setSavingLinks] = useState(false);
  const [poolMemberId, setPoolMemberId] = useState(""); // when assigning from the manager's pool
  const [editId, setEditId] = useState<string | null>(null);
  const [editLink, setEditLink] = useState("");
  const [backfilling, setBackfilling] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const branchBrand = branding.find((b) => b.campaign_id === campId);
  const [script, setScript] = useState<CallScript>(
    branchBrand?.call_script && (branchBrand.call_script.opening || branchBrand.call_script.story) ? branchBrand.call_script : DEFAULT_SCRIPT
  );

  const saveCharidyLinks = async () => {
    if (!campId) return;
    setSavingLinks(true);
    try {
      await setCampaignCharidyLink(campId, campLinkDraft.trim(), donateUrlDraft.trim());
      const link = coordLinkDraft.trim();
      let gid = myGroup?.id;
      if (!gid && link) gid = ensureCallerGroupFor(campId, session!.email, "רכז");
      if (gid) updateCallerGroup(gid, { donation_link: link });
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "השמירה נכשלה");
    }
    setSavingLinks(false);
  };

  const loadTeams = async () => {
    const link = campLinkDraft.trim();
    if (!link) { alert("הזן קודם את קישור הקמפיין ב-Charidy."); return; }
    setLoadingTeams(true);
    const teams = await listCharidyTeamsForLink(link).catch(() => [] as CharidyTeam[]);
    setCharidyTeams(teams);
    setLoadingTeams(false);
    if (!teams.length) alert("לא נמצאו קבוצות ב-Charidy עבור הקישור הזה.");
  };

  if (!session || !campaign) return null;

  const branchPromised = promises
    .filter((p) => myCallers.some((c) => c.id === p.caller_group_id))
    .reduce((s, p) => s + p.amount, 0);
  // actually raised — from Charidy donations matched to leads (reconciliation)
  const branchRaised = myLeads
    .filter((l) => l.status === "donated")
    .reduce((s, l) => s + Number((l.custom_fields as { charidy_amount?: number } | undefined)?.charidy_amount || 0), 0);

  const ranking = myCallers
    .map((cg) => {
      const cgLeads = myLeads.filter((l) => l.assigned_caller_group_id === cg.id);
      const promised = promises.filter((p) => p.caller_group_id === cg.id).reduce((s, p) => s + p.amount, 0);
      const called = calls.filter((c) => c.caller_group_id === cg.id).length;
      const donated = cgLeads.filter((l) => l.status === "donated").length;
      return { cg, promised, called, donated, leads: cgLeads.length };
    })
    .sort((a, b) => b.promised - a.promised);

  const unassigned = myLeads.filter((l) => l.assigned_caller_group_id === null && l.call_decision !== "no").length;

  // email pool from the manager: active callers without a branch, in this
  // campaign or its parent. The coordinator assigns them to their branch.
  const poolMembers = members.filter(
    (m) =>
      m.role === "caller" &&
      m.status === "active" &&
      !m.caller_group_id &&
      (m.campaign_id === campId || m.campaign_id === campaign.parent_campaign_id)
  );

  // join requests waiting for this branch (caller asked to join, not yet approved)
  const pendingRequests = members.filter((m) => m.campaign_id === campId && m.status === "pending");

  // scheduled callbacks across the whole branch
  const branchReminders = reminders
    .filter((r) => myCallers.some((c) => c.id === r.caller_group_id) && r.status === "pending")
    .sort((a, b) => a.due_at.localeCompare(b.due_at));

  const workAsCaller = () => {
    // give the coordinator a personal caller group, then open the caller UI
    ensureCallerGroupFor(campId!, session!.email, session!.display_name);
    // refresh the session so caller_group_id resolves (re-login as same member)
    const me = members.find((m) => m.id && m.email.toLowerCase() === session!.email.toLowerCase() && m.campaign_id === campId);
    if (me) loginAsMember(me.id);
    router.push("/caller");
  };

  return (
    <ThemeRoot campaignId={campId}>
      <AppShell branding={brand} subtitle={`${session.role === "coordinator" ? "רכז" : "מנהל"} · ${campaign.name}`}>
        <div className="card p-4 mb-4">
          <div className="text-sm font-medium mb-2">יעד הסניף</div>
          <Progress value={branchPromised} goal={campaign.goal_amount} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
          <StatCard label="טלפנים" value={myCallers.length} />
          <StatCard label="לידים בסניף" value={myLeads.length} />
          <StatCard label="לא משויכים" value={unassigned} />
          <StatCard label="הובטח" value={`${branchPromised.toLocaleString("he-IL")} ₪`} />
          <StatCard label="גויס בפועל" value={`${branchRaised.toLocaleString("he-IL")} ₪`} accent />
        </div>

        {pendingRequests.length > 0 && (
          <div className="card p-4 mb-4">
            <div className="font-bold mb-2">⏳ בקשות הצטרפות לסניף ({pendingRequests.length})</div>
            <div className="space-y-2">
              {pendingRequests.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 rounded-xl border p-2.5" style={{ borderColor: "var(--border)" }}>
                  <span className="text-sm truncate" dir="ltr">{m.email}</span>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => approveToPool(m.id)} className="btn-primary text-sm px-3 py-1.5 rounded-lg">אשר</button>
                    <button onClick={() => rejectMember(m.id)} className="text-sm text-red-500 px-2">דחה</button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted mt-2">לאחר אישור — שייך אותם לקבוצת גיוס דרך "מאגר המיילים".</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => setShowAdd(true)} className="btn-primary px-4 py-2.5 rounded-xl font-semibold">+ הוסף טלפן</button>
          <button
            onClick={() => assignLeadsEvenly(campId!, myCallers.map((c) => c.id))}
            disabled={myCallers.length === 0 || unassigned === 0}
            className="btn-secondary px-4 py-2.5 rounded-xl font-semibold disabled:opacity-50"
          >
            ⚖️ חלוקה שווה ({unassigned})
          </button>
          <button onClick={workAsCaller} className="btn-accent px-4 py-2.5 rounded-xl font-semibold">
            📞 עבוד כטלפן
          </button>
          <button onClick={() => setShowImport(true)} className="btn-ghost px-4 py-2.5 rounded-xl font-semibold" style={{ borderColor: "var(--border)" }}>
            📥 ייבוא אנשי קשר
          </button>
          <button onClick={() => setShowScript(true)} className="btn-ghost px-4 py-2.5 rounded-xl font-semibold" style={{ borderColor: "var(--border)" }}>
            📋 תסריט שיחה
          </button>
        </div>

        {/* import contacts into this branch */}
        <Modal open={showImport} onClose={() => setShowImport(false)} title="ייבוא אנשי קשר לסניף">
          <LeadImport campaignId={campId!} />
        </Modal>

        {/* per-branch call script editor */}
        <Modal open={showScript} onClose={() => setShowScript(false)} title="תסריט השיחה של הסניף">
          <p className="text-xs text-muted mb-3">התסריט מותאם לסניף שלך ומופיע אצל הטלפנים. {"{שם}"} יוחלף בשם התורם.</p>
          {(["opening", "story", "objections", "closing"] as const).map((k) => (
            <Field key={k} label={{ opening: "פתיחה", story: "הסיפור", objections: "מענה להתנגדויות", closing: "סיום שיחה" }[k]}>
              <Textarea rows={k === "objections" || k === "closing" ? 5 : 2} value={script[k]} onChange={(e) => setScript({ ...script, [k]: e.target.value })} />
            </Field>
          ))}
          <div className="flex gap-2 mt-1">
            <button onClick={() => setScript(DEFAULT_SCRIPT)} className="btn-ghost px-3 py-2 rounded-lg text-sm" style={{ borderColor: "var(--border)" }}>שחזר ברירת מחדל</button>
            <button onClick={() => { updateBranding(campId!, { call_script: script }); setShowScript(false); }} className="btn-primary flex-1 py-2.5 rounded-lg font-semibold">שמור תסריט</button>
          </div>
        </Modal>

        {/* scheduled callbacks — remind callers to call back */}
        {branchReminders.length > 0 && (
          <div className="card p-4 mb-4">
            <div className="font-bold mb-2">🔔 חזרות מתוזמנות בסניף ({branchReminders.length})</div>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {branchReminders.map((r) => {
                const lead = leads.find((l) => l.id === r.lead_id);
                const cg = callerGroups.find((c) => c.id === r.caller_group_id);
                if (!lead || !cg) return null;
                const when = hebrewDateShort(new Date(r.due_at));
                const msg = callbackMessage(lead, when, cg.display_name, campaign?.name);
                return (
                  <div key={r.id} className="py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{lead.full_name} <span className="text-xs text-muted">· {cg.display_name}</span></div>
                        <div className="text-xs" style={{ color: "var(--accent)" }}>🗓️ {when}</div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => openLink(whatsappLink(msg, cg.phone))} className="text-xs px-2 py-1.5 rounded-lg text-white" style={{ background: "#25D366" }}>וואטסאפ לטלפן</button>
                        <button onClick={() => openLink(smsLink(msg, cg.phone))} className="text-xs px-2 py-1.5 rounded-lg btn-secondary">SMS</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Charidy links — campaign (powers the team picker) + my personal group */}
        <div className="card p-4 space-y-3">
          <div className="font-bold">🔗 קישורי Charidy</div>
          <Field label="קישור הקמפיין שלי ב-Charidy (ממנו נשלוף את רשימת הקבוצות)">
            <Input value={campLinkDraft} onChange={(e) => setCampLinkDraft(e.target.value)} dir="ltr" placeholder="https://charidy.com/..." />
          </Field>
          <Field label="הקישור לקבוצה האישית שלי (אם אני גם מתקשר)">
            <Input value={coordLinkDraft} onChange={(e) => setCoordLinkDraft(e.target.value)} dir="ltr" placeholder="https://charidy.com/.../my-team" />
          </Field>
          <Field label="דף תשלום מוטמע (donate.charidy.com) — מצארדי, לחיוב מהיר עם פרטי תורם מולאים">
            <Input value={donateUrlDraft} onChange={(e) => setDonateUrlDraft(e.target.value)} dir="ltr" placeholder="https://donate.charidy.com/38789" />
          </Field>
          <div className="flex gap-2">
            <button onClick={saveCharidyLinks} disabled={savingLinks} className="btn-primary flex-1 py-2.5 rounded-lg font-semibold disabled:opacity-50">
              {savingLinks ? "שומר…" : "שמור קישורים"}
            </button>
            <button onClick={loadTeams} disabled={loadingTeams} className="btn-secondary px-3 py-2.5 rounded-lg font-semibold disabled:opacity-50 whitespace-nowrap">
              {loadingTeams ? "טוען…" : `🔄 רענן קבוצות${charidyTeams.length ? ` (${charidyTeams.length})` : ""}`}
            </button>
          </div>
          <p className="text-xs text-muted">לאחר שמירת קישור הקמפיין ולחיצה על "רענן קבוצות", בהוספת טלפן חדש תוכל לבחור את הקבוצה שלו מתוך הרשימה.</p>
        </div>

        {/* ranking / caller table */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between gap-2" style={{ borderColor: "var(--border)" }}>
            <span className="font-bold">דירוג הטלפנים</span>
            <button
              disabled={backfilling}
              title="מזהה את מספר הצוות ב-Charidy מכל קישור — כדי שתרומות ייוחסו לטלפן הנכון"
              onClick={async () => {
                setBackfilling(true);
                const { backfillCharidyTeamIds } = await import("@/lib/plus/actions");
                const r = await backfillCharidyTeamIds().catch(() => null);
                setBackfilling(false);
                alert(r ? `סונכרנו ${r.resolved} מתוך ${r.total} קישורים ל-Charidy.` : "שגיאה בסנכרון.");
              }}
              className="text-xs px-2.5 py-1.5 rounded-lg btn-secondary disabled:opacity-50"
            >
              {backfilling ? "מסנכרן…" : "🔗 סנכרן מזהי Charidy"}
            </button>
          </div>
          {ranking.length === 0 ? (
            <div className="p-6 text-center text-muted">אין עדיין טלפנים. הוסף את הראשון.</div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {ranking.map((r, i) => (
                <div key={r.cg.id} className="p-4 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: i === 0 ? "var(--accent)" : "var(--secondary)" }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{r.cg.display_name}</div>
                    <div className="text-xs text-muted truncate">{r.cg.caller_email} · {r.leads} לידים · {r.called} שיחות</div>
                  </div>
                  <div className="text-left">
                    <div className="font-bold">{r.promised.toLocaleString("he-IL")} ₪</div>
                    <button onClick={() => { setEditId(r.cg.id); setEditLink(r.cg.donation_link); }} className="text-xs" style={{ color: "var(--secondary)" }}>
                      ערוך קישור
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Modal open={showAdd} onClose={() => { setShowAdd(false); setPoolMemberId(""); }} title="הוספת טלפן לסניף">
          {poolMembers.length > 0 && (
            <Field label="בחר ממאגר המיילים של המנהל">
              <select
                value={poolMemberId}
                onChange={(e) => {
                  const id = e.target.value;
                  setPoolMemberId(id);
                  const m = poolMembers.find((x) => x.id === id);
                  setForm((f) => ({ ...f, email: m?.email ?? f.email, name: f.name }));
                }}
                className="w-full px-3 py-2 rounded-lg border bg-transparent"
                style={{ borderColor: "var(--border)" }}
              >
                <option value="">— הזנה ידנית —</option>
                {poolMembers.map((m) => <option key={m.id} value={m.id}>{m.email}</option>)}
              </select>
            </Field>
          )}
          <Field label="שם הטלפן"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="אימייל (Google)"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" disabled={!!poolMemberId} /></Field>
          <Field label="טלפן נייד (לתזכורות SMS)"><Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" /></Field>
          {charidyTeams.length > 0 && (
            <Field label="בחר קבוצה מ-Charidy">
              <select
                value=""
                onChange={(e) => {
                  const t = charidyTeams.find((x) => x.url === e.target.value);
                  if (t) setForm((f) => ({ ...f, link: t.url, name: f.name || t.name, goal: t.goal ? String(t.goal) : f.goal }));
                }}
                className="w-full px-3 py-2 rounded-lg border bg-transparent"
                style={{ borderColor: "var(--border)" }}
              >
                <option value="">— בחר מתוך {charidyTeams.length} קבוצות —</option>
                {charidyTeams.map((t) => (
                  <option key={t.teamId} value={t.url}>{t.name}{t.goal ? ` · יעד ${t.goal.toLocaleString("he-IL")}` : ""}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="קישור לקבוצה האישית שלו (Charidy)"><Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} dir="ltr" placeholder="https://charidy.com/.../my-team" /></Field>
          <p className="text-xs text-muted -mt-1 mb-2">💡 היעד נשאב אוטומטית מעמוד הקמפיין ב-Charidy — אין צורך להגדיר אותו כאן.</p>
          <button
            disabled={!form.name || !form.email}
            onClick={() => {
              if (poolMemberId) {
                assignFromPool(poolMemberId, campId!, form.name, form.link, Number(form.goal), form.phone || undefined);
              } else {
                addCallerGroup(campId!, form.email, form.name, form.link, Number(form.goal), form.phone || undefined);
              }
              setShowAdd(false);
              setPoolMemberId("");
              setForm({ name: "", email: "", phone: "", link: "", goal: "0" });
            }}
            className="btn-primary w-full py-2.5 rounded-lg font-semibold disabled:opacity-50"
          >
            {poolMemberId ? "שייך טלפן מהמאגר לסניף" : "צור קבוצת גיוס לטלפן"}
          </button>
        </Modal>

        <Modal open={!!editId} onClose={() => setEditId(null)} title="עריכת קישור תרומה">
          <Field label="קישור"><Input value={editLink} onChange={(e) => setEditLink(e.target.value)} dir="ltr" /></Field>
          <button onClick={() => { if (editId) updateCallerGroup(editId, { donation_link: editLink }); setEditId(null); }} className="btn-primary w-full py-2.5 rounded-lg font-semibold">שמור</button>
        </Modal>
      </AppShell>
    </ThemeRoot>
  );
}
