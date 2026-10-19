'use client'

import { useEffect } from 'react'
import gsap from 'gsap'

// Hero background photos (extracted from the reference) — crossfade every 5.5s.
const HERO_IMGS = ['/marketing/hero-1.jpg', '/marketing/hero-2.jpg', '/marketing/hero-3.jpg']
const FOCUS = ['32% 50%', '29% 52%', '52% 18%']
const BANNERS: Record<string, string> = { einav: '/marketing/einav.jpg', skaya: '/marketing/skaya.jpg', ogen: '/marketing/ogen.jpg' }

type Pt = { x: number; y: number; cx: number; cy: number; r?: number }

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

    // ---------- pain → order: autoplay, every message big first ----------
    {
      const sec = document.getElementById('pain')
      const stage = document.getElementById('pain-stage')
      const panel = document.getElementById('pain-panel')
      const big = document.getElementById('pain-big')
      if (sec && stage && panel && big) {
        const bT = big.querySelector('b') as HTMLElement
        const bS = big.querySelector('span') as HTMLElement
        const cards = [...document.querySelectorAll<HTMLElement>('#pain-cards .pc')]
        const nEl = document.getElementById('pain-n') as HTMLElement
        const lEl = document.getElementById('pain-l') as HTMLElement
        const endEl = document.getElementById('pain-end') as HTMLElement
        const CHD = [[.30, .16, -9], [.72, .10, 7], [.18, .46, 6], [.78, .42, -8], [.34, .80, 8], [.70, .78, -5]]
        const CHM = [[.40, .08, -6], [.60, .25, 5], [.38, .42, -4], [.62, .59, 6], [.40, .76, -5], [.60, .93, 4]]
        const TIT = cards.map(c => c.querySelector('.pc-t b')?.textContent || '')
        const PRO = cards.map(c => (c.querySelector('.pc-s .a')?.textContent || '').trim())
        const g = gsap
        const setCount = (left: number) => { nEl.textContent = String(left); lEl.textContent = left === 0 ? 'כאבי ראש. הכל בטיפול.' : (left === 1 ? 'כאב ראש פתוח' : 'כאבי ראש פתוחים') }

        function geo() {
          const W = stage!.clientWidth, H = stage!.clientHeight, sr = stage!.getBoundingClientRect(), mob = innerWidth < 1024
          const pw = panel!.offsetWidth, ph = panel!.offsetHeight, pl = (W - pw) / 2, pt = (H - ph) / 2
          const hd = mob ? 56 : 64, cH = cards[0].offsetHeight, avail = ph - hd - 16, rowH = Math.min(cH + 12, avail / cards.length), top0 = pt + hd + (avail - rowH * cards.length) / 2, CH = mob ? CHM : CHD
          const chaos: Pt[] = [], row: Pt[] = []
          cards.forEach((c, i) => {
            const cw = c.offsetWidth, chh = c.offsetHeight
            const x = Math.max(6, Math.min(W - cw - 6, CH[i][0] * W - cw / 2)), y = Math.max(4, Math.min(H - chh - 4, CH[i][1] * H - chh / 2))
            chaos.push({ x, y, r: CH[i][2], cx: x + cw / 2, cy: y + chh / 2 })
            const ox = pl + (pw - cw) / 2, oy = top0 + i * rowH + (rowH - chh) / 2
            row.push({ x: ox, y: oy, cx: ox + cw / 2, cy: oy + chh / 2 })
          })
          const er = endEl.getBoundingClientRect()
          return { W, H, chaos, row, end: { cx: er.left + er.width / 2 - sr.left, cy: er.top + er.height / 2 - sr.top } }
        }
        const reset = () => {
          cards.forEach(c => c.classList.remove('solved', 'chaos')); sec!.classList.remove('done'); setCount(0)
          g.set(cards, { opacity: 0, x: 0, y: 0, rotation: 0, scale: 1 }); g.set(panel!, { opacity: 0, scale: .92 }); g.set(big!, { opacity: 0 })
        }
        const finalState = () => {
          const G = geo(); cards.forEach((c, i) => { c.classList.add('solved'); c.style.opacity = '1'; c.style.transform = `translate(${G.row[i].x}px,${G.row[i].y}px)` })
          panel!.style.opacity = '1'; panel!.style.transform = 'none'; setCount(0); sec!.classList.add('done')
        }

        if (reduce) {
          finalState(); addEventListener('resize', finalState)
          cleanups.push(() => removeEventListener('resize', finalState))
        } else {
          const say = (cls: string, t: string, sub: string, html?: boolean) => () => { big!.className = 'pain-big ' + cls; if (html) bT.innerHTML = t; else bT.textContent = t; bS.textContent = sub }
          const veil = document.getElementById('pain-veil') as HTMLElement
          let cur: ReturnType<typeof g.timeline> | null = null
          let vis = false
          function build() {
            reset(); g.set(veil, { opacity: 0 }); const G = geo()
            const tl = g.timeline({ paused: true, onComplete: () => { tl.kill(); cur = build(); if (vis) cur.play() } })
            const pop = (t: number) => { tl.to(veil, { opacity: 1, duration: .15, ease: 'none' }, t); tl.fromTo(big!, { opacity: 0, scale: 1.25, x: 0, y: 0 }, { opacity: 1, scale: 1, duration: .26, ease: 'expo.out' }, t) }
            const shrinkTo = (t: number, P: { cx: number; cy: number }, d?: number, sc?: number) => {
              d = d || .32; tl.to(veil, { opacity: 0, duration: d * .7, ease: 'power1.in' }, t)
              tl.to(big!, { x: P.cx - G.W / 2, y: P.cy - G.H / 2, scale: sc || .2, duration: d, ease: 'power3.in' }, t); tl.to(big!, { opacity: 0, duration: .08, ease: 'none' }, t + d - .06)
            }
            let t = .2
            cards.forEach((c, i) => {
              const R = G.row[i]
              tl.call(say('p', TIT[i], PRO[i]), undefined, t); pop(t)
              shrinkTo(t + .44, R)
              tl.set(c, { x: R.x, y: R.y, rotation: 0 }, t)
              tl.fromTo(c, { opacity: 0, scale: .8 }, { opacity: 1, scale: 1, duration: .32, ease: 'back.out(2.4)' }, t + .72)
              tl.call(() => setCount(i + 1), undefined, t + .74)
              t += .8
            })
            tl.to(panel!, { opacity: 1, scale: 1, duration: .5, ease: 'expo.out' }, t + .1)
            cards.forEach((c, i) => tl.call(() => { c.classList.add('solved'); setCount(cards.length - 1 - i) }, undefined, t + .35 + i * .15))
            t += .35 + cards.length * .15 + .3
            tl.call(say('e', 'הכל <em>במקום אחד!</em>', '', true), undefined, t); pop(t)
            shrinkTo(t + .85, G.end, .36, Math.min(1, parseFloat(getComputedStyle(endEl).fontSize) / (parseFloat(getComputedStyle(bT).fontSize) || 1)))
            tl.call(() => sec!.classList.add('done'), undefined, t + 1.18)
            t += 1.3
            tl.to([cards, panel!], { opacity: 0, duration: .5, ease: 'power2.in' }, t + 3)
            tl.to(endEl, { opacity: 0, duration: .4 }, t + 3).set(endEl, { clearProps: 'opacity' }, t + 3.6)
            tl.to({}, { duration: .1 }, t + 3.6)
            return tl
          }
          const pio = new IntersectionObserver(es => { vis = es[0].isIntersecting; if (!cur && vis) cur = build(); if (cur) vis ? cur.play() : cur.pause() }, { threshold: .35 })
          pio.observe(sec)
          let rz: ReturnType<typeof setTimeout>
          const onResize = () => { clearTimeout(rz); rz = setTimeout(() => { if (cur) { cur.kill(); cur = build(); if (vis) cur.play() } }, 250) }
          addEventListener('resize', onResize)
          cleanups.push(() => { pio.disconnect(); removeEventListener('resize', onResize); cur?.kill() })
        }
      }
    }

    return () => cleanups.forEach(fn => fn())
  }, [])

  return null
}
