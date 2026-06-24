"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/plus/store";
import { useRequireRole } from "@/lib/plus/useAuth";
import { initiateCall } from "@/lib/plus/dialer";
import AppShell from "@/components/plus/AppShell";
import ThemeRoot from "@/components/plus/ThemeRoot";
import CallbackPicker from "@/components/plus/CallbackPicker";
import { Modal, Field, Input, Textarea, Progress, StatusBadge, STATUS_LIST } from "@/components/plus/ui";
import { callbackMessage, smsLink, whatsappLink, openLink } from "@/lib/plus/notify";
import { hebrewDateShort } from "@/lib/plus/hebrewDate";
import { fetchCharidyDonations, timeAgo, type CharidyResult } from "@/lib/plus/charidy";
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

  const myLeads = useMemo(() => leads.filter((l) => l.assigned_caller_group_id === cgId), [leads, cgId]);
  const pending = myLeads.filter((l) => ["new", "no_answer", "busy", "callback"].includes(l.status));

  const [idx, setIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [showPromise, setShowPromise] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [showCallback, setShowCallback] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [showDonations, setShowDonations] = useState(false);
  const [showCharge, setShowCharge] = useState(false);
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

  const saveLink = () => {
    updateCallerGroup(group.id, { donation_link: linkDraft.trim() });
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

  const stats = {
    total: myLeads.length,
    called: calls.filter((c) => c.caller_group_id === cgId).length,
    donated: myLeads.filter((l) => l.status === "donated").length,
    promised: myLeads.filter((l) => l.status === "promised").length,
  };

  const leadCalls = current ? calls.filter((c) => c.lead_id === current.id) : [];

  const sendTemplate = (channel: "sms" | "whatsapp") => {
    if (!current) return;
    const tpl = templates.find((t) => t.channel === channel) ?? templates[0];
    const body = (tpl?.body ?? "")
      .replace("{שם}", current.full_name)
      .replace("{קישור}", group.donation_link)
      .replace("{סכום}", promiseAmt || "");
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
        {/* personal goal */}
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-2 gap-2">
            <span className="text-sm font-medium">
              היעד האישי שלי{group.is_coordinator ? " (רכז)" : ""}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setShowDonations(true)} className="btn-ghost text-sm px-3 py-1.5 rounded-lg font-medium" style={{ borderColor: "var(--border)" }}>
                💰 תרומות
              </button>
              <button onClick={() => setShowReminders(true)} className="btn-ghost text-sm px-3 py-1.5 rounded-lg font-medium relative" style={{ borderColor: "var(--border)" }}>
                🔔 חזרות{myReminders.length > 0 ? ` (${myReminders.length})` : ""}
              </button>
              <button onClick={() => setShowScript(true)} className="btn-accent text-sm px-3 py-1.5 rounded-lg font-medium">
                📋 תסריט
              </button>
            </div>
          </div>
          <Progress value={promisedTotal} goal={group.personal_goal} />
          <div className="grid grid-cols-4 gap-2 mt-4 text-center">
            <Mini label="סה״כ" v={stats.total} />
            <Mini label="חויגו" v={stats.called} />
            <Mini label="הבטיחו" v={stats.promised} />
            <Mini label="תרמו" v={stats.donated} />
          </div>
        </div>

        {brand?.welcome_message && (
          <div className="text-center text-sm text-muted mb-4">{brand.welcome_message}</div>
        )}

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

        {/* script */}
        <Modal open={showScript} onClose={() => setShowScript(false)} title="תסריט שיחה">
          {brand && (
            <div className="space-y-3 text-sm">
              <ScriptBlock title="פתיחה" body={brand.call_script.opening} />
              <ScriptBlock title="הסיפור" body={brand.call_script.story} />
              <ScriptBlock title="התנגדויות" body={brand.call_script.objections} />
              <ScriptBlock title="סגירה" body={brand.call_script.closing} />
            </div>
          )}
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
                const msg = callbackMessage(lead, when, group.display_name);
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
                  <button onClick={refreshDonations} disabled={loadingDon} className="btn-primary px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1">
                    <span className={loadingDon ? "animate-spin inline-block" : ""}>🔄</span> רענון
                  </button>
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

              <div className="text-xs font-semibold text-muted mb-1.5">תרומות אחרונות בקמפיין (לייב)</div>
              {/* donor list — campaign-wide live feed (Charidy's public API isn't team-tagged) */}
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

        {/* immediate credit-card charge — opens the caller's Charidy donation page in an iframe */}
        <Modal open={showCharge} onClose={() => setShowCharge(false)} title="חיוב מיידי — Charidy">
          {!group.donation_link ? (
            <p className="text-sm text-muted text-center py-4">לא הוגדר קישור Charidy אישי. הגדר אותו ב"💰 תרומות".</p>
          ) : (
            <>
              <p className="text-xs text-muted mb-2">מלא את פרטי האשראי של התורם ישירות בטופס. בסיום החיוב — סמן "תרם!".</p>
              <iframe
                src={group.donation_link}
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
          )}
        </Modal>
      </AppShell>
    </ThemeRoot>
  );
}

function Mini({ label, v }: { label: string; v: number }) {
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
