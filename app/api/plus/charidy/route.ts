import { NextRequest, NextResponse } from 'next/server'

// Server-side proxy for the Charidy public API (no CORS from the browser).
// Resolves a pasted vanity link (e.g. charidy.com/theglow/razla) to real
// donations for that campaign — filtered to the team when a team slug is given.
//   campaign by slug : /api/v1/campaign/{slug}?locate_by_shortlink=1
//   team by slug     : /api/v1/campaign/{id}/team/{teamSlug}
//   donations        : /api/v1/campaign/{id}/donations?sortBy=-time&limit=50&extend=team
// Amounts come in minor units (cents/agorot) → divided by 100.

const API = 'https://api.charidy.com/api/v1'

interface DonationOut { id: string; donor: string; amount: number; at: string; anonymous?: boolean }

async function j(url: string) {
  const r = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' })
  if (!r.ok) throw new Error(`charidy ${r.status}`)
  return r.json()
}

export async function GET(req: NextRequest) {
  const link = req.nextUrl.searchParams.get('link') || ''
  try {
    let path = link.trim()
    if (!/^https?:\/\//i.test(path)) path = `https://${path}`
    const u = new URL(path)
    if (!/charidy\.com$/i.test(u.hostname)) throw new Error('not a Charidy link')
    let segs = u.pathname.split('/').filter(Boolean)
    if (segs[0] && /^[a-z]{2}$/i.test(segs[0])) segs = segs.slice(1) // drop locale prefix
    const campaignSlug = segs[0]
    const teamSlug = segs[1]
    if (!campaignSlug) throw new Error('missing campaign')

    // 1) resolve campaign
    const campRes = await j(`${API}/campaign/${encodeURIComponent(campaignSlug)}?locate_by_shortlink=1`)
    const camp = Array.isArray(campRes.data) ? campRes.data[0] : campRes.data
    const campaignId = camp?.id ?? camp?.attributes?.campaign_id
    if (!campaignId) throw new Error('campaign not found')
    const sign = camp?.attributes?.currency_sign || '₪'
    const title = camp?.attributes?.title || 'Charidy'

    // 2) optional team
    let teamId: number | null = null
    let teamTotal: number | null = null
    let goal: number | undefined
    if (teamSlug) {
      try {
        const tRes = await j(`${API}/campaign/${campaignId}/team/${encodeURIComponent(teamSlug)}`)
        const team = Array.isArray(tRes.data) ? tRes.data[0] : tRes.data
        teamId = Number(team?.id) || null
        teamTotal = team?.attributes?.amount != null ? Number(team.attributes.amount) / 100 : null
        goal = team?.attributes?.goal != null ? Number(team.attributes.goal) : undefined
      } catch { /* team optional */ }
    }

    // 3) recent donations
    const dRes = await j(`${API}/campaign/${campaignId}/donations?sortBy=-time&limit=50&extend=team`)
    let rows: { id: string; attributes: Record<string, unknown> }[] = dRes.data ?? []
    if (teamId) rows = rows.filter(r => Number(r.attributes?.team_id) === teamId)

    const donations: DonationOut[] = rows.map(r => {
      const a = r.attributes || {}
      const anon = !!a.hide_donation_amount || !a.name
      return {
        id: String(r.id),
        donor: anon ? 'תורם אנונימי' : String(a.name),
        amount: Number(a.total || 0) / 100,
        at: new Date(Number(a.created_at || 0) * 1000).toISOString(),
        anonymous: anon,
      }
    })

    const total = teamTotal != null ? teamTotal : donations.reduce((s, d) => s + d.amount, 0)
    return NextResponse.json({
      ok: true, campaignTitle: title, currencySign: sign,
      total, count: donations.length, goal, donations, fetchedAt: new Date().toISOString(),
    })
  } catch (e) {
    return NextResponse.json({
      ok: false, total: 0, count: 0, donations: [], fetchedAt: new Date().toISOString(),
      error: e instanceof Error ? e.message : 'שגיאת Charidy',
    })
  }
}
