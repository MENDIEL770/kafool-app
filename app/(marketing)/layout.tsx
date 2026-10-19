import MarketingShell from './_components/MarketingShell'
import AccessibilityWidget from '../(public)/_components/AccessibilityWidget'

// The marketing site (home + about/faq/contact). Campaign and legal pages live
// in (public) and keep their existing header. The /design index also lives in
// (public) (next to /design/[projectId]) but reuses MarketingShell for the chrome.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketingShell>{children}</MarketingShell>
      <AccessibilityWidget />
    </>
  )
}
