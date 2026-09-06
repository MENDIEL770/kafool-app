'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, FileText, Loader2 } from 'lucide-react'

interface Props {
  templateUrl: string
  headline: string
  subtext: string
  contact: string
  price: number
  logoUrl?: string
  pageUrl: string
}

// A print-ready flyer: the manager's uploaded template as the background, a few
// editable lines overlaid, the Chabad logo in a fixed corner, and a QR to the
// page. Exports to PNG (social) and PDF (print) via html2canvas-pro + jsPDF.
export default function KaparotFlyer({ templateUrl, headline, subtext, contact, price, logoUrl, pageUrl }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [qr, setQr] = useState('')
  const [busy, setBusy] = useState<'png' | 'pdf' | null>(null)

  useEffect(() => {
    let alive = true
    import('qrcode').then(QR => QR.toDataURL(pageUrl, { margin: 1, width: 240 }).then(url => { if (alive) setQr(url) }).catch(() => {}))
    return () => { alive = false }
  }, [pageUrl])

  async function exportPng() {
    if (!ref.current) return
    setBusy('png')
    try {
      const { default: html2canvas } = await import('html2canvas-pro')
      const canvas = await html2canvas(ref.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
      const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = 'kaparot-flyer.png'; a.click()
    } catch { alert('הייצוא נכשל — ייתכן שהתבנית נטענת מדומיין שחוסם ייצוא. נסה להעלות אותה מחדש.') }
    setBusy(null)
  }
  async function exportPdf() {
    if (!ref.current) return
    setBusy('pdf')
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import('html2canvas-pro'), import('jspdf')])
      const canvas = await html2canvas(ref.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const w = pdf.internal.pageSize.getWidth(), h = pdf.internal.pageSize.getHeight()
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h)
      pdf.save('kaparot-flyer.pdf')
    } catch { alert('הייצוא נכשל — ייתכן שהתבנית נטענת מדומיין שחוסם ייצוא.') }
    setBusy(null)
  }

  return (
    <div className="space-y-3">
      {/* Preview (A4 portrait). Scaled to fit; captured at 2× for export. */}
      <div className="mx-auto overflow-hidden rounded-lg border border-gray-200 shadow-sm" style={{ maxWidth: 360 }}>
        <div ref={ref} className="relative bg-white" style={{ width: 360, height: 509, fontFamily: "'Frank Ruhl Libre', Georgia, serif" }} dir="rtl">
          {templateUrl
            ? <img src={templateUrl} crossOrigin="anonymous" alt="" className="absolute inset-0 w-full h-full object-cover" />
            : <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm text-center px-6">העלה תבנית פלייר כדי לראות תצוגה מקדימה</div>}

          {/* Logo — fixed top-right corner */}
          {logoUrl && <img src={logoUrl} crossOrigin="anonymous" alt="" className="absolute top-3 right-3 h-10 w-auto object-contain" />}

          {/* Editable text zones */}
          <div className="absolute inset-x-0 top-[26%] px-6 text-center" style={{ color: '#1c2340' }}>
            {headline && <div className="text-2xl font-black leading-tight drop-shadow-sm" style={{ textShadow: '0 1px 6px rgba(255,255,255,.7)' }}>{headline}</div>}
            {subtext && <div className="text-sm mt-1.5" style={{ textShadow: '0 1px 6px rgba(255,255,255,.7)' }}>{subtext}</div>}
          </div>

          {/* Bottom band: contact + price + QR */}
          <div className="absolute bottom-3 inset-x-3 flex items-end justify-between gap-2">
            <div className="text-right" style={{ color: '#1c2340' }}>
              <div className="text-lg font-black" style={{ color: '#b4882c', textShadow: '0 1px 6px rgba(255,255,255,.7)' }}>₪{Math.round(price)} לנפש</div>
              {contact && <div className="text-xs font-semibold" style={{ textShadow: '0 1px 6px rgba(255,255,255,.7)' }}>{contact}</div>}
            </div>
            {qr && (
              <div className="bg-white rounded p-1 shadow">
                <img src={qr} alt="QR" className="w-14 h-14" />
                <div className="text-[7px] text-center text-gray-500 mt-0.5">סרקו לפדיון</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-center">
        <button onClick={exportPng} disabled={busy !== null || !templateUrl} className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-xl border border-gray-200 px-4 py-2 hover:bg-gray-50 disabled:opacity-40">
          {busy === 'png' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} ייצוא תמונה (PNG)
        </button>
        <button onClick={exportPdf} disabled={busy !== null || !templateUrl} className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-xl border border-gray-200 px-4 py-2 hover:bg-gray-50 disabled:opacity-40">
          {busy === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} ייצוא להדפסה (PDF)
        </button>
      </div>
      <p className="text-[11px] text-gray-400 text-center">התבנית היא הרקע — הטקסט למעלה נערך בשדות שמעל. השאירו בתבנית מקום ריק לכותרת ולפרטים בתחתית.</p>
    </div>
  )
}
