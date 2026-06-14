'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Phone, PhoneOff, PhoneMissed, XCircle, CalendarClock, HandCoins,
  CheckCircle2, Ban, MessageCircle, Send, History,
} from 'lucide-react'
import type { Caller } from '@/types'

interface CallerWithProfile extends Caller {
  profiles: { full_name: string; phone: string | null } | null
}

interface PulseLead {
  id: string
  campaign_id: string
  org_id: string
  name: string
  phone: string
  email: string | null
  notes: string | null
  status: string
  previous_donations: number | null
  call_attempts: number | null
  callback_at: string | null
}

type ShiftState = 'idle' | 'calling' | 'done'
type Outcome = 'no_answer' | 'busy' | 'wrong_number' | 'callback' | 'promise' | 'donated' | 'do_not_call'

interface ModalState { type: 'promise' | 'donated' | 'callback' | null; amount: string; callbackAt: string }

function fmt(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0')
  const s = (sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function PulsePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const callerId = searchParams.get('caller_id')
  const supabase = createClient()

  const [shift, setShift] = useState<ShiftState>('idle')
  const [caller, setCaller] = useState<CallerWithProfile | null>(null)
  const [campaignSlug, setCampaignSlug] = useState('')
  const [campaignTitle, setCampaignTitle] = useState('')
  const [currentLead, setCurrentLead] = useState<PulseLead | null>(null)
  const [notes, setNotes] = useState('')
  const [modal, setModal] = useState<ModalState>({ type: null, amount: '', callbackAt: '' })
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [sentMsg, setSentMsg] = useState('')
  const [statsToday, setStatsToday] = useState({ calls: 0, donations: 0, raised: 0 })
  const [rank, setRank] = useState(0)
  const [orgId, setOrgId] = useState('')
  const [campaignId, setCampaignId] = useState('')

  // ─── call timer ───
  const [seconds, setSeconds] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimer = useCallback(() => {
    setSeconds(0)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
  }, [])
  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])
  useEffect(() => () => stopTimer(), [stopTimer])

  // ─── caller + campaign ───
  useEffect(() => {
    if (!callerId) return
    supabase.from('callers').select('*, profiles(full_name, phone)').eq('id', callerId).single()
      .then(async ({ data }) => {
        if (!data) return
        setCaller(data as CallerWithProfile)
        setOrgId(data.org_id)
        setCampaignId(data.campaign_id)
        const { data: c } = await supabase.from('campaigns').select('slug, title').eq('id', data.campaign_id).single()
        if (c) { setCampaignSlug(c.slug); setCampaignTitle(c.title) }
      })
  }, [callerId])

  const fetchStats = useCallback(async () => {
    if (!callerId) return
    const today = new Date().toISOString().split('T')[0]
    const { data: donations } = await supabase
      .from('donations').select('id, amount')
      .eq('caller_id', callerId).eq('payment_status', 'completed').gte('created_at', today)
    const raised = donations?.reduce((s, d) => s + (d.amount || 0), 0) ?? 0

    const { data: callerData } = await supabase
      .from('callers').select('total_called, total_donated, org_id').eq('id', callerId).single()
    if (callerData?.org_id) {
      const { data: all } = await supabase.from('callers').select('id, total_donated')
        .eq('org_id', callerData.org_id).order('total_donated', { ascending: false })
      setRank((all?.findIndex(c => c.id === callerId) ?? -1) + 1)
    }
    setStatsToday({ calls: callerData?.total_called ?? 0, donations: donations?.length ?? 0, raised })
    if (callerData) setCaller(prev => prev ? { ...prev, total_called: callerData.total_called, total_donated: callerData.total_donated } : prev)
  }, [callerId])

  useEffect(() => { fetchStats() }, [fetchStats])

  // ─── atomic claim of the next lead (no double-dial) ───
  const fetchNextLead = useCallback(async () => {
    if (!callerId || !campaignId) return
    const { data } = await supabase.rpc('claim_next_lead', { p_caller_id: callerId, p_campaign_id: campaignId })
    const lead = (Array.isArray(data) ? data[0] : data) as PulseLead | undefined
    if (lead) {
      setCurrentLead(lead)
      setNotes(lead.notes || '')
      startTimer()
    } else {
      stopTimer()
      setCurrentLead(null)
      setShift('done')
    }
  }, [callerId, campaignId, startTimer, stopTimer])

  async function startShift() {
    if (!callerId) return
    await supabase.from('callers').update({ status: 'calling' }).eq('id', callerId)
    setShift('calling')
    await fetchNextLead()
  }

  async function endShift() {
    if (!callerId) return
    stopTimer()
    if (currentLead) await supabase.rpc('release_lead', { p_lead_id: currentLead.id })
    await supabase.from('callers').update({ status: 'idle' }).eq('id', callerId)
    router.push('/callers')
  }

  // ─── unified outcome recorder ───
  async function record(outcome: Outcome, extra: { amount?: number; callbackAt?: string } = {}) {
    if (!currentLead || !callerId) return
    setLoading(true)
    stopTimer()
    const duration = seconds

    const update: Record<string, unknown> = {
      status: outcome,
      notes,
      call_attempts: (currentLead.call_attempts || 0) + 1,
      last_call_at: new Date().toISOString(),
      locked_by: null,
      locked_at: null,
    }
    if (outcome === 'callback' && extra.callbackAt) update.callback_at = extra.callbackAt
    if (outcome === 'promise' && extra.amount) update.amount_pledged = extra.amount

    await supabase.from('leads').update(update).eq('id', currentLead.id)

    await supabase.from('call_logs').insert({
      org_id: orgId, campaign_id: campaignId, lead_id: currentLead.id, caller_id: callerId,
      outcome, duration_seconds: duration, amount: extra.amount ?? null, note: notes || null,
    })

    // side effects
    if (outcome === 'promise' && extra.amount) {
      await supabase.from('promises').insert({
        org_id: orgId, campaign_id: campaignId, lead_id: currentLead.id, caller_id: callerId, amount: extra.amount,
      })
    }
    if (outcome === 'donated' && extra.amount) {
      await supabase.from('donations').insert({
        campaign_id: campaignId, org_id: orgId, amount: extra.amount,
        donor_name: currentLead.name, donor_phone: currentLead.phone, caller_id: callerId,
        payment_status: 'completed',
      })
      const { data: donorId } = await supabase.rpc('upsert_donor', {
        p_org_id: orgId, p_name: currentLead.name, p_phone: currentLead.phone, p_amount: extra.amount,
      })
      if (donorId) await supabase.from('leads').update({ donor_id: donorId }).eq('id', currentLead.id)
      await supabase.from('callers').update({ total_donated: (caller?.total_donated || 0) + extra.amount }).eq('id', callerId)
    }
    if (outcome === 'do_not_call') {
      await supabase.from('donors').update({ do_not_call: true })
        .eq('org_id', orgId).eq('phone', currentLead.phone)
    }

    await supabase.from('callers').update({ total_called: (caller?.total_called || 0) + 1 }).eq('id', callerId)

    setModal({ type: null, amount: '', callbackAt: '' })
    await fetchNextLead()
    await fetchStats()
    setLoading(false)
  }

  // ─── send donation link ───
  async function sendWhatsApp() {
    if (!currentLead) return
    const intl = '972' + currentLead.phone.replace(/\D/g, '').replace(/^0/, '')
    const url = `${window.location.origin}/${campaignSlug}`
    const text = encodeURIComponent(`שלום, לתרומה לקמפיין "${campaignTitle}": ${url}`)
    window.open(`https://wa.me/${intl}?text=${text}`, '_blank')
    await supabase.from('link_sends').insert({
      org_id: orgId, campaign_id: campaignId, lead_id: currentLead.id, caller_id: callerId, channel: 'whatsapp',
    })
    setSentMsg('נפתח WhatsApp ✓'); setTimeout(() => setSentMsg(''), 2500)
  }

  async function sendSms() {
    if (!currentLead) return
    setSending(true); setSentMsg('')
    const res = await fetch('/api/callers/send-link', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: currentLead.id, callerId }),
    })
    const data = await res.json()
    setSending(false)
    setSentMsg(res.ok ? 'נשלח SMS ✓' : (data.error || 'שליחת SMS נכשלה'))
    setTimeout(() => setSentMsg(''), 3000)
  }

  const goalPct = caller && caller.personal_goal > 0
    ? Math.min(100, Math.round(((caller.total_donated || 0) / caller.personal_goal) * 100)) : 0

  if (!callerId) {
    return <div className="text-center py-16 text-gray-400" dir="rtl">חסר מזהה טלפן. חזור לדף הטלפנים.</div>
  }

  const statusBtns: { outcome: Outcome; label: string; icon: React.ElementType; cls: string; modal?: ModalState['type'] }[] = [
    { outcome: 'no_answer',    label: 'לא ענה',       icon: PhoneMissed,  cls: 'bg-gray-100 hover:bg-gray-200 text-gray-700' },
    { outcome: 'busy',         label: 'תפוס',         icon: PhoneOff,     cls: 'bg-gray-100 hover:bg-gray-200 text-gray-700' },
    { outcome: 'wrong_number', label: 'מספר שגוי',    icon: XCircle,      cls: 'bg-gray-100 hover:bg-gray-200 text-gray-700' },
    { outcome: 'callback',     label: 'לחזור אליו',   icon: CalendarClock, cls: 'bg-blue-500 hover:bg-blue-600 text-white', modal: 'callback' },
    { outcome: 'promise',      label: 'הבטיח',        icon: HandCoins,    cls: 'bg-amber-400 hover:bg-amber-500 text-amber-950', modal: 'promise' },
    { outcome: 'donated',      label: 'תרם',          icon: CheckCircle2, cls: 'bg-emerald-500 hover:bg-emerald-600 text-white', modal: 'donated' },
    { outcome: 'do_not_call',  label: 'הסר מרשימה',   icon: Ban,          cls: 'bg-red-100 hover:bg-red-200 text-red-700' },
  ]

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[80vh]" dir="rtl">
      <div className="flex-1 flex flex-col gap-6 min-w-0 order-2 lg:order-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">KafoolPulse — {caller?.profiles?.full_name || '...'}</h1>
          {shift !== 'idle' && <Button variant="outline" onClick={endShift}>סיים משמרת</Button>}
        </div>

        {shift === 'idle' && (
          <div className="flex flex-col items-center justify-center flex-1 gap-6 py-20">
            <div className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center"><Phone className="w-9 h-9 text-blue-600" /></div>
            <p className="text-gray-500 text-lg">מוכן להתחיל משמרת?</p>
            <Button onClick={startShift} className="text-xl px-12 py-6 h-auto">התחל משמרת</Button>
          </div>
        )}

        {shift === 'done' && (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 py-20">
            <CheckCircle2 className="w-16 h-16 text-emerald-500" />
            <h2 className="text-2xl font-bold text-gray-800">כל הלידים טופלו!</h2>
            <p className="text-gray-500">עבודה מצוינת. אין עוד לידים זמינים כרגע.</p>
            <Button variant="outline" onClick={endShift}>סיים משמרת</Button>
          </div>
        )}

        {shift === 'calling' && currentLead && (
          <div className="space-y-4">
            <Card className="border-2 border-blue-200 shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{currentLead.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    {(currentLead.call_attempts ?? 0) > 0 && (
                      <Badge variant="outline" className="gap-1"><History className="w-3 h-3" />ניסיון {(currentLead.call_attempts ?? 0) + 1}</Badge>
                    )}
                    <Badge variant="outline" className="font-mono tabular-nums text-blue-700 bg-blue-50">{fmt(seconds)}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <a href={`tel:${currentLead.phone}`} className="block text-3xl font-bold text-blue-600 hover:text-blue-700 text-center py-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors" dir="ltr">
                  {currentLead.phone}
                </a>

                {currentLead.previous_donations != null && (
                  <div className="text-sm text-gray-600 bg-amber-50 rounded-lg px-4 py-2">
                    תרומות קודמות: <strong>₪{currentLead.previous_donations.toLocaleString()}</strong>
                  </div>
                )}

                {/* send donation link */}
                <div className="flex items-center gap-2">
                  <button onClick={sendWhatsApp} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bc59] text-white text-sm font-bold transition-colors">
                    <MessageCircle className="w-4 h-4" /> קישור בוואטסאפ
                  </button>
                  <button onClick={sendSms} disabled={sending} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-blue-200 text-blue-700 text-sm font-bold hover:bg-blue-50 transition-colors disabled:opacity-50">
                    <Send className="w-4 h-4" /> {sending ? 'שולח...' : 'קישור ב-SMS'}
                  </button>
                </div>
                {sentMsg && <p className="text-xs text-center text-emerald-600 font-medium">{sentMsg}</p>}

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">הערות</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                    className="w-full border rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-blue-200 outline-none"
                    placeholder="הוסף הערות..." />
                </div>
              </CardContent>
            </Card>

            {/* outcome buttons */}
            <div className="grid grid-cols-2 gap-3">
              {statusBtns.map(b => (
                <button key={b.outcome} disabled={loading}
                  onClick={() => b.modal ? setModal({ type: b.modal, amount: '', callbackAt: '' }) : record(b.outcome)}
                  className={`flex items-center justify-center gap-2 py-4 rounded-xl text-base font-semibold transition-colors disabled:opacity-50 ${b.cls} ${b.outcome === 'do_not_call' ? 'col-span-2' : ''}`}>
                  <b.icon className="w-5 h-5" /> {b.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Callback modal */}
        {modal.type === 'callback' && (
          <Modal title="קביעת שיחה חוזרת" onClose={() => setModal({ type: null, amount: '', callbackAt: '' })}>
            <input type="datetime-local" value={modal.callbackAt} onChange={e => setModal(m => ({ ...m, callbackAt: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2" />
            <div className="flex gap-2">
              <Button onClick={() => record('callback', { callbackAt: modal.callbackAt })} disabled={loading || !modal.callbackAt} className="flex-1">אישור</Button>
              <Button variant="outline" onClick={() => setModal({ type: null, amount: '', callbackAt: '' })} className="flex-1">ביטול</Button>
            </div>
          </Modal>
        )}

        {/* Promise / Donate modal */}
        {(modal.type === 'promise' || modal.type === 'donated') && (
          <Modal title={modal.type === 'promise' ? 'סכום שהובטח' : 'סכום התרומה'} onClose={() => setModal({ type: null, amount: '', callbackAt: '' })}>
            <input type="number" value={modal.amount} onChange={e => setModal(m => ({ ...m, amount: e.target.value }))}
              placeholder="₪ סכום" autoFocus className="w-full border rounded-lg px-3 py-2 text-xl text-center" dir="ltr" />
            <div className="flex gap-2">
              <Button onClick={() => record(modal.type as Outcome, { amount: Number(modal.amount) || 0 })} disabled={loading || !modal.amount}
                className={`flex-1 ${modal.type === 'promise' ? 'bg-amber-400 hover:bg-amber-500 text-amber-950' : 'bg-emerald-500 hover:bg-emerald-600'}`}>אישור</Button>
              <Button variant="outline" onClick={() => setModal({ type: null, amount: '', callbackAt: '' })} className="flex-1">ביטול</Button>
            </div>
          </Modal>
        )}
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-64 shrink-0 space-y-4 order-1 lg:order-2 grid grid-cols-3 lg:block gap-3 lg:gap-0 lg:space-y-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">📊 היום</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Row label="שיחות" value={String(statsToday.calls)} />
            <Row label="תרומות" value={String(statsToday.donations)} green />
            <Row label="גויס" value={`₪${statsToday.raised.toLocaleString()}`} green />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">🎯 יעד אישי</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">₪{(caller?.total_donated || 0).toLocaleString()}</span>
              <span className="text-gray-400">/ ₪{(caller?.personal_goal || 0).toLocaleString()}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full"><div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${goalPct}%` }} /></div>
            <div className="text-center text-lg font-bold text-blue-600">{goalPct}%</div>
          </CardContent>
        </Card>
        {rank > 0 && (
          <Card><CardContent className="pt-4 text-center">
            <div className="text-3xl mb-1">{rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏅'}</div>
            <div className="text-sm text-gray-500">דירוג</div>
            <div className="text-2xl font-bold text-gray-800">#{rank}</div>
          </CardContent></Card>
        )}
      </div>
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 shadow-xl w-80 space-y-4" dir="rtl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold">{title}</h3>
        {children}
      </div>
    </div>
  )
}

function Row({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`font-bold ${green ? 'text-green-600' : ''}`}>{value}</span>
    </div>
  )
}
