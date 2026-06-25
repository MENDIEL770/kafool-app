// Resolve a pasted Charidy vanity link (e.g. charidy.com/<campaign>/<team>) to
// the numeric team id. That id is exactly what the donation webhook reports in
// `team_id_list`, so storing it on the caller group lets us map an incoming
// donation -> the group that received it. Server-only (calls the public API).

const API = 'https://api.charidy.com/api/v1'

async function j(url: string) {
  const r = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' })
  if (!r.ok) throw new Error(`charidy ${r.status}`)
  return r.json()
}

export async function resolveCharidyTeamId(link: string): Promise<string | null> {
  try {
    if (!link || !/charidy/i.test(link)) return null
    let path = link.trim()
    if (!/^https?:\/\//i.test(path)) path = `https://${path}`
    const u = new URL(path)
    if (!/charidy\.com$/i.test(u.hostname)) return null
    let segs = u.pathname.split('/').filter(Boolean)
    if (segs[0] && /^[a-z]{2}$/i.test(segs[0])) segs = segs.slice(1) // drop locale prefix
    const campaignSlug = segs[0]
    const teamSlug = segs[1]
    if (!campaignSlug || !teamSlug) return null // no team in the link → nothing to map

    const campRes = await j(`${API}/campaign/${encodeURIComponent(campaignSlug)}?locate_by_shortlink=1`)
    const camp = Array.isArray(campRes.data) ? campRes.data[0] : campRes.data
    const campaignId = camp?.id ?? camp?.attributes?.campaign_id
    if (!campaignId) return null

    const tRes = await j(`${API}/campaign/${campaignId}/team/${encodeURIComponent(teamSlug)}`)
    const team = Array.isArray(tRes.data) ? tRes.data[0] : tRes.data
    const teamId = team?.id != null ? String(team.id) : null
    return teamId && teamId !== '0' ? teamId : null
  } catch {
    return null
  }
}
