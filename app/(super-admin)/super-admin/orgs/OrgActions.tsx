'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OrgActions({ orgId, status, slug }: { orgId: string; status: string; slug: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function updateStatus(newStatus: 'active' | 'suspended') {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('organizations').update({ status: newStatus }).eq('id', orgId)
    if (newStatus === 'active') {
      const { data: org } = await supabase.from('organizations').select('owner_id').eq('id', orgId).single()
      if (org?.owner_id) {
        await supabase.from('profiles').update({ org_id: orgId }).eq('id', org.owner_id)
      }
    }
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-2">
      <a
        href={`/campaigns?org=${orgId}`}
        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium"
      >
        קמפיינים
      </a>
      {status === 'pending' && (
        <button
          onClick={() => updateStatus('active')}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-semibold disabled:opacity-50"
        >
          {loading ? '...' : 'אשר'}
        </button>
      )}
      {status === 'active' && (
        <button
          onClick={() => updateStatus('suspended')}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors font-medium disabled:opacity-50"
        >
          {loading ? '...' : 'השהה'}
        </button>
      )}
      {status === 'suspended' && (
        <button
          onClick={() => updateStatus('active')}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50"
        >
          {loading ? '...' : 'הפעל מחדש'}
        </button>
      )}
    </div>
  )
}
