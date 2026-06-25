"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { useStore } from "@/lib/plus/store";
import { autoDetect, buildLead } from "@/lib/plus/import-detect";
import { parseVCards } from "@/lib/plus/vcard";

const FIELD_LABELS: Record<string, string> = {
  full_name: "שם", phone: "טלפון", email: "אימייל", address: "כתובת", birthday: "ת. לידה", notes: "הערות",
};

/** Self-contained Excel import that auto-detects columns and adds leads to `campaignId`. */
export default function LeadImport({ campaignId, onDone }: { campaignId: string; onDone?: () => void }) {
  const importLeads = useStore((s) => s.importLeads);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [historyCols, setHistoryCols] = useState<string[]>([]);
  const [result, setResult] = useState<{ added: number; duplicates: number; review: number } | null>(null);

  const onFile = (file?: File) => {
    if (!file) return;
    setResult(null);
    const isVcf = /\.vcf$/i.test(file.name) || /vcard/i.test(file.type);
    const reader = new FileReader();
    reader.onload = (e) => {
      // iPhone/Android exported contacts (vCard) — no columns to map, import directly.
      if (isVcf) {
        const parsed = parseVCards(String(e.target?.result ?? ""));
        if (!parsed.length) { alert("לא נמצאו אנשי קשר עם טלפון בקובץ ה-vCard."); return; }
        setResult(importLeads(campaignId, parsed));
        onDone?.();
        return;
      }
      const wb = XLSX.read(e.target?.result, { type: "binary" });
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: "" });
      if (!json.length) return;
      const hdrs = Object.keys(json[0]);
      const { mapping: m, historyCols: hc } = autoDetect(hdrs, json);
      setHeaders(hdrs); setRows(json); setMapping(m); setHistoryCols(hc);
    };
    if (isVcf) reader.readAsText(file); else reader.readAsBinaryString(file);
  };

  const doImport = () => {
    const mapped = rows.map((r) => buildLead(r, mapping, historyCols));
    setResult(importLeads(campaignId, mapped));
    onDone?.();
  };

  return (
    <div>
      <label className="block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer mb-3" style={{ borderColor: "var(--border)" }}>
        <div className="text-3xl mb-1">📥</div>
        <div className="font-medium text-sm">בחר קובץ או גרור לכאן</div>
        <div className="text-xs text-muted mt-1">vCard (.vcf) מהאייפון · או .xlsx / .xls / .csv — זיהוי אוטומטי</div>
        <input type="file" accept=".vcf,text/vcard,.xlsx,.xls,.csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      </label>

      {headers.length > 0 && (
        <>
          <div className="rounded-xl border p-3 mb-3" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
            <div className="text-sm font-semibold mb-2">🪄 זוהה אוטומטית ({rows.length} שורות)</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(mapping).filter(([k]) => FIELD_LABELS[k]).map(([k, v]) => (
                <span key={k} className="text-[11px] px-2 py-1 rounded-full" style={{ background: "color-mix(in srgb, var(--secondary) 14%, transparent)", color: "var(--secondary)" }}>{FIELD_LABELS[k]}: <b>{v}</b></span>
              ))}
              {historyCols.map((h) => (
                <span key={h} className="text-[11px] px-2 py-1 rounded-full" style={{ background: "color-mix(in srgb, var(--accent) 18%, transparent)", color: "#7a5b12" }}>תרומה: <b>{h}</b></span>
              ))}
            </div>
            {(!mapping.full_name || !mapping.phone) && <div className="text-[11px] text-red-500 mt-2">לא זוהו שם/טלפון בקובץ.</div>}
          </div>
          <button disabled={!mapping.full_name || !mapping.phone} onClick={doImport} className="btn-primary w-full py-3 rounded-xl font-semibold disabled:opacity-50">
            ייבא {rows.length} לידים לסניף
          </button>
        </>
      )}

      {result && (
        <div className="mt-3 rounded-xl p-3 text-sm" style={{ background: "var(--bg)" }}>
          ✅ נוספו {result.added} · כפולים {result.duplicates} · לבדיקה {result.review}
        </div>
      )}
    </div>
  );
}
