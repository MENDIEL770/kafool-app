'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { X, CreditCard, Copy, Check, MessageSquare, ExternalLink, CheckCircle2, ArrowLeftRight } from 'lucide-react'
import type { Lead } from './LeadsTabClient'

const PAYMENT_LINK = process.env.NEXT_PUBLIC_GROW_PAYMENT_LINK || ''

export default function LeadPaymentModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [sending, setSending] = useState(false)
  const [working, setWorking] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  async function copy() {
    await navigator.clipboard.writeText(PAYMENT_LINK)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function sendSms() {
    setSending(true); setError(''); setMsg('')
    const res = await fetch('/api/super-admin/leads/send-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: lead.id }),
    })
    const data = await res.json()
    setSending(false)
    if (!res.ok) { setError(data.error || 'שליחת SMS נכשלה'); return }
    setMsg('הקישור נשלח ללקוח ב-SMS ✓')
    router.refresh()
  }

  async function markPaidAndConvert() {
    if (!confirm('לסמן את הליד כ״שולם״ ולהמיר לארגון פעיל?')) return
    setWorking(true); setError('')
    const supabase = createClient()
    await supabase
      .from('sales_leads')
      .update({ payment_status: 'paid', paid_at: new Date().toISOString(), stage: 'won' })
      .eq('id', lead.id)
    const res = await fetch('/api/super-admin/leads/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: lead.id }),
    })
    const data = await res.json()
    setWorking(false)
    if (!res.ok) { setError(data.error || 'ההמרה נכשלה'); return }
    router.refresh()
    onClose()
  }

  async function convertOnly() {
    if (!confirm('להמיר לארגון פעיל ללא תשלום?')) return
    setWorking(true); setError('')
    const res = await fetch('/api/super-admin/leads/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: lead.id }),
    })
    const data = await res.json()
    setWorking(false)
    if (!res.ok) { setError(data.error || 'ההמרה נכשלה'); return }
    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()} dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-black text-gray-900 text-lg">גביית דמי הקמה</h2>
              <p className="text-xs text-gray-400">{lead.org_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {!PAYMENT_LINK ? (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              לינק התשלום לא מוגדר. הוסף <code className="font-mono text-xs">NEXT_PUBLIC_GROW_PAYMENT_LINK</code> לקובץ הסביבה והפעל מחדש את השרת.
            </div>
          ) : (
            <>
              {/* Payment link section */}
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-gray-500">קישור לתשלום (Grow)</p>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-2">
                  <input readOnly value={PAYMENT_LINK} className="flex-1 bg-transparent text-xs text-gray-500 outline-none px-2 truncate" dir="ltr" />
                  <button onClick={copy} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 font-semibold text-gray-600 shrink-0">
                    {copied ? <><Check className="w-3.5 h-3.5 text-emerald-500" /> הועתק</> : <><Copy className="w-3.5 h-3.5" /> העתק</>}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <a href={PAYMENT_LINK} target="_blank" rel="noopener noreferrer"
                     className="flex items-center justify-center gap-1.5 text-sm px-3 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition">
                    <ExternalLink className="w-4 h-4" /> פתח תשלום
                  </a>
                  <button onClick={sendSms} disabled={sending || !lead.phone}
                          className="flex items-center justify-center gap-1.5 text-sm px-3 py-2.5 rounded-xl border border-blue-200 text-blue-700 font-bold hover:bg-blue-50 transition disabled:opacity-40"
                          title={lead.phone ? `שלח ל-${lead.phone}` : 'אין טלפון לליד'}>
                    <MessageSquare className="w-4 h-4" /> {sending ? 'שולח...' : 'שלח ב-SMS'}
                  </button>
                </div>

                {msg && <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2">{msg}</div>}

                {/* Grow blocks iframe embedding — open in a new tab instead */}
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-5 text-center space-y-1.5">
                  <ExternalLink className="w-6 h-6 text-gray-300 mx-auto" />
                  <p className="text-xs text-gray-500">דף התשלום של Grow נפתח בכרטיסייה נפרדת (לא ניתן להטמיעו כאן).</p>
                  <p className="text-[11px] text-gray-400">לחץ <span className="font-semibold text-gray-500">פתח תשלום</span> או שלח את הקישור ללקוח.</p>
                </div>
              </div>

              {/* Manual status — no automatic webhook in fixed-link mode */}
              <div className="border-t border-gray-100 pt-4 space-y-2.5">
                <p className="text-xs font-semibold text-gray-500">לאחר שהלקוח שילם — סמן ידנית:</p>
                <button onClick={markPaidAndConvert} disabled={working}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition disabled:opacity-50">
                  <CheckCircle2 className="w-4 h-4" />
                  {working ? 'מעבד...' : 'סמן כשולם והמר לארגון'}
                </button>
                <button onClick={convertOnly} disabled={working}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  המר לארגון ללא תשלום
                </button>
              </div>

              {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{error}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
