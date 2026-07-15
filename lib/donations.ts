import type { SupabaseClient } from '@supabase/supabase-js'
import { sendThankYouEmail } from './email'

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

// Last 9 digits — so "050-353-5770", "0535035770" and "+972535035770" all match.
function normPhone(p: string | null | undefined): string {
  return (p || '').replace(/\D/g, '').slice(-9)
}

/**
 * Re-attach the custom-form values a donor filled before payment (stored in
 * donation_intents) to the donation the callback just recorded, and send the
 * thank-you email (per-form override from the intent, else the campaign default).
 * Matches on campaign + phone + amount within a recent window. No-op if the
 * table/columns aren't present yet.
 */
export async function attachCustomData(
  supabase: SupabaseClient,
  args: { donationId: string; campaignId: string; phone: string | null; amount: number; donorEmail?: string | null },
): Promise<void> {
  let intentTemplate: { subject?: string; body?: string; image?: string } | null = null
  try {
    const sinceIso = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() // last 6h
    const { data: intents } = await supabase
      .from('donation_intents')
      .select('id, phone, amount, custom_data, email_template')
      .eq('campaign_id', args.campaignId)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(50)

    const wantPhone = normPhone(args.phone)
    const strongMatch = (intents || []).find(i => {
      const phoneOk = wantPhone && normPhone(i.phone as string) === wantPhone
      const amountOk = Math.round(Number(i.amount) || 0) === Math.round(args.amount)
      return phoneOk && amountOk
    })
    const match = strongMatch || (intents || []).find(i => Math.round(Number(i.amount) || 0) === Math.round(args.amount))

    if (match) {
      if (match.custom_data) {
        // Drop reserved internal keys (__name / __method / __notified) — they're
        // for the abandoned-donation flow, not part of the donor's real data.
        const clean = Object.fromEntries(
          Object.entries(match.custom_data as Record<string, unknown>).filter(([k]) => !k.startsWith('__'))
        )
        await supabase.from('donations').update({ custom_data: clean }).eq('id', args.donationId)
      }
      // Only trust the intent's email template on a STRONG (phone+amount) match.
      // An amount-only match could be a different donor's planted intent, so we
      // fall back to the campaign's server-side template resolution instead.
      intentTemplate = strongMatch ? ((match.email_template as typeof intentTemplate) || null) : null
      await supabase.from('donation_intents').delete().eq('id', match.id)
    }
  } catch (e) {
    console.error('attachCustomData error:', e)
  }

  // Thank-you email. Send when: the intent carried a content override (per-form /
  // per-button content) → use it; else this button opted-in via its checkbox → use
  // its content, or the default content; else the master default email is enabled.
  try {
    if (!args.donorEmail) return
    const { data: c } = await supabase.from('campaigns').select('settings, title').eq('id', args.campaignId).single()
    type Tpl = { enabled?: boolean; subject?: string; body?: string; image?: string }
    const s = (c?.settings as { thank_you_email?: Tpl; button_emails?: Record<string, Tpl> } | null) || {}
    const def = s.thank_you_email || {}
    const hasContent = (t?: Tpl) => !!(t && (t.subject || t.body || t.image))
    let tpl: Tpl | null = intentTemplate
    if (!tpl) {
      const btnE = s.button_emails?.[String(Math.round(args.amount))]
      if (btnE?.enabled === true) tpl = hasContent(btnE) ? btnE : (hasContent(def) ? def : {})
      else if (def.enabled) tpl = def
    }
    if (tpl) await sendThankYouEmail(args.donorEmail, tpl, c?.title || '')
  } catch (e) {
    console.error('thank-you email error:', e)
  }
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
