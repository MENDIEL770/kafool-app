'use client'

import KafoolIntro from './KafoolIntro'

// Renders the logo intro loader and, when it finishes (or is skipped), fires a
// window event that ChromeRuntime listens for to release the gated hero reveals.
// KafoolIntro removes itself after its own exit animation.
export default function IntroGate() {
  return <KafoolIntro onDone={() => { try { window.dispatchEvent(new Event('kf:ready')) } catch { /* ignore */ } }} />
}
