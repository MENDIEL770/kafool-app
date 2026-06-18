import type { SupabaseClient } from '@supabase/supabase-js'

// A campaign's raised_amount is always defined as the sum of its COMPLETED
// donations — never an incremental add/subtract. This keeps the total drift-free
// and lets the thanks page and the webhook race without double-counting: whoever
// runs last recomputes the same correct total. (Same definition the donors page
// "תקן סכום" button uses.)

type DonationRow = { amount: number | null; payment_status: string | null; group_id: string | null }

function sumCompleted(rows: DonationRow[]): number {
  return rows
    .filter(d => d.payment_status === 'completed')
    .reduce((s, d) => s + (Number(d.amount) || 0), 0)
}

/** Recompute campaign.raised_amount (and every affected group) from donations. */
export async function recomputeCampaignRaised(
  supabase: SupabaseClient,
  campaignId: string,
): Promise<void> {
  const { data } = await supabase
    .from('donations')
    .select('amount, payment_status, group_id')
    .eq('campaign_id', campaignId)
  const rows = (data ?? []) as DonationRow[]

  await supabase
    .from('campaigns')
    .update({ raised_amount: sumCompleted(rows) })
    .eq('id', campaignId)

  // refresh each group's total too
  const groupIds = Array.from(new Set(rows.map(r => r.group_id).filter(Boolean))) as string[]
  await Promise.all(
    groupIds.map(gid =>
      supabase
        .from('groups')
        .update({ raised_amount: sumCompleted(rows.filter(r => r.group_id === gid)) })
        .eq('id', gid)
    )
  )
}
