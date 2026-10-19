'use client'

import { useEffect } from 'react'
import gsap from 'gsap'
import { stopScroll, startScroll } from '../_lib/scrollLock'

type Feat = { t: string; d: string; pts: string[]; demo: string }

export default function FeaturesRuntime() {
  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const g = gsap
    const mq = document.getElementById('wa') as HTMLElement
    const fx = document.getElementById('fx') as HTMLElement
    const P = document.getElementById('fx-p') as HTMLElement
    const demo = document.getElementById('fx-demo') as HTMLElement
    const txt = document.getElementById('fx-txt') as HTMLElement
    const grab = document.getElementById('fx-grab') as HTMLElement
    if (!mq || !fx || !P || !demo || !txt || !grab) return
    const scrim = fx.querySelector('.fx-scrim') as HTMLElement
    const ICS = [...mq.querySelectorAll('.mq-c')].slice(0, 3).map(c => (c.querySelector('.mq-ic') as HTMLElement).outerHTML)

    const F: Feat[] = [
      { t: 'חיבור הפלטפורמה לוואטסאפ האישי', d: 'מחברים פעם אחת את הוואטסאפ של המוסד, וכפול שולח את ההודעות הנכונות בזמן הנכון, לבד.',
        pts: ['תודה אישית לכל תורם ברגע שהתרומה מאושרת', 'תזכורת עדינה למי שעצר באמצע התרומה', 'עדכון לכל שגריר עם הקישור האישי שלו', 'נשלח מהוואטסאפ שלכם, לא ממספר זר'],
        demo: `<span class="fx-lbl">LIVE · וואטסאפ</span><div class="d-chat" id="d0"></div>` },
      { t: 'מעקב אחרי תרומות שננטשו', d: 'רואים בזמן אמת מי התחיל לתרום ולא סיים, באיזה שלב עצר, ומחזירים אותו בלי לרדוף.',
        pts: ['כל תרומה שהתחילה ולא הושלמה מופיעה ברשימה', 'רואים באיזה שלב התורם עצר ובאיזה סכום', 'תזכורת אוטומטית עם קישור ישר לתשלום', 'התראה למנהל הקמפיין על כל נטישה'],
        demo: `<span class="fx-lbl">LIVE · תרומות</span><div class="d-fn"><span class="d-fl" id="d1l"></span>${['נכנס לדף', 'בחר סכום', 'עצר בתשלום', 'קיבל תזכורת', 'השלים'].map((x, i) => `<span class="d-st" data-s="${i}"><i>${i + 1}</i>${x}</span>`).join('')}</div>
      <div class="d-rows">${[['משה ל.', '₪360 · עצר בתשלום', '#9AA6E8'], ['רחל כ.', '₪180 · עצרה בפרטים', '#F2C46D'], ['דוד מ.', '₪1,800 · עצר בתשלום', '#8FD3B6']].map(r => `<div class="d-row"><span class="av" style="background:${r[2]}"></span><span class="nm">${r[0]}<small>${r[1]}</small></span><span class="chip r">ננטש</span></div>`).join('')}</div>` },
      { t: 'סנכרון אנשי קשר ושיחות התרמה', d: 'פלטפורמה ייחודית שמסנכרנת את אנשי הקשר שלכם ומנהלת את שיחות ההתרמה בצורה מסודרת ועקבית.',
        pts: ['סנכרון אנשי קשר מהטלפון או מקובץ', 'רשימת חיוג מסודרת לכל מתרים', 'סטטוס לכל שיחה: לא ענה, לחזור, התחייב', 'מעקב עקבי עד שההתחייבות נסלקת'],
        demo: `<span class="fx-lbl">LIVE · שיחות</span><div class="d-sync"><span>אנשי קשר סונכרנו</span><b id="d2n">0</b></div><div class="d-bar"><i id="d2b"></i></div>
      <div class="d-rows">${[['אברהם ש.', '050-•••-1182', '#9AA6E8'], ['שרה ג.', '052-•••-4410', '#F2C46D'], ['יוסף ב.', '054-•••-7731', '#8FD3B6'], ['לאה פ.', '053-•••-2095', '#F5A3B5']].map(r => `<div class="d-row"><span class="av" style="background:${r[2]}"></span><span class="nm">${r[0]}<small>${r[1]}</small></span><span class="chip y">לחייג</span></div>`).join('')}</div>` },
    ]
    const mob = () => innerWidth < 768
    let open = -1
    let card: HTMLElement | null = null
    let dtl: ReturnType<typeof g.timeline> | null = null
    let ot: ReturnType<typeof g.timeline> | null = null
    let lastFocus: HTMLElement | null = null

    function runDemo(i: number) {
      dtl && dtl.kill()
      if (reduce) return
      const tl = g.timeline({ repeat: -1, repeatDelay: 1.2 }); dtl = tl
      if (i === 0) {
        const box = document.getElementById('d0') as HTMLElement
        const Sg: string[][] = [['ev', 'תרומה התקבלה · יוסף כ. · ₪180'], ['b', 'יוסף, תודה ענקית! התרומה שלך בונה את הבית. הקבלה כבר במייל.'], ['ev r', 'משה ל. עצר בדף התשלום'], ['b', 'משה, ראינו שלא הספקת לסיים. הקישור שמור לך כאן ←'], ['ev', 'שגריר: מנחם הגיע ל-80% מהיעד'], ['b', 'מנחם, עוד ₪1,200 ואתה ביעד! הקישור שלך מוכן לשליחה.']]
        tl.call(() => { box.innerHTML = '' }, undefined, 0)
        Sg.forEach((m, k) => {
          const t = .3 + k * 1.05
          tl.call(() => {
            const d = document.createElement('div'); d.className = m[0] === 'b' ? 'd-b' : 'd-' + m[0]; d.textContent = m[1]
            if (m[0] === 'b') { const sm = document.createElement('small'); sm.textContent = 'נשלח אוטומטית ✓✓'; d.append(sm) }
            box.append(d); if (box.children.length > 4) box.firstElementChild?.remove()
            g.fromTo(d, { opacity: 0, y: 14, scale: .96 }, { opacity: 1, y: 0, scale: 1, duration: .45, ease: 'expo.out' })
          }, undefined, t)
        })
        tl.to({}, { duration: 1 }, 6.6)
      }
      if (i === 1) {
        const st = [...demo.querySelectorAll('.d-st')] as HTMLElement[], line = document.getElementById('d1l') as HTMLElement, chips = [...demo.querySelectorAll('.chip')] as HTMLElement[]
        tl.call(() => { st.forEach(x => (x.className = 'd-st')); chips.forEach(c => { c.className = 'chip r'; c.textContent = 'ננטש' }) }, undefined, 0)
        tl.fromTo(line, { width: '0%' }, { width: '40%', duration: 1, ease: 'power2.inOut' }, .2)
        ;[0, 1].forEach(k => tl.call(() => st[k].classList.add('on'), undefined, .2 + k * .5))
        tl.call(() => st[2].classList.add('bad'), undefined, 1.2)
        tl.fromTo(st[2], { scale: 1 }, { scale: 1.12, duration: .18, yoyo: true, repeat: 3, ease: 'power1.inOut' }, 1.2)
        tl.to(line, { width: '60%', duration: .6, ease: 'power2.inOut' }, 2.1)
        tl.call(() => { st[3].classList.add('on') }, undefined, 2.6)
        chips.forEach((c, k) => tl.call(() => { c.className = 'chip y'; c.textContent = 'תזכורת נשלחה' }, undefined, 2.7 + k * .18))
        tl.to(line, { width: '80%', duration: .6, ease: 'power2.inOut' }, 3.4)
        tl.call(() => { st[2].className = 'd-st on'; st[4].classList.add('on') }, undefined, 4)
        chips.forEach((c, k) => tl.call(() => { if (k === 1) return; c.className = 'chip g'; c.textContent = 'הושלם ✓' }, undefined, 4.1 + k * .25))
        tl.to({}, { duration: 1.4 }, 4.8)
      }
      if (i === 2) {
        const n = document.getElementById('d2n') as HTMLElement, b = document.getElementById('d2b') as HTMLElement, rows = [...demo.querySelectorAll('.d-row')] as HTMLElement[], chips = rows.map(r => r.querySelector('.chip') as HTMLElement)
        const o = { v: 0 }
        tl.call(() => { chips.forEach(c => { c.className = 'chip y'; c.textContent = 'לחייג' }) }, undefined, 0)
        tl.set(rows, { opacity: 0, y: 10 }, 0)
        tl.fromTo(o, { v: 0 }, { v: 1248, duration: 1.6, ease: 'power2.out', onUpdate: () => (n.textContent = Math.round(o.v).toLocaleString('en-US')) }, .2)
        tl.fromTo(b, { scaleX: 0 }, { scaleX: 1, duration: 1.6, ease: 'power2.out' }, .2)
        tl.to(rows, { opacity: 1, y: 0, duration: .45, stagger: .12, ease: 'expo.out' }, 1.1)
        const seq: (string | number)[][] = [[0, 'b', 'בשיחה…'], [0, 'g', 'התחייב ₪360 ✓'], [1, 'r', 'לא ענתה'], [2, 'b', 'בשיחה…'], [2, 'y', 'לחזור מחר 18:00'], [3, 'g', 'התחייבה ₪180 ✓']]
        seq.forEach((q, k) => tl.call(() => { const c = chips[q[0] as number]; c.className = 'chip ' + (q[1] === 'b' ? 'y' : q[1]); c.textContent = q[2] as string; g.fromTo(c, { scale: .85 }, { scale: 1, duration: .35, ease: 'back.out(2.5)' }) }, undefined, 2 + k * .55))
        tl.to({}, { duration: 1.4 }, 5.4)
      }
    }
    function fill(i: number) {
      const f = F[i]
      demo.innerHTML = f.demo
      txt.innerHTML = `${ICS[i]}<h3 id="fx-t"></h3><p></p><ul class="fx-pts">${f.pts.map(() => '<li></li>').join('')}</ul><button type="button" class="pill solid fx-cta" data-modal>אני רוצה את זה בקמפיין שלי</button>`
      ;(txt.querySelector('h3') as HTMLElement).textContent = f.t;(txt.querySelector('p') as HTMLElement).textContent = f.d
      txt.querySelectorAll('.fx-pts li').forEach((li, k) => ((li as HTMLElement).textContent = f.pts[k]))
      txt.querySelector('[data-modal]')?.addEventListener('click', () => close())
    }
    function openFx(i: number, el: HTMLElement) {
      if (open !== -1) return
      open = i; card = el; lastFocus = document.activeElement as HTMLElement
      mq!.classList.add('paused'); fill(i); fx!.hidden = false; stopScroll()
      ot && ot.kill(); g.killTweensOf([P, scrim])
      const body = [demo, txt]
      ot = g.timeline()
      ot.fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: .35, ease: 'power1.out' }, 0)
      if (mob() || reduce) {
        ot.fromTo(P!, { yPercent: reduce ? 0 : 100, opacity: reduce ? 0 : 1 }, { yPercent: 0, opacity: 1, duration: reduce ? .2 : .55, ease: 'expo.out' }, 0)
        ot.fromTo(body, { opacity: 0 }, { opacity: 1, duration: .3, stagger: .06 }, .12)
      } else {
        const a = el.getBoundingClientRect(), b = P!.getBoundingClientRect()
        ot.fromTo(P!, { x: a.left - b.left, y: a.top - b.top, scaleX: a.width / b.width, scaleY: a.height / b.height }, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: .6, ease: 'expo.out' }, 0)
        ot.fromTo(body, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .4, stagger: .07, ease: 'expo.out' }, .2)
      }
      runDemo(i)
      setTimeout(() => (fx!.querySelector('.fx-x') as HTMLElement)?.focus({ preventScroll: true }), 60)
    }
    function close(v?: number) {
      if (open === -1) return
      const el = card as HTMLElement; open = -1; dtl && dtl.kill(); ot && ot.kill()
      const done = () => { fx!.hidden = true; g.set(P!, { clearProps: 'transform,opacity' }); mq!.classList.remove('paused'); startScroll(); lastFocus?.focus?.({ preventScroll: true }) }
      ot = g.timeline({ onComplete: done })
      ot.to(scrim, { opacity: 0, duration: .3, ease: 'power1.in' }, 0)
      if (mob() || reduce) {
        ot.to(P!, { yPercent: reduce ? 0 : 100, opacity: reduce ? 0 : 1, duration: reduce ? .2 : Math.max(.22, .42 - (v || 0) / 6000), ease: 'power3.in' }, 0)
      } else {
        ot.to([demo, txt], { opacity: 0, duration: .12 }, 0)
        const a = el.getBoundingClientRect(), b = P!.getBoundingClientRect(), cx = Number(g.getProperty(P, 'x')), cy = Number(g.getProperty(P, 'y'))
        ot.to(P!, { x: cx + a.left - b.left, y: cy + a.top - b.top, scaleX: a.width / (b.width / Number(g.getProperty(P, 'scaleX'))), scaleY: a.height / (b.height / Number(g.getProperty(P, 'scaleY'))), duration: .45, ease: 'expo.inOut' }, 0)
        ot.to(P!, { opacity: 0, duration: .12 }, .33)
      }
    }
    const onMqClick = (e: MouseEvent) => { const c = (e.target as HTMLElement).closest('.mq-c') as HTMLElement | null; if (!c) return; const idx = [...mq.querySelectorAll('.mq-c')].indexOf(c) % 3; openFx(idx, c) }
    const onMqKey = (e: KeyboardEvent) => { if ((e.key === 'Enter' || e.key === ' ') && (e.target as HTMLElement).classList.contains('mq-c')) { e.preventDefault(); (e.target as HTMLElement).click() } }
    mq.addEventListener('click', onMqClick)
    mq.addEventListener('keydown', onMqKey)
    fx.querySelectorAll('[data-fx-close]').forEach(b => b.addEventListener('click', () => close()))
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    addEventListener('keydown', onEsc)

    // phones: drag the sheet down to close
    type Drag = { y0: number; h: [number, number][]; H: number } | null
    let drag: Drag = null
    const rb = (o: number, d: number) => (o * d * .55) / (d + .55 * Math.abs(o))
    const proj = (v: number) => (v / 1000) * .998 / (1 - .998)
    const down = (e: PointerEvent) => { if (!mob() || open === -1) return; drag = { y0: e.clientY, h: [[e.clientY, performance.now()]], H: P.offsetHeight }; ot && ot.kill(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) }
    const move = (e: PointerEvent) => { if (!drag) return; const dy = e.clientY - drag.y0; drag.h.push([e.clientY, performance.now()]); if (drag.h.length > 6) drag.h.shift(); g.set(P, { y: dy > 0 ? dy : -rb(-dy, drag.H) }) }
    const up = () => {
      if (!drag) return
      const h = drag.h, a = h[0], b = h[h.length - 1], v = (b[0] - a[0]) / Math.max(1, (b[1] - a[1])) * 1000, y = Number(g.getProperty(P, 'y')); const H = drag.H; drag = null
      if (y + proj(v) > H * .4) { g.to(P, { y: H, duration: Math.max(.18, .38 - v / 8000), ease: 'power2.out' }); g.to(scrim, { opacity: 0, duration: .3 }); open = -1; dtl && dtl.kill(); setTimeout(() => { fx.hidden = true; g.set(P, { clearProps: 'transform,opacity' }); mq.classList.remove('paused'); startScroll() }, 380) }
      else g.to(P, { y: 0, duration: .5, ease: 'expo.out' })
    }
    ;[grab, demo].forEach(el => { el.addEventListener('pointerdown', down as EventListener); el.addEventListener('pointermove', move as EventListener); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up) })

    return () => {
      mq.removeEventListener('click', onMqClick); mq.removeEventListener('keydown', onMqKey)
      removeEventListener('keydown', onEsc); dtl?.kill(); ot?.kill()
    }
  }, [])

  return null
}
