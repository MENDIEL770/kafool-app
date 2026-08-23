import { NextRequest, NextResponse } from 'next/server'
import { getIlsPerUnit } from '@/lib/fx'

export const runtime = 'nodejs'

// Live ₪-per-unit rate for a foreign currency, for the donor form's currency
// conversion. `fallback` carries the campaign's manual rate for when the live
// source is down. Public, non-sensitive; short client cache.
export async function GET(req: NextRequest) {
  const currency = (req.nextUrl.searchParams.get('currency') || 'usd').toLowerCase()
  const fallback = Number(req.nextUrl.searchParams.get('fallback')) || 3.7
  const rate = await getIlsPerUnit(currency, fallback)
  return NextResponse.json({ currency, rate }, {
    headers: { 'Cache-Control': 'public, max-age=1800' },
  })
}
