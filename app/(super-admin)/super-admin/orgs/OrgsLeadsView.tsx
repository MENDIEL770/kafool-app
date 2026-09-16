'use client'

import OrgsPageClient from './OrgsPageClient'

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

// The leads pipeline was removed — organizations are added manually only
// (the "ארגון חדש" button inside OrgsPageClient).
export default function OrgsLeadsView({ orgs, raisedByOrg = {}, stats }: {
  orgs: Org[]; raisedByOrg?: Record<string, number>; stats?: PlatformStats
}) {
  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-screen-2xl mx-auto">
        <OrgsPageClient orgs={orgs} raisedByOrg={raisedByOrg} stats={stats} />
      </div>
    </div>
  )
}
