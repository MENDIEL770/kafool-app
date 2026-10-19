import type { ReactNode } from 'react'
import '../_lib/marketing.css'
import SvgDefs from './SvgDefs'
import IntroGate from './IntroGate'
import ChromeRuntime from './ChromeRuntime'
import { Bar, Menu, Modal, Footer } from './Chrome'

// The marketing chrome (loader, sticky bar, menu, contact modal, footer + their
// runtime) plus the route-scoped reference CSS. Used by the (marketing) layout
// and by the /design index (which lives in the (public) group alongside its
// /design/[projectId] detail route, so the `design` segment stays in one group).
export default function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <>
      <SvgDefs />
      <IntroGate />
      {children}
      <Footer />
      <Bar />
      <Menu />
      <Modal />
      <ChromeRuntime />
    </>
  )
}
