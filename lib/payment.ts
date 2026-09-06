// Per-campaign payment-connection override.
//
// Payment links (Kesher/Nedarim) live on the ORGANIZATION by default. A campaign
// may optionally override them via `campaign.settings.payment` — e.g. a product
// sales page that needs its own dedicated "payment" clearing page rather than the
// org's "donation" one. Anything left empty inherits the org, and a campaign with
// no `settings.payment` at all (every existing campaign) is completely unaffected.

export interface CampaignPaymentPatch {
  provider?: 'kesher' | 'nedarim'
  urls?: Record<string, string>
  nedarim?: { mosad: string; apiValid: string }
}

type StoredPayment = {
  provider?: string | null
  urls?: Record<string, string | null> | null
  nedarim?: { mosad?: string | null; api_valid?: string | null } | null
} | null | undefined

const URL_KEYS = ['one_time', 'hok', 'bit', 'bank', 'one_time_en', 'hok_en'] as const

/**
 * Reads `settings.payment` and, only if it holds non-empty overrides, calls
 * `apply()` with just those overrides. No-op when absent/empty, so the org
 * connection is kept. `currentProvider` is the org-resolved provider, used to
 * decide whether Nedarim identity overrides are relevant.
 */
export function applyCampaignPaymentOverride(
  settings: unknown,
  apply: (patch: CampaignPaymentPatch) => void,
  currentProvider: string,
): void {
  const pm = (settings as { payment?: StoredPayment })?.payment
  if (!pm) return

  const patch: CampaignPaymentPatch = {}
  if (pm.provider === 'kesher' || pm.provider === 'nedarim') patch.provider = pm.provider

  const u = pm.urls || {}
  const urls: Record<string, string> = {}
  for (const k of URL_KEYS) {
    const v = (u[k] ?? '').toString().trim()
    if (v) urls[k] = v
  }
  if (Object.keys(urls).length) patch.urls = urls

  const finalProvider = patch.provider || currentProvider
  if (finalProvider === 'nedarim' && pm.nedarim) {
    const mosad = (pm.nedarim.mosad ?? '').toString().trim()
    const apiValid = (pm.nedarim.api_valid ?? '').toString().trim()
    if (mosad || apiValid) patch.nedarim = { mosad, apiValid }
  }

  if (patch.provider || patch.urls || patch.nedarim) apply(patch)
}
