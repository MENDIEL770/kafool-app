import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { parseGrowWebhook } from '@/lib/grow'
import { convertLeadToOrg } from '@/lib/leads'

/**
 * Grow / Meshulam server callback for the platform's setup-fee billing.
 * Set this URL as the page's callback in the Grow dashboard:
 *   https://kafool.com/api/webhooks/grow
 *
 * On a successful payment we: mark the lead as paid, advance it to 'won',
 * and convert it into an active organization.
 */

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function handle(raw: Record<string, unknown>): Promise<void> {
  console.log('Grow webhook received:', JSON.stringify(raw).substring(0, 1000))

  const evt = parseGrowWebhook(raw)
  if (!evt.success) {
    console.log('Grow webhook: not a success status — ignoring')
    return
  }
  if (!evt.ref) {
    console.warn('Grow webhook: missing ref (cField1) — cannot match a lead')
    return
  }

  const supabase = admin()

  const { data: lead } = await supabase
    .from('sales_leads')
    .select('id, payment_status, converted_org_id')
    .eq('id', evt.ref)
    .single()

  if (!lead) {
    console.warn('Grow webhook: lead not found for ref', evt.ref)
    return
  }

  // Idempotent: already processed
  if (lead.payment_status === 'paid' && lead.converted_org_id) {
    console.log('Grow webhook: lead already paid + converted, skipping', evt.ref)
    return
  }

  await supabase
    .from('sales_leads')
    .update({
      payment_status: 'paid',
      paid_at: new Date().toISOString(),
      grow_transaction_id: evt.transactionId,
      grow_raw: evt.raw,
      stage: 'won',
    })
    .eq('id', lead.id)

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://kafool.com'
  const result = await convertLeadToOrg(supabase, lead.id, baseUrl)
  if (!result.ok) {
    console.error('Grow webhook: conversion failed', result.error)
  } else {
    console.log(`Grow: lead ${lead.id} paid → org ${result.orgId} (${result.slug})`)
  }
}

async function readBody(req: NextRequest): Promise<Record<string, unknown>> {
  const contentType = req.headers.get('content-type') || ''
  const rawText = await req.text()
  if (!rawText) return {}
  if (contentType.includes('application/json')) {
    try { return JSON.parse(rawText) } catch { /* fall through */ }
  }
  // default: form-urlencoded (Grow uses bracket-notation keys)
  try {
    const body: Record<string, unknown> = {}
    new URLSearchParams(rawText).forEach((v, k) => { body[k] = v })
    if (Object.keys(body).length) return body
  } catch { /* ignore */ }
  try { return JSON.parse(rawText) } catch { return {} }
}

export async function POST(req: NextRequest) {
  try {
    const body = await readBody(req)
    await handle(body)
  } catch (e) {
    console.error('Grow webhook error:', e)
  }
  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  if (searchParams.size === 0) {
    return NextResponse.json({ ok: true, service: 'kafool-grow-webhook' })
  }
  try {
    const body: Record<string, unknown> = {}
    searchParams.forEach((v, k) => { body[k] = v })
    await handle(body)
  } catch (e) {
    console.error('Grow webhook (GET) error:', e)
  }
  return NextResponse.json({ ok: true })
}
