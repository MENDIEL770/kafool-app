import type { SupabaseClient } from '@supabase/supabase-js'
import { sendYemotSms } from './sms/yemot'
import { sendPlusEmail } from './email'

// A donor who filled in details and reached the payment step leaves a
// donation_intents row (the "lead"). When the payment completes, the callback
// deletes that row. So an intent still around a while later — with no matching
// completed donation — is an ABANDONED donation. We then, once each:
//   • SMS the campaign manager (name, method, amount, callback phone), and
//   • email the donor a gentle "your donation didn't complete" with a link back.
// The lead is kept either way.

const ABANDON_MINUTES = 5    // wait this long before treating an intent as abandoned
const WINDOW_HOURS = 24      // don't look back further than this

const METHOD_LABEL: Record<string, string> = {
  bit: 'ביט', credit: 'אשראי', hok: 'הוראת קבע',
  transfer: 'העברה בנקאית', bank: 'העברה בנקאית', one_time: 'אשראי',
}

function normPhone(p: string | null | undefined): string {
  return (p || '').replace(/\D/g, '').slice(-9)
}

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || 'https://www.kafool.com').replace(/\/$/, '')
}

// The recovery email the donor receives (per the campaign's copy).
function recoveryEmailHtml(args: { campaignTitle: string; orgName: string; link: string; managerPhone: string }): string {
  const { campaignTitle, orgName, link, managerPhone } = args
  const phoneLine = managerPhone
    ? `<p>אם נתקלת בבעיה או שיש לך כל שאלה, תרגיש חופשי לשלוח לנו הודעה למספר טלפון <strong dir="ltr">${managerPhone}</strong> ואנו נעמוד לשירותך.</p>`
    : ''
  return `
    <p>שלום וברכה,</p>
    <p>תודה על בחירתך לתמוך ב<strong>${campaignTitle}</strong>! שמנו לב שתרומתך באתר לא הושלמה.</p>
    <p>עזרתך חיונית, ותרומתך נמצאת במרחק לחיצת כפתור:</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:bold;padding:14px 30px;border-radius:12px;font-size:16px;">להשלמת התרומה</a>
    </p>
    ${phoneLine}
    <p>לנדיבותך יש השפעה אמיתית, ואנו מעריכים את מחויבותך.</p>
    <p>בברכה,<br/>${orgName} ומערכת ׳כפול׳</p>`
}

/**
 * Sweep one campaign's abandoned intents. Idempotent per channel (each lead gets
 * at most one manager SMS via __notified and one donor email via __emailed).
 * Safe to call opportunistically (on each new intent) or from a cron.
 */
export async function notifyAbandonedIntents(supabase: SupabaseClient, campaignId: string): Promise<number> {
  const apiKey = process.env.YEMOT_API_KEY
  const nowMs = Date.now()
  const cutoffIso = new Date(nowMs - ABANDON_MINUTES * 60_000).toISOString()
  const floorIso = new Date(nowMs - WINDOW_HOURS * 3_600_000).toISOString()

  const { data: intents } = await supabase
    .from('donation_intents')
    .select('id, phone, amount, custom_data, donor_email, group_slug, created_at')
    .eq('campaign_id', campaignId)
    .lt('created_at', cutoffIso)
    .gt('created_at', floorIso)
    .order('created_at', { ascending: true })
    .limit(100)
  const pending = (intents || []).filter(i => {
    const cd = (i.custom_data || {}) as Record<string, unknown>
    return !(cd.__notified && cd.__emailed) // still needs at least one channel
  })
  if (pending.length === 0) return 0

  // Completed donations in the window — to tell "completed" from "abandoned".
  const { data: dons } = await supabase
    .from('donations')
    .select('donor_phone, amount, created_at')
    .eq('campaign_id', campaignId)
    .eq('payment_status', 'completed')
    .gt('created_at', floorIso)
    .limit(500)
  const completed = dons || []

  const { data: camp } = await supabase
    .from('campaigns').select('title, slug, settings, org_id').eq('id', campaignId).single()
  const managerPhone = String((camp?.settings as { manager_phone?: string } | null)?.manager_phone || '').trim()
  const { data: org } = camp?.org_id
    ? await supabase.from('organizations').select('name').eq('id', camp.org_id).single()
    : { data: null }
  const orgName = org?.name || camp?.title || 'הארגון'
  const campaignTitle = camp?.title || ''

  let sent = 0
  for (const it of pending) {
    const cd = (it.custom_data || {}) as Record<string, unknown>
    const wantPhone = normPhone(it.phone)
    const wantAmount = Math.round(Number(it.amount) || 0)

    // Did a matching completed donation actually land? Then it's not abandoned.
    const matched = completed.some(d => {
      const amountOk = Math.round(Number(d.amount) || 0) === wantAmount
      const phoneOk = wantPhone ? normPhone(d.donor_phone) === wantPhone : true
      return amountOk && phoneOk
    })
    if (matched) {
      await supabase.from('donation_intents').delete().eq('id', it.id)
      continue
    }

    const next: Record<string, unknown> = { ...cd }
    let changed = false

    // Donor recovery email — once per lead.
    if (!cd.__emailed && it.donor_email) {
      const link = it.group_slug
        ? `${baseUrl()}/${camp?.slug}/g/${it.group_slug}`
        : `${baseUrl()}/${camp?.slug}`
      const ok = await sendPlusEmail(
        it.donor_email,
        `תרומתך ל${campaignTitle} ממתינה להשלמה`,
        recoveryEmailHtml({ campaignTitle, orgName, link, managerPhone }),
      )
      if (ok) { next.__emailed = true; changed = true; sent++ }
    }

    // Manager SMS — once per lead (only if we have a callback number).
    if (!cd.__notified && managerPhone && apiKey && it.phone) {
      const name = String(cd.__name || 'תורם/ת')
      const method = METHOD_LABEL[String(cd.__method || '')] || String(cd.__method || 'תשלום')
      const msg =
        `${name} לא השלים/ה את התרומה באמצעות ${method} ע"ס ${wantAmount} ₪.\n` +
        `מספר לחזרה: ${it.phone}` +
        (campaignTitle ? `\n(${campaignTitle})` : '')
      const r = await sendYemotSms(apiKey, managerPhone, msg)
      if (r.success) { next.__notified = true; changed = true; sent++ }
    }

    if (changed) {
      await supabase.from('donation_intents').update({ custom_data: next }).eq('id', it.id)
    }
  }
  return sent
}
