'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function CampaignStatusToggle({
  campaignId,
  currentStatus,
}: {
  campaignId: string
  currentStatus: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    const newStatus = currentStatus === 'active' ? 'ended' : 'active'
    const supabase = createClient()
    await supabase.from('campaigns').update({ status: newStatus }).eq('id', campaignId)
    router.refresh()
    setLoading(false)
  }

  return (
    <Button
      variant={currentStatus === 'active' ? 'outline' : 'default'}
      onClick={toggle}
      disabled={loading}
    >
      {currentStatus === 'active' ? 'עצור קמפיין' : 'הפעל קמפיין'}
    </Button>
  )
}
