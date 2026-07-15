import type { SupabaseClient } from '@supabase/supabase-js'
import { sendYemotSms } from './sms/yemot'

// A donor who filled in details and reached the payment step leaves a
// donation_intents row (the "lead"). When the payment completes, the callback
// deletes that row. So an intent that is still around a while later — with no
// matching completed donation — is an ABANDONED donation: we SMS the campaign
// manager once (with the donor's name, chosen method, amount and callback phone)
// and keep the lead in the table.

const ABANDON_MINUTES = 30   // wait this long before treating an intent as abandoned
const WINDOW_HOURS = 24      // don't look back further than this

const METHOD_LABEL: Record<string, string> = {
  bit: 'ביט', credit: 'אשראי', hok: 'הוראת קבע',
  transfer: 'העברה בנקאית', bank: 'העברה בנקאית', one_time: 'אשראי',
}

function normPhone(p: string | null | undefined): string {
  return (p || '').replace(/\D/g, '').slice(-9)
}

/**
 * Sweep one campaign's abandoned intents. Idempotent: each lead is notified at
 * most once (marked via custom_data.__notified). Safe to call opportunistically
 * (e.g. whenever a new intent is created) or from a cron. Returns #SMS sent.
 */
export async function notifyAbandonedIntents(supabase: SupabaseClient, campaignId: string): Promise<number> {
  const apiKey = process.env.YEMOT_API_KEY
  const nowMs = Date.now()
  const cutoffIso = new Date(nowMs - ABANDON_MINUTES * 60_000).toISOString()
  const floorIso = new Date(nowMs - WINDOW_HOURS * 3_600_000).toISOString()

  const { data: intents } = await supabase
    .from('donation_intents')
    .select('id, phone, amount, custom_data, created_at')
    .eq('campaign_id', campaignId)
    .lt('created_at', cutoffIso)
    .gt('created_at', floorIso)
    .order('created_at', { ascending: true })
    .limit(100)
  const pending = (intents || []).filter(i => !(i.custom_data as Record<string, unknown> | null)?.__notified)
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
    .from('campaigns').select('title, settings').eq('id', campaignId).single()
  const managerPhone = String((camp?.settings as { manager_phone?: string } | null)?.manager_phone || '').trim()

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

    // Abandoned → notify the manager once (only if we have a callback number).
    // Mark notified ONLY on a successful send, so a lead isn't lost if the manager
    // phone isn't configured yet (it'll be picked up once it is, within the window).
    if (managerPhone && apiKey && it.phone) {
      const name = String(cd.__name || 'תורם/ת')
      const method = METHOD_LABEL[String(cd.__method || '')] || String(cd.__method || 'תשלום')
      const msg =
        `${name} לא השלים/ה את התרומה באמצעות ${method} ע"ס ${wantAmount} ₪.\n` +
        `מספר לחזרה: ${it.phone}` +
        (camp?.title ? `\n(${camp.title})` : '')
      const r = await sendYemotSms(apiKey, managerPhone, msg)
      if (r.success) {
        sent++
        await supabase
          .from('donation_intents')
          .update({ custom_data: { ...cd, __notified: true } })
          .eq('id', it.id)
      }
    }
  }
  return sent
}
