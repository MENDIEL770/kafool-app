"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/plus/store";
import { useRequireRole } from "@/lib/plus/useAuth";
import { initiateCall } from "@/lib/plus/dialer";
import AppShell from "@/components/plus/AppShell";
import ThemeRoot from "@/components/plus/ThemeRoot";
import CallbackPicker from "@/components/plus/CallbackPicker";
import SwipeTriage from "@/components/plus/SwipeTriage";
import CallerContactsImport from "@/components/plus/CallerContactsImport";
import { setCallDecisionOwn, saveMyCallerLink } from "@/lib/plus/actions";
import { Modal, Field, Input, Textarea, Progress, StatusBadge, STATUS_LIST } from "@/components/plus/ui";
import { callbackMessage, smsLink, whatsappLink, openLink } from "@/lib/plus/notify";
import { hebrewDateShort } from "@/lib/plus/hebrewDate";
import { fetchCharidyDonations, timeAgo, type CharidyResult } from "@/lib/plus/charidy";
import { isIsraeliPhone } from "@/lib/plus/phone";
import HelpGuide from "@/components/plus/HelpGuide";
import { DEFAULT_SCRIPT } from "@/lib/plus/presets";
import type { Lead, LeadStatus } from "@/lib/plus/types";

const QUICK_STATUSES: LeadStatus[] = ["no_answer", "busy", "wrong_number", "not_interested", "callback"];

export default function CallerPage() {
  // coordinators can also work as callers (they get a personal caller group)
  const session = useRequireRole(["caller", "coordinator"]);

  const leads = useStore((s) => s.leads);
  const callerGroups = useStore((s) => s.callerGroups);
  const branding = useStore((s) => s.branding);
  const campaigns = useStore((s) => s.campaigns);
  const promises = useStore((s) => s.promises);
  const calls = useStore((s) => s.calls);
  const reminders = useStore((s) => s.reminders);
  const templates = useStore((s) => s.templates);

  const logCall = useStore((s) => s.logCall);
  const addPromise = useStore((s) => s.addPromise);
  const addReminder = useStore((s) => s.addReminder);
  const updateCallerGroup = useStore((s) => s.updateCallerGroup);
  const updateLead = useStore((s) => s.updateLead);
  const refresh = useStore((s) => s.refresh);

  // resolve the caller group: explicit on the session, else the one matching
  // this user's email within their campaign (coordinator-as-caller path).
  const group =
    callerGroups.find((c) => c.id === session?.caller_group_id) ??
    callerGroups.find((c) => c.campaign_id === session?.campaign_id && c.caller_email.toLowerCase() === session?.email.toLowerCase());
  const cgId = group?.id ?? null;
  const campaign = campaigns.find((c) => c.id === group?.campaign_id);
  const brand =
    branding.find((b) => b.campaign_id === campaign?.id) ??
    branding.find((b) => b.campaign_id === campaign?.parent_campaign_id) ??
    branding[0];

  // the caller's branch + coordinator (the branch's coordinator email / display name)
  const coordEmail = campaign?.coordinator_email ?? null;
  const coordGroup = callerGroups.find((c) => c.campaign_id === campaign?.id && !!coordEmail && c.caller_email?.toLowerCase() === coordEmail.toLowerCase());
  const coordName = coordGroup?.display_name || coordEmail || "—";

  const myLeads = useMemo(() => leads.filter((l) => l.assigned_caller_group_id === cgId), [leads, cgId]);
  // classify by the actual phone — works for every lead, not just freshly imported
  const isOverseas = (l: Lead) => !isIsraeliPhone(l.phone);
  // overseas (non-Israeli) contacts go to their own list, out of the main flow
  const overseasLeads = useMemo(() => myLeads.filter(isOverseas), [myLeads]);
  // self-imported Israeli contacts awaiting the caller's swipe triage
  const triageQueue = useMemo(
    () => myLeads.filter((l) => !isOverseas(l) && (l.custom_fields as Record<string, unknown> | null)?.needs_triage && l.call_decision === undefined),
    [myLeads]
  );
  // call queue: Israeli, pending status, not rejected, and (manager-assigned OR triaged-yes)
  const pending = myLeads.filter((l) =>
    !isOverseas(l) &&
    ["new", "no_answer", "busy", "callback"].includes(l.status) &&
    l.call_decision !== "no" &&
    (l.call_decision === "yes" || !(l.custom_fields as Record<string, unknown> | null)?.needs_triage)
  );

  const [idx, setIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [showPromise, setShowPromise] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [showCallback, setShowCallback] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [showDonations, setShowDonations] = useState(false);
  const [showCharge, setShowCharge] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [showTriage, setShowTriage] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showOverseas, setShowOverseas] = useState(false);
  const [mode, setMode] = useState<"home" | "dialer">("home"); // home = functions, dialer = call flow
  const [donorSearch, setDonorSearch] = useState("");
  const [promiseAmt, setPromiseAmt] = useState("");
  const [note, setNote] = useState("");

  // ---- Charidy donations (live feed) ----
  const savedLink = group?.donation_link ?? "";
  const [linkDraft, setLinkDraft] = useState(savedLink);
  const [charidy, setCharidy] = useState<CharidyResult | null>(null);
  const [loadingDon, setLoadingDon] = useState(false);
  const [live, setLive] = useState(true);

  const refreshDonations = useCallback(async () => {
    if (!savedLink) { setCharidy(null); return; }
    setLoadingDon(true);
    const res = await fetchCharidyDonations(savedLink);
    setCharidy(res);
    setLoadingDon(false);
  }, [savedLink]);

  // auto-fetch on open + live polling every 20s while the panel is open
  useEffect(() => {
    if (!showDonations) return;
    refreshDonations();
    if (!live) return;
    const id = setInterval(refreshDonations, 20000);
    return () => clearInterval(id);
  }, [showDonations, live, refreshDonations]);

  const current: Lead | undefined = pending[Math.min(idx, Math.max(0, pending.length - 1))] ?? pending[0];

  if (!session || !group) return null;

  const saveLink = async () => {
    updateCallerGroup(group.id, { donation_link: linkDraft.trim() }); // optimistic
    try { await saveMyCallerLink(linkDraft.trim()); } catch { /* ignore */ }
  };

  // triage swipe: persist the caller's own decision + reflect it locally
  const triage = (id: string, d: "yes" | "no") => {
    updateLead(id, { call_decision: d });
    setCallDecisionOwn(id, d).catch(() => { /* ignore */ });
  };

  // Charidy embeddable donate page with the donor's details prefilled (the
  // coordinator sets donate.charidy.com/<id> on the campaign; this page allows
  // iframe embedding, unlike charidy.com).
  const buildDonateUrl = (lead?: Lead): string | null => {
    const base = campaign?.charidy_donate_url?.trim();
    if (!base || !lead) return null;
    const p = new URLSearchParams({ lang: "he" });
    if (group?.charidy_team_id) p.set("team_id", group.charidy_team_id);
    if (lead.full_name) { p.set("fullname", lead.full_name); p.set("displayname", lead.full_name); }
    if (lead.email) p.set("email", lead.email);
    if (lead.phone) p.set("phone", lead.phone.replace(/\D/g, ""));
    return `${base}${base.includes("?") ? "&" : "?"}${p.toString()}`;
  };

  // Reconcile Charidy donations to the leads I called — match by name (Charidy
  // hides phone), mark them donated and record how much they gave.
  const normName = (s: string) =>
    (s || "").replace(/משפחת|משפ['׳]|מר |גב['׳] |הרב |ר['׳] /g, "").replace(/[^א-תa-zA-Z0-9]/g, "").toLowerCase();
  const syncDonations = () => {
    const ds = charidy?.donations ?? [];
    if (!ds.length) { alert("אין תרומות לסנכרון. רענן/י קודם את התרומות."); return; }
    let matched = 0;
    for (const d of ds) {
      if (d.anonymous) continue;
      const dn = normName(d.donor);
      if (dn.length < 3) continue;
      const lead = myLeads.find((l) => {
        const ln = normName(l.full_name);
        return ln.length >= 3 && (ln === dn || ln.includes(dn) || dn.includes(ln));
      });
      if (lead && lead.status !== "donated") {
        updateLead(lead.id, { status: "donated", custom_fields: { ...(lead.custom_fields || {}), charidy_amount: d.amount } });
        matched++;
      }
    }
    alert(matched > 0 ? `✅ התאמתי ${matched} תרומות ללידים שחייגת אליהם — סומנו כ"תרם" עם הסכום.` : "לא נמצאו התאמות חדשות לפי שם.");
  };

  const myReminders = reminders
    .filter((r) => r.caller_group_id === cgId && r.status === "pending")
    .sort((a, b) => a.due_at.localeCompare(b.due_at));

  const goNext = () => {
    setExpanded(false);
    setNote("");
    setIdx((i) => (i + 1) % Math.max(1, pending.length));
  };

  const promisedTotal = promises
    .filter((p) => p.caller_group_id === cgId)
    .reduce((s, p) => s + p.amount, 0);

  // ── caller metrics / dashboard ── (plain computations — must stay below the
  // early return without adding hooks, so no useMemo here)
  const myCalls = calls.filter((c) => c.caller_group_id === cgId);
  const ANSWERED = ["donated", "promised", "callback", "not_interested", "removed", "wrong_number"];
  const cf = (l: Lead) => (l.custom_fields as Record<string, unknown> | null) ?? {};
  const donatedTotal = myLeads.reduce((s, l) => s + (Number(cf(l).charidy_total ?? cf(l).charidy_amount ?? 0) || 0), 0);
  const stats = {
    total: myLeads.length,
    called: myCalls.length,
    answered: myCalls.filter((c) => ANSWERED.includes(c.outcome)).length,
    noAnswer: myCalls.filter((c) => ["no_answer", "busy"].includes(c.outcome)).length,
    donated: myLeads.filter((l) => l.status === "donated").length,
    promised: myLeads.filter((l) => l.status === "promised").length,
  };
  const conversion = stats.called ? Math.round((stats.donated / stats.called) * 100) : 0;
  // recommended hours — when answered calls actually happened (fallback: evening)
  const recommendedHours = (() => {
    const buckets: Record<number, number> = {};
    myCalls.filter((c) => ANSWERED.includes(c.outcome)).forEach((c) => { const h = new Date(c.called_at).getHours(); buckets[h] = (buckets[h] || 0) + 1; });
    const top = Object.entries(buckets).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([h]) => `${h}:00`);
    return top.length ? top : ["18:00", "19:00", "20:00"];
  })();
  // call history — most recent first, with the lead name
  const callHistory = [...myCalls].sort((a, b) => b.called_at.localeCompare(a.called_at)).map((c) => ({
    ...c, lead: leads.find((l) => l.id === c.lead_id),
  }));

  // donor name search → tap to call
  const searchHits = (() => {
    const q = donorSearch.trim().toLowerCase();
    if (q.length < 1) return [];
    return myLeads.filter((l) => (l.full_name || "").toLowerCase().includes(q) || (l.phone || "").includes(q)).slice(0, 8);
  })();

  const leadCalls = current ? calls.filter((c) => c.lead_id === current.id) : [];

  const sendTemplate = (channel: "sms" | "whatsapp") => {
    if (!current) return;
    const tpl = templates.find((t) => t.channel === channel) ?? templates[0];
    let body = (tpl?.body ?? "שלום {שם}, תודה רבה! קישור לתרומה מאובטח: {קישור}")
      .replace("{שם}", current.full_name)
      .replace("{קישור}", group.donation_link || "")
      .replace("{סכום}", promiseAmt || "");
    // attach the campaign media file — a link in SMS, a preview/file in WhatsApp
    if (brand?.media_url) body += `\n${brand.media_url}`;
    const phone = current.phone.replace(/[^\d]/g, "");
    const url =
      channel === "whatsapp"
        ? `https://wa.me/972${phone.replace(/^0/, "")}?text=${encodeURIComponent(body)}`
        : `sms:${current.phone}?&body=${encodeURIComponent(body)}`;
    if (typeof window !== "undefined") window.open(url, "_blank");
    setShowSend(false);
  };

  return (
    <ThemeRoot campaignId={group.campaign_id}>
      <AppShell branding={brand} subtitle={`${group.display_name} · ${campaign?.name ?? ""}`}>
        {/* my branch + coordinator */}
        <div className="card p-3 mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] text-muted">הסניף שלי</div>
            <div className="font-bold truncate">🏢 {campaign?.name ?? "—"}</div>
          </div>
          <div className="min-w-0 text-left">
            <div className="text-[11px] text-muted">הרכז שלי</div>
            <div className="font-bold truncate">👤 {coordName}</div>
          </div>
        </div>

        {mode === "home" && (<>
        {/* personal goal + stats */}
        <div className="card p-4 mb-4">
          <div className="text-sm font-medium mb-2">היעד האישי שלי{group.is_coordinator ? " (רכז)" : ""}</div>
          <Progress value={promisedTotal} goal={group.personal_goal} />
          <div className="grid grid-cols-4 gap-2 mt-4 text-center">
            <Mini label="סה״כ" v={stats.total} />
            <Mini label="חויגו" v={stats.called} />
            <Mini label="הבטיחו" v={stats.promised} />
            <Mini label="תרמו" v={stats.donated} />
          </div>
        </div>

        {/* functions */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button onClick={() => setShowDonations(true)} className="card p-3 flex flex-col items-center gap-1 text-sm font-bold"><span className="text-xl">💰</span>תרומות</button>
          <button onClick={() => setShowReminders(true)} className="card p-3 flex flex-col items-center gap-1 text-sm font-bold"><span className="text-xl">🔔</span>חזרות{myReminders.length > 0 ? ` (${myReminders.length})` : ""}</button>
          <button onClick={() => setShowContacts(true)} className="card p-3 flex flex-col items-center gap-1 text-sm font-bold"><span className="text-xl">📇</span>אנשי קשר</button>
          <button onClick={() => setShowDashboard(true)} className="card p-3 flex flex-col items-center gap-1 text-sm font-bold"><span className="text-xl">📊</span>דשבורד</button>
          <button onClick={() => setShowHistory(true)} className="card p-3 flex flex-col items-center gap-1 text-sm font-bold"><span className="text-xl">📋</span>שיחות</button>
          <button onClick={() => setShowScript(true)} className="card p-3 flex flex-col items-center gap-1 text-sm font-bold"><span className="text-xl">📝</span>תסריט</button>
          {overseasLeads.length > 0 && <button onClick={() => setShowOverseas(true)} className="card p-3 flex flex-col items-center gap-1 text-sm font-bold"><span className="text-xl">🌍</span>חו״ל ({overseasLeads.length})</button>}
          <HelpGuide className="card p-3 flex flex-col items-center gap-1 text-sm font-bold w-full" label={<><span className="text-xl">❓</span>עזרה</>} />
        </div>

        {triageQueue.length > 0 && (
          <button
            onClick={() => setShowTriage(true)}
            className="w-full card p-3 mb-4 flex items-center justify-between gap-2 text-right"
            style={{ borderColor: "var(--accent)", borderWidth: 2 }}
          >
            <span className="text-sm font-semibold">📇 {triageQueue.length} אנשי קשר ממתינים לסינון — בחר למי להתקשר</span>
            <span className="btn-accent text-sm px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap">סנן עכשיו</span>
          </button>
        )}

        {/* donor search → call directly */}
        <div className="mb-4">
          <Input value={donorSearch} onChange={(e) => setDonorSearch(e.target.value)} placeholder="🔍 חיפוש תורם לפי שם / טלפון — וחייג ישירות" />
          {searchHits.length > 0 && (
            <div className="card mt-2 divide-y overflow-hidden" style={{ borderColor: "var(--border)" }}>
              {searchHits.map((l) => (
                <div key={l.id} className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{l.full_name}</div>
                    <div className="text-xs text-muted" dir="ltr">{l.phone}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <StatusBadge status={l.status} />
                    <button
                      onClick={() => { const i = pending.findIndex((p) => p.id === l.id); if (i >= 0) setIdx(i); setDonorSearch(""); initiateCall(l); }}
                      className="btn-primary text-sm px-3 py-1.5 rounded-lg whitespace-nowrap"
                    >
                      📞 חייג
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {brand?.welcome_message && (
          <div className="text-center text-sm text-muted mb-4">{brand.welcome_message}</div>
        )}

        <button
          onClick={() => { setMode("dialer"); setIdx(0); }}
          className="btn-primary w-full py-4 rounded-2xl text-lg font-extrabold flex items-center justify-center gap-2"
        >
          📞 מסך טלפניה — התחל לחייג{pending.length ? ` (${pending.length})` : ""}
        </button>
        </>)}

        {mode === "dialer" && (<>
        <button onClick={() => setMode("home")} className="btn-ghost text-sm px-3 py-1.5 rounded-lg mb-3" style={{ borderColor: "var(--border)" }}>
          ← חזרה לתפריט
        </button>

        {/* progress — remaining to call, so the caller feels momentum */}
        {(() => {
          const handled = myLeads.filter((l) => !isOverseas(l) && ["donated", "promised", "not_interested", "removed", "wrong_number"].includes(l.status)).length;
          const totalToCall = handled + pending.length;
          if (totalToCall === 0) return null;
          return (
            <div className="card p-3 mb-4">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-semibold">נותרו לחיוג: <b style={{ color: "var(--accent)" }}>{pending.length}</b></span>
                <span className="text-muted">טופלו {handled} / {totalToCall}</span>
              </div>
              <Progress value={handled} goal={totalToCall} />
            </div>
          );
        })()}

        {!current ? (
          <div className="card p-8 text-center">
            <div className="text-4xl mb-2">🎉</div>
            <p className="font-semibold">סיימת את כל הלידים בתור!</p>
            <p className="text-sm text-muted mt-1">כל הכבוד. אפשר לחזור ל"חזור אליהם" בהמשך.</p>
          </div>
        ) : (
          <div className="card overflow-hidden kp-fade">
            {/* card head */}
            <div className="p-5 text-white" style={{ background: "linear-gradient(150deg, #16223f 0%, #21376a 60%, #2a4a8c 100%)" }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {current.is_vip && <span className="inline-flex items-center gap-1 bg-[var(--accent)] text-[#1c1606] text-[11px] px-2 py-0.5 rounded-full font-extrabold">★ VIP</span>}
                    <h2 className="text-xl font-extrabold truncate">{current.full_name}</h2>
                  </div>
                  <a href={`tel:${current.phone}`} className="inline-block mt-1 text-lg font-semibold" style={{ color: "#cdd8ef" }} dir="ltr">{current.phone}</a>
                </div>
                <StatusBadge status={current.status} />
              </div>
              {current.donation_history.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <div className="bg-white/15 rounded-lg px-3 py-2 inline-flex items-center gap-2">
                    <span className="text-xs">תרומה קודמת:</span>
                    <span className="font-bold text-lg">
                      {current.donation_history[current.donation_history.length - 1].amount.toLocaleString("he-IL")} ₪
                    </span>
                  </div>
                  <div className="bg-white/15 rounded-lg px-3 py-2 inline-flex items-center gap-2">
                    <span className="text-xs">ממוצע תרומה:</span>
                    <span className="font-bold text-lg">
                      {Math.round(current.donation_history.reduce((s, d) => s + d.amount, 0) / current.donation_history.length).toLocaleString("he-IL")} ₪
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* details */}
            <div className="p-4">
              <button onClick={() => setExpanded((e) => !e)} className="text-sm text-muted mb-2">
                {expanded ? "▲ הסתר פרטים" : "▼ פרטים נוספים"}
              </button>
              {expanded && (
                <div className="text-sm space-y-1 mb-3">
                  {current.email && <div><b>מייל:</b> {current.email}</div>}
                  {current.address && <div><b>כתובת:</b> {current.address}</div>}
                  {current.notes && <div><b>הערות:</b> {current.notes}</div>}
                  {current.donation_history.length > 0 && (
                    <div>
                      <b>היסטוריית תרומות:</b>
                      <ul className="list-disc pr-5">
                        {current.donation_history.map((d, i) => (
                          <li key={i}>{d.date}: {d.amount.toLocaleString("he-IL")} ₪ {d.campaign ? `(${d.campaign})` : ""}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {leadCalls.length > 0 && (
                    <div><b>שיחות קודמות:</b> {leadCalls.length}</div>
                  )}
                </div>
              )}

              {/* primary action: call */}
              <button
                onClick={() => initiateCall(current)}
                className="btn-primary w-full py-4 rounded-xl text-lg font-bold flex items-center justify-center gap-2 mb-3"
              >
                📞 התקשר
              </button>

              {/* note at end of call */}
              <Textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="הערה לסיכום השיחה (תישמר על הליד)..."
                className="mb-3"
              />

              {/* quick statuses */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-3">
                {QUICK_STATUSES.map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      if (st === "callback") { setShowCallback(true); return; }
                      logCall(current.id, cgId!, st, note || undefined);
                      goNext();
                    }}
                    className="btn-ghost whitespace-nowrap text-sm px-3 py-2 rounded-lg"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {STATUS_LIST[st].label}
                  </button>
                ))}
              </div>

              {/* secondary actions */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setShowPromise(true)} className="btn-secondary py-3 rounded-xl font-semibold">
                  ✋ רישום הבטחה
                </button>
                <button onClick={() => setShowSend(true)} className="btn-accent py-3 rounded-xl font-semibold">
                  🔗 שליחת קישור
                </button>
                <button
                  onClick={() => setShowCharge(true)}
                  disabled={!group.donation_link}
                  className="py-3 rounded-xl font-semibold text-white col-span-2 disabled:opacity-40"
                  style={{ background: "#7c3aed" }}
                >
                  💳 חיוב מיידי בכרטיס אשראי
                </button>
                <button
                  onClick={() => { logCall(current.id, cgId!, "donated", note || undefined); goNext(); }}
                  className="py-3 rounded-xl font-semibold text-white col-span-2"
                  style={{ background: "#16a34a" }}
                >
                  ✅ תרם!
                </button>
              </div>

              <div className="flex justify-between mt-4 text-sm">
                <span className="text-muted">ליד {Math.min(idx + 1, pending.length)} מתוך {pending.length}</span>
                <button onClick={goNext} className="font-medium" style={{ color: "var(--secondary)" }}>דלג לליד הבא ←</button>
              </div>
            </div>
          </div>
        )}
        </>)}

        {/* script — branch script if set, else the recommended default */}
        <Modal open={showScript} onClose={() => setShowScript(false)} title="תסריט שיחה">
          {(() => {
            const cs = brand?.call_script;
            const script = cs && (cs.opening || cs.story || cs.objections || cs.closing) ? cs : DEFAULT_SCRIPT;
            return (
              <div className="space-y-3 text-sm">
                <ScriptBlock title="פתיחה" body={script.opening} />
                <ScriptBlock title="הסיפור" body={script.story} />
                <ScriptBlock title="מענה להתנגדויות" body={script.objections} />
                <ScriptBlock title="סיום שיחה" body={script.closing} />
              </div>
            );
          })()}
        </Modal>

        {/* promise */}
        <Modal open={showPromise} onClose={() => setShowPromise(false)} title="רישום הבטחה">
          <Field label="סכום ההבטחה (₪)">
            <Input type="number" inputMode="numeric" value={promiseAmt} onChange={(e) => setPromiseAmt(e.target.value)} autoFocus />
          </Field>
          <div className="flex gap-2 mb-3">
            {[180, 360, 500, 1000].map((a) => (
              <button key={a} onClick={() => setPromiseAmt(String(a))} className="btn-ghost flex-1 py-2 rounded-lg text-sm" style={{ borderColor: "var(--border)" }}>
                {a}
              </button>
            ))}
          </div>
          <button
            disabled={!promiseAmt}
            onClick={() => { if (current) { addPromise(current.id, cgId!, Number(promiseAmt)); } setShowPromise(false); setPromiseAmt(""); goNext(); }}
            className="btn-primary w-full py-2.5 rounded-lg font-semibold disabled:opacity-50"
          >
            שמור הבטחה
          </button>
        </Modal>

        {/* callback — Hebrew-date picker with quick defaults + time of day */}
        <Modal open={showCallback} onClose={() => setShowCallback(false)} title="קביעת חזרה">
          <CallbackPicker
            onConfirm={(date, label) => {
              if (current) {
                const noteText = note ? `${note} · חזרה: ${label}` : `חזרה: ${label}`;
                addReminder(current.id, cgId!, date.toISOString(), noteText);
              }
              setShowCallback(false);
              goNext();
            }}
          />
        </Modal>

        {/* send link */}
        <Modal open={showSend} onClose={() => setShowSend(false)} title="שליחת קישור תרומה">
          <p className="text-sm text-muted mb-3">הקישור: <span dir="ltr">{group.donation_link}</span></p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => sendTemplate("whatsapp")} className="py-3 rounded-xl font-semibold text-white" style={{ background: "#25D366" }}>
              וואטסאפ
            </button>
            <button onClick={() => sendTemplate("sms")} className="btn-secondary py-3 rounded-xl font-semibold">
              SMS
            </button>
          </div>
        </Modal>

        {/* my callbacks / reminders */}
        <Modal open={showReminders} onClose={() => setShowReminders(false)} title="החזרות שלי">
          {myReminders.length === 0 ? (
            <p className="text-sm text-muted text-center py-4">אין חזרות מתוזמנות.</p>
          ) : (
            <div className="space-y-2">
              {myReminders.map((r) => {
                const lead = leads.find((l) => l.id === r.lead_id);
                if (!lead) return null;
                const when = hebrewDateShort(new Date(r.due_at));
                const msg = callbackMessage(lead, when, group.display_name, campaign?.name);
                return (
                  <div key={r.id} className="card p-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{lead.full_name}</div>
                        <div className="text-xs text-muted" dir="ltr">{lead.phone}</div>
                      </div>
                      <a href={`tel:${lead.phone}`} className="btn-primary text-sm px-3 py-1.5 rounded-lg">📞 חייג</a>
                    </div>
                    <div className="text-xs mt-2" style={{ color: "var(--accent)" }}>🗓️ {when}</div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => openLink(whatsappLink(msg, group.phone))} className="flex-1 text-sm py-1.5 rounded-lg text-white" style={{ background: "#25D366" }}>תזכורת וואטסאפ</button>
                      <button onClick={() => openLink(smsLink(msg, group.phone))} className="flex-1 text-sm py-1.5 rounded-lg btn-secondary">תזכורת SMS</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Modal>

        {/* Charidy donations — live feed for this caller's team */}
        <Modal open={showDonations} onClose={() => setShowDonations(false)} title="התרומות שלי (Charidy)">
          {/* personal link */}
          <Field label="הקישור האישי שלי ב-Charidy">
            <div className="flex gap-2">
              <Input value={linkDraft} onChange={(e) => setLinkDraft(e.target.value)} dir="ltr" placeholder="https://charidy.com/..." />
              <button onClick={saveLink} className="btn-secondary px-3 rounded-lg text-sm font-semibold whitespace-nowrap">שמור</button>
            </div>
          </Field>

          {!savedLink ? (
            <p className="text-sm text-muted text-center py-4">הזן את הקישור האישי שלך ולחץ "שמור" כדי לראות מי תרם.</p>
          ) : (
            <>
              {/* summary + controls */}
              <div className="card p-4 mb-3" style={{ background: "var(--bg)" }}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-2xl font-bold" style={{ color: "var(--accent)" }}>
                      {(charidy?.total ?? 0).toLocaleString("he-IL")} ₪
                    </div>
                    <div className="text-xs text-muted">סה״כ שגויס בצוות שלי · יעד {((charidy?.goal || group.personal_goal) || 0).toLocaleString("he-IL")} ₪</div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button onClick={refreshDonations} disabled={loadingDon} className="btn-primary px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1">
                      <span className={loadingDon ? "animate-spin inline-block" : ""}>🔄</span> רענון
                    </button>
                    <button onClick={syncDonations} className="btn-accent px-3 py-2 rounded-lg text-sm font-semibold">🔗 התאם ללידים</button>
                  </div>
                </div>
                <Progress value={charidy?.total ?? 0} goal={(charidy?.goal || group.personal_goal) || 0} />
                <div className="flex items-center justify-between mt-2 text-xs text-muted">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
                    עדכון חי (כל 20 שנ׳)
                    {live && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />}
                  </label>
                  {charidy && <span>עודכן {timeAgo(charidy.fetchedAt)}</span>}
                </div>
              </div>

              {charidy?.error && <p className="text-red-500 text-sm mb-2">{charidy.error}</p>}

              <div className="text-xs font-semibold text-muted mb-1.5">התרומות האחרונות שלי (לייב)</div>
              {/* donor list — filtered to this caller's team via team_id_list */}
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {(charidy?.donations ?? []).map((d) => (
                  <div key={d.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{d.anonymous ? "תורם אנונימי" : d.donor}</div>
                      <div className="text-xs text-muted">{timeAgo(d.at)}</div>
                    </div>
                    <div className="font-bold whitespace-nowrap">{d.amount.toLocaleString("he-IL")} ₪</div>
                  </div>
                ))}
                {charidy?.ok && charidy.donations.length === 0 && (
                  <p className="text-sm text-muted text-center py-3">אין עדיין תרומות.</p>
                )}
              </div>
            </>
          )}
        </Modal>

        {/* upload my own contacts */}
        <Modal open={showContacts} onClose={() => setShowContacts(false)} title="העלאת אנשי הקשר שלי">
          <CallerContactsImport onDone={() => { void refresh(); }} />
        </Modal>

        {/* triage — swipe who to call */}
        <Modal open={showTriage} onClose={() => setShowTriage(false)} title="סינון — למי להתקשר?">
          <SwipeTriage
            queue={triageQueue}
            onDecide={triage}
            doneMessage="כל מי שסימנת ✓ נכנס לרשימת השיחות שלך."
          />
        </Modal>

        {/* dashboard — caller performance */}
        <Modal open={showDashboard} onClose={() => setShowDashboard(false)} title="הדשבורד שלי">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Mini label="שיחות" v={stats.called} />
            <Mini label="ענו" v={stats.answered} />
            <Mini label="לא ענו" v={stats.noAnswer} />
            <Mini label="יחס המרה" v={`${conversion}%`} />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="card p-3 text-center">
              <div className="text-xs text-muted">התחייבויות</div>
              <div className="text-xl font-bold">{promisedTotal.toLocaleString("he-IL")} ₪</div>
            </div>
            <div className="card p-3 text-center">
              <div className="text-xs text-muted">תרומות בפועל</div>
              <div className="text-xl font-bold" style={{ color: "var(--accent)" }}>{donatedTotal.toLocaleString("he-IL")} ₪</div>
            </div>
          </div>

          <div className="card p-3 mb-3">
            <div className="text-sm font-semibold mb-1">🕐 שעות מומלצות להתקשר</div>
            <div className="text-sm text-muted">{recommendedHours.join(" · ")}</div>
            <div className="text-[11px] text-muted mt-1">לפי השעות שבהן ענו לך הכי הרבה.</div>
          </div>

          <div className="card p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm font-semibold">↩️ לחזור אליהם ({myReminders.length})</div>
              {myReminders.length > 0 && (
                <button onClick={() => { setShowDashboard(false); setShowReminders(true); }} className="text-xs" style={{ color: "var(--secondary)" }}>הצג הכל</button>
              )}
            </div>
            {myReminders.length === 0 ? (
              <div className="text-xs text-muted">אין כרגע חזרות מתוזמנות.</div>
            ) : (
              <div className="space-y-1">
                {myReminders.slice(0, 4).map((r) => {
                  const l = leads.find((x) => x.id === r.lead_id);
                  return (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{l?.full_name ?? "—"}</span>
                      <a href={`tel:${l?.phone}`} className="text-xs btn-primary px-2 py-1 rounded-lg shrink-0">📞</a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Modal>

        {/* overseas (non-Israeli) contacts — separate list */}
        <Modal open={showOverseas} onClose={() => setShowOverseas(false)} title="אנשי קשר חו״ל">
          <p className="text-sm text-muted mb-3">מספרים לא-ישראליים (לא 05.. / +972). מופרדים מהתור הראשי.</p>
          {overseasLeads.length === 0 ? (
            <p className="text-sm text-muted text-center py-4">אין אנשי קשר חו״ל.</p>
          ) : (
            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
              {overseasLeads.map((l) => (
                <div key={l.id} className="card p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{l.full_name}</div>
                    <div className="text-xs text-muted" dir="ltr">{l.phone}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <StatusBadge status={l.status} />
                    <a href={`tel:${l.phone}`} className="text-sm btn-primary px-3 py-1.5 rounded-lg">📞 חייג</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>

        {/* call history */}
        <Modal open={showHistory} onClose={() => setShowHistory(false)} title="השיחות שלי">
          {callHistory.length === 0 ? (
            <p className="text-sm text-muted text-center py-4">עוד לא ביצעת שיחות.</p>
          ) : (
            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
              {callHistory.map((c) => (
                <div key={c.id} className="card p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{c.lead?.full_name ?? "—"}</div>
                    <div className="text-xs text-muted">{hebrewDateShort(new Date(c.called_at))} · {STATUS_LIST[c.outcome]?.label ?? c.outcome}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <StatusBadge status={c.outcome} />
                    {c.lead && <a href={`tel:${c.lead.phone}`} className="text-xs btn-ghost px-2 py-1 rounded-lg" style={{ borderColor: "var(--border)" }}>📞</a>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>

        {/* immediate credit-card charge — Charidy blocks iframe embedding, so we
            open its page in a new tab; the caller fills the card there + marks donated */}
        <Modal open={showCharge} onClose={() => setShowCharge(false)} title="חיוב מיידי — Charidy">
          {(() => {
            const donateUrl = buildDonateUrl(current);
            if (donateUrl) {
              // embeddable Charidy donate page with the donor's details prefilled
              return (
                <>
                  <p className="text-xs text-muted mb-2">פרטי התורם כבר מולאו. הזן את פרטי האשראי ולחץ "סמן תרם" בסיום.</p>
                  <iframe
                    src={donateUrl}
                    title="Charidy"
                    className="w-full rounded-lg border"
                    style={{ height: "60vh", borderColor: "var(--border)" }}
                    allow="payment"
                  />
                  <button
                    onClick={() => { if (current) { logCall(current.id, cgId!, "donated", note || undefined); } setShowCharge(false); goNext(); }}
                    className="w-full mt-3 py-3 rounded-xl font-semibold text-white"
                    style={{ background: "#16a34a" }}
                  >
                    ✅ החיוב בוצע — סמן תרם
                  </button>
                </>
              );
            }
            if (!group.donation_link) {
              return <p className="text-sm text-muted text-center py-4">לא הוגדר דף תשלום. הרכז יגדיר "דף תשלום מוטמע" (donate.charidy.com) במסך הרכז.</p>;
            }
            // fallback: charidy.com blocks iframes → open in a new tab
            return (
              <>
                <p className="text-sm text-muted mb-3">פתח את דף החיוב בטאב חדש, מלא את פרטי האשראי של התורם, ובסיום חזור וסמן "תרם".</p>
                <a href={group.donation_link} target="_blank" rel="noopener noreferrer" className="block w-full text-center btn-primary py-3 rounded-xl font-bold mb-2">
                  💳 פתח דף חיוב בטאב חדש ↗
                </a>
                <button
                  onClick={() => { if (current) { logCall(current.id, cgId!, "donated", note || undefined); } setShowCharge(false); goNext(); }}
                  className="w-full py-3 rounded-xl font-semibold text-white" style={{ background: "#16a34a" }}
                >
                  ✅ החיוב בוצע — סמן תרם
                </button>
              </>
            );
          })()}
        </Modal>
      </AppShell>
    </ThemeRoot>
  );
}

function Mini({ label, v }: { label: string; v: number | string }) {
  return (
    <div className="rounded-xl py-2.5" style={{ background: "var(--bg)" }}>
      <div className="text-xl font-extrabold tracking-tight">{v}</div>
      <div className="text-[11px] text-muted mt-0.5">{label}</div>
    </div>
  );
}

function ScriptBlock({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div className="font-bold mb-0.5" style={{ color: "var(--primary)" }}>{title}</div>
      <p className="text-muted whitespace-pre-wrap">{body}</p>
    </div>
  );
}
