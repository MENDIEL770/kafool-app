import type { SupabaseClient } from '@supabase/supabase-js'

// Outgoing webhook to the Kafool+ (ambassadors) system. Fires on every confirmed
// donation in campaigns flagged for sync (settings.kafool_plus_sync === true).
// No-op until KAFOOL_WEBHOOK_SECRET is set. The Kafool+ side dedupes by `id`, so
// a resend is safe. Never send card details — only the fields below.
const ENDPOINT = 'https://plus.kafool.com/api/kafool/webhook'

// POST with a small retry. HTTP 200 = success. setTimeout backoff is fine here
// (server route, not a workflow script).
async function postWithRetry(url: string, body: unknown, attempts = 3): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.status === 200) return true
    } catch { /* fall through to retry */ }
    if (i < attempts - 1) await new Promise(r => setTimeout(r, 500 * (i + 1)))
  }
  return false
}

/**
 * Sync one confirmed donation to Kafool+. Best-effort; awaited so serverless
 * doesn't kill it early, but never throws into the caller.
 */
export async function syncDonationToKafoolPlus(
  supabase: SupabaseClient,
  args: { donationId: string; campaignId: string; phone?: string | null },
): Promise<void> {
  const secret = process.env.KAFOOL_WEBHOOK_SECRET
  if (!secret) return
  try {
    const { data: campaign } = await supabase
      .from('campaigns').select('settings').eq('id', args.campaignId).maybeSingle()
    const on = (campaign?.settings as { kafool_plus_sync?: boolean } | null)?.kafool_plus_sync === true
    if (!on) return

    const { data: d } = await supabase
      .from('donations')
      .select('id, donor_name, donor_phone, donor_email, amount, created_at')
      .eq('id', args.donationId).maybeSingle()
    if (!d) return

    // phone is the required matching key on the Kafool+ side
    const phone = (args.phone || d.donor_phone || '').trim()
    if (!phone) {
      console.warn('Kafool+ sync skipped — no phone for donation', d.id)
      return
    }

    const payload = [{
      id: d.id,
      phone_number: phone,
      name: d.donor_name || null,
      email: d.donor_email || null,
      amount: Number(d.amount) || 0,
      date_added: d.created_at,
      campaign_id: args.campaignId,
    }]

    const ok = await postWithRetry(`${ENDPOINT}?token=${encodeURIComponent(secret)}`, payload)
    if (!ok) console.error('Kafool+ sync failed after retries for donation', d.id)
  } catch (e) {
    console.error('syncDonationToKafoolPlus error:', e)
  }
}

/**
 * Optional: sync a campaign / group creation event to Kafool+.
 * Body shape per the Kafool+ contract: { type:'campaign', id, name, phone_number }.
 */
export async function syncCampaignEventToKafoolPlus(
  args: { id: string; name: string; phone_number?: string | null },
): Promise<void> {
  const secret = process.env.KAFOOL_WEBHOOK_SECRET
  if (!secret) return
  try {
    await postWithRetry(`${ENDPOINT}?token=${encodeURIComponent(secret)}`, {
      type: 'campaign',
      id: args.id,
      name: args.name,
      phone_number: args.phone_number || null,
    })
  } catch (e) {
    console.error('syncCampaignEventToKafoolPlus error:', e)
  }
}
