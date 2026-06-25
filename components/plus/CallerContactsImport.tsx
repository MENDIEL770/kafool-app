"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { autoDetect, buildLead } from "@/lib/plus/import-detect";
import { importCallerContacts } from "@/lib/plus/actions";

type Row = { full_name: string; phone: string; email?: string };

// Minimal typing for the Contacts Picker API (Chrome on Android only).
type ContactInfo = { name?: string[]; tel?: string[]; email?: string[] };
interface ContactsManager { select(props: string[], opts?: { multiple?: boolean }): Promise<ContactInfo[]>; getProperties(): Promise<string[]>; }

/** Caller uploads their OWN contacts (Excel/CSV or phone) → their group, for triage. */
export default function CallerContactsImport({ onDone }: { onDone?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ added: number; duplicates: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const contactsApi = (typeof navigator !== "undefined" ? (navigator as unknown as { contacts?: ContactsManager }).contacts : undefined);

  const submit = async (rows: Row[]) => {
    const clean = rows.filter((r) => (r.phone || "").replace(/\D/g, "").length >= 6);
    if (!clean.length) { setError("לא נמצאו אנשי קשר עם מספר טלפון תקין."); return; }
    setBusy(true); setError(null);
    try {
      const res = await importCallerContacts(clean);
      setResult(res);
      onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "הייבוא נכשל");
    }
    setBusy(false);
  };

  const onFile = (file?: File) => {
    if (!file) return;
    setResult(null); setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "binary" });
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: "" });
        if (!json.length) { setError("הקובץ ריק."); return; }
        const hdrs = Object.keys(json[0]);
        const { mapping, historyCols } = autoDetect(hdrs, json);
        const rows = json.map((r) => {
          const l = buildLead(r, mapping, historyCols);
          return { full_name: l.full_name, phone: l.phone, email: l.email };
        });
        submit(rows);
      } catch { setError("קריאת הקובץ נכשלה."); }
    };
    reader.readAsBinaryString(file);
  };

  const pickFromPhone = async () => {
    if (!contactsApi) return;
    try {
      const picked = await contactsApi.select(["name", "tel", "email"], { multiple: true });
      const rows: Row[] = picked.map((c) => ({
        full_name: (c.name && c.name[0]) || "",
        phone: (c.tel && c.tel[0]) || "",
        email: c.email && c.email[0],
      }));
      submit(rows);
    } catch { /* user cancelled */ }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">העלה את אנשי הקשר שלך. אחר כך תסנן בהחלקה למי להתקשר — ורק הם ייכנסו לרשימת השיחות.</p>

      {contactsApi && (
        <button onClick={pickFromPhone} disabled={busy} className="btn-primary w-full py-3 rounded-xl font-semibold disabled:opacity-50">
          📱 ייבוא אנשי קשר מהטלפון
        </button>
      )}

      <label className="block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer" style={{ borderColor: "var(--border)" }}>
        <div className="text-2xl mb-1">📥</div>
        <div className="font-medium text-sm">{contactsApi ? "או העלה קובץ" : "העלה קובץ אנשי קשר"}</div>
        <div className="text-xs text-muted mt-1">.xlsx, .xls, .csv — זיהוי עמודות אוטומטי</div>
        <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={busy} onChange={(e) => onFile(e.target.files?.[0])} />
      </label>

      {!contactsApi && (
        <p className="text-[11px] text-muted text-center">ייבוא ישיר מאנשי הקשר בטלפון זמין ב-Chrome על אנדרואיד.</p>
      )}

      {busy && <p className="text-sm text-center text-muted">מייבא…</p>}
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {result && (
        <div className="rounded-xl p-3 text-sm" style={{ background: "var(--bg)" }}>
          ✅ נוספו <b>{result.added}</b> אנשי קשר{result.duplicates > 0 ? ` · ${result.duplicates} כפולים דולגו` : ""}. עבור ל<b>סינון</b> כדי לבחור למי להתקשר.
        </div>
      )}
    </div>
  );
}
