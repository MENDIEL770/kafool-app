import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ToolsClient from '@/app/(dashboard)/tools/ToolsClient'
import { type ShortLink } from '@/app/(dashboard)/tools/page'

export const dynamic = 'force-dynamic'

// Super-admin view of the toolbox — reachable from the super-admin sidebar even
// in global context (the dashboard /tools redirects a global super-admin away).
// Shows the roadmap ("בקרוב") cards, which are hidden from regular managers.
export default async function SuperAdminToolsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') redirect('/dashboard')

  let links: ShortLink[] = []
  try {
    const { data } = await supabase.from('short_links')
      .select('id, code, target_url, label, clicks, created_at')
      .order('created_at', { ascending: false })
    links = (data as ShortLink[]) || []
  } catch { links = [] }

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://www.kafool.com').replace(/\/$/, '')
  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <ToolsClient initialLinks={links} baseUrl={baseUrl} isSuperAdmin />
      </div>
    </div>
  )
}
