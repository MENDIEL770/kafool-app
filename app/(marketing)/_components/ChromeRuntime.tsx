'use client'

import { useEffect } from 'react'
import { stopScroll, startScroll } from '../_lib/scrollLock'

// Ported from the reference's vanilla script: scroll-reveals, the intro gate,
// menu + contact modal, the sticky bar, and smooth in-page scrolling. Runs once
// against the rendered DOM (the markup uses the same ids/classes as the baseline).
export default function ChromeRuntime() {
  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const root = document.documentElement
    try { history.scrollRestoration = 'manual' } catch { /* ignore */ }

    // Fluid root font-size: cap it on very wide screens (CSS media queries handle the rest).
    const grid = () => {
      const W = 1920, c = 0.6666, w = innerWidth
      const r = ((W - w) / W) * 100 * c, sz = 16 - (16 * r) / 100
      if (sz > 16) root.style.fontSize = sz + 'px'; else root.style.removeProperty('font-size')
    }
    grid(); addEventListener('resize', grid)

    const go = (hash: string) => { const el = hash && document.querySelector(hash); if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }) }

    // reveals
    let ready = false
    document.querySelectorAll<HTMLElement>('[data-wf]').forEach(p => {
      let i = 0
      p.innerHTML = (p.textContent || '').trim().split(/\s+/).map(w => `<span class="w" style="--i:${i++}">${w}</span>`).join(' ')
    })
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return
      const el = e.target as HTMLElement
      if (el.hasAttribute('data-gate') && !ready) return
      el.classList.add('on'); io.unobserve(el)
    }), { threshold: 0.15, rootMargin: '0px 0px -6% 0px' })
    document.querySelectorAll('[data-iv],[data-rv],[data-wf],[data-gate]').forEach(el => io.observe(el))
    const releaseGate = () => document.querySelectorAll('[data-gate]').forEach(el => el.classList.add('on'))

    // The intro loader (KafoolIntro) fires this when it finishes / is skipped.
    const onReady = () => { if (ready) return; ready = true; releaseGate() }
    window.addEventListener('kf:ready', onReady)

    // ---- menu & modal ----
    const menu = document.getElementById('menu')
    const burger = document.getElementById('burger')
    const md = document.getElementById('md')
    const bar = document.getElementById('bar')
    let lastF: HTMLElement | null = null

    const openMenu = () => {
      if (!menu) return
      lastF = document.activeElement as HTMLElement
      menu.removeAttribute('inert'); menu.setAttribute('aria-hidden', 'false'); menu.classList.add('open')
      burger?.setAttribute('aria-expanded', 'true'); stopScroll()
      setTimeout(() => (menu.querySelector('.xbtn') as HTMLElement)?.focus(), 100)
    }
    const closeMenu = () => {
      if (!menu || !menu.classList.contains('open')) return
      menu.classList.remove('open'); menu.setAttribute('inert', ''); menu.setAttribute('aria-hidden', 'true')
      burger?.setAttribute('aria-expanded', 'false'); startScroll(); lastF?.focus?.({ preventScroll: true })
    }
    const openMd = () => {
      if (!md) return
      lastF = document.activeElement as HTMLElement
      md.removeAttribute('inert'); md.setAttribute('aria-hidden', 'false'); md.classList.add('open')
      md.querySelector('.lines')?.classList.add('on'); stopScroll()
      setTimeout(() => document.getElementById('md-name')?.focus({ preventScroll: true }), 120)
    }
    const closeMd = () => {
      if (!md || !md.classList.contains('open')) return
      md.classList.remove('open'); md.setAttribute('inert', ''); md.setAttribute('aria-hidden', 'true'); startScroll()
      setTimeout(() => {
        md.classList.remove('done');
        (document.getElementById('md-f') as HTMLFormElement | null)?.reset()
        const b = document.getElementById('md-sub') as HTMLButtonElement | null
        if (b) { b.disabled = false; b.textContent = 'שליחה' }
        md.querySelector('.lines')?.classList.remove('on')
      }, 350)
      lastF?.focus?.({ preventScroll: true })
    }

    if (burger) burger.onclick = openMenu
    document.querySelectorAll<HTMLElement>('[data-burger]').forEach(b => (b.onclick = openMenu))
    menu?.querySelectorAll<HTMLElement>('[data-close]').forEach(b => (b.onclick = closeMenu))
    md?.querySelectorAll<HTMLElement>('[data-mclose]').forEach(b => (b.onclick = closeMd))

    // Home: the bar appears once the hero is scrolled past. Inner pages have no
    // .hero (their pg-hero leaves top room for it), so the bar stays fixed on top.
    const hero = document.querySelector('.hero')
    let barIo: IntersectionObserver | null = null
    if (bar && hero) {
      barIo = new IntersectionObserver(es => {
        const show = !es[0].isIntersecting && ready
        bar.classList.toggle('show', show)
        show ? bar.removeAttribute('inert') : bar.setAttribute('inert', '')
        bar.setAttribute('aria-hidden', String(!show))
      }, { rootMargin: '-80px 0px 0px 0px' })
      barIo.observe(hero)
    } else if (bar) {
      bar.classList.add('show'); bar.removeAttribute('inert'); bar.setAttribute('aria-hidden', 'false')
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (md?.classList.contains('open')) closeMd(); else closeMenu()
    }
    addEventListener('keydown', onKey)

    const onDocClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      const m = t.closest('[data-modal]')
      if (m) { e.preventDefault(); const inMenu = !!menu?.contains(m); if (inMenu) closeMenu(); setTimeout(openMd, inMenu ? 300 : 0); return }
      const g = t.closest('[data-go]') as HTMLAnchorElement | null
      const href = g?.getAttribute('href')
      if (g && href?.startsWith('#')) {
        e.preventDefault(); const inMenu = !!menu?.contains(g); if (inMenu) closeMenu()
        setTimeout(() => {
          // Target on this page → smooth-scroll; otherwise (inner pages) go home.
          if (document.querySelector(href)) go(href)
          else location.href = '/' + (href === '#top' ? '' : href)
        }, inMenu ? 320 : 0)
      }
    }
    document.addEventListener('click', onDocClick)

    const form = document.getElementById('md-f') as HTMLFormElement | null
    const onSubmit = async (e: Event) => {
      e.preventDefault()
      const nameEl = document.getElementById('md-name') as HTMLInputElement | null
      const name = (nameEl?.value || '').trim()
      if (!name) { nameEl?.focus(); return }
      const phone = (form?.querySelector('[name="phone"]') as HTMLInputElement | null)?.value.trim() || ''
      const msg = (form?.querySelector('[name="msg"]') as HTMLTextAreaElement | null)?.value.trim() || ''
      const b = document.getElementById('md-sub') as HTMLButtonElement | null
      if (b) { b.disabled = true; b.textContent = 'שולח…' }
      const first = name.split(' ')[0]
      const okp = document.getElementById('ok-p'); if (okp) okp.textContent = 'תודה' + (first ? ', ' + first : '') + '! נחזור אליכם בהקדם כדי לתכנן את הקמפיין.'
      // Save the lead (contact_submissions) + SMS the admin, via the existing API.
      try {
        await fetch('/api/contact', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full_name: name, phone: phone || undefined, message: msg || 'פתיחת קמפיין מדף הבית', source: 'campaign-request' }),
        })
      } catch { /* network hiccup — still thank the user */ }
      setTimeout(() => md?.classList.add('done'), 400)
    }
    form?.addEventListener('submit', onSubmit)

    return () => {
      removeEventListener('resize', grid)
      removeEventListener('keydown', onKey)
      window.removeEventListener('kf:ready', onReady)
      document.removeEventListener('click', onDocClick)
      form?.removeEventListener('submit', onSubmit)
      io.disconnect(); barIo?.disconnect()
    }
  }, [])

  return null
}
