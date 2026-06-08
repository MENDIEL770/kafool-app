'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Donation, Group } from '@/types'

interface Campaign {
  id: string
  title: string
  goal_amount: number
  raised_amount: number
  start_at: string | null
}

interface CallerRank {
  id: string
  total_donated: number
  profiles: { full_name: string } | { full_name: string }[] | null
}

interface DonationFeedItem extends Partial<Donation> {
  id: string
  amount: number
  donor_name: string | null
  created_at: string
  isNew?: boolean
}

export default function WarRoomPage() {
  const supabase = createClient()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [raised, setRaised] = useState(0)
  const [donations, setDonations] = useState<DonationFeedItem[]>([])
  const [callers, setCallers] = useState<CallerRank[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [stats, setStats] = useState({ totalDonations: 0, callsToday: 0 })
  const [orgId, setOrgId] = useState('')
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
      if (!profile?.org_id) return
      setOrgId(profile.org_id)

      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, title, goal_amount, raised_amount, start_at')
        .eq('org_id', profile.org_id)
        .eq('status', 'active')
        .limit(1)

      const activeCampaign = campaigns?.[0] ?? null
      if (!activeCampaign) return
      setCampaign(activeCampaign)
      setRaised(activeCampaign.raised_amount || 0)

      const today = new Date().toISOString().split('T')[0]

      const [{ data: recentDons }, { data: topCallers }, { data: grps }, { data: allDons }] = await Promise.all([
        supabase.from('donations').select('id, amount, donor_name, created_at').eq('campaign_id', activeCampaign.id).eq('payment_status', 'completed').order('created_at', { ascending: false }).limit(10),
        supabase.from('callers').select('id, total_donated, profiles(full_name)').eq('org_id', profile.org_id).order('total_donated', { ascending: false }).limit(5),
        supabase.from('groups').select('*').eq('campaign_id', activeCampaign.id).order('raised_amount', { ascending: false }),
        supabase.from('donations').select('id').eq('campaign_id', activeCampaign.id).eq('payment_status', 'completed').gte('created_at', today),
      ])

      setDonations((recentDons as DonationFeedItem[]) ?? [])
      setCallers((topCallers as unknown as CallerRank[]) ?? [])
      setGroups((grps as Group[]) ?? [])
      setStats({ totalDonations: recentDons?.length ?? 0, callsToday: allDons?.length ?? 0 })

      // Realtime subscription
      if (channelRef.current) { supabase.removeChannel(channelRef.current) }
      const ch = supabase.channel('war-room-donations')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'donations', filter: `campaign_id=eq.${activeCampaign.id}` }, (payload) => {
          const newDon = payload.new as DonationFeedItem
          setRaised(prev => prev + (newDon.amount || 0))
          setDonations(prev => [{ ...newDon, isNew: true }, ...prev.slice(0, 9)])
          setTimeout(() => {
            setDonations(prev => prev.map(d => d.id === newDon.id ? { ...d, isNew: false } : d))
          }, 2000)
        })
        .subscribe()
      channelRef.current = ch
    }
    init()
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [])

  const pct = campaign && campaign.goal_amount > 0 ? Math.min(100, Math.round((raised / campaign.goal_amount) * 100)) : 0
  const remaining = campaign ? Math.max(0, campaign.goal_amount - raised) : 0

  const hourlyRate = (() => {
    if (!campaign?.start_at) return 0
    const hours = Math.max(1, (Date.now() - new Date(campaign.start_at).getTime()) / 3600000)
    return Math.round(raised / hours)
  })()

  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']

  if (!campaign) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center" dir="rtl">
        <div className="text-center text-white space-y-4">
          <div className="text-6xl">📺</div>
          <h1 className="text-2xl font-bold">חמ&quot;ל גיוס</h1>
          <p className="text-gray-400">אין קמפיינים פעילים כרגע.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-100">{campaign.title}</h1>
        <div className="text-7xl font-black text-green-400">₪{raised.toLocaleString('he-IL')}</div>
        <div className="text-gray-400">מתוך ₪{campaign.goal_amount.toLocaleString('he-IL')}</div>

        <div className="max-w-2xl mx-auto space-y-2">
          <div className="h-6 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-l from-green-400 to-emerald-600 rounded-full transition-all duration-1000"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span className="text-green-400 font-bold text-lg">{pct}%</span>
            <span>נותר: ₪{remaining.toLocaleString('he-IL')}</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{stats.totalDonations}</div>
          <div className="text-xs text-gray-400 mt-1">סה&quot;כ תרומות</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{stats.callsToday}</div>
          <div className="text-xs text-gray-400 mt-1">שיחות היום</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">₪{hourlyRate.toLocaleString()}</div>
          <div className="text-xs text-gray-400 mt-1">קצב לשעה</div>
        </div>
      </div>

      {/* Main columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Caller leaderboard */}
        <div className="bg-gray-800 rounded-2xl p-5 space-y-3">
          <h2 className="text-lg font-bold text-gray-200">🏆 טלפנים מובילים</h2>
          {callers.length === 0 && <p className="text-gray-500 text-sm">אין נתונים עדיין</p>}
          {callers.map((c, i) => (
            <div key={c.id} className="flex items-center gap-3 p-3 bg-gray-700 rounded-xl">
              <span className="text-2xl">{medals[i] || '🏅'}</span>
              <div className="flex-1">
                <div className="font-medium text-gray-100">{Array.isArray(c.profiles) ? c.profiles[0]?.full_name : c.profiles?.full_name || '—'}</div>
              </div>
              <div className="text-green-400 font-bold">₪{(c.total_donated || 0).toLocaleString()}</div>
            </div>
          ))}
        </div>

        {/* Live donations feed */}
        <div className="bg-gray-800 rounded-2xl p-5 space-y-3">
          <h2 className="text-lg font-bold text-gray-200">⚡ תרומות חיות</h2>
          {donations.length === 0 && <p className="text-gray-500 text-sm">ממתין לתרומות...</p>}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {donations.map((d) => (
              <div
                key={d.id}
                className={`flex items-center justify-between p-3 rounded-xl transition-all duration-500 ${d.isNew ? 'bg-green-500/30 border border-green-400/50 scale-[1.02]' : 'bg-gray-700'}`}
              >
                <div>
                  <div className="font-medium text-gray-100 text-sm">{d.donor_name || 'אנונימי'}</div>
                  <div className="text-xs text-gray-400">{new Date(d.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div className={`font-bold text-lg ${d.isNew ? 'text-green-300' : 'text-green-400'}`}>
                  ₪{(d.amount || 0).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Groups competition */}
      {groups.length > 0 && (
        <div className="bg-gray-800 rounded-2xl p-5 space-y-3">
          <h2 className="text-lg font-bold text-gray-200">🏁 תחרות קבוצות</h2>
          <div className="space-y-3">
            {groups.map((g) => {
              const gPct = g.goal_amount > 0 ? Math.min(100, Math.round((g.raised_amount / g.goal_amount) * 100)) : 0
              return (
                <div key={g.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-200 font-medium">{g.name}</span>
                    <span className="text-green-400 font-bold">₪{(g.raised_amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-l from-blue-400 to-blue-600 rounded-full transition-all duration-1000" style={{ width: `${gPct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
