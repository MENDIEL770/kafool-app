"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { useStore } from "@/lib/plus/store";
import { importBranchLeads, importCoordinators } from "@/lib/plus/actions";
import { useRequireRole } from "@/lib/plus/useAuth";
import AppShell from "@/components/plus/AppShell";
import ThemeRoot from "@/components/plus/ThemeRoot";
import ManagerNav from "@/components/plus/ManagerNav";
import { Field } from "@/components/plus/ui";
import { autoDetect, parseHistory, findHeaderRow } from "@/lib/plus/import-detect";

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
  const [multiSheet, setMultiSheet] = useState(0); // # of branch sheets detected
  const [coordResult, setCoordResult] = useState<{ assigned: number; created: number } | null>(null);
  const [coordBusy, setCoordBusy] = useState(false);

  // coordinators file: (name, branch, email) — usually header-less
  const onCoordFile = (file?: File) => {
    if (!file) return;
    setCoordResult(null);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const wb = XLSX.read(e.target?.result, { type: "binary" });
      const raw = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" });
      // pick the email column (the one whose cells look like emails), name = first, branch = the other
      const rows = raw
        .map((r) => (r as unknown[]).map((c) => String(c ?? "").trim()))
        .filter((r) => r.some((c) => /.+@.+\..+/.test(c)))
        .map((r) => {
          const emailIdx = r.findIndex((c) => /.+@.+\..+/.test(c));
          const rest = r.map((c, i) => ({ c, i })).filter(({ i }) => i !== emailIdx).map((x) => x.c).filter(Boolean);
          return { name: rest[0] || "", branch: rest[1] || rest[0] || "", email: r[emailIdx] };
        });
      if (!rows.length) { alert("לא נמצאו שורות עם מייל בקובץ"); return; }
      setCoordBusy(true);
      try {
        const res = await importCoordinators(rootId!, rows);
        await refresh();
        setCoordResult(res);
      } catch (err) { alert(err instanceof Error ? err.message : "הייבוא נכשל"); }
      setCoordBusy(false);
    };
    reader.readAsBinaryString(file);
  };

  const onFile = (file?: File) => {
    if (!file) return;
    setResult(null); setBranchResult(null); setMultiSheet(0);
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target?.result, { type: "binary" });

      // ── multi-sheet branch file: one sheet per branch (branch = sheet name),
      // with a title row before the headers. Detect & flatten. ──
      const isIndex = (n: string) => /אינדקס|index|סיכום|summary/i.test(n);
      const branchRows: Record<string, unknown>[] = [];
      const headerSet = new Set<string>();
      let branchSheets = 0;
      for (const sn of wb.SheetNames) {
        if (isIndex(sn)) continue;
        const raw = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sn], { header: 1, defval: "" });
        const hi = findHeaderRow(raw);
        if (hi < 0) continue;
        const hdrs = (raw[hi] as unknown[]).map((c) => String(c ?? "").trim());
        let any = false;
        for (let i = hi + 1; i < raw.length; i++) {
          const r = raw[i] as unknown[];
          if (!r || r.every((c) => String(c ?? "").trim() === "")) continue;
          const obj: Record<string, unknown> = { __branch: sn };
          hdrs.forEach((h, idx) => { if (h) { obj[h] = r[idx] ?? ""; headerSet.add(h); } });
          branchRows.push(obj); any = true;
        }
        if (any) branchSheets++;
      }

      if (branchSheets >= 2) {
        const hdrs = ["__branch", ...headerSet];
        const { mapping: guess, historyCols: hist } = autoDetect([...headerSet], branchRows);
        guess.branch = "__branch"; // branch comes from the sheet name
        setHeaders(hdrs); setRows(branchRows); setMapping(guess); setHistoryCols(hist);
        setMultiSheet(branchSheets);
        return;
      }

      // ── single flat sheet (possibly with a title row before the headers) ──
      const raw = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" });
      const hi = Math.max(0, findHeaderRow(raw));
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: "", range: hi });
      if (json.length === 0) return;
      const hdrs = Object.keys(json[0]);
      const { mapping: guess, historyCols: hist } = autoDetect(hdrs, json);
      setHeaders(hdrs); setRows(json); setMapping(guess); setHistoryCols(hist);
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
              {multiSheet > 0 && (
                <div className="rounded-xl border p-3 mb-3 text-sm" style={{ borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 10%, transparent)" }}>
                  📑 זוהה קובץ <b>מרובה-לשוניות</b>: {multiSheet} סניפים (לשונית = סניף). כל הלשוניות יאוחדו ויובאו, עם היסטוריית התרומות לפי שנים.
                </div>
              )}
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

        {/* coordinators file (name | branch | email) */}
        <div className="card p-6 mt-4">
          <h2 className="font-bold text-lg mb-1">ייבוא רכזי סניפים</h2>
          <p className="text-sm text-muted mb-4">קובץ נפרד עם <b>שם רכז · סניף · מייל</b> (גם בלי שורת כותרת). כל רכז ישויך לסניף המתאים לפי שם — מומלץ לייבא קודם את התורמים.</p>
          <label className="block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer" style={{ borderColor: "var(--border)" }}>
            <div className="text-3xl mb-1">👤</div>
            <div className="font-medium text-sm">{coordBusy ? "מייבא…" : "בחר קובץ רכזים"}</div>
            <div className="text-xs text-muted mt-1">.xlsx, .xls, .csv</div>
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={coordBusy} onChange={(e) => onCoordFile(e.target.files?.[0])} />
          </label>
          {coordResult && (
            <div className="mt-4 rounded-xl p-4 text-sm" style={{ background: "var(--bg)" }}>
              ✅ שויכו {coordResult.assigned} רכזים לסניפים{coordResult.created > 0 ? ` · נוצרו ${coordResult.created} סניפים חדשים` : ""}.
            </div>
          )}
        </div>
      </AppShell>
    </ThemeRoot>
  );
}
