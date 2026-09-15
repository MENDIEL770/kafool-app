'use client'

import { useEffect, useRef, useState } from 'react'
import type { ShortLink } from './page'
import {
  QrCode, Link2, Copy, Check, Trash2, Download, Plus, Wrench, ExternalLink,
  ChevronDown, MessageCircle, Image as ImageIcon, Calculator, Sparkles, type LucideIcon,
} from 'lucide-react'

const field = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400'

/* ─────────────────────────── QR tool ─────────────────────────── */
// qr-code-styling is a browser-only lib (touches document) — loaded dynamically.
type DotType = 'square' | 'rounded' | 'dots' | 'extra-rounded'
const DOT_STYLES: { key: DotType; label: string }[] = [
  { key: 'square', label: 'מרובע' },
  { key: 'rounded', label: 'מעוגל' },
  { key: 'extra-rounded', label: 'עגול מאוד' },
  { key: 'dots', label: 'נקודות' },
]

function QrBody() {
  const holder = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qrRef = useRef<any>(null)
  const [data, setData] = useState('')
  const [dotType, setDotType] = useState<DotType>('rounded')
  const [fg, setFg] = useState('#0f172a')
  const [transparent, setTransparent] = useState(false)
  const [bg, setBg] = useState('#ffffff')
  const [size, setSize] = useState(320)
  const [ready, setReady] = useState(false)

  const opts = () => ({
    width: size, height: size, type: 'canvas' as const, data: data || ' ',
    margin: 12,
    dotsOptions: { color: fg, type: dotType },
    cornersSquareOptions: { type: (dotType === 'square' ? 'square' : 'extra-rounded') as 'square' | 'extra-rounded', color: fg },
    cornersDotOptions: { color: fg },
    backgroundOptions: { color: transparent ? 'transparent' : bg },
  })

  useEffect(() => {
    let alive = true
    import('qr-code-styling').then(({ default: QRCodeStyling }) => {
      if (!alive || !holder.current) return
      qrRef.current = new QRCodeStyling(opts())
      holder.current.innerHTML = ''
      qrRef.current.append(holder.current)
      setReady(true)
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { if (qrRef.current) qrRef.current.update(opts()) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [data, dotType, fg, transparent, bg, size])

  const download = (ext: 'png' | 'svg') => qrRef.current?.download({ name: 'kafool-qr', extension: ext })

  return (
    <div className="grid md:grid-cols-2 gap-6 items-start">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">קישור או טקסט</label>
          <input value={data} onChange={e => setData(e.target.value)} dir="ltr" className={field} placeholder="https://…" />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1.5">סגנון</label>
          <div className="flex flex-wrap gap-2">
            {DOT_STYLES.map(s => (
              <button key={s.key} type="button" onClick={() => setDotType(s.key)}
                className={`text-sm font-semibold rounded-full px-3 py-1.5 border ${dotType === s.key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-600'}`}>{s.label}</button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-5 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            צבע הברקוד
            <input type="color" value={fg} onChange={e => setFg(e.target.value)} className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer" />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            רקע
            <input type="color" value={bg} onChange={e => setBg(e.target.value)} disabled={transparent} className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer disabled:opacity-40" />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={transparent} onChange={e => setTransparent(e.target.checked)} className="w-4 h-4 accent-blue-600" />
            רקע שקוף
          </label>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">גודל: {size}px</label>
          <input type="range" min={160} max={640} step={20} value={size} onChange={e => setSize(Number(e.target.value))} className="w-full accent-blue-600" />
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => download('png')} disabled={!ready || !data.trim()} className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl px-4 py-2.5 disabled:opacity-50"><Download className="w-4 h-4" /> הורדה PNG</button>
          <button type="button" onClick={() => download('svg')} disabled={!ready || !data.trim()} className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl px-4 py-2.5 hover:bg-gray-50 disabled:opacity-50"><Download className="w-4 h-4" /> SVG</button>
        </div>
      </div>

      {/* preview */}
      <div className="flex items-center justify-center">
        <div className="rounded-2xl p-4" style={{ background: transparent ? 'repeating-conic-gradient(#eef1f6 0% 25%, #fff 0% 50%) 50%/20px 20px' : '#f8fafc', border: '1px solid #eef1f6' }}>
          <div ref={holder} />
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────── Link shortener tool ─────────────────────── */
function ShortenerBody({ initialLinks, baseUrl }: { initialLinks: ShortLink[]; baseUrl: string }) {
  const [links, setLinks] = useState<ShortLink[]>(initialLinks)
  const [target, setTarget] = useState('')
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const shortUrl = (c: string) => `${baseUrl}/s/${c}`

  async function create() {
    if (!target.trim()) return
    setBusy(true); setError(null)
    try {
      const r = await fetch('/api/tools/short-link', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_url: target.trim(), code: code.trim() || undefined, label: label.trim() || undefined }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setError(d.error || 'היצירה נכשלה'); setBusy(false); return }
      setLinks(l => [d.link, ...l]); setTarget(''); setCode(''); setLabel('')
    } catch { setError('היצירה נכשלה') }
    setBusy(false)
  }

  async function remove(id: string) {
    setLinks(l => l.filter(x => x.id !== id))
    await fetch(`/api/tools/short-link?id=${id}`, { method: 'DELETE' }).catch(() => {})
  }

  const copy = (c: string) => { navigator.clipboard?.writeText(shortUrl(c)); setCopied(c); setTimeout(() => setCopied(v => v === c ? null : v), 1500) }

  return (
    <>
      <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
        <div className="grid sm:grid-cols-2 gap-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-gray-600 block mb-1">כתובת יעד</label>
            <input value={target} onChange={e => setTarget(e.target.value)} dir="ltr" placeholder="https://www.kafool.com/…" className={field} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">סיומת מותאמת (אופציונלי)</label>
            <div className="flex items-center gap-1" dir="ltr">
              <span className="text-xs text-gray-400 whitespace-nowrap">{baseUrl.replace(/^https?:\/\//, '')}/s/</span>
              <input value={code} onChange={e => setCode(e.target.value)} dir="ltr" placeholder="rosh" className={field} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">כותרת לזיהוי (אופציונלי)</label>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="למשל: קמפיין ראש השנה" className={field} />
          </div>
        </div>
        <button type="button" onClick={create} disabled={busy || !target.trim()} className="inline-flex items-center justify-center gap-1.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl px-4 py-2.5 h-[42px] disabled:opacity-50">
          <Plus className="w-4 h-4" /> {busy ? 'יוצר…' : 'קצר'}
        </button>
      </div>
      {error && <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</div>}

      <div className="mt-5 space-y-2">
        {links.length === 0 && <p className="text-sm text-gray-400 text-center py-4">עדיין לא נוצרו קישורים.</p>}
        {links.map(l => (
          <div key={l.id} className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5 hover:bg-gray-50">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-blue-700 text-sm truncate" dir="ltr">{shortUrl(l.code)}</span>
                <button onClick={() => copy(l.code)} className="shrink-0 text-gray-400 hover:text-blue-600" title="העתק">{copied === l.code ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}</button>
              </div>
              <div className="text-xs text-gray-400 truncate flex items-center gap-1" dir="ltr"><ExternalLink className="w-3 h-3 shrink-0" /> {l.target_url}</div>
              {l.label && <div className="text-[11px] text-gray-400 truncate">{l.label}</div>}
            </div>
            <div className="text-center shrink-0">
              <div className="text-sm font-bold text-gray-800 tabular-nums">{l.clicks}</div>
              <div className="text-[10px] text-gray-400">קליקים</div>
            </div>
            <button onClick={() => remove(l.id)} className="shrink-0 p-1.5 rounded-lg text-red-400 hover:bg-red-50" title="מחק"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </>
  )
}

/* ─────────────────────────── Accordion shell ─────────────────────────── */
function ToolCard({ icon: Icon, title, desc, open, onToggle, children }: {
  icon: LucideIcon; title: string; desc: string; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors ${open ? 'border-blue-200' : 'border-gray-100'}`}>
      <button type="button" onClick={onToggle} className="w-full flex items-center gap-4 p-4 md:p-5 text-right hover:bg-gray-50/70 transition-colors">
        <span className={`flex-none w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${open ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
          <Icon className="w-5 h-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-gray-900">{title}</span>
          <span className="block text-sm text-gray-500 truncate">{desc}</span>
        </span>
        <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="px-4 md:px-5 pb-5 pt-1 border-t border-gray-100">{children}</div>
        </div>
      </div>
    </div>
  )
}

// Teaser card for tools that aren't built yet — gives the toolbox a visible roadmap.
function SoonCard({ icon: Icon, title, desc }: { icon: LucideIcon; title: string; desc: string }) {
  return (
    <div className="bg-white/60 rounded-2xl border border-dashed border-gray-200 p-4 md:p-5 flex items-center gap-4">
      <span className="flex-none w-11 h-11 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center"><Icon className="w-5 h-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-gray-500">{title}</span>
        <span className="block text-sm text-gray-400 truncate">{desc}</span>
      </span>
      <span className="shrink-0 text-[11px] font-bold text-blue-600 bg-blue-50 rounded-full px-2.5 py-1">בקרוב</span>
    </div>
  )
}

/* ─────────────────────────── Page ─────────────────────────── */
export default function ToolsClient({ initialLinks, baseUrl }: { initialLinks: ShortLink[]; baseUrl: string }) {
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const toggle = (k: string) => setOpen(o => ({ ...o, [k]: !o[k] }))

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16" dir="rtl">
      {/* big header */}
      <header className="pt-1">
        <div className="flex items-center gap-3">
          <span className="flex-none w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-200">
            <Wrench className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">כלי עזר</h1>
            <p className="text-sm text-gray-500 mt-0.5">ארגז כלים לשיווק וניהול הקמפיינים. לחצו על כלי כדי לפתוח אותו.</p>
          </div>
        </div>
      </header>

      {/* active tools */}
      <div className="space-y-3">
        <ToolCard icon={Link2} title="קיצור קישורים" desc="הפכו קישור ארוך לכתובת קצרה וקלה לשיתוף, עם ספירת קליקים." open={!!open.shortener} onToggle={() => toggle('shortener')}>
          <ShortenerBody initialLinks={initialLinks} baseUrl={baseUrl} />
        </ToolCard>

        <ToolCard icon={QrCode} title="מחולל ברקוד (QR)" desc="הדביקו קישור, עצבו, והורידו כתמונה — כולל רקע שקוף." open={!!open.qr} onToggle={() => toggle('qr')}>
          <QrBody />
        </ToolCard>
      </div>

      {/* roadmap */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide px-1">בפיתוח — בקרוב בארגז הכלים</h2>
        <SoonCard icon={MessageCircle} title="בונה הודעת תפוצה" desc="הודעת WhatsApp/SMS מוכנה עם הקישור והטקסט — להעתקה ושליחה בקליק." />
        <SoonCard icon={ImageIcon} title="מחולל תמונת שיתוף" desc="תמונה מעוצבת לרשתות עם שם הקמפיין, היעד וההתקדמות." />
        <SoonCard icon={Calculator} title="מחשבון יעד וקצב גיוס" desc="כמה תורמים/סכום ליום צריך כדי להגיע ליעד עד תאריך שנקבע." />
        <SoonCard icon={Sparkles} title="בנק נוסחים לבקשת תרומה" desc="נוסחי פנייה מוכנים (וואטסאפ, מייל, פוסט) שאפשר להתאים ולהעתיק." />
      </div>
    </div>
  )
}
