'use client'

import { useEffect } from 'react'

// Ported from the prototype's componentDidMount: scroll-reveals, the count-up
// numbers and the timeline fill. Runs against the rendered .kp DOM. Everything
// is progressive — the content is fully visible even if this never runs
// (reduced-motion / JS off): .rv starts hidden only once .anim-ready is added.
//
// Kept off the scroll path on purpose: reveals use IntersectionObserver, and the
// timeline is updated at most once per frame, reading all positions before
// writing anything (no forced layouts while scrolling).
export default function ServicesRuntime() {
  useEffect(() => {
    const root = document.querySelector('.kp') as HTMLElement | null
    if (!root) return
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    const runCount = (el: Element) => {
      const node = el.firstChild
      if (!node || node.nodeValue == null) return
      const original = node.nodeValue
      const match = original.match(/[\d,]+/)
      if (!match) return
      const target = parseInt(match[0].replace(/,/g, ''), 10)
      const from = parseInt((el as HTMLElement).getAttribute('data-from') || '0', 10)
      const started = performance.now()
      const duration = 1100
      const tick = (now: number) => {
        const p = Math.min((now - started) / duration, 1)
        const eased = 1 - Math.pow(1 - p, 3)
        const value = Math.round(from + (target - from) * eased)
        node.nodeValue = p < 1 ? original.replace(match[0], value.toLocaleString('en-US')) : original
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }

    root.classList.add('anim-ready')

    // Scroll reveals. Regular items come in a bit before they reach the screen;
    // "late" ones (the system cards) only once they're well inside it.
    const reveal = (entries: IntersectionObserverEntry[], obs: IntersectionObserver) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        e.target.classList.add('in')
        e.target.querySelectorAll('.count').forEach((c) => runCount(c))
        obs.unobserve(e.target)
      }
    }
    const early = new IntersectionObserver(reveal, { rootMargin: '0px 0px 15% 0px' })
    const late = new IntersectionObserver(reveal, { rootMargin: '0px 0px -12% 0px' })
    root.querySelectorAll<HTMLElement>('.rv').forEach((el) => (el.classList.contains('late') ? late : early).observe(el))

    // Timeline: a line that fills as you scroll past the steps.
    const steps = Array.from(root.querySelectorAll<HTMLElement>('.tl'))
    const track = root.querySelector('.tl-track') as HTMLElement | null
    const fill = root.querySelector('.tl-fill') as HTMLElement | null
    const wrap = root.querySelector('.tl-wrap') as HTMLElement | null
    let near = false
    let frame = 0
    let lastSpan = -1
    const updateTimeline = () => {
      frame = 0
      if (!steps.length || !track || !fill) return
      // read
      const marker = Math.min(window.innerHeight * 0.62, 620)
      const tops = steps.map((s) => s.getBoundingClientRect().top + 16)
      const span = Math.max(tops[tops.length - 1] - tops[0], 1)
      const progress = Math.max(0, Math.min((marker - tops[0]) / span, 1))
      // write
      if (Math.abs(span - lastSpan) > 0.5) {
        track.style.bottom = 'auto'
        track.style.height = span + 'px'
        lastSpan = span
      }
      fill.style.transform = 'scaleY(' + progress + ')'
      steps.forEach((s, i) => s.classList.toggle('reached', tops[i] <= marker))
    }
    const schedule = () => { if (near && !frame) frame = requestAnimationFrame(updateTimeline) }
    const nearObs = wrap
      ? new IntersectionObserver(([e]) => { near = e.isIntersecting; if (near) schedule() }, { rootMargin: '50% 0px 50% 0px' })
      : null
    if (wrap && nearObs) nearObs.observe(wrap)
    updateTimeline()

    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
    return () => {
      early.disconnect(); late.disconnect(); nearObs?.disconnect()
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])

  return null
}
