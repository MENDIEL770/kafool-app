'use client'

import { useEffect } from 'react'

// Hero background photos (extracted from the reference) — crossfade every 5.5s.
const HERO_IMGS = ['/marketing/hero-1.jpg', '/marketing/hero-2.jpg', '/marketing/hero-3.jpg']
const FOCUS = ['32% 50%', '29% 52%', '52% 18%']

export default function HomeRuntime() {
  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    let timer: ReturnType<typeof setInterval> | undefined
    const anims: Animation[] = []

    // Hero photos: replace the fallback plate with the crossfading images.
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

    // Fallback infinity (only runs if no photos were injected above).
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

    return () => { if (timer) clearInterval(timer); anims.forEach(an => an.cancel()) }
  }, [])

  return null
}
