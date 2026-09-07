import type { SupabaseClient } from '@supabase/supabase-js'
import { getOrgCardcom } from './org'
import { getLpResult } from './client'
import { attachCustomData, recomputeCampaignRaised } from '../donations'

/** Record a CardCom donation from its LowProfileId — the source of truth is
 *  GetLpResult (never the webhook/redirect payload). Idempotent on the CardCom
 *  transaction id. Called from both the webhook and the /thanks verify endpoint. */
export async function recordCardcomDonation(
  supabase: SupabaseClient,
  args: { lowProfileId: string; campaignId: string; groupSlug?: string | null },
): Promise<string> {
  if (!args.lowProfileId || !args.campaignId) return 'cardcom: missing lp/campaign'

  const { data: campaign } = await supabase
    .from('campaigns').select('org_id').eq('id', args.campaignId).maybeSingle()
  if (!campaign) return `cardcom: campaign ${args.campaignId} not found`
  const orgId = (campaign as { org_id: string }).org_id

  const creds = await getOrgCardcom(supabase, orgId)
  if (!creds) return 'cardcom: org not configured'

  const r = await getLpResult(creds, args.lowProfileId)
  if (r.ResponseCode !== 0) return `cardcom lp ${args.lowProfileId}: not approved (${r.Description || r.ResponseCode})`

  const txn = `cc:${r.TranzactionId || args.lowProfileId}`
  const { data: existing } = await supabase.from('donations').select('id').eq('kesher_transaction_id', txn).maybeSingle()
  if (existing) return `cardcom: duplicate ${txn}`

  const ui = r.TranzactionInfo?.UIValues || {}
  const amount = Number(r.TranzactionInfo?.Amount) || 0
  const phone = (ui.CardOwnerPhone || '').trim() || null
  const email = (ui.CardOwnerEmail || '').trim() || null

  let groupId: string | null = null
  const gslug = (args.groupSlug || '').trim()
  if (gslug) {
    const { data: g } = await supabase.from('groups').select('id').eq('campaign_id', args.campaignId).eq('slug', gslug).maybeSingle()
    groupId = (g as { id?: string })?.id ?? null
  }

  const { data: inserted, error } = await supabase.from('donations').insert({
    campaign_id: args.campaignId, org_id: orgId, amount, currency: 'ILS',
    donor_name: (ui.CardOwnerName || '').trim() || null, donor_phone: phone, donor_email: email,
    group_id: groupId, payment_status: 'completed', payment_type: 'one_time',
    kesher_transaction_id: txn,
    custom_data: { payment_method: 'cardcom' },
    kesher_raw: r as unknown as Record<string, unknown>,
  }).select('id').single()
  if (error) return `cardcom insert error: ${error.message}`

  await attachCustomData(supabase, { donationId: (inserted as { id: string }).id, campaignId: args.campaignId, phone, amount, donorEmail: email })
  await recomputeCampaignRaised(supabase, args.campaignId)
  return `cardcom recorded ${txn}: ₪${amount} -> ${args.campaignId}`
}
