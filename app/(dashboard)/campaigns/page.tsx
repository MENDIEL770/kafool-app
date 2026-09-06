'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getClientOrgId } from '@/lib/tenancy-client'
import Link from 'next/link'
import { Star, Plus, ExternalLink, Clock } from 'lucide-react'

interface Campaign {
  id: string
  title: string
  slug: string
  status: string
  raised_amount: number
  goal_amount: number
  settings?: {
    countdown_end?: string
    banners?: { url: string }[]
    primary_color?: string
  }
}

const DEFAULT_KEY = 'kafool_default_campaign'

function CountdownBadge({ end }: { end: string }) {
  const [display, setDisplay] = useState('')

  useEffect(() => {
    function calc() {
      const diff = new Date(end).getTime() - Date.now()
      if (diff <= 0) { setDisplay('הסתיים'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      if (d > 0) setDisplay(`${d}י ${h}ש`)
      else setDisplay(`${h}:${String(m).padStart(2, '0')}`)
    }
    calc()
    const t = setInterval(calc, 30000)
    return () => clearInterval(t)
  }, [end])

  if (!display) return null
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">
      <Clock className="w-3 h-3" />
      {display}
    </span>
  )
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [defaultId, setDefaultId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [orgName, setOrgName] = useState<string>('')   // when a super-admin views a specific org
  const [isSuper, setIsSuper] = useState(false)        // only the manager may open new pages

  useEffect(() => {
    setDefaultId(localStorage.getItem(DEFAULT_KEY) || '')
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('id', user.id).single()
      const isSuper = profile?.role === 'super_admin'
      setIsSuper(isSuper)
      // sticky org context (super admin: the entered org; else own org)
      const ctxOrgId = getClientOrgId(profile)

      const query = supabase.from('campaigns').select('id, title, slug, status, raised_amount, goal_amount, settings').order('created_at', { ascending: false })
      if (ctxOrgId) {
        query.eq('org_id', ctxOrgId)
        if (isSuper) {
          const { data: org } = await supabase.from('organizations').select('name').eq('id', ctxOrgId).single()
          if (org) setOrgName(org.name)
        }
      }
      const { data } = await query
      setCampaigns(data || [])
      setLoading(false)
    }
    load()
  }, [])

  function toggleDefault(id: string) {
    const next = defaultId === id ? '' : id
    setDefaultId(next)
    if (next) localStorage.setItem(DEFAULT_KEY, next)
    else localStorage.removeItem(DEFAULT_KEY)
  }

  const sorted = [...campaigns].sort((a, b) => {
    if (a.id === defaultId) return -1
    if (b.id === defaultId) return 1
    return 0
  })

  const statusLabel: Record<string, { label: string; color: string }> = {
    active: { label: 'פעיל', color: 'bg-emerald-100 text-emerald-700' },
    draft: { label: 'טיוטה', color: 'bg-gray-100 text-gray-500' },
    ended: { label: 'הסתיים', color: 'bg-red-50 text-red-500' },
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            קמפיינים{orgName && <span className="text-gray-400 font-semibold"> · {orgName}</span>}
          </h1>
          {orgName ? (
            <Link href="/super-admin/orgs" className="text-xs text-blue-600 hover:underline mt-0.5 inline-block">← חזרה לניהול ארגונים</Link>
          ) : defaultId ? (
            <p className="text-xs text-gray-400 mt-0.5">★ קמפיין ברירת מחדל מסומן</p>
          ) : null}
        </div>
        {isSuper && (
          <Link
            href="/campaigns/new"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            קמפיין חדש
          </Link>
        )}
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-56 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && campaigns.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4"></div>
          <p className="font-medium">אין קמפיינים עדיין</p>
          {isSuper && (
            <Link href="/campaigns/new" className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" /> צור קמפיין ראשון
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((c) => {
          const pct = c.goal_amount > 0 ? Math.min(100, Math.round((c.raised_amount / c.goal_amount) * 100)) : 0
          const isDefault = c.id === defaultId
          const banner = c.settings?.banners?.[0]?.url
          const color = c.settings?.primary_color || '#2563eb'
          const s = statusLabel[c.status] || { label: c.status, color: 'bg-gray-100 text-gray-500' }
          const countdownEnd = c.settings?.countdown_end

          return (
            <div
              key={c.id}
              className={`relative bg-white rounded-2xl border-2 overflow-hidden shadow-sm hover:shadow-md transition-all ${isDefault ? 'border-blue-400' : 'border-gray-100 hover:border-gray-200'}`}
            >
              {/* Banner image */}
              <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                {banner ? (
                  <img src={banner} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl"></div>
                )}
              </div>

              {/* Star button */}
              <button
                onClick={() => toggleDefault(c.id)}
                title={isDefault ? 'הסר ברירת מחדל' : 'הגדר כברירת מחדל'}
                className={`absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center shadow transition-all ${isDefault ? 'bg-yellow-400 text-white' : 'bg-white/80 text-gray-400 hover:bg-yellow-50 hover:text-yellow-500'}`}
              >
                <Star className={`w-4 h-4 ${isDefault ? 'fill-current' : ''}`} />
              </button>

              {/* Status badge */}
              <span className={`absolute top-2 right-2 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${s.color}`}>
                {s.label}
              </span>

              <div className="p-4 space-y-3">
                <div>
                  <h2 className="font-bold text-gray-900 truncate text-sm">{c.title}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[11px] text-gray-400">kafool.com/{c.slug}</span>
                    {countdownEnd && <CountdownBadge end={countdownEnd} />}
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">₪{(c.raised_amount || 0).toLocaleString('he-IL')}</span>
                    <span className="font-semibold text-gray-700">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  <div className="text-[10px] text-gray-400">יעד: ₪{(c.goal_amount || 0).toLocaleString('he-IL')}</div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Link
                    href={`/campaigns/${c.id}`}
                    className="flex-1 text-center text-xs font-semibold py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    ניהול
                  </Link>
                  <Link
                    href={`/${c.slug}`}
                    target="_blank"
                    className="w-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {isDefault && (
                <div className="absolute bottom-0 inset-x-0 h-0.5 bg-blue-400" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
