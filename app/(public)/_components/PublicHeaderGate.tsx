'use client'

import { usePathname } from 'next/navigation'
import MarketingHeader from './MarketingHeader'

// The marketing header (with site nav + accessibility widget) belongs only on the
// informational pages. Campaign donation pages ([slug], /donate, /thanks, /g/...)
// render their own dedicated header and accessibility widget, so we must NOT add
// the marketing header on top of them — otherwise the header/widget appear twice.
// The home + about/design/faq/contact now live in the (marketing) route group
// with their own chrome, so only the legal pages here still use this header.
const MARKETING_PATHS = [
  '/privacy',
  '/terms',
  '/accessibility',
  '/accessibility-statement',
]

export default function PublicHeaderGate({ hiddenPages = [] }: { hiddenPages?: string[] }) {
  const pathname = usePathname()
  // Match the page itself and any sub-path (e.g. /design/<project-slug>).
  // Campaign routes are single-segment slugs (/einav, /einav/donate …) and never
  // start with a marketing prefix, so they're safely excluded.
  const isMarketing = MARKETING_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
  if (!isMarketing) return null
  return <MarketingHeader hiddenPages={hiddenPages} />
}
