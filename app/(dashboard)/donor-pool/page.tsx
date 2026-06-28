import { createClient } from '@/lib/supabase/server'
import { getContext } from '@/lib/tenancy'
import { redirect } from 'next/navigation'
import DonorPoolClient, { type PoolDonor } from './DonorPoolClient'

export const dynamic = 'force-dynamic'

type Row = {
  donor_name: string | null; donor_phone: string | null; donor_email: string | null
  amount: number | null; campaign_id: string
}

export default async function DonorPoolPage() {
  const supabase = await createClient()
  const ctx = await getContext(supabase)
  if (!ctx.orgId) redirect('/dashboard') // a specific org must be in scope

  // all campaigns of the org → id → title
  const { data: campaigns } = await supabase.from('campaigns').select('id, title').eq('org_id', ctx.orgId)
  const campTitle = new Map((campaigns ?? []).map(c => [c.id as string, (c.title as string) || 'קמפיין']))
  const campIds = [...campTitle.keys()]
  if (!campIds.length) return <DonorPoolClient donors={[]} />

  // page through completed donations (PostgREST caps at 1000)
  const rows: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('donations')
      .select('donor_name, donor_phone, donor_email, amount, campaign_id')
      .in('campaign_id', campIds).eq('payment_status', 'completed')
      .order('id', { ascending: true }).range(from, from + 999)
    if (error || !data?.length) break
    rows.push(...(data as Row[]))
    if (data.length < 1000) break
  }

  // aggregate by donor identity (phone last-9, else email, else name)
  const digits = (s?: string | null) => (s || '').replace(/\D/g, '')
  const keyOf = (r: Row): string | null => {
    const ph = digits(r.donor_phone).slice(-9)
    if (ph.length >= 7) return 'p:' + ph
    if (r.donor_email?.trim()) return 'e:' + r.donor_email.trim().toLowerCase()
    if (r.donor_name?.trim()) return 'n:' + r.donor_name.trim()
    return null
  }
  type Agg = { name: string; phone: string; email: string; total: number; count: number; byCampaign: Map<string, number> }
  const map = new Map<string, Agg>()
  for (const r of rows) {
    const k = keyOf(r); if (!k) continue
    let e = map.get(k)
    if (!e) { e = { name: '', phone: '', email: '', total: 0, count: 0, byCampaign: new Map() }; map.set(k, e) }
    if (!e.name && r.donor_name) e.name = r.donor_name
    if (!e.phone && r.donor_phone) e.phone = r.donor_phone
    if (!e.email && r.donor_email) e.email = r.donor_email
    const amt = Number(r.amount) || 0
    e.total += amt; e.count += 1
    const t = campTitle.get(r.campaign_id) || 'קמפיין'
    e.byCampaign.set(t, (e.byCampaign.get(t) || 0) + amt)
  }

  const donors: PoolDonor[] = [...map.values()].map(e => ({
    name: e.name, phone: e.phone, email: e.email, total: Math.round(e.total), count: e.count,
    campaigns: [...e.byCampaign.entries()].map(([title, amount]) => ({ title, amount: Math.round(amount) })).sort((a, b) => b.amount - a.amount),
  })).sort((a, b) => b.total - a.total)

  return <DonorPoolClient donors={donors} />
}
