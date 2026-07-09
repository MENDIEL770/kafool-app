'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'
import { setCampaignStatus } from './status-actions'

export default function CampaignStatusToggle({
  campaignId,
  currentStatus,
  onStatusChange,
}: {
  campaignId: string
  currentStatus: string
  onStatusChange?: (status: string) => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justChanged, setJustChanged] = useState(false)

  const isActive = currentStatus === 'active'

  async function toggle() {
    setLoading(true)
    setError(null)
    const newStatus = isActive ? 'ended' : 'active'
    const res = await setCampaignStatus(campaignId, newStatus)
    setLoading(false)
    if (res?.error) {
      setError(res.error)
      return
    }
    onStatusChange?.(newStatus)          // flips the button + updates the copy immediately
    setJustChanged(true)
    setTimeout(() => setJustChanged(false), 2500)
    router.refresh()                     // sync the nav badge / server components
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        {isActive && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            פעיל
          </span>
        )}
        <Button variant={isActive ? 'outline' : 'default'} onClick={toggle} disabled={loading}>
          {loading ? 'שומר…' : isActive ? 'עצור קמפיין' : 'הפעל קמפיין'}
        </Button>
      </div>
      {justChanged && !error && (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {isActive ? 'הקמפיין הופעל — דף הגיוס פתוח לתרומות' : 'הקמפיין נעצר'}
        </span>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}
