'use client'

import { useEffect, useRef, useState } from 'react'
import type { ShortLink } from './page'
import { QrCode, Link2, Copy, Check, Trash2, Download, Plus, Wrench, ExternalLink } from 'lucide-react'

// qr-code-styling is a browser-only lib (touches document) — loaded dynamically.
type DotType = 'square' | 'rounded' | 'dots' | 'extra-rounded'
const DOT_STYLES: { key: DotType; label: string }[] = [
  { key: 'square', label: 'מרובע' },
  { key: 'rounded', label: 'מעוגל' },
  { key: 'extra-rounded', label: 'עגול מאוד' },
  { key: 'dots', label: 'נקודות' },
]

function QrTool() {
  const holder = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qrRef = useRef<any>(null)
  const [data, setData] = useState('https://www.kafool.com')
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

  const field = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400'
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6">
      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-1"><QrCode className="w-5 h-5 text-blue-600" /> מחולל ברקוד (QR)</h2>
      <p className="text-sm text-gray-500 mb-5">הדביקו קישור, עצבו, והורידו כתמונה — כולל רקע שקוף.</p>

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
            <button type="button" onClick={() => download('png')} disabled={!ready} className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl px-4 py-2.5 disabled:opacity-50"><Download className="w-4 h-4" /> הורדה PNG</button>
            <button type="button" onClick={() => download('svg')} disabled={!ready} className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl px-4 py-2.5 hover:bg-gray-50 disabled:opacity-50"><Download className="w-4 h-4" /> SVG</button>
          </div>
        </div>

        {/* preview */}
        <div className="flex items-center justify-center">
          <div className="rounded-2xl p-4" style={{ background: transparent ? 'repeating-conic-gradient(#eef1f6 0% 25%, #fff 0% 50%) 50%/20px 20px' : '#f8fafc', border: '1px solid #eef1f6' }}>
            <div ref={holder} />
          </div>
        </div>
      </div>
    </section>
  )
}

function ShortenerTool({ initialLinks, baseUrl }: { initialLinks: ShortLink[]; baseUrl: string }) {
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
  const field = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400'

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6">
      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-1"><Link2 className="w-5 h-5 text-blue-600" /> קיצור קישורים</h2>
      <p className="text-sm text-gray-500 mb-5">הפכו קישור ארוך לכתובת קצרה וקלה לשיתוף, עם ספירת קליקים.</p>

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
    </section>
  )
}

export default function ToolsClient({ initialLinks, baseUrl }: { initialLinks: ShortLink[]; baseUrl: string }) {
  return (
    <div className="max-w-4xl mx-auto space-y-5" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Wrench className="w-6 h-6 text-blue-600" /> כלי עזר</h1>
        <p className="text-sm text-gray-500 mt-0.5">כלים מהירים לשיווק וניהול — קיצור קישורים ומחולל ברקוד.</p>
      </div>
      <ShortenerTool initialLinks={initialLinks} baseUrl={baseUrl} />
      <QrTool />
    </div>
  )
}
