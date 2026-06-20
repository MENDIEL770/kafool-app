'use client'

/**
 * MediaGuide — interactive, animated, RTL mockup that shows a client exactly
 * where every media asset lands on a Kafool fundraising page, plus a one-click
 * PDF export of all the requirements.
 *
 * Deps for the PDF export (lazy-loaded, install once):
 *   npm i jspdf html2canvas-pro
 *
 * The interactive part uses pure CSS transitions — no extra deps.
 * We use html2canvas-pro (not the original html2canvas) because it parses
 * Tailwind v4's oklch() color values, which the original throws on while
 * scanning the page stylesheets.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { Download, Monitor, Smartphone, Heart, Loader2 } from 'lucide-react'

/* ─── Brand ─── */
const BRAND_BLUE = '#2B4C9B'
const BRAND_FLAME = '#F2683C' // red-orange from the logo

/* ─── Media spec ─── */
type Zone = 'hero' | 'logo' | 'og' | 'popup' | 'gallery' | 'donate' | 'group'
interface Media {
  id: string
  zone: Zone
  device?: 'desktop' | 'mobile'
  name: string
  size: string
  ratio: string
  format: string
  maxWeight: string
  color: string
}

const MEDIA: Media[] = [
  { id: 'hero-desktop', zone: 'hero', device: 'desktop', name: 'באנר עליון — דסקטופ', size: '1920 × 640 px', ratio: '3:1 (פנורמי)', format: 'JPG / WebP', maxWeight: '2MB', color: BRAND_BLUE },
  { id: 'hero-mobile', zone: 'hero', device: 'mobile', name: 'באנר עליון — נייד', size: '1080 × 1350 px', ratio: '4:5 (או 1:1)', format: 'JPG / WebP', maxWeight: '2MB', color: '#4F46E5' },
  { id: 'logo', zone: 'logo', name: 'לוגו הקמפיין', size: '500 × 500 px', ratio: '1:1', format: 'PNG שקוף', maxWeight: '500KB', color: '#059669' },
  { id: 'og', zone: 'og', name: 'תמונת שיתוף לרשתות (OG)', size: '1200 × 630 px', ratio: '1.91:1', format: 'JPG / PNG', maxWeight: '2MB', color: '#DB2777' },
  { id: 'popup', zone: 'popup', name: 'פרסומת פופ-אפ', size: '1080 × 1080 px', ratio: '1:1 (או 4:5)', format: 'JPG / PNG', maxWeight: '2MB', color: BRAND_FLAME },
  { id: 'gallery', zone: 'gallery', name: 'גלריית הקמפיין', size: '1200 × 800 px', ratio: '3:2', format: 'JPG / WebP', maxWeight: '2MB', color: '#7C3AED' },
  { id: 'donate', zone: 'donate', name: 'כפתורי תרומה (עיצוב)', size: '500 × 500 px', ratio: '1:1 — מוצג כעיגול', format: 'JPG / PNG', maxWeight: '~1MB', color: '#0891B2' },
  { id: 'group', zone: 'group', name: 'תמונת קבוצה', size: '600 × 600 px', ratio: '1:1 — נחתכת לעיגול', format: 'JPG / PNG', maxWeight: '~1MB', color: '#CA8A04' },
]

const TIPS = [
  'דחסו תמונות לפני העלאה — קובץ קל = טעינה מהירה יותר לתורמים.',
  'העדיפו פורמט WebP לתמונות צילום — איכות זהה במשקל נמוך משמעותית.',
  'ודאו רקע שקוף (PNG) בלוגו, כדי שישב יפה על כל צבע באנר.',
  'שמרו על הפנים והאלמנטים החשובים במרכז הבאנר — הקצוות עלולים להיחתך בנייד.',
]

export default function MediaGuide() {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [generating, setGenerating] = useState(false)

  const zoneRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60)
    return () => clearTimeout(t)
  }, [])

  const activeZone: Zone | null = activeId ? MEDIA.find(m => m.id === activeId)?.zone ?? null : null

  // Representative media id for a zone (hero depends on the device toggle).
  const repId = useCallback(
    (zone: Zone) => (zone === 'hero' ? (device === 'mobile' ? 'hero-mobile' : 'hero-desktop') : MEDIA.find(m => m.zone === zone)!.id),
    [device],
  )

  // Hover a list row → light up + scroll its zone into view.
  const onRowEnter = (m: Media) => {
    setActiveId(m.id)
    zoneRefs.current[m.zone]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  // Hover a zone → light up its matching list row + scroll it into view.
  const onZoneEnter = (zone: Zone) => {
    const id = repId(zone)
    setActiveId(id)
    rowRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
  const clear = () => setActiveId(null)

  /* ─── PDF export ─── */
  async function downloadPdf() {
    if (!printRef.current) return
    setGenerating(true)
    try {
      // html2canvas-pro is a maintained fork that understands Tailwind v4's
      // oklch()/lab() colors; the original html2canvas throws on them.
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas-pro'),
        import('jspdf'),
      ])
      const node = printRef.current
      node.style.display = 'block'
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
      node.style.display = 'none'

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const imgW = pageW
      const imgH = (canvas.height * imgW) / canvas.width
      const img = canvas.toDataURL('image/jpeg', 0.92)

      let remaining = imgH
      let position = 0
      pdf.addImage(img, 'JPEG', 0, position, imgW, imgH)
      remaining -= pageH
      while (remaining > 0) {
        position -= pageH
        pdf.addPage()
        pdf.addImage(img, 'JPEG', 0, position, imgW, imgH)
        remaining -= pageH
      }
      pdf.save('Kafool-מדריך-מדיה.pdf')
    } catch (err) {
      console.error('PDF export failed', err)
      alert('יצירת ה-PDF נכשלה. ודאו שהחבילות jspdf ו-html2canvas-pro מותקנות.')
    } finally {
      setGenerating(false)
    }
  }

  const isActive = (zone: Zone) => activeZone === zone
  const visibleHero = MEDIA.find(m => m.id === (device === 'mobile' ? 'hero-mobile' : 'hero-desktop'))!

  /* shared zone wrapper styling */
  const zoneBase =
    'relative rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer outline-none'
  const zoneStyle = (zone: Zone, color: string): React.CSSProperties => ({
    borderColor: isActive(zone) ? color : `${color}66`,
    background: isActive(zone) ? `${color}1f` : `${color}0d`,
    boxShadow: isActive(zone) ? `0 0 0 4px ${color}33` : 'none',
    transform: isActive(zone) ? 'scale(1.02)' : 'scale(1)',
  })
  const enterStyle = (i: number): React.CSSProperties => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(12px)',
    transition: `opacity .5s ease ${i * 70}ms, transform .5s ease ${i * 70}ms`,
  })

  return (
    <div dir="rtl" className="w-full max-w-6xl mx-auto px-4 py-8 text-gray-800">
      {/* keyframes for the active pulse */}
      <style>{`
        @keyframes mg-pulse { 0%,100%{opacity:1} 50%{opacity:.55} }
        .mg-pulse { animation: mg-pulse 1.4s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold leading-tight" style={{ color: BRAND_BLUE }}>
              דרישות קבצי מדיה — דף גיוס
            </h1>
            <p className="text-sm text-gray-500">עברו עם העכבר על כל פריט כדי לראות איפה הוא יושב בדף</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* device toggle */}
          <div className="flex items-center rounded-xl bg-gray-100 p-1">
            <button
              onClick={() => setDevice('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${device === 'desktop' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            >
              <Monitor className="w-4 h-4" /> דסקטופ
            </button>
            <button
              onClick={() => setDevice('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${device === 'mobile' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            >
              <Smartphone className="w-4 h-4" /> נייד
            </button>
          </div>

          <button
            onClick={downloadPdf}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-bold text-sm shadow-md hover:opacity-90 transition-opacity disabled:opacity-60"
            style={{ background: BRAND_BLUE }}
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {generating ? 'מכין PDF…' : 'הורד מדריך PDF'}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[340px_1fr] gap-6">
        {/* ─── Media list ─── */}
        <div className="space-y-2">
          {MEDIA.map((m, i) => {
            const on = activeId === m.id || (activeZone === m.zone && (m.zone !== 'hero' || m.id === repId('hero')))
            return (
              <button
                key={m.id}
                ref={el => { rowRefs.current[m.id] = el }}
                onMouseEnter={() => onRowEnter(m)}
                onMouseLeave={clear}
                onFocus={() => onRowEnter(m)}
                onBlur={clear}
                style={{ ...enterStyle(i), borderColor: on ? m.color : '#e5e7eb', background: on ? `${m.color}0f` : '#fff' }}
                className="w-full text-right rounded-xl border p-3 transition-all duration-200 hover:shadow-sm focus:outline-none"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 w-3 h-3 rounded-full shrink-0" style={{ background: m.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm leading-tight">{m.name}</div>
                    <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>{m.size}</span>
                      <span>· {m.ratio}</span>
                      <span>· {m.format}</span>
                      <span>· עד {m.maxWeight}</span>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* ─── Mockup ─── */}
        <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 sm:p-6 max-h-[640px] overflow-y-auto">
          <div className={`mx-auto transition-all duration-500 ${device === 'mobile' ? 'max-w-[300px]' : 'max-w-full'}`}>
            {/* browser/phone chrome */}
            <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 border-b border-gray-200">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
              </div>

              <div className="relative p-3 sm:p-4 space-y-4">
                {/* Hero */}
                <Floating label={visibleHero} active={isActive('hero')}>
                  <div
                    ref={el => { zoneRefs.current['hero'] = el }}
                    onMouseEnter={() => onZoneEnter('hero')}
                    onMouseLeave={clear}
                    style={{ ...zoneStyle('hero', visibleHero.color), ...enterStyle(0), aspectRatio: device === 'mobile' ? '4 / 5' : '3 / 1' }}
                    className={`${zoneBase} flex items-center justify-center w-full`}
                  >
                    <ZoneTag color={visibleHero.color} text={`באנר ${device === 'mobile' ? 'נייד 4:5' : 'דסקטופ 3:1'}`} pulsing={isActive('hero')} />
                  </div>
                </Floating>

                {/* Logo overlapping hero bottom */}
                <div className="flex justify-center -mt-9 relative z-10">
                  <Floating label={MEDIA.find(m => m.id === 'logo')!} active={isActive('logo')} side>
                    <div
                      ref={el => { zoneRefs.current['logo'] = el }}
                      onMouseEnter={() => onZoneEnter('logo')}
                      onMouseLeave={clear}
                      style={{ ...zoneStyle('logo', '#059669'), ...enterStyle(1) }}
                      className={`${zoneBase} w-16 h-16 rounded-full flex items-center justify-center bg-white`}
                    >
                      <span className="text-[10px] font-bold text-center leading-none" style={{ color: '#059669' }}>לוגו</span>
                    </div>
                  </Floating>
                </div>

                {/* Title lines */}
                <div className="space-y-1.5 pt-1">
                  <div className="h-3 w-2/3 mx-auto rounded bg-gray-200" />
                  <div className="h-2 w-1/2 mx-auto rounded bg-gray-100" />
                  <div className="h-3 w-3/4 mx-auto rounded-full" style={{ background: `${BRAND_FLAME}40` }} />
                </div>

                {/* Donate buttons (circles) */}
                <Floating label={MEDIA.find(m => m.id === 'donate')!} active={isActive('donate')}>
                  <div
                    ref={el => { zoneRefs.current['donate'] = el }}
                    onMouseEnter={() => onZoneEnter('donate')}
                    onMouseLeave={clear}
                    style={{ ...zoneStyle('donate', '#0891B2'), ...enterStyle(2) }}
                    className={`${zoneBase} p-3`}
                  >
                    <div className="flex justify-center gap-3">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="flex flex-col items-center gap-1">
                          <span className="w-12 h-12 rounded-full border-2" style={{ borderColor: '#0891B2', background: '#0891B210' }} />
                          <span className="h-1.5 w-8 rounded bg-gray-200" />
                        </div>
                      ))}
                    </div>
                  </div>
                </Floating>

                {/* Group images (circles) */}
                <Floating label={MEDIA.find(m => m.id === 'group')!} active={isActive('group')}>
                  <div
                    ref={el => { zoneRefs.current['group'] = el }}
                    onMouseEnter={() => onZoneEnter('group')}
                    onMouseLeave={clear}
                    style={{ ...zoneStyle('group', '#CA8A04'), ...enterStyle(3) }}
                    className={`${zoneBase} p-3`}
                  >
                    <div className="flex justify-center gap-2 flex-wrap">
                      {[0, 1, 2, 3].map(i => (
                        <span key={i} className="w-10 h-10 rounded-full border-2" style={{ borderColor: '#CA8A04', background: '#CA8A0410' }} />
                      ))}
                    </div>
                  </div>
                </Floating>

                {/* Gallery */}
                <Floating label={MEDIA.find(m => m.id === 'gallery')!} active={isActive('gallery')}>
                  <div
                    ref={el => { zoneRefs.current['gallery'] = el }}
                    onMouseEnter={() => onZoneEnter('gallery')}
                    onMouseLeave={clear}
                    style={{ ...zoneStyle('gallery', '#7C3AED'), ...enterStyle(4) }}
                    className={`${zoneBase} p-3`}
                  >
                    <div className="grid grid-cols-3 gap-2">
                      {[0, 1, 2, 3, 4, 5].map(i => (
                        <span key={i} className="rounded-lg border-2" style={{ aspectRatio: '3 / 2', borderColor: '#7C3AED55', background: '#7C3AED10' }} />
                      ))}
                    </div>
                  </div>
                </Floating>

                {/* Popup overlay */}
                {isActive('popup') && <div className="absolute inset-0 bg-black/30 rounded-lg transition-opacity" />}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Floating label={MEDIA.find(m => m.id === 'popup')!} active={isActive('popup')} side>
                    <div
                      ref={el => { zoneRefs.current['popup'] = el }}
                      onMouseEnter={() => onZoneEnter('popup')}
                      onMouseLeave={clear}
                      style={{ ...zoneStyle('popup', BRAND_FLAME), ...enterStyle(5), opacity: isActive('popup') ? 1 : 0.55 }}
                      className={`${zoneBase} pointer-events-auto w-32 h-32 flex items-center justify-center bg-white shadow-lg`}
                    >
                      <ZoneTag color={BRAND_FLAME} text="פופ-אפ" pulsing={isActive('popup')} />
                    </div>
                  </Floating>
                </div>
              </div>
            </div>

            {/* OG share preview — WhatsApp/Facebook style card on the side */}
            <div className="mt-5">
              <p className="text-xs text-gray-400 mb-2">כך נראה השיתוף בוואטסאפ / פייסבוק:</p>
              <Floating label={MEDIA.find(m => m.id === 'og')!} active={isActive('og')} side>
                <div
                  ref={el => { zoneRefs.current['og'] = el }}
                  onMouseEnter={() => onZoneEnter('og')}
                  onMouseLeave={clear}
                  style={{ ...zoneStyle('og', '#DB2777'), ...enterStyle(6) }}
                  className={`${zoneBase} max-w-xs overflow-hidden bg-white`}
                >
                  <div className="flex items-center justify-center" style={{ aspectRatio: '1.91 / 1', background: '#DB277710' }}>
                    <ZoneTag color="#DB2777" text="תמונת OG 1.91:1" pulsing={isActive('og')} />
                  </div>
                  <div className="p-2.5 bg-gray-50 border-t border-gray-100">
                    <div className="h-2 w-3/4 rounded bg-gray-200 mb-1.5" />
                    <div className="h-1.5 w-1/2 rounded bg-gray-100" />
                    <div className="text-[10px] text-gray-400 mt-1.5">kafool.com</div>
                  </div>
                </div>
              </Floating>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden printable node — inline HEX styles only (html2canvas-safe) */}
      <PrintableGuide ref={printRef} />
    </div>
  )
}

/* ─── Floating label bubble shown when a zone is active ─── */
function Floating({ children, label, active, side }: { children: React.ReactNode; label: Media; active: boolean; side?: boolean }) {
  return (
    <div className="relative">
      {children}
      <div
        className={`absolute z-30 ${side ? 'top-1/2 -translate-y-1/2 left-[calc(100%+8px)]' : 'bottom-[calc(100%+6px)] right-0'} transition-all duration-200 pointer-events-none`}
        style={{ opacity: active ? 1 : 0, transform: `${side ? 'translateY(-50%)' : ''} ${active ? 'scale(1)' : 'scale(.95)'}` }}
      >
        <div className="rounded-lg shadow-lg text-white text-[11px] leading-snug px-3 py-2 whitespace-nowrap" style={{ background: label.color }}>
          <div className="font-bold">{label.name}</div>
          <div className="opacity-90">{label.size} · {label.ratio}</div>
          <div className="opacity-90">{label.format} · עד {label.maxWeight}</div>
        </div>
      </div>
    </div>
  )
}

function ZoneTag({ color, text, pulsing }: { color: string; text: string; pulsing: boolean }) {
  return (
    <span className={`text-xs font-bold ${pulsing ? 'mg-pulse' : ''}`} style={{ color }}>
      {text}
    </span>
  )
}

/* ─── Kafool brand mark ─── */
function BrandMark() {
  return (
    <div className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0" style={{ background: BRAND_BLUE }}>
      <Heart className="w-6 h-6" style={{ color: BRAND_FLAME, fill: BRAND_FLAME }} />
    </div>
  )
}

/* ─── Hidden printable guide for the PDF (HEX inline styles only) ─── */
import { forwardRef } from 'react'

const PrintableGuide = forwardRef<HTMLDivElement>(function PrintableGuide(_props, ref) {
  const cell: React.CSSProperties = { border: '1px solid #E2E8F0', padding: '8px 10px', fontSize: '12px', textAlign: 'right', color: '#1F2937' }
  const head: React.CSSProperties = { ...cell, background: BRAND_BLUE, color: '#fff', fontWeight: 700, border: '1px solid ' + BRAND_BLUE }
  return (
    <div
      ref={ref}
      dir="rtl"
      style={{ display: 'none', width: '760px', padding: '32px', background: '#fff', fontFamily: 'Rubik, Arial, sans-serif', color: '#1F2937' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: `3px solid ${BRAND_FLAME}` }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: BRAND_BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', color: BRAND_FLAME, fontSize: '24px' }}>♥</div>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: BRAND_BLUE }}>דרישות קבצי מדיה — דף גיוס Kafool</div>
          <div style={{ fontSize: '13px', color: '#64748B' }}>מדריך הכנת הקבצים להעלאה למערכת</div>
        </div>
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={head}>פריט</th>
            <th style={head}>מידות מומלצות</th>
            <th style={head}>יחס</th>
            <th style={head}>פורמט</th>
            <th style={head}>משקל מקס׳</th>
          </tr>
        </thead>
        <tbody>
          {MEDIA.map((m, i) => (
            <tr key={m.id} style={{ background: i % 2 ? '#F8FAFC' : '#fff' }}>
              <td style={{ ...cell, fontWeight: 700 }}>
                <span style={{ display: 'inline-block', width: '9px', height: '9px', borderRadius: '50%', background: m.color, marginLeft: '6px' }} />
                {m.name}
              </td>
              <td style={cell}>{m.size}</td>
              <td style={cell}>{m.ratio}</td>
              <td style={cell}>{m.format}</td>
              <td style={cell}>{m.maxWeight}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Tips */}
      <div style={{ marginTop: '22px', background: '#F1F5F9', borderRadius: '10px', padding: '16px 18px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: BRAND_BLUE, marginBottom: '8px' }}>טיפים להעלאה</div>
        <ul style={{ margin: 0, paddingInlineStart: '18px' }}>
          {TIPS.map((t, i) => (
            <li key={i} style={{ fontSize: '12px', color: '#334155', marginBottom: '5px', lineHeight: 1.5 }}>{t}</li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '11px', color: '#94A3B8' }}>
        Kafool · kafool.com · מדריך מדיה לדף גיוס
      </div>
    </div>
  )
})
