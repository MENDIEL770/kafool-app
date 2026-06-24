'use client'

import AppShell from '@/components/plus/AppShell'
import { StatCard } from '@/components/plus/ui'
import { useStore } from '@/lib/plus/store'

// Temporary landing for the new telephony module — proves auth + entitlement +
// store hydration end-to-end. The full role screens (caller/coordinator/manager/
// admin) are ported next and will replace this.
export default function PlusHome() {
  const session = useStore(s => s.session)
  const campaigns = useStore(s => s.campaigns)
  const leads = useStore(s => s.leads)
  const callerGroups = useStore(s => s.callerGroups)
  const promises = useStore(s => s.promises)

  return (
    <AppShell subtitle="מוקד טלפוני (חדש)">
      <div className="space-y-4">
        <div className="card p-4">
          <div className="font-bold mb-1">ברוך הבא{session ? `, ${session.display_name}` : ''}</div>
          <div className="text-sm text-muted">תפקיד: {session?.role ?? '—'}</div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="קמפיינים" value={campaigns.length} />
          <StatCard label="טלפנים" value={callerGroups.length} />
          <StatCard label="לידים" value={leads.length} />
          <StatCard label="התחייבויות" value={promises.length} accent />
        </div>
        <div className="text-xs text-muted">המסכים המלאים בפיתוח — נטענים בשלב הבא.</div>
      </div>
    </AppShell>
  )
}
