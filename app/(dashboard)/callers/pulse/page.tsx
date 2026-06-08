'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Lead, Caller } from '@/types'

interface CallerWithProfile extends Caller {
  profiles: { full_name: string; phone: string | null } | null
}

type ShiftState = 'idle' | 'calling' | 'done'

interface ModalState {
  type: 'pledge' | 'donate' | 'callback' | null
  amount: string
  callbackAt: string
}

export default function PulsePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const callerId = searchParams.get('caller_id')
  const supabase = createClient()

  const [shift, setShift] = useState<ShiftState>('idle')
  const [caller, setCaller] = useState<CallerWithProfile | null>(null)
  const [currentLead, setCurrentLead] = useState<Lead | null>(null)
  const [notes, setNotes] = useState('')
  const [modal, setModal] = useState<ModalState>({ type: null, amount: '', callbackAt: '' })
  const [loading, setLoading] = useState(false)
  const [statsToday, setStatsToday] = useState({ calls: 0, donations: 0, raised: 0 })
  const [rank, setRank] = useState<number>(0)
  const [orgId, setOrgId] = useState('')
  const [campaignId, setCampaignId] = useState('')

  // Fetch caller info
  useEffect(() => {
    if (!callerId) return
    supabase
      .from('callers')
      .select('*, profiles(full_name, phone)')
      .eq('id', callerId)
      .single()
      .then(({ data }) => {
        if (data) {
          setCaller(data as CallerWithProfile)
          setOrgId(data.org_id)
          setCampaignId(data.campaign_id)
        }
      })
  }, [callerId])

  // Fetch today's stats
  const fetchStats = useCallback(async () => {
    if (!callerId) return
    const today = new Date().toISOString().split('T')[0]
    const { data: donations } = await supabase
      .from('donations')
      .select('id, amount')
      .eq('caller_id', callerId)
      .eq('payment_status', 'completed')
      .gte('created_at', today)
    const raised = donations?.reduce((s, d) => s + (d.amount || 0), 0) ?? 0
    const donationsCount = donations?.length ?? 0

    // Get total called today from caller's total_called (approximation)
    const { data: callerData } = await supabase.from('callers').select('total_called, total_donated, org_id').eq('id', callerId).single()

    // Rank among all callers in org
    if (callerData?.org_id) {
      const { data: allCallers } = await supabase.from('callers').select('id, total_donated').eq('org_id', callerData.org_id).order('total_donated', { ascending: false })
      const myRank = (allCallers?.findIndex(c => c.id === callerId) ?? -1) + 1
      setRank(myRank)
    }

    setStatsToday({ calls: callerData?.total_called ?? 0, donations: donationsCount, raised })
    if (callerData) setCaller(prev => prev ? { ...prev, total_called: callerData.total_called, total_donated: callerData.total_donated } : prev)
  }, [callerId])

  useEffect(() => { fetchStats() }, [fetchStats])

  const fetchNextLead = useCallback(async () => {
    if (!callerId || !campaignId) return
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('campaign_id', campaignId)
      .in('status', ['new', 'assigned'])
      .or(`caller_id.is.null,caller_id.eq.${callerId}`)
      .order('priority', { ascending: false })
      .limit(1)
      .single()
    if (lead) {
      setCurrentLead(lead as Lead)
      setNotes(lead.notes || '')
    } else {
      setCurrentLead(null)
      setShift('done')
    }
  }, [callerId, campaignId])

  async function startShift() {
    if (!callerId) return
    await supabase.from('callers').update({ status: 'calling' }).eq('id', callerId)
    setShift('calling')
    await fetchNextLead()
  }

  async function endShift() {
    if (!callerId) return
    await supabase.from('callers').update({ status: 'idle' }).eq('id', callerId)
    router.push('/callers')
  }

  async function incrementCalled() {
    if (!callerId || !caller) return
    const newCount = (caller.total_called || 0) + 1
    await supabase.from('callers').update({ total_called: newCount }).eq('id', callerId)
    setCaller(prev => prev ? { ...prev, total_called: newCount } : prev)
  }

  async function handleNoAnswer() {
    if (!currentLead) return
    setLoading(true)
    await supabase.from('leads').update({ status: 'called', notes: 'לא ענה' }).eq('id', currentLead.id)
    await incrementCalled()
    await fetchNextLead()
    await fetchStats()
    setLoading(false)
  }

  async function handleCallback() {
    if (!currentLead || !modal.callbackAt) return
    setLoading(true)
    await supabase.from('leads').update({ status: 'callback', callback_at: modal.callbackAt, notes }).eq('id', currentLead.id)
    await incrementCalled()
    setModal({ type: null, amount: '', callbackAt: '' })
    await fetchNextLead()
    await fetchStats()
    setLoading(false)
  }

  async function handlePledge() {
    if (!currentLead) return
    setLoading(true)
    await supabase.from('leads').update({ status: 'callback', amount_pledged: Number(modal.amount) || 0, notes }).eq('id', currentLead.id)
    await incrementCalled()
    setModal({ type: null, amount: '', callbackAt: '' })
    await fetchNextLead()
    await fetchStats()
    setLoading(false)
  }

  async function handleDonated() {
    if (!currentLead || !caller) return
    setLoading(true)
    const amount = Number(modal.amount) || 0
    // Insert donation record
    await supabase.from('donations').insert({
      campaign_id: campaignId,
      org_id: orgId,
      amount,
      donor_name: currentLead.name,
      donor_phone: currentLead.phone,
      caller_id: callerId,
      payment_status: 'completed',
    })
    await supabase.from('leads').update({ status: 'donated', notes }).eq('id', currentLead.id)
    const newTotal = (caller.total_donated || 0) + amount
    await supabase.from('callers').update({ total_donated: newTotal }).eq('id', callerId)
    await incrementCalled()
    setModal({ type: null, amount: '', callbackAt: '' })
    await fetchNextLead()
    await fetchStats()
    setLoading(false)
  }

  async function handleDnc() {
    if (!currentLead) return
    setLoading(true)
    await supabase.from('leads').update({ status: 'dnc', notes }).eq('id', currentLead.id)
    await incrementCalled()
    await fetchNextLead()
    await fetchStats()
    setLoading(false)
  }

  const goalPct = caller && caller.personal_goal > 0
    ? Math.min(100, Math.round(((caller.total_donated || 0) / caller.personal_goal) * 100))
    : 0

  if (!callerId) {
    return <div className="text-center py-16 text-gray-400" dir="rtl">חסר מזהה טלפן. חזור לדף הטלפנים.</div>
  }

  return (
    <div className="flex gap-6 min-h-[80vh]" dir="rtl">
      {/* Main area */}
      <div className="flex-1 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">KafoolPulse — {caller?.profiles?.full_name || '...'}</h1>
          {shift !== 'idle' && (
            <Button variant="outline" onClick={endShift}>סיים משמרת</Button>
          )}
        </div>

        {/* IDLE */}
        {shift === 'idle' && (
          <div className="flex flex-col items-center justify-center flex-1 gap-6 py-20">
            <div className="text-6xl">📞</div>
            <p className="text-gray-500 text-lg">מוכן להתחיל משמרת?</p>
            <Button onClick={startShift} className="text-xl px-12 py-6 h-auto">התחל משמרת</Button>
          </div>
        )}

        {/* DONE */}
        {shift === 'done' && (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 py-20">
            <div className="text-6xl">✅</div>
            <h2 className="text-2xl font-bold text-gray-800">כל הלידים טופלו!</h2>
            <p className="text-gray-500">עבודה מצוינת. אין עוד לידים זמינים כרגע.</p>
            <Button variant="outline" onClick={endShift}>סיים משמרת</Button>
          </div>
        )}

        {/* CALLING */}
        {shift === 'calling' && currentLead && (
          <div className="space-y-4">
            {/* Lead card */}
            <Card className="border-2 border-blue-200 shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{currentLead.name}</CardTitle>
                  <Badge variant="outline">{currentLead.status === 'new' ? 'חדש' : 'שויך'}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <a href={`tel:${currentLead.phone}`} className="block text-3xl font-bold text-blue-600 hover:text-blue-700 text-center py-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
                  📞 {currentLead.phone}
                </a>
                {currentLead.previous_donations != null && (
                  <div className="text-sm text-gray-600 bg-amber-50 rounded-lg px-4 py-2">
                    תרומות קודמות: <strong>₪{currentLead.previous_donations.toLocaleString()}</strong>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">הערות</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full border rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-blue-200 outline-none"
                    rows={3}
                    placeholder="הוסף הערות..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Action buttons */}
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={handleNoAnswer}
                disabled={loading}
                className="w-full py-4 rounded-xl text-lg font-semibold bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
              >
                📵 לא ענה
              </button>
              <button
                onClick={() => setModal({ type: 'callback', amount: '', callbackAt: '' })}
                disabled={loading}
                className="w-full py-4 rounded-xl text-lg font-semibold bg-blue-500 hover:bg-blue-600 text-white transition-colors"
              >
                📅 לחזור
              </button>
              <button
                onClick={() => setModal({ type: 'pledge', amount: '', callbackAt: '' })}
                disabled={loading}
                className="w-full py-4 rounded-xl text-lg font-semibold bg-yellow-400 hover:bg-yellow-500 text-yellow-900 transition-colors"
              >
                🤝 הבטיח
              </button>
              <button
                onClick={() => setModal({ type: 'donate', amount: '', callbackAt: '' })}
                disabled={loading}
                className="w-full py-4 rounded-xl text-lg font-semibold bg-green-500 hover:bg-green-600 text-white transition-colors"
              >
                ✅ תרם
              </button>
              <button
                onClick={handleDnc}
                disabled={loading}
                className="w-full py-4 rounded-xl text-lg font-semibold bg-red-100 hover:bg-red-200 text-red-700 transition-colors"
              >
                ❌ סירב
              </button>
            </div>
          </div>
        )}

        {/* Callback Modal */}
        {modal.type === 'callback' && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 shadow-xl w-80 space-y-4" dir="rtl">
              <h3 className="text-lg font-bold">קביעת שיחה חוזרת</h3>
              <input
                type="datetime-local"
                value={modal.callbackAt}
                onChange={e => setModal(m => ({ ...m, callbackAt: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
              />
              <div className="flex gap-2">
                <Button onClick={handleCallback} disabled={loading || !modal.callbackAt} className="flex-1">אישור</Button>
                <Button variant="outline" onClick={() => setModal({ type: null, amount: '', callbackAt: '' })} className="flex-1">ביטול</Button>
              </div>
            </div>
          </div>
        )}

        {/* Pledge Modal */}
        {modal.type === 'pledge' && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 shadow-xl w-80 space-y-4" dir="rtl">
              <h3 className="text-lg font-bold">🤝 סכום שהובטח</h3>
              <input
                type="number"
                value={modal.amount}
                onChange={e => setModal(m => ({ ...m, amount: e.target.value }))}
                placeholder="₪ סכום"
                className="w-full border rounded-lg px-3 py-2 text-xl text-center"
              />
              <div className="flex gap-2">
                <Button onClick={handlePledge} disabled={loading} className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-yellow-900">אישור</Button>
                <Button variant="outline" onClick={() => setModal({ type: null, amount: '', callbackAt: '' })} className="flex-1">ביטול</Button>
              </div>
            </div>
          </div>
        )}

        {/* Donate Modal */}
        {modal.type === 'donate' && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 shadow-xl w-80 space-y-4" dir="rtl">
              <h3 className="text-lg font-bold">✅ סכום התרומה</h3>
              <input
                type="number"
                value={modal.amount}
                onChange={e => setModal(m => ({ ...m, amount: e.target.value }))}
                placeholder="₪ סכום"
                className="w-full border rounded-lg px-3 py-2 text-xl text-center"
              />
              <div className="flex gap-2">
                <Button onClick={handleDonated} disabled={loading} className="flex-1 bg-green-500 hover:bg-green-600">אישור</Button>
                <Button variant="outline" onClick={() => setModal({ type: null, amount: '', callbackAt: '' })} className="flex-1">ביטול</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar stats */}
      <div className="w-64 shrink-0 space-y-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">📊 סטטיסטיקות היום</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">שיחות</span>
              <span className="font-bold">{statsToday.calls}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">תרומות</span>
              <span className="font-bold text-green-600">{statsToday.donations}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">גויס</span>
              <span className="font-bold text-green-600">₪{statsToday.raised.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">🎯 יעד אישי</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">₪{(caller?.total_donated || 0).toLocaleString()}</span>
              <span className="text-gray-400">/ ₪{(caller?.personal_goal || 0).toLocaleString()}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${goalPct}%` }} />
            </div>
            <div className="text-center text-lg font-bold text-blue-600">{goalPct}%</div>
          </CardContent>
        </Card>

        {rank > 0 && (
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-3xl mb-1">{rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏅'}</div>
              <div className="text-sm text-gray-500">דירוג</div>
              <div className="text-2xl font-bold text-gray-800">#{rank}</div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
