'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import KafoolIntro from './KafoolIntro'

// The logo intro plays only on the main site entry (home "/"). On the inner
// pages it's skipped — we just fire kf:ready so any gated reveals release.
export default function IntroGate() {
  const pathname = usePathname()
  const isHome = pathname === '/'

  useEffect(() => {
    if (!isHome) { try { window.dispatchEvent(new Event('kf:ready')) } catch { /* ignore */ } }
  }, [isHome])

  if (!isHome) return null
  return <KafoolIntro onDone={() => { try { window.dispatchEvent(new Event('kf:ready')) } catch { /* ignore */ } }} />
}
