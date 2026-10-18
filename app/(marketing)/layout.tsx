import './_lib/marketing.css'
import SvgDefs from './_components/SvgDefs'
import IntroGate from './_components/IntroGate'
import ChromeRuntime from './_components/ChromeRuntime'
import { Bar, Menu, Modal, Footer } from './_components/Chrome'
import AccessibilityWidget from '../(public)/_components/AccessibilityWidget'

// The marketing site (home + about/design/faq/contact) — its own chrome (loader,
// bar, menu, contact modal, footer). Campaign and legal pages live in (public)
// and keep their existing header, so they're unaffected by this layout.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SvgDefs />
      <IntroGate />
      {children}
      <Footer />
      <Bar />
      <Menu />
      <Modal />
      <AccessibilityWidget />
      <ChromeRuntime />
    </>
  )
}
