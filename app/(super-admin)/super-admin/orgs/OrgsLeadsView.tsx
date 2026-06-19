'use client'

import { useState } from 'react'
import { Building2, Sparkles } from 'lucide-react'
import OrgsPageClient from './OrgsPageClient'
import LeadsTabClient, { type Lead } from './LeadsTabClient'

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

export interface PlatformStats { totalRaised: number; orgCount: number; campaignCount: number; donationCount: number }

export default function OrgsLeadsView({ orgs, leads, raisedByOrg = {}, stats }: {
  orgs: Org[]; leads: Lead[]; raisedByOrg?: Record<string, number>; stats?: PlatformStats
}) {
  const [tab, setTab] = useState<'leads' | 'orgs'>('leads')

  const openLeads = leads.filter(l => !['won', 'lost'].includes(l.stage)).length

  const tabs = [
    { key: 'leads', label: 'לידים', icon: Sparkles, badge: openLeads },
    { key: 'orgs',  label: 'ארגונים', icon: Building2, badge: orgs.length },
  ] as const

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-screen-2xl mx-auto">
      {/* ─── Tab bar ─── */}
      <div className="flex items-center gap-1 mb-6 bg-gray-100/70 p-1 rounded-2xl w-fit">
        {tabs.map(t => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                {t.badge}
              </span>
            </button>
          )
        })}
      </div>

      {tab === 'leads' ? <LeadsTabClient leads={leads} /> : <OrgsPageClient orgs={orgs} raisedByOrg={raisedByOrg} stats={stats} />}
      </div>
    </div>
  )
}
