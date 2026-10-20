import { NextResponse } from 'next/server'
import { sendBitTransaction } from '@/lib/kesher/client'

// Create a Bit payment via Kesher and return its app deep-link, so the donation
// modal can open the Bit app directly on the donor's phone (instead of waiting
// for Kesher's SMS). The client falls back to the hosted SMS flow on any error.
export async function POST(req: Request) {
  try {
    const { campaignId, amount, phone } = await req.json() as { campaignId?: string; amount?: number; phone?: string }
    if (!campaignId || !amount || !phone) {
      return NextResponse.json({ error: 'חסרים פרטים (קמפיין / סכום / טלפון)' }, { status: 400 })
    }
    const r = await sendBitTransaction(campaignId, Number(amount), String(phone))
    if (!r.success || !r.url) {
      return NextResponse.json({ error: r.error || 'יצירת תשלום ביט נכשלה' }, { status: 502 })
    }
    return NextResponse.json({ url: r.url, numTransaction: r.numTransaction })
  } catch (e) {
    console.error('bit-link route error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
