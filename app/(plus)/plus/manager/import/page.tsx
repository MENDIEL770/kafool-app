"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { useStore } from "@/lib/plus/store";
import { useRequireRole } from "@/lib/plus/useAuth";
import AppShell from "@/components/plus/AppShell";
import ThemeRoot from "@/components/plus/ThemeRoot";
import ManagerNav from "@/components/plus/ManagerNav";
import { Field } from "@/components/plus/ui";

// target lead fields the user maps columns onto
const TARGETS: { key: string; label: string; required?: boolean }[] = [
  { key: "full_name", label: "שם מלא", required: true },
  { key: "phone", label: "טלפון", required: true },
  { key: "email", label: "אימייל" },
  { key: "address", label: "כתובת" },
  { key: "birthday", label: "תאריך לידה" },
  { key: "notes", label: "הערות" },
  { key: "prev_amount", label: "תרומה קודמת (₪)" },
];

export default function ImportPage() {
  const session = useRequireRole(["manager"]);
  const rootId = session?.campaign_id ?? null;
  const importLeads = useStore((s) => s.importLeads);

  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ added: number; duplicates: number; review: number } | null>(null);

  const onFile = (file?: File) => {
    if (!file) return;
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      if (json.length === 0) return;
      const hdrs = Object.keys(json[0]);
      setHeaders(hdrs);
      setRows(json);
      // auto-guess mapping by Hebrew header names
      const guess: Record<string, string> = {};
      for (const t of TARGETS) {
        const hit = hdrs.find((h) => h.includes(t.label) || h.toLowerCase().includes(t.key));
        if (hit) guess[t.key] = hit;
      }
      // common Hebrew aliases
      hdrs.forEach((h) => {
        if (/שם/.test(h) && !guess.full_name) guess.full_name = h;
        if (/טלפו|נייד|פלאפו/.test(h) && !guess.phone) guess.phone = h;
        if (/מייל|דוא/.test(h) && !guess.email) guess.email = h;
      });
      setMapping(guess);
    };
    reader.readAsBinaryString(file);
  };

  const doImport = () => {
    const mapped = rows.map((r) => {
      const prev = mapping.prev_amount ? Number(r[mapping.prev_amount]) : 0;
      return {
        full_name: String(r[mapping.full_name] ?? ""),
        phone: String(r[mapping.phone] ?? ""),
        email: mapping.email ? String(r[mapping.email]) : undefined,
        address: mapping.address ? String(r[mapping.address]) : undefined,
        birthday: mapping.birthday ? String(r[mapping.birthday]) : undefined,
        notes: mapping.notes ? String(r[mapping.notes]) : undefined,
        donation_history: prev > 0 ? [{ date: "2025", amount: prev }] : [],
      };
    });
    const res = importLeads(rootId!, mapped);
    setResult(res);
  };

  if (!session) return null;

  return (
    <ThemeRoot campaignId={rootId}>
      <AppShell subtitle="ייבוא אנשי קשר מאקסל">
        <ManagerNav />

        <div className="card p-6">
          <h2 className="font-bold text-lg mb-1">ייבוא אקסל</h2>
          <p className="text-sm text-muted mb-4">העלה קובץ .xlsx / .csv. נזהה עמודות אוטומטית — אפשר לתקן ידנית. דה-דופליקציה לפי טלפן.</p>

          <label className="block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer mb-4" style={{ borderColor: "var(--border)" }}>
            <div className="text-3xl mb-2">📥</div>
            <div className="font-medium">בחר קובץ או גרור לכאן</div>
            <div className="text-xs text-muted mt-1">.xlsx, .xls, .csv</div>
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>

          {headers.length > 0 && (
            <>
              <div className="text-sm font-medium mb-2">מיפוי עמודות ({rows.length} שורות)</div>
              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                {TARGETS.map((t) => (
                  <Field key={t.key} label={`${t.label}${t.required ? " *" : ""}`}>
                    <select
                      value={mapping[t.key] ?? ""}
                      onChange={(e) => setMapping({ ...mapping, [t.key]: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border bg-transparent"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <option value="">— לא ממופה —</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </Field>
                ))}
              </div>

              {/* preview */}
              <div className="overflow-x-auto mb-4 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "var(--bg)" }}>
                      <th className="p-2 text-right">שם</th>
                      <th className="p-2 text-right">טלפון</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 4).map((r, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: "var(--border)" }}>
                        <td className="p-2">{String(r[mapping.full_name] ?? "—")}</td>
                        <td className="p-2" dir="ltr">{String(r[mapping.phone] ?? "—")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                disabled={!mapping.full_name || !mapping.phone}
                onClick={doImport}
                className="btn-primary w-full py-3 rounded-xl font-semibold disabled:opacity-50"
              >
                ייבא {rows.length} לידים
              </button>
            </>
          )}

          {result && (
            <div className="mt-4 rounded-xl p-4" style={{ background: "var(--bg)" }}>
              <div className="font-semibold mb-1">✅ הייבוא הושלם</div>
              <div className="text-sm text-muted">נוספו {result.added} · כפולים שדולגו {result.duplicates} · לבדיקה (מספר לא תקין) {result.review}</div>
              <div className="text-sm mt-2">המשך ל<b>סינון</b> כדי לבחור למי להתקשר.</div>
            </div>
          )}
        </div>
      </AppShell>
    </ThemeRoot>
  );
}
