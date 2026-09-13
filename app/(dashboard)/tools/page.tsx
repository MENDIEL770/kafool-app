import { createClient } from '@/lib/supabase/server'
import ToolsClient from './ToolsClient'

export const dynamic = 'force-dynamic'

export interface ShortLink { id: string; code: string; target_url: string; label: string | null; clicks: number; created_at: string }

export default async function ToolsPage() {
  const supabase = await createClient()
  // resilient: the short_links table may not be migrated yet
  let links: ShortLink[] = []
  try {
    const { data } = await supabase.from('short_links')
      .select('id, code, target_url, label, clicks, created_at')
      .order('created_at', { ascending: false })
    links = (data as ShortLink[]) || []
  } catch { links = [] }

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://www.kafool.com').replace(/\/$/, '')
  return <ToolsClient initialLinks={links} baseUrl={baseUrl} />
}
