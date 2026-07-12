'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { track } from '@/lib/track'
import { Loader2, AlertCircle } from 'lucide-react'

interface Props {
  slug: string
  campaignId?: string
  orgName: string
  campaignTitle: string
  primaryColor: string
  receiptUrl: string | null
  transactionNumber: string | null
  pendingTx?: string | null
  initiallyConfirmed?: boolean
  logoUrl?: string | null
  thanksTitle?: string | null
  thanksMessage?: string | null
}

type Phase = 'verifying' | 'confirmed' | 'pending'

export default function ThanksClient({
  slug, campaignId, orgName, campaignTitle, primaryColor, receiptUrl,
  transactionNumber, pendingTx, initiallyConfirmed, logoUrl, thanksTitle, thanksMessage,
}: Props) {
  const router = useRouter()

  // Only congratulate once the payment is actually confirmed. If we already know
  // it landed → straight to the thank-you. If we have a transaction to check →
  // poll (spinner). If there's nothing to verify → honest pending state.
  const [phase, setPhase] = useState<Phase>(
    initiallyConfirmed ? 'confirmed' : pendingTx ? 'verifying' : 'pending'
  )
  const [seconds, setSeconds] = useState(10)
  const [donorName, setDonorName] = useState<string | null>(null)
  const [receipt] = useState<string | null>(receiptUrl)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Poll the verify endpoint while we don't have a confirmation yet.
  useEffect(() => {
    if (phase !== 'verifying' || !pendingTx || !campaignId) return
    let tries = 0
    const MAX = 15 // ~30s at 2s intervals
    let stop = false
    const tick = async () => {
      if (stop) return
      tries++
      try {
        const r = await fetch(`/api/donations/verify?campaignId=${encodeURIComponent(campaignId)}&tx=${encodeURIComponent(pendingTx)}`)
        const d = await r.json().catch(() => ({}))
        if (d?.confirmed) { setPhase('confirmed'); return }
      } catch { /* keep trying */ }
      if (tries >= MAX) { setPhase('pending'); return }
      timer.current = setTimeout(tick, 2000)
    }
    timer.current = setTimeout(tick, 1500)
    return () => { stop = true; if (timer.current) clearTimeout(timer.current) }
  }, [phase, pendingTx, campaignId])

  // Usage funnel: count a completed donation only once it's confirmed.
  useEffect(() => { if (phase === 'confirmed' && campaignId) track(campaignId, 'donate_complete') }, [phase, campaignId])

  // If /thanks loaded inside the payment iframe, take over the whole tab.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.self !== window.top) {
      try { window.top!.location.href = window.location.href } catch { /* cross-origin */ }
    }
  }, [])

  // Attach donor details to the recorded donation (Kesher flow) — only once confirmed.
  useEffect(() => {
    if (phase !== 'confirmed') return
    const raw = localStorage.getItem('kafool_donor')
    if (!raw) return
    try {
      const donor = JSON.parse(raw)
      if (!donor.anonymous && donor.name) setDonorName(donor.name)
      localStorage.removeItem('kafool_donor')
      if (transactionNumber) {
        createClient()
          .from('donations')
          .update({
            donor_name: donor.anonymous ? null : donor.name || null,
            donor_phone: donor.phone || null,
            donor_email: donor.email || null,
            dedication: donor.dedication || null,
          })
          .eq('kesher_transaction_id', transactionNumber)
          .then(({ error }) => { if (error) console.error('Failed to update donor details:', error) })
      }
    } catch {}
  }, [phase, transactionNumber])

  function goToCampaign() {
    const url = `/${slug}`
    if (typeof window !== 'undefined' && window.self !== window.top) window.top!.location.href = url
    else router.push(url)
  }

  // Auto-return countdown runs only on the confirmed screen.
  useEffect(() => {
    if (phase !== 'confirmed') return
    const t = setInterval(() => {
      setSeconds(s => { if (s <= 1) { clearInterval(t); goToCampaign(); return 0 } return s - 1 })
    }, 1000)
    return () => clearInterval(t)
  }, [phase, slug])

  // ── Verifying: spinning "confirming your payment" screen ──
  if (phase === 'verifying') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
        <div className="text-center space-y-6 max-w-md w-full">
          {logoUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={logoUrl} alt={campaignTitle} className="h-20 w-auto object-contain mx-auto" />
          )}
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-lg"
            style={{ backgroundColor: primaryColor + '20' }}
          >
            <Loader2 className="w-12 h-12 animate-spin" style={{ color: primaryColor }} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">מאמתים את התשלום…</h1>
            <p className="text-gray-500 text-base">אנחנו מוודאים מול חברת הסליקה שהתרומה נקלטה.</p>
            <p className="text-gray-400 text-sm mt-2">אל תסגור את הדף — זה ייקח כמה שניות.</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Pending: honest "not confirmed yet" screen (no celebration) ──
  if (phase === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
        <div className="text-center space-y-6 max-w-md w-full">
          {logoUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={logoUrl} alt={campaignTitle} className="h-16 w-auto object-contain mx-auto" />
          )}
          <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mx-auto shadow-sm">
            <AlertCircle className="w-10 h-10 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">עדיין מאמתים את התשלום</h1>
            <p className="text-gray-500 text-base leading-relaxed">
              קיבלנו את בקשת התרומה, אך טרם קיבלנו אישור מחברת הסליקה.
              <br />
              ייתכן שהחיוב לא הושלם. אם לא חויבת — נסה שוב. אם כן חויבת — נשמח שתיצור קשר ונוודא.
            </p>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => goToCampaign()}
              className="w-full py-3 rounded-xl font-bold text-white text-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              חזרה לדף הקמפיין
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Confirmed: the thank-you ──
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="text-center space-y-6 max-w-md w-full">
        {logoUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={logoUrl} alt={campaignTitle} className="h-20 w-auto object-contain mx-auto" />
        )}

        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-lg"
          style={{ backgroundColor: primaryColor + '20' }}
        >
          <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">{thanksTitle || 'תודה רבה!'}</h1>
          <p className="text-gray-500 text-lg whitespace-pre-line">{thanksMessage || 'תרומתך התקבלה בהצלחה'}</p>
          {donorName && <p className="text-gray-700 font-bold mt-1">{donorName}</p>}
          {orgName && <p className="text-gray-400 text-sm mt-1">{orgName}</p>}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <p className="text-gray-600 text-sm leading-relaxed">
            קבלה תישלח לאימייל שלך בקרוב.
            <br />
            תרומתך תשנה חיים.
          </p>
          {receipt && (
            <a
              href={receipt}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 font-bold text-sm transition-colors hover:bg-gray-50"
              style={{ borderColor: primaryColor, color: primaryColor }}
            >
              הורד קבלה
            </a>
          )}
        </div>

        <div className="space-y-2">
          <button
            onClick={goToCampaign}
            className="w-full py-3 rounded-xl font-bold text-white text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
          >
            חזרה לדף הקמפיין
          </button>
          <p className="text-gray-400 text-xs">חוזר אוטומטית בעוד {seconds} שניות...</p>
        </div>
      </div>
    </div>
  )
}
