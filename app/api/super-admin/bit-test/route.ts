import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendBitTransaction } from '@/lib/kesher/client'

// Super-admin diagnostic: run Kesher SendBitTransaction for a campaign + phone +
// amount and return the RAW Kesher response, so we can see exactly why the
// direct-Bit flow does/doesn't produce a deep-link. A real Bit request is sent
// to the phone (decline it in the app).
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { campaign, phone, amount } = await req.json() as { campaign?: string; phone?: string; amount?: number }
  if (!campaign || !phone || !amount) return NextResponse.json({ error: 'חסרים פרטים (קמפיין / טלפון / סכום)' }, { status: 400 })

  const admin = await createServiceClient()
  const byId = /^[0-9a-f-]{36}$/i.test(String(campaign))
  const { data: camp } = await admin.from('campaigns').select('id, slug, title').eq(byId ? 'id' : 'slug', campaign).maybeSingle()
  if (!camp) return NextResponse.json({ error: `קמפיין "${campaign}" לא נמצא (נסה slug או id)` }, { status: 404 })

  const result = await sendBitTransaction(camp.id, Number(amount), String(phone))
  return NextResponse.json({ campaign: { id: camp.id, slug: camp.slug, title: camp.title }, result })
}
