interface KesherIframeOptions {
  pageId: string | number
  amount?: number
  donorFirstName?: string
  donorLastName?: string
  donorPhone?: string
  donorEmail?: string
  donorId?: string        // ת.ז
  campaignId?: string
  groupSlug?: string
  callerId?: string
  dedication?: string
  successUrl?: string
  failedUrl?: string
  lang?: 'Hebrew' | 'English'
}

// Encodes campaign metadata into addactiondata field
// This comes back as "adddata" in both successUrl and webhook
export function encodeAddActionData(opts: {
  campaignId?: string
  groupSlug?: string
  callerId?: string
  dedication?: string
}): string {
  const parts = [
    opts.campaignId || '',
    opts.groupSlug || '',
    opts.callerId || '',
    opts.dedication ? encodeURIComponent(opts.dedication) : '',
  ]
  return parts.join('|')
}

export function decodeAddActionData(adddata: string): {
  campaignId: string
  groupSlug: string
  callerId: string
  dedication: string
} {
  const [campaignId = '', groupSlug = '', callerId = '', dedicationEncoded = ''] = adddata.split('|')
  return {
    campaignId,
    groupSlug,
    callerId,
    dedication: dedicationEncoded ? decodeURIComponent(dedicationEncoded) : '',
  }
}

export function buildKesherIframeUrl(options: KesherIframeOptions): string {
  // Base URL for Kesher payment page
  const base = `https://kesherhk.info/PaymentPage/PaymentPage`

  const params = new URLSearchParams()
  params.set('id', String(options.pageId))

  if (options.amount) params.set('total', String(options.amount))
  if (options.donorFirstName) params.set('firstname', options.donorFirstName)
  if (options.donorLastName) params.set('lastname', options.donorLastName)
  if (options.donorPhone) params.set('tel', options.donorPhone)
  if (options.donorEmail) params.set('mail', options.donorEmail)
  if (options.donorId) params.set('tz', options.donorId)
  if (options.lang) params.set('lang', options.lang)

  if (options.successUrl) params.set('successurl', options.successUrl)
  if (options.failedUrl) params.set('failedurl', options.failedUrl)

  // Encode campaign metadata — comes back as "adddata" in webhook and successUrl
  const addActionData = encodeAddActionData({
    campaignId: options.campaignId,
    groupSlug: options.groupSlug,
    callerId: options.callerId,
    dedication: options.dedication,
  })
  if (addActionData.replace(/\|/g, '')) {
    params.set('addactiondata', addActionData)
  }

  return `${base}?${params.toString()}`
}
