'use client'

import { useState } from 'react'
import { Plus, Building2, Users, Clock, Ban, LogIn, ChevronDown, Send, ExternalLink } from 'lucide-react'
import OrgActions from './OrgActions'
import CreateOrgModal from './CreateOrgModal'

interface Org {
  id: string
  name: string
  slug: string
  status: string
  logo_url?: string | null
  registration_number?: string | null
  created_at: string
  profiles?: { full_name: string; phone?: string; id: string } | null
}

const STATUS_MAP = {
  active:    { label: 'פעיל',           dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  pending:   { label: 'ממתין לאישור',   dot: 'bg-amber-400',   pill: 'bg-amber-50  text-amber-700  border-amber-100'  },
  suspended: { label: 'מושהה',          dot: 'bg-red-400',     pill: 'bg-red-50    text-red-700    border-red-100'    },
}

function OrgAvatar({ name, logo }: { name: string; logo?: string | null }) {
  if (logo) return <img src={logo} alt={name} className="w-10 h-10 rounded-2xl object-contain border border-gray-100 shrink-0 bg-white" />
  return (
    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm">
      {name[0]}
    </div>
  )
}

interface PlatformStats { totalRaised: number; orgCount: number; campaignCount: number; donationCount: number }

export default function OrgsPageClient({ orgs, raisedByOrg = {}, stats: platformStats }: {
  orgs: Org[]; raisedByOrg?: Record<string, number>; stats?: PlatformStats
}) {
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'suspended'>('all')

  const total     = orgs.length
  const active    = orgs.filter(o => o.status === 'active').length
  const pending   = orgs.filter(o => o.status === 'pending').length
  const suspended = orgs.filter(o => o.status === 'suspended').length

  const displayed = filter === 'all' ? orgs : orgs.filter(o => o.status === filter)

  const stats = [
    { key: 'all',       label: 'הכל',     value: total,     icon: Building2, color: 'text-gray-700',    bg: 'bg-white',       border: 'border-gray-200',  active: 'ring-2 ring-gray-300' },
    { key: 'active',    label: 'פעילים',  value: active,    icon: Users,     color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-100', active: 'ring-2 ring-emerald-300' },
    { key: 'pending',   label: 'ממתינים', value: pending,   icon: Clock,     color: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-100',   active: 'ring-2 ring-amber-300' },
    { key: 'suspended', label: 'מושהים',  value: suspended, icon: Ban,       color: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-100',     active: 'ring-2 ring-red-300' },
  ] as const

  return (
    <div className="space-y-6" dir="rtl">

      {/* ─── Header ─── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">ניהול ארגונים</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total} ארגונים רשומים במערכת</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm hover:opacity-90 active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
        >
          <Plus className="w-4 h-4" />
          ארגון חדש
        </button>
      </div>

      {/* ─── Platform aggregate (global overview) ─── */}
      {platformStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gradient-to-l from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4">
          <div>
            <div className="text-[11px] font-semibold text-gray-500">סה״כ גויס בפלטפורמה</div>
            <div className="text-xl font-black text-blue-700">₪{platformStats.totalRaised.toLocaleString('he-IL')}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-gray-500">ארגונים</div>
            <div className="text-xl font-black text-gray-900">{platformStats.orgCount}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-gray-500">קמפיינים</div>
            <div className="text-xl font-black text-gray-900">{platformStats.campaignCount}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-gray-500">תרומות</div>
            <div className="text-xl font-black text-gray-900">{platformStats.donationCount}</div>
          </div>
        </div>
      )}

      {/* ─── Stat cards (clickable filters) ─── */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map(s => {
          const Icon = s.icon
          const isActive = filter === s.key
          return (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              className={`rounded-2xl border p-4 text-right transition-all hover:shadow-sm ${s.bg} ${s.border} ${isActive ? s.active : ''}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${s.bg} border ${s.border}`}>
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </div>
              </div>
              <div className="text-xs font-semibold text-gray-500">{s.label}</div>
            </button>
          )
        })}
      </div>

      {/* ─── Table ─── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Table header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50/70">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            {filter === 'all' ? `כל הארגונים` : stats.find(s => s.key === filter)?.label} · {displayed.length}
          </span>
        </div>

        {displayed.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <Building2 className="w-10 h-10 text-gray-200 mx-auto" />
            <p className="text-sm text-gray-400">אין ארגונים להציג</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400">ארגון</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400">בעלים</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400">נרשם</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400">סטטוס</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400">סכום שגויס</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayed.map(org => {
                const owner = org.profiles as { full_name: string; phone?: string } | null
                const s = STATUS_MAP[org.status as keyof typeof STATUS_MAP] ?? STATUS_MAP.suspended
                return (
                  <tr key={org.id} className="hover:bg-blue-50/30 transition-colors group">

                    {/* Org */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <OrgAvatar name={org.name} logo={org.logo_url} />
                        <div className="min-w-0">
                          <div className="font-bold text-gray-800 leading-tight">{org.name}</div>
                          <a
                            href={`https://kafool.com/${org.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-600 hover:underline flex items-center gap-0.5 mt-0.5 w-fit transition-colors"
                            dir="ltr"
                          >
                            kafool.com/{org.slug}
                            <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </a>
                          {org.registration_number && (
                            <div className="text-[11px] text-gray-300 mt-0.5">ח.פ {org.registration_number}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Owner */}
                    <td className="px-5 py-4">
                      {owner ? (
                        <div>
                          <div className="font-semibold text-gray-700 text-sm">{owner.full_name}</div>
                          {owner.phone && <div className="text-xs text-gray-400 mt-0.5" dir="ltr">{owner.phone}</div>}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">לא מוגדר</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(org.created_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.pill}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                        {s.label}
                      </span>
                    </td>

                    {/* Raised */}
                    <td className="px-5 py-4 font-bold text-gray-800 whitespace-nowrap">
                      ₪{(raisedByOrg[org.id] || 0).toLocaleString('he-IL')}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <OrgActions orgId={org.id} status={org.status} slug={org.slug} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && <CreateOrgModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
