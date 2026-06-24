"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/plus/store";
import { useRequireRole } from "@/lib/plus/useAuth";
import AppShell from "@/components/plus/AppShell";
import ThemeRoot from "@/components/plus/ThemeRoot";
import { StatCard, Modal, Field, Input, Textarea, StatusBadge, STATUS_LIST } from "@/components/plus/ui";
import type { Lead, LeadStatus } from "@/lib/plus/types";

export default function AdminPage() {
  const session = useRequireRole(["super_admin"]);
  const campaigns = useStore((s) => s.campaigns);
  const members = useStore((s) => s.members);
  const callerGroups = useStore((s) => s.callerGroups);
  const leads = useStore((s) => s.leads);
  const addManagerAccount = useStore((s) => s.addManagerAccount);
  const updateLead = useStore((s) => s.updateLead);
  const deleteLead = useStore((s) => s.deleteLead);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", goal: "1000000" });
  const [created, setCreated] = useState<string | null>(null);

  // ---- leads management ----
  const [query, setQuery] = useState("");
  const [campFilter, setCampFilter] = useState("");
  const [edit, setEdit] = useState<Lead | null>(null);
  const [confirmDel, setConfirmDel] = useState<Lead | null>(null);

  const campName = (id: string) => campaigns.find((c) => c.id === id)?.name ?? id;
  const orgCount = useMemo(() => new Set([...campaigns.map((c) => c.organization_id), ...members.map((m) => m.organization_id)]).size, [campaigns, members]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (campFilter && l.campaign_id !== campFilter) return false;
      if (!q) return true;
      return l.full_name.toLowerCase().includes(q) || l.phone.includes(q) || (l.email ?? "").toLowerCase().includes(q);
    });
  }, [leads, query, campFilter]);

  if (!session) return null;

  const topCampaigns = campaigns.filter((c) => c.parent_campaign_id === null);
  const shown = filtered.slice(0, 100);

  return (
    <ThemeRoot>
      <AppShell subtitle="ניהול מערכת (Super Admin)">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <StatCard label="ארגונים" value={orgCount} />
          <StatCard label="קמפיינים" value={campaigns.length} />
          <StatCard label="משתמשים" value={members.length} />
          <StatCard label="לידים" value={leads.length} />
        </div>

        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-lg">חשבונות מנהל / קמפיינים-על</h2>
          <button onClick={() => setShowCreate(true)} className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold">+ חשבון מנהל חדש</button>
        </div>

        <div className="card divide-y mb-6" style={{ borderColor: "var(--border)" }}>
          {topCampaigns.map((c) => {
            const manager = members.find((m) => m.campaign_id === c.id && m.role === "manager");
            const subs = campaigns.filter((s) => s.parent_campaign_id === c.id).length;
            const callers = callerGroups.filter((cg) => campaigns.some((cc) => (cc.id === cg.campaign_id) && (cc.id === c.id || cc.parent_campaign_id === c.id))).length;
            return (
              <div key={c.id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{c.name}</div>
                  <div className="text-xs text-muted truncate">מנהל: {manager?.email ?? "—"} · {subs} סניפים · {callers} טלפנים</div>
                </div>
                <div className="text-xs text-muted">org: {c.organization_id}</div>
              </div>
            );
          })}
        </div>

        {/* ---- leads management ---- */}
        <h2 className="font-bold text-lg mb-3">ניהול לידים</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          <input
            placeholder="חיפוש לפי שם / טלפון / מייל"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border bg-transparent outline-none"
            style={{ borderColor: "var(--border)" }}
          />
          <select value={campFilter} onChange={(e) => setCampFilter(e.target.value)} className="px-3 py-2 rounded-lg border bg-transparent" style={{ borderColor: "var(--border)" }}>
            <option value="">כל הקמפיינים</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="text-xs text-muted mb-2">{filtered.length} לידים{filtered.length > 100 ? " · מוצגים 100 הראשונים" : ""}</div>

        <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
          {shown.length === 0 && <div className="p-6 text-center text-muted">לא נמצאו לידים.</div>}
          {shown.map((l) => (
            <div key={l.id} className="flex items-center gap-2 p-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{l.full_name} {l.is_vip && "⭐"}</div>
                <div className="text-xs text-muted truncate"><span dir="ltr">{l.phone}</span> · {campName(l.campaign_id)}</div>
              </div>
              <StatusBadge status={l.status} />
              <button onClick={() => setEdit(l)} className="text-sm px-2 py-1 rounded-lg" style={{ color: "var(--secondary)" }}>ערוך</button>
              <button onClick={() => setConfirmDel(l)} className="text-sm px-2 py-1 rounded-lg text-red-500">מחק</button>
            </div>
          ))}
        </div>

        {/* create manager modal */}
        <Modal open={showCreate} onClose={() => { setShowCreate(false); setCreated(null); }} title="יצירת חשבון מנהל קמפיין">
          {created ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-2">✅</div>
              <p>נוצר קמפיין-על חדש עבור <b>{created}</b>.</p>
              <p className="text-sm text-muted mt-1">ברגע שהמנהל יתחבר עם Google באותו מייל — יקבל עולם קמפיין נקי משלו.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted mb-3">יוצר קמפיין-על חדש + שורת member עם role=manager. מבודד ב-organization_id משלו.</p>
              <Field label="שם הקמפיין"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="אימייל המנהל (Google)"><Input type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
              <Field label="יעד (₪)"><Input type="number" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} /></Field>
              <button
                disabled={!form.name || !form.email}
                onClick={() => {
                  addManagerAccount(form.name, form.email, form.name, Number(form.goal));
                  setCreated(form.email);
                  setForm({ name: "", email: "", goal: "1000000" });
                }}
                className="btn-primary w-full py-2.5 rounded-lg font-semibold disabled:opacity-50"
              >
                צור חשבון מנהל
              </button>
            </>
          )}
        </Modal>

        {/* edit lead modal */}
        <Modal open={!!edit} onClose={() => setEdit(null)} title="עריכת ליד">
          {edit && (
            <>
              <Field label="שם מלא"><Input value={edit.full_name} onChange={(e) => setEdit({ ...edit, full_name: e.target.value })} /></Field>
              <Field label="טלפון"><Input dir="ltr" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></Field>
              <Field label="אימייל"><Input dir="ltr" value={edit.email ?? ""} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></Field>
              <Field label="כתובת"><Input value={edit.address ?? ""} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></Field>
              <Field label="סטטוס">
                <select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as LeadStatus })} className="w-full px-3 py-2 rounded-lg border bg-transparent" style={{ borderColor: "var(--border)" }}>
                  {Object.entries(STATUS_LIST).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Field>
              <Field label="הערות"><Textarea rows={2} value={edit.notes ?? ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></Field>
              <label className="flex items-center gap-2 mb-4 cursor-pointer">
                <input type="checkbox" checked={edit.is_vip} onChange={(e) => setEdit({ ...edit, is_vip: e.target.checked })} className="w-5 h-5" />
                <span className="text-sm font-medium">VIP ⭐</span>
              </label>
              <button
                onClick={() => {
                  updateLead(edit.id, { full_name: edit.full_name, phone: edit.phone, email: edit.email, address: edit.address, status: edit.status, notes: edit.notes, is_vip: edit.is_vip });
                  setEdit(null);
                }}
                className="btn-primary w-full py-2.5 rounded-lg font-semibold"
              >
                שמור שינויים
              </button>
            </>
          )}
        </Modal>

        {/* delete confirm */}
        <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="מחיקת ליד">
          {confirmDel && (
            <>
              <p className="mb-4">למחוק את הליד <b>{confirmDel.full_name}</b> (<span dir="ltr">{confirmDel.phone}</span>)? הפעולה תמחק גם שיחות, הבטחות ותזכורות קשורות.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDel(null)} className="btn-ghost flex-1 py-2.5 rounded-lg font-semibold" style={{ borderColor: "var(--border)" }}>ביטול</button>
                <button onClick={() => { deleteLead(confirmDel.id); setConfirmDel(null); }} className="flex-1 py-2.5 rounded-lg font-semibold text-white" style={{ background: "#dc2626" }}>מחק לצמיתות</button>
              </div>
            </>
          )}
        </Modal>
      </AppShell>
    </ThemeRoot>
  );
}
