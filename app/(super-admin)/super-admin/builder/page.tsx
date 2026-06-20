import type { Metadata } from 'next'
import { createClient as createAdmin } from '@supabase/supabase-js'
import PageBuilder, { type BuilderCampaign } from '@/components/PageBuilder'

export const metadata: Metadata = {
  title: 'עורך תבנית (פיתוח) — Kafool',
}

export const dynamic = 'force-dynamic'

// Access is already restricted to super_admin by the (super-admin) layout.
// Development sandbox for the page builder: pick a campaign, edit its layout +
// theme, and save it to that campaign's live page.
export default async function SuperAdminBuilderPage() {
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await admin
    .from('campaigns')
    .select('id, title, slug, settings')
    .order('created_at', { ascending: false })

  const campaigns = (data || []) as BuilderCampaign[]
  return <PageBuilder campaigns={campaigns} />
}
