'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Caller, Lead } from '@/types'

interface CallerWithProfile extends Caller {
  profiles: { full_name: string; phone: string | null } | null
}

interface Campaign {
  id: string
  title: string
  goal_amount: number
  raised_amount: number
}

interface Stats {
  activeCampaign: Campaign | null
  callers: CallerWithProfile[]
  callsToday: number
  donatedToday: number
  activeCallersCount: number
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'calling') return <Badge className="bg-green-100 text-green-700 border-green-200">בשיחה</Badge>
  if (status === 'idle') return <Badge className="bg-blue-100 text-blue-700 border-blue-200">זמין</Badge>
  return <Badge variant="secondary" className="bg-gray-100 text-gray-500">לא פעיל</Badge>
}

function AddCallerForm({ orgId, campaignId, onAdded }: { orgId: string; campaignId: string; onAdded: () => void }) {
  const supabase = createClient()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [goal, setGoal] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    // Create profile first, then caller
    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .insert({ full_name: name, phone: phone || null, role: 'caller', org_id: orgId })
      .select('id')
      .single()
    if (pErr || !profile) { setError(pErr?.message || 'שגיאה'); setLoading(false); return }
    const { error: cErr } = await supabase.from('callers').insert({
      profile_id: profile.id,
      org_id: orgId,
      campaign_id: campaignId,
      personal_goal: Number(goal) || 0,
      status: 'idle',
      total_called: 0,
      total_donated: 0,
    })
    if (cErr) { setError(cErr.message); setLoading(false); return }
    setName(''); setPhone(''); setGoal('')
    setLoading(false)
    onAdded()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 p-4 bg-blue-50 rounded-xl border border-blue-100">
      <input required value={name} onChange={e => setName(e.target.value)} placeholder="שם הטלפן" className="border rounded px-3 py-2 text-sm flex-1 min-w-32" />
      <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="טלפון" className="border rounded px-3 py-2 text-sm w-36" />
      <input value={goal} onChange={e => setGoal(e.target.value)} placeholder="יעד אישי ₪" type="number" className="border rounded px-3 py-2 text-sm w-32" />
      <button type="submit" disabled={loading} className={cn(buttonVariants(), 'text-sm')}>{loading ? '...' : 'הוסף'}</button>
      {error && <p className="w-full text-red-500 text-xs">{error}</p>}
    </form>
  )
}

function ImportLeadsButton({ campaignId, orgId }: { campaignId: string; orgId: string }) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus('מעלה...')
    const text = await file.text()
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const rows = lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim())
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => { obj[h] = vals[i] || '' })
      return obj
    })
    const leads: Partial<Lead>[] = rows.filter(r => r.name || r.phone).map(r => ({
      org_id: orgId,
      campaign_id: campaignId,
      name: r.name || r['שם'] || '',
      phone: r.phone || r['טלפון'] || '',
      email: r.email || r['אימייל'] || null,
      previous_donations: r.previous_donations ? Number(r.previous_donations) : null,
      status: 'new' as const,
      priority: 0,
    }))
    const { error } = await supabase.from('leads').insert(leads)
    setStatus(error ? `שגיאה: ${error.message}` : `יובאו ${leads.length} לידים בהצלחה`)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="flex items-center gap-2">
      <input ref={fileRef} type="file" accept=".csv" className="hidden" id="import-csv" onChange={handleFile} />
      <label htmlFor="import-csv" className={cn(buttonVariants({ variant: 'outline' }), 'cursor-pointer text-sm')}>
        📂 ייבא לידים
      </label>
      {status && <span className="text-xs text-gray-500">{status}</span>}
    </div>
  )
}

export default function CallersPage() {
  const supabase = createClient()
  const [stats, setStats] = useState<Stats>({ activeCampaign: null, callers: [], callsToday: 0, donatedToday: 0, activeCallersCount: 0 })
  const [showAddForm, setShowAddForm] = useState(false)
  const [orgId, setOrgId] = useState('')
  const [loading, setLoading] = useState(true)

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return
    setOrgId(profile.org_id)

    const today = new Date().toISOString().split('T')[0]

    const [{ data: campaigns }, { data: callers }, { data: donations }] = await Promise.all([
      supabase.from('campaigns').select('id, title, goal_amount, raised_amount').eq('org_id', profile.org_id).eq('status', 'active').limit(1),
      supabase.from('callers').select('*, profiles(full_name, phone)').eq('org_id', profile.org_id).order('total_donated', { ascending: false }),
      supabase.from('donations').select('id, amount, caller_id, created_at').eq('org_id', profile.org_id).eq('payment_status', 'completed').gte('created_at', today),
    ])

    const activeCampaign = campaigns?.[0] ?? null
    const callsToday = donations?.length ?? 0
    const donatedToday = donations?.reduce((s, d) => s + (d.amount || 0), 0) ?? 0
    const activeCaller = (callers as CallerWithProfile[] ?? []).filter(c => c.status === 'calling' || c.status === 'idle').length

    setStats({ activeCampaign, callers: (callers as CallerWithProfile[]) ?? [], callsToday, donatedToday, activeCallersCount: activeCaller })
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const { activeCampaign, callers } = stats
  const pct = activeCampaign && activeCampaign.goal_amount > 0 ? Math.min(100, Math.round((activeCampaign.raised_amount / activeCampaign.goal_amount) * 100)) : 0

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900">טלפנים / KafoolPulse</h1>
        <div className="flex gap-2 flex-wrap">
          {activeCampaign && <ImportLeadsButton campaignId={activeCampaign.id} orgId={orgId} />}
          <button onClick={() => setShowAddForm(v => !v)} className={cn(buttonVariants(), 'text-sm')}>+ הוסף טלפן</button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-gray-500">קמפיין פעיל</CardTitle></CardHeader>
          <CardContent>
            {activeCampaign ? (
              <>
                <div className="text-sm font-semibold truncate">{activeCampaign.title}</div>
                <div className="text-xs text-gray-400 mt-0.5">₪{(activeCampaign.raised_amount || 0).toLocaleString()} / ₪{(activeCampaign.goal_amount || 0).toLocaleString()}</div>
                <div className="h-1.5 bg-gray-100 rounded-full mt-1"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} /></div>
              </>
            ) : <div className="text-sm text-gray-400">אין קמפיין פעיל</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-gray-500">טלפנים פעילים</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-600">{stats.activeCallersCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-gray-500">שיחות היום</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-gray-700">{stats.callsToday}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-gray-500">גויס היום</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">₪{stats.donatedToday.toLocaleString()}</div></CardContent>
        </Card>
      </div>

      {/* Add form */}
      {showAddForm && activeCampaign && (
        <AddCallerForm orgId={orgId} campaignId={activeCampaign.id} onAdded={() => { setShowAddForm(false); fetchData() }} />
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">טוען...</div>
      ) : callers.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-gray-400"><div className="text-4xl mb-3">📞</div><p>אין טלפנים עדיין.</p></CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-right">#</th>
                <th className="px-4 py-3 text-right">שם</th>
                <th className="px-4 py-3 text-right">סטטוס</th>
                <th className="px-4 py-3 text-right">שיחות היום</th>
                <th className="px-4 py-3 text-right">תרומות</th>
                <th className="px-4 py-3 text-right">גייס</th>
                <th className="px-4 py-3 text-right">יעד</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {callers.map((c, i) => {
                const goalPct = c.personal_goal > 0 ? Math.min(100, Math.round((c.total_donated / c.personal_goal) * 100)) : 0
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{c.profiles?.full_name || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3">{c.total_called}</td>
                    <td className="px-4 py-3">—</td>
                    <td className="px-4 py-3 font-semibold text-green-600">₪{(c.total_donated || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full"><div className="h-full bg-blue-400 rounded-full" style={{ width: `${goalPct}%` }} /></div>
                        <span className="text-xs text-gray-400">{goalPct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/callers/pulse?caller_id=${c.id}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                        התחל משמרת
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
