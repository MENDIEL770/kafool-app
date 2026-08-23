// Live foreign-exchange rates: ₪ (ILS) per 1 unit of a foreign currency, pulled
// from a free public source at request time and cached briefly. Used both for the
// in-form currency conversion and for recording a foreign donation's ₪ value.
//
// Source: frankfurter.app (European Central Bank reference rates — free, no key,
// refreshed every business day). If it's unreachable we fall back to open.er-api,
// then to a caller-supplied manual rate, then to a sane default. So a live rate is
// used whenever possible, and the flow never breaks when the source is down.

const CACHE = new Map<string, { rate: number; at: number }>()
const TTL_MS = 1000 * 60 * 60 * 3 // 3h — ECB refs update at most once/business day

async function fromFrankfurter(cur: string): Promise<number | null> {
  try {
    const r = await fetch(`https://api.frankfurter.dev/v1/latest?base=${cur}&symbols=ILS`, { cache: 'no-store' })
    if (!r.ok) return null
    const d = await r.json()
    const rate = Number(d?.rates?.ILS)
    return rate > 0 ? rate : null
  } catch { return null }
}

async function fromErApi(cur: string): Promise<number | null> {
  try {
    const r = await fetch(`https://open.er-api.com/v6/latest/${cur}`, { cache: 'no-store' })
    if (!r.ok) return null
    const d = await r.json()
    const rate = Number(d?.rates?.ILS)
    return rate > 0 ? rate : null
  } catch { return null }
}

/**
 * ₪ per 1 unit of `currency`, live. ILS → 1. On any failure returns `fallback`
 * (the manager's manual rate) or 3.7. Cached in-memory per server instance.
 */
export async function getIlsPerUnit(currency: string, fallback = 3.7): Promise<number> {
  const cur = (currency || '').toUpperCase()
  if (!cur || cur === 'ILS') return 1

  const hit = CACHE.get(cur)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.rate

  const rate = (await fromFrankfurter(cur)) ?? (await fromErApi(cur))
  if (rate && rate > 0) {
    CACHE.set(cur, { rate, at: Date.now() })
    return rate
  }
  return fallback > 0 ? fallback : 3.7
}
