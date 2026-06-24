"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { useStore } from "@/lib/plus/store";
import { importBranchLeads } from "@/lib/plus/actions";
import { useRequireRole } from "@/lib/plus/useAuth";
import AppShell from "@/components/plus/AppShell";
import ThemeRoot from "@/components/plus/ThemeRoot";
import ManagerNav from "@/components/plus/ManagerNav";
import { Field } from "@/components/plus/ui";

// target lead fields the user maps columns onto
const TARGETS: { key: string; label: string; required?: boolean }[] = [
  { key: "branch", label: "סניף (לייבוא מרובה-סניפים)" },
  { key: "coord_email", label: "מייל רכז הסניף" },
  { key: "full_name", label: "שם מלא", required: true },
  { key: "phone", label: "טלפון", required: true },
  { key: "email", label: "אימייל" },
  { key: "address", label: "כתובת" },
  { key: "birthday", label: "תאריך לידה" },
  { key: "notes", label: "הערות" },
  { key: "history", label: "היסטוריית תרומות (סכומים מופרדים בפסיק)" },
];

// "1800,360;2024:5000" -> [{date,amount}] (supports plain amounts or year:amount)
function parseHistory(raw: string): { date: string; amount: number }[] {
  return String(raw || "")
    .split(/[;,\n]+/).map((t) => t.trim()).filter(Boolean)
    .map((tok) => {
      const [a, b] = tok.split(":");
      const amount = Number((b ?? a).replace(/[^\d.]/g, ""));
      const date = b ? a.trim() : "";
      return amount > 0 ? { date: date || "—", amount } : null;
    })
    .filter((x): x is { date: string; amount: number } => !!x);
}

// ── smart auto-detection: maps columns by header aliases AND by content ──
const ALIASES: Record<string, string[]> = {
  full_name: ["שם מלא", "שם התורם", "שם פרטי", "שם", "תורם", "איש קשר", "full name", "name", "donor", "contact"],
  phone: ["טלפון נייד", "טלפון", "נייד", "פלאפון", "פלאפ", "סלולרי", "מספר טלפון", "מס טלפון", "tel", "phone", "mobile", "cell", "whatsapp", "וואטסאפ"],
  email: ["אימייל", "דואל", "דואר אלקטרוני", "מייל", "email", "e-mail", "mail"],
  address: ["כתובת", "עיר", "ישוב", "יישוב", "רחוב", "address", "city", "street"],
  birthday: ["תאריך לידה", "יום הולדת", "לידה", "birthday", "dob"],
  notes: ["הערות", "הערה", "comment", "comments", "note", "notes"],
  branch: ["סניף", "קבוצה", "צוות", "קהילה", "branch", "team", "group"],
  coord_email: ["מייל רכז", "אימייל רכז", "רכז", "אחראי", "קפטן", "captain", "coordinator", "leader"],
};
const norm = (s: string) => s.toLowerCase().replace(/["'`׳״.\-_/]/g, "").replace(/\s+/g, " ").trim();

function autoDetect(headers: string[], rows: Record<string, unknown>[]): { mapping: Record<string, string>; historyCols: string[] } {
  const sample = rows.slice(0, 25);
  const vals = (h: string) => sample.map((r) => String(r[h] ?? "").trim()).filter(Boolean);
  const frac = (arr: string[], f: (v: string) => boolean) => (arr.length ? arr.filter(f).length / arr.length : 0);
  const isPhone = (v: string) => { const d = v.replace(/\D/g, ""); return d.length >= 9 && d.length <= 11 && /^[\d\-+()\s]+$/.test(v); };
  const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const isAmount = (v: string) => { const n = Number(v.replace(/[₪$,\s]/g, "")); return /^[₪$\s]*[\d,]+(\.\d+)?[₪$\s]*$/.test(v) && n > 0; };
  const isName = (v: string) => /(?:[א-ת]{2,}\s+[א-ת]{2,})|(?:[A-Za-z]{2,}\s+[A-Za-z]{2,})/.test(v);
  const isYearHeader = (h: string) => /(^|[^\d])(19|20)\d{2}([^\d]|$)/.test(h) || /תש[״"׳']?[עפסקרת]/.test(h) || /תרומ|סכום|donation|amount|pledge/i.test(h);

  const used = new Set<string>();
  const mapping: Record<string, string> = {};
  // 1) header-alias scoring
  for (const key of Object.keys(ALIASES)) {
    let best: string | null = null, bestScore = 0;
    for (const h of headers) {
      if (used.has(h)) continue;
      const nh = norm(h);
      let score = 0;
      for (const a of ALIASES[key]) { const na = norm(a); if (nh === na) score = Math.max(score, 3); else if (nh.includes(na) || na.includes(nh)) score = Math.max(score, 2); }
      if (score > bestScore) { bestScore = score; best = h; }
    }
    if (best && bestScore >= 2) { mapping[key] = best; used.add(best); }
  }
  // 2) content sniffing for essentials still missing
  if (!mapping.phone) { const h = headers.find((x) => !used.has(x) && frac(vals(x), isPhone) > 0.6); if (h) { mapping.phone = h; used.add(h); } }
  if (!mapping.email) { const h = headers.find((x) => !used.has(x) && frac(vals(x), isEmail) > 0.5); if (h) { mapping.email = h; used.add(h); } }
  if (!mapping.full_name) { const h = headers.find((x) => !used.has(x) && frac(vals(x), isName) > 0.4); if (h) { mapping.full_name = h; used.add(h); } }
  // 3) donation-history columns: year/amount-like headers OR numeric columns left over
  const historyCols = headers.filter((h) => !used.has(h) && (isYearHeader(h) || frac(vals(h), isAmount) > 0.6));
  return { mapping, historyCols };
}

export default function ImportPage() {
  const session = useRequireRole(["manager"]);
  const campaigns = useStore((s) => s.campaigns);
  const rootId = session?.campaign_id ?? campaigns.find((c) => c.parent_campaign_id === null)?.id ?? null;
  const importLeads = useStore((s) => s.importLeads);
  const refresh = useStore((s) => s.refresh);

  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [historyCols, setHistoryCols] = useState<string[]>([]);
  const [result, setResult] = useState<{ added: number; duplicates: number; review: number } | null>(null);
  const [branchResult, setBranchResult] = useState<{ branches: number; coordinators: number; leads: number; duplicates: number } | null>(null);
  const [busy, setBusy] = useState(false);

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
      // smart auto-detection (header aliases + content sniffing)
      const { mapping: guess, historyCols: hist } = autoDetect(hdrs, json);
      setMapping(guess);
      setHistoryCols(hist);
    };
    reader.readAsBinaryString(file);
  };

  const byBranch = !!mapping.branch;

  const doImport = async () => {
    setResult(null); setBranchResult(null);
    const history = (r: Record<string, unknown>) => {
      const out: { date: string; amount: number }[] = [];
      if (mapping.history) out.push(...parseHistory(String(r[mapping.history] ?? "")));
      for (const h of historyCols) {
        const n = Number(String(r[h] ?? "").replace(/[^\d.]/g, ""));
        if (n > 0) out.push({ date: h, amount: n });
      }
      return out;
    };

    if (byBranch) {
      // multi-branch import → creates branches + coordinators + leads server-side
      setBusy(true);
      const branchRows = rows.map((r) => ({
        branch: String(r[mapping.branch] ?? ""),
        coordEmail: mapping.coord_email ? String(r[mapping.coord_email]) : undefined,
        full_name: String(r[mapping.full_name] ?? ""),
        phone: String(r[mapping.phone] ?? ""),
        email: mapping.email ? String(r[mapping.email]) : undefined,
        address: mapping.address ? String(r[mapping.address]) : undefined,
        notes: mapping.notes ? String(r[mapping.notes]) : undefined,
        history: history(r),
      }));
      try {
        const res = await importBranchLeads(rootId!, branchRows);
        await refresh();
        setBranchResult(res);
      } catch (e) {
        alert(e instanceof Error ? e.message : "הייבוא נכשל");
      }
      setBusy(false);
      return;
    }

    const mapped = rows.map((r) => ({
      full_name: String(r[mapping.full_name] ?? ""),
      phone: String(r[mapping.phone] ?? ""),
      email: mapping.email ? String(r[mapping.email]) : undefined,
      address: mapping.address ? String(r[mapping.address]) : undefined,
      birthday: mapping.birthday ? String(r[mapping.birthday]) : undefined,
      notes: mapping.notes ? String(r[mapping.notes]) : undefined,
      donation_history: history(r),
    }));
    setResult(importLeads(rootId!, mapped));
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
              {/* auto-detection summary */}
              <div className="rounded-xl border p-3 mb-4" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                <div className="text-sm font-semibold mb-2">🪄 זוהה אוטומטית ({rows.length} שורות)</div>
                <div className="flex flex-wrap gap-1.5">
                  {TARGETS.filter((t) => mapping[t.key]).map((t) => (
                    <span key={t.key} className="text-[11px] px-2 py-1 rounded-full" style={{ background: "color-mix(in srgb, var(--secondary) 14%, transparent)", color: "var(--secondary)" }}>
                      {t.label.replace(/ \(.*\)$/, "")}: <b>{mapping[t.key]}</b>
                    </span>
                  ))}
                  {historyCols.map((h) => (
                    <span key={h} className="text-[11px] px-2 py-1 rounded-full" style={{ background: "color-mix(in srgb, var(--accent) 18%, transparent)", color: "#7a5b12" }}>
                      תרומה: <b>{h}</b>
                    </span>
                  ))}
                </div>
                {historyCols.length > 0 && <div className="text-[11px] text-muted mt-2">{historyCols.length} עמודות זוהו כהיסטוריית תרומות וימוזגו לכל ליד.</div>}
                {(!mapping.full_name || !mapping.phone) && <div className="text-[11px] text-red-500 mt-2">לא זוהו שם/טלפון — בחר ידנית למטה.</div>}
              </div>

              <details className="mb-4">
                <summary className="text-sm font-medium cursor-pointer text-muted">תיקון ידני של המיפוי</summary>
                <div className="text-sm font-medium mb-2 mt-3">מיפוי עמודות</div>
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
              </details>

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

              {byBranch && (
                <div className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 mb-3">
                  ייבוא מרובה-סניפים: ייווצרו סניפים לפי עמודת "סניף", חשבונות רכזים לפי "מייל רכז", והלידים עם היסטוריית התרומות שלהם.
                </div>
              )}
              <button
                disabled={!mapping.full_name || !mapping.phone || busy}
                onClick={doImport}
                className="btn-primary w-full py-3 rounded-xl font-semibold disabled:opacity-50"
              >
                {busy ? "מייבא…" : byBranch ? `ייבא ${rows.length} שורות לסניפים` : `ייבא ${rows.length} לידים`}
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

          {branchResult && (
            <div className="mt-4 rounded-xl p-4" style={{ background: "var(--bg)" }}>
              <div className="font-semibold mb-1">✅ הייבוא לסניפים הושלם</div>
              <div className="text-sm text-muted">נוצרו {branchResult.branches} סניפים · {branchResult.coordinators} רכזים · {branchResult.leads} לידים · כפולים שדולגו {branchResult.duplicates}</div>
              <div className="text-sm mt-2">הרכזים יכולים להיכנס עם המייל שלהם ולנהל את הסניף.</div>
            </div>
          )}
        </div>
      </AppShell>
    </ThemeRoot>
  );
}
