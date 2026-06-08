'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function OrgApproveButton({ orgId }: { orgId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function approve() {
    setLoading(true)
    const supabase = createClient()

    // Approve org
    await supabase.from('organizations').update({ status: 'active' }).eq('id', orgId)

    // Link profile's org_id
    const { data: org } = await supabase.from('organizations').select('owner_id').eq('id', orgId).single()
    if (org?.owner_id) {
      await supabase.from('profiles').update({ org_id: orgId }).eq('id', org.owner_id)
    }

    router.refresh()
    setLoading(false)
  }

  return (
    <Button size="sm" onClick={approve} disabled={loading}>
      {loading ? '...' : 'אשר'}
    </Button>
  )
}
