import type { SupabaseClient } from '@supabase/supabase-js'
import { sendYemotSms } from './sms/yemot'
import { sendPlusEmail } from './email'
import { sendWhatsAppTemplate } from './whatsapp'

// A donor who filled in details and reached the payment step leaves a
// donation_intents row (the "lead"). When the payment completes, the callback
// deletes that row. So an intent still around a while later — with no matching
// completed donation — is an ABANDONED donation. We then, once each:
//   • SMS the campaign manager (name, method, amount, callback phone), and
//   • email the donor a gentle "your donation didn't complete" with a link back.
// The lead is kept either way.

const ABANDON_MINUTES = 5      // on-page methods (credit / hok) finish in seconds
const BIT_ABANDON_MINUTES = 30 // Bit is async — SMS → open the Bit app → pay — so wait much longer
const WINDOW_HOURS = 24        // don't look back further than this

// How long to wait before treating a lead of this method as abandoned.
function abandonMinutesFor(method: string): number {
  return method === 'bit' ? BIT_ABANDON_MINUTES : ABANDON_MINUTES
}

const METHOD_LABEL: Record<string, string> = {
  bit: 'ביט', credit: 'אשראי', hok: 'הוראת קבע',
  transfer: 'העברה בנקאית', bank: 'העברה בנקאית', one_time: 'אשראי',
}

function normPhone(p: string | null | undefined): string {
  return (p || '').replace(/\D/g, '').slice(-9)
}

function normName(s: unknown): string {
  return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase()
}

function normEmail(s: unknown): string {
  return String(s || '').trim().toLowerCase()
}

export type CompletedDonation = {
  donor_phone?: string | null
  donor_name?: string | null
  donor_email?: string | null
  amount?: number | null
  created_at: string
}

/**
 * Has this lead actually completed? A confirmed donation counts when it shares
 * an identity with the intent (phone / email / name) AND either the amount
 * matches OR it landed close in time — because Bit donations frequently record a
 * DIFFERENT amount than the intent (fees / the donor edits it in the Bit app) and
 * sometimes no phone/email. When the donation carries no identity at all, fall
 * back to same-amount close-in-time. Shared by the sweep and the leads dashboard.
 */
export function intentCompleted(
  intent: { phone?: string | null; donor_email?: string | null; name?: unknown; amount?: number | null; created_at: string },
  completed: CompletedDonation[],
): boolean {
  const wantPhone = normPhone(intent.phone)
  const wantEmail = normEmail(intent.donor_email)
  const wantName = normName(intent.name)
  const wantAmount = Math.round(Number(intent.amount) || 0)
  const intentMs = new Date(intent.created_at).getTime()
  return completed.some(d => {
    const dMs = new Date(d.created_at).getTime()
    // A donation can only be THIS intent's completion if it landed around/after
    // it — never a months-old donation of the same amount from the same donor
    // (e.g. a repeated ₪1 test from the same phone). Time link is mandatory.
    const closeInTime = dMs >= intentMs - 5 * 60_000 && dMs <= intentMs + 120 * 60_000
    if (!closeInTime) return false
    const dPhone = normPhone(d.donor_phone)
    const dEmail = normEmail(d.donor_email)
    const dName = normName(d.donor_name)
    // same person (amount may drift for Bit: intent ₪104 → charged ₪100)…
    const identity =
      (!!wantPhone && dPhone === wantPhone) ||
      (!!wantEmail && dEmail === wantEmail) ||
      (!!wantName && !!dName && dName === wantName)
    if (identity) return true
    // …or an identity-less donation with the same amount in the same window
    if (!dPhone && !dEmail && !dName && Math.round(Number(d.amount) || 0) === wantAmount) return true
    return false
  })
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

// The alert the campaign manager receives about an abandoned lead.
function managerAlertHtml(args: { name: string; method: string; amount: number; phone: string | null; campaignTitle: string }): string {
  const { name, method, amount, phone, campaignTitle } = args
  return `
    <p><strong>${name}</strong> התחיל/ה תרומה אך לא השלים/ה אותה.</p>
    <table style="border-collapse:collapse;margin:12px 0;font-size:15px;">
      <tr><td style="padding:4px 12px 4px 0;color:#64748b;">סכום</td><td style="padding:4px 0;font-weight:bold;">₪${amount.toLocaleString()}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#64748b;">אמצעי</td><td style="padding:4px 0;font-weight:bold;">${method}</td></tr>
      ${phone ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b;">טלפון לחזרה</td><td style="padding:4px 0;font-weight:bold;" dir="ltr">${phone}</td></tr>` : ''}
      ${campaignTitle ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b;">קמפיין</td><td style="padding:4px 0;font-weight:bold;">${campaignTitle}</td></tr>` : ''}
    </table>
    <p>מומלץ ליצור קשר עם התורם/ת ולעזור להשלים את התרומה.</p>
    <p style="color:#94a3b8;font-size:13px;">מערכת ׳כפול׳</p>`
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
  const { data: camp } = await supabase
    .from('campaigns').select('title, slug, settings, org_id').eq('id', campaignId).single()
  const managerPhone = String((camp?.settings as { manager_phone?: string } | null)?.manager_phone || '').trim()
  const managerEmail = String((camp?.settings as { manager_email?: string } | null)?.manager_email || '').trim()
  const { data: org } = camp?.org_id
    ? await supabase.from('organizations').select('name').eq('id', camp.org_id).single()
    : { data: null }
  const orgName = org?.name || camp?.title || 'הארגון'
  const campaignTitle = camp?.title || ''

  const waTemplate = process.env.WHATSAPP_ABANDON_TEMPLATE
  const pending = (intents || []).filter(i => {
    const cd = (i.custom_data || {}) as Record<string, unknown>
    // still needs at least one channel (manager SMS/email / donor email / donor WhatsApp)
    return !(cd.__notified && cd.__emailed && (cd.__wa || !waTemplate) && (cd.__mgrEmailed || !managerEmail))
  })
  if (pending.length === 0) return 0

  // Completed donations in the window — to tell "completed" from "abandoned".
  const { data: dons } = await supabase
    .from('donations')
    .select('donor_phone, donor_name, donor_email, amount, created_at')
    .eq('campaign_id', campaignId)
    .eq('payment_status', 'completed')
    .gt('created_at', floorIso)
    .limit(500)
  const completed = dons || []

  let sent = 0
  for (const it of pending) {
    const cd = (it.custom_data || {}) as Record<string, unknown>
    const wantAmount = Math.round(Number(it.amount) || 0)

    // Did a matching completed donation actually land? Then it's not abandoned.
    const matched = intentCompleted(
      { phone: it.phone, donor_email: it.donor_email, name: cd.__name, amount: it.amount, created_at: it.created_at },
      completed,
    )
    if (matched) {
      await supabase.from('donation_intents').delete().eq('id', it.id)
      continue
    }

    // Not abandoned yet if it hasn't waited long enough for its method. Bit is
    // async (SMS → open the app → pay), so it gets a much longer grace window —
    // this is what stopped the false "not completed" alerts on Bit donations.
    const ageMin = (nowMs - new Date(it.created_at).getTime()) / 60_000
    if (ageMin < abandonMinutesFor(String(cd.__method || ''))) continue

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

    // Manager email alert — once per lead (independent of the SMS).
    if (!cd.__mgrEmailed && managerEmail) {
      const name = String(cd.__name || 'תורם/ת')
      const method = METHOD_LABEL[String(cd.__method || '')] || String(cd.__method || 'תשלום')
      const ok = await sendPlusEmail(
        managerEmail,
        `ליד שלא הושלם — ${campaignTitle || 'קמפיין'}`,
        managerAlertHtml({ name, method, amount: wantAmount, phone: it.phone, campaignTitle }),
      )
      if (ok) { next.__mgrEmailed = true; changed = true; sent++ }
    }

    // Donor WhatsApp reminder — once per lead (approved template; {{1}}=campaign,
    // {{2}}=link back). No-op until WHATSAPP_ABANDON_TEMPLATE + WhatsApp are set.
    if (!cd.__wa && waTemplate && it.phone) {
      const link = it.group_slug
        ? `${baseUrl()}/${camp?.slug}/g/${it.group_slug}`
        : `${baseUrl()}/${camp?.slug}`
      const r = await sendWhatsAppTemplate(it.phone, waTemplate, [campaignTitle, link])
      if (r.success) { next.__wa = true; changed = true; sent++ }
    }

    if (changed) {
      await supabase.from('donation_intents').update({ custom_data: next }).eq('id', it.id)
    }
  }
  return sent
}
