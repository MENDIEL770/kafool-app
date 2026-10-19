'use client'

import { useEffect } from 'react'
import gsap from 'gsap'
import { stopScroll, startScroll } from '../_lib/scrollLock'

// Runtime for the inner pages (about / design / faq / contact): .rv reveals plus
// the designs filter+lightbox, the faq accordion+search, and contact validation.
// Each page includes it; the parts whose elements are absent simply no-op.
export default function InnerRuntime() {
  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

    // reveals
    const rio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('on'); rio.unobserve(e.target) } }), { threshold: .12, rootMargin: '0px 0px -5% 0px' })
    document.querySelectorAll('.rv:not(.on)').forEach(el => { if (reduce) el.classList.add('on'); else rio.observe(el) })

    const cleanups: Array<() => void> = [() => rio.disconnect()]

    // ---------- designs: lazy images, filter, lightbox ----------
    const dsg = document.querySelector('.ds-g')
    if (dsg) {
      document.querySelectorAll<HTMLImageElement>('.ds-c img[data-src]').forEach(im => { im.loading = 'eager'; im.onload = () => im.classList.add('ld'); im.onerror = () => im.remove(); im.src = im.dataset.src || '' })
      const cards = [...document.querySelectorAll<HTMLElement>('.ds-c')]
      document.querySelectorAll<HTMLElement>('.ds-f button').forEach(b => b.addEventListener('click', () => {
        const f = b.dataset.f
        document.querySelectorAll('.ds-f button').forEach(x => x.setAttribute('aria-pressed', String(x === b)))
        const show = (c: HTMLElement) => f === 'הכל' || c.dataset.cat === f
        if (reduce) { cards.forEach(c => c.classList.toggle('out', !show(c))); return }
        gsap.to(dsg, { opacity: 0, y: 8, duration: .16, ease: 'power1.in', onComplete: () => { cards.forEach(c => c.classList.toggle('out', !show(c))); gsap.fromTo(dsg, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .45, ease: 'expo.out' }) } })
      }))
      const lb = document.getElementById('lb') as HTMLElement | null
      const lbIm = document.getElementById('lb-im') as HTMLElement | null
      if (lb && lbIm) {
        let li = -1
        const vis = () => cards.filter(c => !c.classList.contains('out'))
        const lbShow = (c: HTMLElement) => {
          li = +(c.dataset.i || 0)
          const img = c.querySelector('img'), ph = c.querySelector('.ds-ph')
          lbIm.innerHTML = ''; lbIm.append(img && img.classList.contains('ld') ? Object.assign(new window.Image(), { src: (img as HTMLImageElement).src, alt: img.alt }) : (ph as HTMLElement).cloneNode(true))
          ;(document.getElementById('lb-t') as HTMLElement).textContent = c.querySelector('.ds-cap b')?.textContent || ''
          ;(document.getElementById('lb-c') as HTMLElement).textContent = c.dataset.cat || ''
          const a = document.getElementById('lb-a') as HTMLAnchorElement, link = c.dataset.link; a.hidden = !link; if (link) a.href = 'https://www.kafool.com' + link
        }
        const lbOpen = (c: HTMLElement) => {
          lbShow(c); lb.hidden = false; stopScroll()
          if (!reduce) { gsap.fromTo(lb.querySelector('.lb-bg'), { opacity: 0 }, { opacity: 1, duration: .3 }); gsap.fromTo(lb.querySelector('.lb-p'), { opacity: 0, scale: .94, y: 16 }, { opacity: 1, scale: 1, y: 0, duration: .5, ease: 'expo.out' }) }
          ;(lb.querySelector('.lb-x') as HTMLElement).focus({ preventScroll: true })
        }
        const lbClose = () => {
          if (lb.hidden) return
          const done = () => { lb.hidden = true; startScroll() }
          if (!reduce) { gsap.to(lb.querySelector('.lb-p'), { opacity: 0, scale: .96, duration: .2, ease: 'power2.in' }); gsap.to(lb.querySelector('.lb-bg'), { opacity: 0, duration: .25, onComplete: done }) } else done()
        }
        const lbStep = (d: number) => { const v = vis(), k = v.findIndex(c => +(c.dataset.i || 0) === li); const n = v[(k + d + v.length) % v.length]; if (!n) return; lbShow(n); if (!reduce) gsap.fromTo(lbIm, { opacity: 0, x: d * -24 }, { opacity: 1, x: 0, duration: .4, ease: 'expo.out' }) }
        cards.forEach(c => c.addEventListener('click', () => lbOpen(c)))
        lb.querySelectorAll('[data-lbx]').forEach(b => b.addEventListener('click', lbClose))
        lb.querySelectorAll<HTMLElement>('[data-lbn]').forEach(b => b.addEventListener('click', () => lbStep(+(b.dataset.lbn || 0))))
        const onKey = (e: KeyboardEvent) => { if (lb.hidden) return; if (e.key === 'Escape') lbClose(); if (e.key === 'ArrowLeft') lbStep(1); if (e.key === 'ArrowRight') lbStep(-1) }
        addEventListener('keydown', onKey); cleanups.push(() => removeEventListener('keydown', onKey))
        let sx: number | null = null
        lbIm.addEventListener('pointerdown', e => { sx = e.clientX }); lbIm.addEventListener('pointerup', e => { if (sx === null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50) lbStep(dx < 0 ? 1 : -1) })
      }
    }

    // ---------- faq: accordion + live search ----------
    const items = [...document.querySelectorAll<HTMLElement>('.fq-i')]
    items.forEach(it => { const q = it.querySelector('.fq-q') as HTMLElement; q?.addEventListener('click', () => { const o = !it.classList.contains('open'); it.classList.toggle('open', o); q.setAttribute('aria-expanded', String(o)) }) })
    const fin = document.getElementById('fq-in') as HTMLInputElement | null, none = document.getElementById('fq-none')
    fin?.addEventListener('input', () => { const v = fin.value.trim(); let n = 0; items.forEach(it => { const hit = !v || (it.textContent || '').includes(v); it.classList.toggle('hide', !hit); if (hit) n++; it.classList.add('on') }); none?.classList.toggle('on', n === 0) })

    // ---------- contact: chips, inline validation, success ----------
    document.querySelectorAll<HTMLElement>('.chips button').forEach(b => b.addEventListener('click', () => b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'))))
    const form = document.getElementById('ct-form') as HTMLFormElement | null
    if (form) {
      const check = (f: HTMLElement) => {
        const inp = f.querySelector('input,textarea') as HTMLInputElement; let bad = false
        if (f.hasAttribute('data-req')) bad = !inp.value.trim()
        if (f.hasAttribute('data-em')) bad = !!inp.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inp.value.trim())
        f.classList.toggle('err', bad); inp.setAttribute('aria-invalid', String(bad)); return !bad
      }
      form.querySelectorAll<HTMLElement>('[data-req],[data-em]').forEach(f => (f.querySelector('input,textarea') as HTMLElement)?.addEventListener('blur', () => check(f)))
      form.addEventListener('submit', e => {
        e.preventDefault()
        const fs = [...form.querySelectorAll<HTMLElement>('[data-req],[data-em]')], ok = fs.map(check).every(Boolean)
        if (!ok) { (form.querySelector('.err input,.err textarea') as HTMLElement | null)?.focus(); return }
        document.getElementById('ct-f')?.classList.add('sent')
      })
    }

    return () => cleanups.forEach(fn => fn())
  }, [])

  return null
}
