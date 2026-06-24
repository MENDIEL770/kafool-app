"use client";

import { useState } from "react";
import { useStore } from "@/lib/plus/store";
import { useRequireRole } from "@/lib/plus/useAuth";
import AppShell from "@/components/plus/AppShell";
import ThemeRoot from "@/components/plus/ThemeRoot";
import ManagerNav from "@/components/plus/ManagerNav";
import { Field, Input, Textarea } from "@/components/plus/ui";
import { uploadImage } from "@/lib/image-client";
import { cssVarStyle } from "@/lib/plus/theme";
import { COLOR_PRESETS, SCRIPT_PRESETS } from "@/lib/plus/presets";
import type { CampaignBranding } from "@/lib/plus/types";

export default function BrandingStudio() {
  const session = useRequireRole(["manager"]);
  const rootId = session?.campaign_id ?? null;
  const branding = useStore((s) => s.branding);
  const updateBranding = useStore((s) => s.updateBranding);

  const saved = branding.find((b) => b.campaign_id === rootId);
  const [draft, setDraft] = useState<CampaignBranding | null>(saved ?? null);
  const [tab, setTab] = useState<"colors" | "media" | "content" | "script">("colors");
  const [savedFlash, setSavedFlash] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  if (!session || !draft) return null;

  const set = (patch: Partial<CampaignBranding>) => setDraft({ ...draft, ...patch });

  // real upload to Supabase Storage (images and PDF)
  const onUpload = async (key: "logo_url" | "banner_url" | "background_image_url" | "media_url", file?: File) => {
    if (!file) return;
    setUploading(key);
    try {
      const url = await uploadImage(file, `plus/${draft.organization_id}/${key}-${crypto.randomUUID()}`);
      set({ [key]: url } as Partial<CampaignBranding>);
    } catch (e) { alert(e instanceof Error ? e.message : "ההעלאה נכשלה"); }
    setUploading(null);
  };

  const save = () => {
    updateBranding(rootId!, draft);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  return (
    <ThemeRoot campaignId={rootId}>
      <AppShell
        branding={saved}
        subtitle="סטודיו מיתוג"
        right={
          <button onClick={save} className="btn-accent px-4 py-1.5 rounded-lg text-sm font-bold">
            {savedFlash ? "✓ נשמר" : "שמור"}
          </button>
        }
      >
        <ManagerNav />

        <div className="grid lg:grid-cols-2 gap-4">
          {/* ----- settings panel ----- */}
          <div className="card p-4">
            <div className="flex gap-1 mb-4 overflow-x-auto no-scrollbar">
              {([["colors", "צבעים"], ["media", "מדיה"], ["content", "תוכן"], ["script", "תסריט"]] as const).map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className="px-3 py-1.5 rounded-lg text-sm whitespace-nowrap"
                  style={{ background: tab === k ? "var(--primary)" : "transparent", color: tab === k ? "#fff" : "var(--text)", border: "1px solid var(--border)" }}
                >
                  {l}
                </button>
              ))}
            </div>

            {tab === "colors" && (
              <div>
                <div className="text-sm font-medium mb-2">ערכות מוכנות</div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {COLOR_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => set({ ...p.colors, preset_id: p.id })}
                      className="rounded-lg p-2 border text-xs"
                      style={{ borderColor: draft.preset_id === p.id ? "var(--accent)" : "var(--border)" }}
                    >
                      <div className="flex gap-1 mb-1 justify-center">
                        <span className="w-4 h-4 rounded-full" style={{ background: p.colors.primary_color }} />
                        <span className="w-4 h-4 rounded-full" style={{ background: p.colors.secondary_color }} />
                        <span className="w-4 h-4 rounded-full" style={{ background: p.colors.accent_color }} />
                      </div>
                      {p.name}
                    </button>
                  ))}
                </div>
                <ColorRow label="ראשי" value={draft.primary_color} onChange={(v) => set({ primary_color: v })} />
                <ColorRow label="משני" value={draft.secondary_color} onChange={(v) => set({ secondary_color: v })} />
                <ColorRow label="הדגשה" value={draft.accent_color} onChange={(v) => set({ accent_color: v })} />
                <Field label="רקע">
                  <select
                    value={draft.background_style}
                    onChange={(e) => set({ background_style: e.target.value as CampaignBranding["background_style"] })}
                    className="w-full px-3 py-2 rounded-lg border bg-transparent"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <option value="light">בהיר</option>
                    <option value="dark">כהה</option>
                    <option value="custom">מותאם</option>
                  </select>
                </Field>
              </div>
            )}

            {tab === "media" && (
              <div>
                <UploadRow label="לוגו" current={draft.logo_url} uploading={uploading === "logo_url"} onFile={(f) => onUpload("logo_url", f)} onClear={() => set({ logo_url: null })} />
                <UploadRow label="באנר (מופיע בראש הדף בנייד)" current={draft.banner_url} uploading={uploading === "banner_url"} onFile={(f) => onUpload("banner_url", f)} onClear={() => set({ banner_url: null })} />
                <UploadRow label="תמונת רקע" current={draft.background_image_url} uploading={uploading === "background_image_url"} onFile={(f) => onUpload("background_image_url", f)} onClear={() => set({ background_image_url: null })} />
                <UploadRow label="קובץ מדיה לשיתוף (תמונה / PDF)" current={draft.media_url ?? null} uploading={uploading === "media_url"} accept="image/*,application/pdf" onFile={(f) => onUpload("media_url", f)} onClear={() => set({ media_url: null })} />
                <p className="text-xs text-muted mt-2">קובץ המדיה יישלח לתורם — בקישור SMS וכקובץ/תצוגה בוואטסאפ. הקבצים נשמרים ב-Supabase Storage.</p>
              </div>
            )}

            {tab === "content" && (
              <div>
                <Field label="שם הקמפיין"><Input value={draft.campaign_name} onChange={(e) => set({ campaign_name: e.target.value })} /></Field>
                <Field label="סלוגן"><Input value={draft.tagline} onChange={(e) => set({ tagline: e.target.value })} /></Field>
                <Field label="הודעת פתיחה לטלפן"><Textarea rows={2} value={draft.welcome_message} onChange={(e) => set({ welcome_message: e.target.value })} /></Field>
                <Field label="הודעת תודה"><Textarea rows={2} value={draft.thank_you_message} onChange={(e) => set({ thank_you_message: e.target.value })} /></Field>
              </div>
            )}

            {tab === "script" && (
              <div>
                <div className="text-sm font-medium mb-2">תבניות מוכנות</div>
                <div className="flex gap-2 mb-3">
                  {SCRIPT_PRESETS.map((p) => (
                    <button key={p.id} onClick={() => set({ call_script: p.script })} className="btn-ghost text-xs px-3 py-1.5 rounded-lg" style={{ borderColor: "var(--border)" }}>
                      {p.name}
                    </button>
                  ))}
                </div>
                {(["opening", "story", "objections", "closing"] as const).map((k) => (
                  <Field key={k} label={{ opening: "פתיחה", story: "סיפור", objections: "התנגדויות", closing: "סגירה" }[k]}>
                    <Textarea rows={2} value={draft.call_script[k]} onChange={(e) => set({ call_script: { ...draft.call_script, [k]: e.target.value } })} />
                  </Field>
                ))}
              </div>
            )}
          </div>

          {/* ----- live preview ----- */}
          <div>
            <div className="text-sm font-medium mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> תצוגה מקדימה חיה — מסך הטלפן
            </div>
            <div className="rounded-2xl overflow-hidden border themed-transition" style={{ ...cssVarStyle(draft), background: "var(--bg)", borderColor: "var(--border)" }}>
              <div className="p-3 flex items-center gap-2 border-b" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                {draft.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.logo_url} alt="" className="h-8 rounded" />
                ) : (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: "var(--primary)" }}>
                    {draft.campaign_name.slice(0, 2)}
                  </div>
                )}
                <div className="font-bold text-sm" style={{ color: "var(--text)" }}>{draft.campaign_name}</div>
              </div>
              {draft.banner_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.banner_url} alt="" className="w-full h-24 object-cover" />
              )}
              <div className="p-4">
                <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div className="p-4 text-white" style={{ background: "var(--primary)" }}>
                    <div className="text-lg font-bold">אברהם כהן</div>
                    <div className="opacity-90" dir="ltr">050-1234567</div>
                    <div className="mt-2 inline-block bg-white/15 rounded-lg px-3 py-1 text-sm">תרומה קודמת: <b>500 ₪</b></div>
                  </div>
                  <div className="p-4">
                    <button className="w-full py-3 rounded-xl text-white font-bold mb-2" style={{ background: "var(--primary)" }}>📞 התקשר</button>
                    <div className="grid grid-cols-2 gap-2">
                      <button className="py-2 rounded-lg text-white font-semibold" style={{ background: "var(--secondary)" }}>הבטחה</button>
                      <button className="py-2 rounded-lg font-semibold" style={{ background: "var(--accent)", color: "#1a1a1a" }}>קישור</button>
                    </div>
                    <div className="mt-3 h-2 rounded-full" style={{ background: "var(--border)" }}>
                      <div className="h-full rounded-full" style={{ width: "62%", background: "var(--accent)" }} />
                    </div>
                  </div>
                </div>
                <p className="text-center text-xs mt-3" style={{ color: "var(--muted)" }}>{draft.welcome_message}</p>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </ThemeRoot>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted" dir="ltr">{value}</span>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-10 h-10 rounded-lg border-0 cursor-pointer" />
      </div>
    </div>
  );
}

function UploadRow({ label, current, onFile, onClear, accept = "image/*", uploading }: { label: string; current: string | null; onFile: (f?: File) => void; onClear: () => void; accept?: string; uploading?: boolean }) {
  const isImg = !!current && !/\.pdf($|\?)/i.test(current);
  return (
    <div className="mb-4">
      <div className="text-sm font-medium mb-1">{label}</div>
      <div className="flex items-center gap-2">
        {current && (isImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt="" className="h-12 rounded-lg border" style={{ borderColor: "var(--border)" }} />
        ) : (
          <a href={current} target="_blank" rel="noreferrer" className="h-12 px-3 rounded-lg border flex items-center text-xs font-semibold" style={{ borderColor: "var(--border)" }}>📄 PDF</a>
        ))}
        <label className="btn-ghost px-3 py-2 rounded-lg text-sm cursor-pointer" style={{ borderColor: "var(--border)" }}>
          {uploading ? "מעלה…" : "העלה"}
          <input type="file" accept={accept} className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        {current && <button onClick={onClear} className="text-sm text-red-500">הסר</button>}
      </div>
    </div>
  );
}
