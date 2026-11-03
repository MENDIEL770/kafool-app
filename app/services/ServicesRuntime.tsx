'use client'

import { useEffect } from 'react'

// Ported from the prototype's componentDidMount: scroll-reveals, the count-up
// numbers, the timeline fill, and the active nav link. Runs against the rendered
// .kp DOM. Everything is progressive — the content is fully visible even if this
// never runs (reduced-motion / JS off): .rv starts hidden only once .anim-ready
// is added here.
export default function ServicesRuntime() {
  useEffect(() => {
    const root = document.querySelector('.kp') as HTMLElement | null
    if (!root) return
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

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

    const update = () => {
      if (!reduce) {
        root.classList.add('anim-ready')
        const limit = window.innerHeight * 1.15
        root.querySelectorAll<HTMLElement>('.rv:not(.in)').forEach((el) => {
          const reach = el.classList.contains('late') ? window.innerHeight * 0.88 : limit
          if (el.getBoundingClientRect().top < reach) {
            el.classList.add('in')
            el.querySelectorAll('.count').forEach((c) => runCount(c))
          }
        })
      }
      const steps = root.querySelectorAll<HTMLElement>('.tl')
      const track = root.querySelector('.tl-track') as HTMLElement | null
      const fill = root.querySelector('.tl-fill') as HTMLElement | null
      if (!reduce && steps.length && track && fill) {
        const marker = Math.min(window.innerHeight * 0.62, 620)
        const first = steps[0].getBoundingClientRect().top + 16
        const last = steps[steps.length - 1].getBoundingClientRect().top + 16
        const span = Math.max(last - first, 1)
        track.style.bottom = 'auto'
        track.style.height = span + 'px'
        const progress = Math.max(0, Math.min((marker - first) / span, 1))
        fill.style.transform = 'scaleY(' + progress + ')'
        steps.forEach((step) => step.classList.toggle('reached', step.getBoundingClientRect().top + 16 <= marker))
      }
      const line = Math.min(window.innerHeight * 0.4, 320)
      let current = ''
      root.querySelectorAll<HTMLElement>('section[id]').forEach((s) => { if (s.getBoundingClientRect().top <= line) current = s.id })
      root.querySelectorAll<HTMLAnchorElement>('.nav-link').forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + current))
    }

    update()
    const timer = setInterval(update, 150)
    window.addEventListener('scroll', update, { passive: true, capture: true })
    return () => { clearInterval(timer); window.removeEventListener('scroll', update, { capture: true } as EventListenerOptions) }
  }, [])

  return null
}
