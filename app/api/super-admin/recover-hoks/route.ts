import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Super-admin tool: find הו"ק commitments that came through Kafool (an intent
// exists) but were never recorded — because Kesher sent no callback (e.g. a
// future-dated first charge) — and let the admin record the confirmed ones.
// The donor's intent has the monthly amount + group but NOT the installment
// count (the donor sets that inside Kesher), so the admin supplies months per row.

const norm = (p: unknown) => String(p ?? '').replace(/\D/g, '').replace(/^972/, '0').slice(-10)

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'super_admin' ? user : null
}

export async function POST(req: NextRequest) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const admin = await createServiceClient()

  // ── SCAN ──────────────────────────────────────────────────────────────────
  if (body.action === 'scan') {
    const days = Math.min(60, Math.max(1, Number(body.days) || 14))
    const sinceIso = new Date(Date.now() - days * 864e5).toISOString()

    const { data: intents } = await admin.from('donation_intents')
      .select('campaign_id, group_slug, phone, donor_email, amount, custom_data, created_at')
      .gt('created_at', sinceIso).order('created_at', { ascending: false }).limit(5000)
    const hok = (intents || []).filter((i: any) => String(i.custom_data?.__method || '') === 'hok')

    const { data: dons } = await admin.from('donations')
      .select('campaign_id, donor_phone').gt('created_at', sinceIso)
    const donPhonesByCamp: Record<string, Set<string>> = {}
    for (const d of dons || []) (donPhonesByCamp[d.campaign_id] ||= new Set()).add(norm(d.donor_phone))

    const campIds = [...new Set(hok.map((i: any) => i.campaign_id))]
    const { data: camps } = campIds.length
      ? await admin.from('campaigns').select('id, title').in('id', campIds)
      : { data: [] }
    const title: Record<string, string> = Object.fromEntries((camps || []).map((c: any) => [c.id, c.title]))

    const missing = new Map<string, any>()
    for (const i of hok) {
      const p = norm(i.phone)
      if (donPhonesByCamp[i.campaign_id]?.has(p)) continue
      const key = `${i.campaign_id}|${p}|${i.amount}`
      if (!missing.has(key)) missing.set(key, {
        campaign_id: i.campaign_id, campaign_title: title[i.campaign_id] || '?',
        donor_name: i.custom_data?.__name || '', phone: i.phone, donor_email: i.donor_email,
        monthly: Number(i.amount) || 0, group_slug: i.group_slug || '', attempts: 0, first: i.created_at,
      })
      missing.get(key).attempts++
    }
    return NextResponse.json({ items: [...missing.values()].sort((a, b) => a.campaign_title.localeCompare(b.campaign_title)) })
  }

  // ── RECORD ────────────────────────────────────────────────────────────────
  if (body.action === 'record') {
    const items = Array.isArray(body.items) ? body.items : []
    const results: any[] = []
    const touchedCampaigns = new Set<string>()

    for (const it of items) {
      const campaignId = String(it.campaign_id || '')
      const monthly = Number(it.monthly) || 0
      const months = Math.max(0, Math.min(120, Number(it.months) || 0))
      const phone = String(it.phone || '')
      if (!campaignId || monthly <= 0 || months <= 0) { results.push({ phone, ok: false, error: 'חסר קמפיין/סכום/חודשים' }); continue }

      const { data: campaign } = await admin.from('campaigns').select('org_id').eq('id', campaignId).single()
      if (!campaign) { results.push({ phone, ok: false, error: 'קמפיין לא נמצא' }); continue }

      // The obligation reference (asmachta) from the Kesher approval. Storing it lets
      // the eventual first-charge webhook dedup against this record instead of
      // recording the הו"ק a second time when the deferred charge finally posts.
      const oblRef = String(it.obligation_ref || '').trim()

      // idempotency: already recorded — by obligation ref (preferred) or phone+monthly.
      let dup = false
      if (oblRef) {
        const { data: byRef } = await admin.from('donations').select('id')
          .eq('campaign_id', campaignId).eq('kesher_obligation_ref', oblRef).limit(1)
        dup = !!(byRef && byRef.length)
      }
      if (!dup) {
        const { data: existDon } = await admin.from('donations')
          .select('id, donor_phone, monthly_amount, payment_type').eq('campaign_id', campaignId).eq('payment_type', 'hok')
        dup = (existDon || []).some((d: any) => norm(d.donor_phone) === norm(phone) && Number(d.monthly_amount) === monthly)
      }
      if (dup) { results.push({ phone, ok: false, error: 'כבר רשום (כפילות)' }); continue }

      let groupId: string | null = null
      const gslug = String(it.group_slug || '').trim()
      if (gslug) {
        const { data: g } = await admin.from('groups').select('id').eq('campaign_id', campaignId).eq('slug', gslug).maybeSingle()
        groupId = g?.id ?? null
      }

      const amount = monthly * months
      const chargeDay = it.charge_day ? Number(it.charge_day) : null
      const startDate = String(it.start_date || '').trim() || null
      const { error } = await admin.from('donations').insert({
        campaign_id: campaignId, org_id: campaign.org_id, amount, currency: 'ILS',
        donor_name: it.donor_name || null, donor_phone: phone || null, donor_email: it.donor_email || null,
        group_id: groupId, payment_status: 'completed', payment_type: 'hok',
        monthly_amount: monthly, installments: months,
        kesher_transaction_id: oblRef ? `hok:${oblRef}` : null,
        kesher_obligation_ref: oblRef || null,
        kesher_raw: oblRef ? { __recovered: true, obligationRef: oblRef } : null,
        custom_data: {
          __name: it.donor_name || null, __method: 'hok', __recovered: true,
          ...(chargeDay ? { __charge_day: chargeDay } : {}), ...(startDate ? { __starts_at: startDate } : {}),
          ...(it.note ? { manager_note: String(it.note) } : {}),
        },
      })
      if (error) { results.push({ phone, ok: false, error: error.message }); continue }
      touchedCampaigns.add(campaignId)
      results.push({ phone, ok: true, amount })
    }

    const { recomputeCampaignRaised } = await import('@/lib/donations')
    for (const cid of touchedCampaigns) await recomputeCampaignRaised(admin, cid)
    return NextResponse.json({ results })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
