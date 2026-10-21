'use client'

import { useEffect } from 'react'

// Hero background photos (extracted from the reference) — crossfade every 5.5s.
const HERO_IMGS = ['/marketing/hero-1.jpg', '/marketing/hero-2.jpg', '/marketing/hero-3.jpg']
const FOCUS = ['32% 50%', '29% 52%', '52% 18%']
const BANNERS: Record<string, string> = { einav: '/marketing/einav.jpg', skaya: '/marketing/skaya.jpg', ogen: '/marketing/ogen.jpg' }


export default function HomeRuntime() {
  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const cleanups: Array<() => void> = []

    // ---------- hero photos + fallback infinity ----------
    {
      let timer: ReturnType<typeof setInterval> | undefined
      const anims: Animation[] = []
      const pl = document.getElementById('plate')
      if (pl && HERO_IMGS.length) {
        pl.innerHTML = ''
        const ims = HERO_IMGS.map((src, i) => {
          const im = new window.Image()
          im.src = src; im.alt = ''; im.style.objectPosition = FOCUS[i] || '50% 50%'; im.decoding = 'async'
          if (i === 0) { im.setAttribute('fetchpriority', 'high'); im.className = 'on' }
          pl.append(im); return im
        })
        if (ims.length > 1 && !reduce) {
          let k = 0
          timer = setInterval(() => {
            if (document.hidden) return
            const prev = ims[k]; k = (k + 1) % ims.length; ims[k].classList.add('on')
            setTimeout(() => prev.classList.remove('on'), 1900)
          }, 5500)
        }
      }
      const a = document.getElementById('pf-run') as unknown as SVGGeometryElement | null
      const b = document.getElementById('pf-run2') as unknown as SVGGeometryElement | null
      if (a && b) {
        const len = a.getTotalLength(), seg = len * 0.14
        ;[a, b].forEach(p => ((p as unknown as SVGElement).setAttribute('style', `stroke-dasharray:${seg} ${len - seg}`)))
        if (!reduce) {
          anims.push(a.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: -len }], { duration: 11000, iterations: Infinity }))
          anims.push(b.animate([{ strokeDashoffset: -len / 2 }, { strokeDashoffset: -len * 1.5 }], { duration: 11000, iterations: Infinity }))
        }
      }
      cleanups.push(() => { if (timer) clearInterval(timer); anims.forEach(an => an.cancel()) })

      // Campaign banner images (replace the branded fallback card).
      document.querySelectorAll<HTMLElement>('[data-ban]').forEach(a => {
        const src = BANNERS[a.dataset.ban || '']
        if (!src) return
        const box = a.querySelector('.im'); if (!box) return
        box.innerHTML = ''
        const bg = new window.Image(); bg.src = src; bg.alt = ''; bg.className = 'bg'; bg.setAttribute('aria-hidden', 'true')
        const im = new window.Image(); im.src = src; im.alt = 'הבאנר של הקמפיין'; im.className = 'fg'; im.loading = 'lazy'
        box.append(bg, im)
      })
    }

    // ---------- pain → order: reveal the problems, then flip them to solved (once) ----------
    {
      const sec = document.getElementById('pain')
      const cards = [...document.querySelectorAll<HTMLElement>('#pain-cards .pc')]
      const nEl = document.getElementById('pain-n')
      const lEl = document.getElementById('pain-l')
      if (sec && cards.length && nEl && lEl) {
        const setCount = (n: number) => { nEl.textContent = String(n); lEl.textContent = n === 0 ? 'כאבי ראש. הכל בטיפול.' : (n === 1 ? 'כאב ראש פתוח' : 'כאבי ראש פתוחים') }
        if (reduce) {
          cards.forEach(c => c.classList.add('in', 'solved')); setCount(0); sec.classList.add('done')
        } else {
          const timers: ReturnType<typeof setTimeout>[] = []
          let played = false
          const play = () => {
            setCount(5)
            cards.forEach((c, i) => timers.push(setTimeout(() => c.classList.add('in'), 150 + i * 130)))
            const base = 150 + cards.length * 130 + 650
            cards.forEach((c, i) => timers.push(setTimeout(() => { c.classList.add('solved'); setCount(cards.length - 1 - i) }, base + i * 170)))
            timers.push(setTimeout(() => sec.classList.add('done'), base + cards.length * 170 + 120))
          }
          const io = new IntersectionObserver(es => { if (es[0].isIntersecting && !played) { played = true; play(); io.disconnect() } }, { threshold: .3 })
          io.observe(sec)
          cleanups.push(() => { io.disconnect(); timers.forEach(t => clearTimeout(t)) })
        }
      }
    }

    return () => cleanups.forEach(fn => fn())
  }, [])

  return null
}
