import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const donationId = req.nextUrl.searchParams.get('donationId')
  if (!donationId) return NextResponse.json({ error: 'חסר donationId' }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('donations')
    .select('status, receipt_link, kesher_status_code, amount, donor_name')
    .eq('id', donationId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'לא נמצא' }, { status: 404 })

  return NextResponse.json({
    status: data.status,
    receiptLink: data.receipt_link,
    kesherStatus: data.kesher_status_code,
    amount: data.amount,
    donorName: data.donor_name,
  })
}
