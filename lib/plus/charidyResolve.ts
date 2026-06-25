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

export interface CharidyTeam { teamId: string; name: string; url: string; goal: number; donated: number }

// Resolve a campaign slug/id from a campaign (or team) link.
async function resolveCampaign(link: string): Promise<{ id: string; shortlink: string } | null> {
  if (!link || !/charidy/i.test(link)) return null
  let path = link.trim()
  if (!/^https?:\/\//i.test(path)) path = `https://${path}`
  const u = new URL(path)
  if (!/charidy\.com$/i.test(u.hostname)) return null
  let segs = u.pathname.split('/').filter(Boolean)
  if (segs[0] && /^[a-z]{2}$/i.test(segs[0])) segs = segs.slice(1)
  const campaignSlug = segs[0]
  if (!campaignSlug) return null
  const campRes = await j(`${API}/campaign/${encodeURIComponent(campaignSlug)}?locate_by_shortlink=1`)
  const camp = Array.isArray(campRes.data) ? campRes.data[0] : campRes.data
  const id = camp?.id ?? camp?.attributes?.campaign_id
  if (!id) return null
  return { id: String(id), shortlink: camp?.attributes?.shortlink || campaignSlug }
}

// List all teams of a Charidy campaign — for the coordinator to pick a caller's
// group link. Each team's numeric id matches the donation webhook's team_id_list.
export async function listCharidyTeams(campaignLink: string): Promise<CharidyTeam[]> {
  try {
    const camp = await resolveCampaign(campaignLink)
    if (!camp) return []
    // `show_all=true` returns every team (not just featured); limit max is 100,
    // so page through. Guard against a non-advancing/ignored page param.
    const teams: { id: string; attributes: Record<string, unknown> }[] = []
    const seen = new Set<string>()
    for (let page = 1; page <= 25; page++) {
      const tRes = await j(`${API}/campaign/${camp.id}/teams?limit=100&show_all=true&page=${page}`)
      const batch = (tRes.data || []) as { id: string; attributes: Record<string, unknown> }[]
      if (!batch.length) break
      let added = 0
      for (const t of batch) { if (!seen.has(t.id)) { seen.add(t.id); teams.push(t); added++ } }
      if (batch.length < 100 || added === 0) break
    }
    return teams.map((t) => {
      const a = t.attributes || {}
      const slug = String(a.slug || a.shortlink || '')
      const sl = String(a.campaign_shortlink || camp.shortlink)
      return {
        teamId: String(t.id),
        name: String(a.name || slug || t.id),
        url: slug ? `https://charidy.com/${sl}/${slug}` : '',
        goal: Number(a.goal || 0),
        donated: Number(a.donated || 0),
      }
    }).filter((t) => t.url).sort((x, y) => x.name.localeCompare(y.name, 'he'))
  } catch { return [] }
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
