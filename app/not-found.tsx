'use client'

import { useEffect } from 'react'

const CSS = `
.kf404{
  --bg-0:#0b1224;        /* deep brand navy */
  --bg-1:#121b35;        /* lifted navy */
  --brand:#3b82f6;       /* brand blue */
  --brand-soft:#93b4f7;  /* light blue */
  --brand-deep:#1d4ed8;  /* deep blue */
  --accent:#f15e4d;      /* brand coral (infinity) */
  --ink:#eff3fb;         /* cool off-white */
  --muted:#94a1c2;       /* cool muted */
  --line:rgba(59,130,246,.20);
}
.kf404 *{box-sizing:border-box;margin:0;padding:0}
.kf404{
  position:fixed;inset:0;z-index:0;
  background:
    radial-gradient(1200px 700px at 50% -10%, rgba(59,130,246,.14), transparent 60%),
    radial-gradient(900px 600px at 50% 120%, rgba(241,94,77,.08), transparent 55%),
    linear-gradient(180deg,var(--bg-0),var(--bg-1));
  color:var(--ink);
  font-family:"Rubik",system-ui,sans-serif;
  min-height:100dvh;
  overflow:hidden;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  text-align:center;
  -webkit-user-select:none;user-select:none;
}
.kf404 .ambient{position:fixed;inset:0;pointer-events:none;z-index:0;opacity:.5}
.kf404 .ambient span{
  position:absolute;width:3px;height:3px;border-radius:50%;
  background:var(--brand);opacity:0;animation:kf-rise linear infinite;
}
@keyframes kf-rise{
  0%{transform:translateY(20px);opacity:0}
  15%{opacity:.55}
  85%{opacity:.4}
  100%{transform:translateY(-120px);opacity:0}
}
.kf404 .stage{position:relative;z-index:2;width:100%;max-width:560px;padding:24px;display:flex;flex-direction:column;align-items:center;gap:8px}
.kf404 .eyebrow{font-size:13px;letter-spacing:.22em;color:var(--brand-soft);font-weight:500;margin-bottom:6px}
.kf404 h1{font-weight:900;font-size:clamp(28px,7vw,46px);line-height:1.15;margin-bottom:6px;color:var(--ink)}
.kf404 .notexist{color:var(--brand-soft);font-size:clamp(15px,4vw,19px);font-weight:500;margin:-2px auto 8px}
.kf404 .sub{color:var(--muted);font-size:clamp(15px,3.6vw,18px);font-weight:300;max-width:30ch;margin:0 auto 4px}
.kf404 .hint{color:var(--brand-soft);font-size:14px;font-weight:400;opacity:.85;margin-top:2px;transition:opacity .4s}
.kf404 .play{position:relative;width:100%;height:360px;margin-top:10px;display:flex;align-items:flex-start;justify-content:center}
.kf404 .coin-wrap{position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:5;touch-action:none;cursor:grab}
.kf404 .coin-wrap.grabbing{cursor:grabbing}
.kf404 .coin{
  width:88px;height:88px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  background:radial-gradient(circle at 32% 28%, var(--brand-soft), var(--brand) 45%, var(--brand-deep) 100%);
  box-shadow:0 8px 26px rgba(0,0,0,.45),inset 0 2px 6px rgba(255,255,255,.45),inset 0 -6px 12px rgba(13,30,75,.55);
  position:relative;animation:kf-bob 2.6s ease-in-out infinite;
}
.kf404 .coin::after{content:"";position:absolute;inset:7px;border-radius:50%;border:2px solid rgba(255,255,255,.4)}
.kf404 .coin .mark{font-weight:900;font-size:34px;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.3)}
@keyframes kf-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
.kf404 .coin-wrap.dropping{animation:none}
.kf404 .coin-glow{position:absolute;inset:-18px;border-radius:50%;background:radial-gradient(circle,rgba(59,130,246,.5),transparent 65%);filter:blur(8px);z-index:-1;animation:kf-pulse 2.6s ease-in-out infinite}
@keyframes kf-pulse{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:.85;transform:scale(1.08)}}
.kf404 .box{position:absolute;bottom:6px;left:50%;transform:translateX(-50%);z-index:3;width:150px;text-align:center}
.kf404 .box-label{font-size:12px;color:var(--muted);letter-spacing:.12em;margin-top:10px}
.kf404 .pushke{
  width:150px;height:122px;margin:0 auto;position:relative;
  border-radius:14px 14px 16px 16px;
  background:linear-gradient(180deg,#1d2742,#141c31);
  border:1px solid var(--line);
  box-shadow:0 18px 40px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.06);
  transition:transform .15s ease, box-shadow .3s ease;
}
.kf404 .pushke .slot{position:absolute;top:16px;left:50%;transform:translateX(-50%);width:64px;height:9px;border-radius:6px;background:#080c16;box-shadow:inset 0 2px 4px rgba(0,0,0,.8), 0 0 0 1px var(--line)}
.kf404 .pushke .heart{position:absolute;top:52%;left:50%;transform:translate(-50%,-50%);width:46px;height:46px;filter:drop-shadow(0 4px 10px rgba(241,94,77,.5));animation:kf-heart 2.4s ease-in-out infinite}
.kf404 .pushke .heart svg{display:block;width:100%;height:100%}
@keyframes kf-heart{0%,100%{transform:translate(-50%,-50%) scale(1)}15%{transform:translate(-50%,-50%) scale(1.14)}30%{transform:translate(-50%,-50%) scale(1)}45%{transform:translate(-50%,-50%) scale(1.08)}60%{transform:translate(-50%,-50%) scale(1)}}
.kf404 .pushke .ring{position:absolute;inset:0;border-radius:14px;border:2px solid var(--brand);opacity:0;transition:opacity .25s;pointer-events:none}
.kf404 .box.hot .pushke{transform:scale(1.05)}
.kf404 .box.hot .pushke .ring{opacity:.9;animation:kf-ringPulse 1s ease-in-out infinite}
@keyframes kf-ringPulse{0%,100%{box-shadow:0 0 0 0 rgba(59,130,246,.4)}50%{box-shadow:0 0 26px 4px rgba(59,130,246,.5)}}
.kf404 .burst{position:fixed;inset:0;z-index:30;pointer-events:none;display:flex;align-items:center;justify-content:center;opacity:0}
.kf404 .burst.go{animation:kf-burstFill 1.9s ease forwards}
.kf404 .burst .core{width:30px;height:30px;border-radius:50%;background:radial-gradient(circle,#fff,var(--brand-soft) 40%,var(--brand) 70%);box-shadow:0 0 60px 20px rgba(59,130,246,.8)}
.kf404 .burst.go .core{animation:kf-coreGrow 1.9s cubic-bezier(.5,0,.2,1) forwards}
@keyframes kf-burstFill{0%{opacity:0}10%{opacity:1}100%{opacity:1}}
@keyframes kf-coreGrow{0%{transform:scale(0)}55%{transform:scale(60)}100%{transform:scale(120)}}
.kf404 .ripple{position:fixed;left:50%;top:50%;z-index:29;border-radius:50%;border:2px solid rgba(59,130,246,.6);transform:translate(-50%,-50%) scale(0);pointer-events:none;opacity:0}
.kf404 .ripple.go{animation:kf-rip 1.4s ease-out forwards}
@keyframes kf-rip{0%{transform:translate(-50%,-50%) scale(0);opacity:.7}100%{transform:translate(-50%,-50%) scale(40);opacity:0}}
.kf404 .mute{position:fixed;top:16px;left:16px;z-index:40;width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,.06);border:1px solid var(--line);color:var(--ink);cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);transition:background .2s}
.kf404 .mute:hover{background:rgba(255,255,255,.12)}
.kf404 .fallback{margin-top:14px}
.kf404 .fallback a{color:var(--muted);font-size:13px;text-decoration:none;border-bottom:1px solid var(--line);padding-bottom:2px}
.kf404 .fallback a:hover{color:var(--brand-soft)}
@media (prefers-reduced-motion:reduce){.kf404 .coin,.kf404 .coin-glow,.kf404 .ambient span,.kf404 .pushke .heart{animation:none!important}}
@media (max-width:480px){.kf404 .play{height:330px}.kf404 .coin{width:78px;height:78px}.kf404 .coin .mark{font-size:30px}}
`

export default function NotFound() {
  useEffect(() => {
    const coin = document.getElementById('kf-coin')!
    const box = document.getElementById('kf-box')!
    const burst = document.getElementById('kf-burst')!
    const hint = document.getElementById('kf-hint')!
    const muteBtn = document.getElementById('kf-mute')!
    const amb = document.getElementById('kf-ambient')!
    const HOME = '/'

    let muted = false, done = false
    let dragging = false, startX = 0, startY = 0, baseX = 0, baseY = 0

    const onMute = () => {
      muted = !muted
      muteBtn.textContent = muted ? 'הפעל צליל' : 'השתק'
      muteBtn.setAttribute('aria-label', muted ? 'ביטול השתקה' : 'השתקת צליל')
    }
    muteBtn.addEventListener('click', onMute)

    function clink() {
      if (muted) return
      try {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext
        const ctx = new Ctx()
        const now = ctx.currentTime
        ;[1318.5, 1567.98].forEach((f, i) => {
          const o = ctx.createOscillator(), g = ctx.createGain()
          o.type = 'triangle'; o.frequency.value = f
          g.gain.setValueAtTime(0.0001, now)
          g.gain.exponentialRampToValueAtTime(0.18, now + 0.01 + i * 0.02)
          g.gain.exponentialRampToValueAtTime(0.0001, now + 0.5)
          o.connect(g); g.connect(ctx.destination)
          o.start(now + i * 0.02); o.stop(now + 0.55)
        })
      } catch { /* ignore */ }
    }

    function getXY(): [number, number] {
      const t = coin.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/)
      return [t ? parseFloat(t[1]) : 0, t ? parseFloat(t[2]) : 0]
    }

    function pointerDown(e: any) {
      if (done) return
      dragging = true
      coin.classList.add('grabbing')
      const p = e.touches ? e.touches[0] : e
      startX = p.clientX; startY = p.clientY
      ;[baseX, baseY] = getXY()
    }
    function pointerMove(e: any) {
      if (!dragging || done) return
      const p = e.touches ? e.touches[0] : e
      const dx = p.clientX - startX, dy = p.clientY - startY
      coin.style.transform = `translate(${baseX + dx}px, ${baseY + dy}px)`
      const cb = coin.getBoundingClientRect(), bb = box.getBoundingClientRect()
      const cx = cb.left + cb.width / 2, cy = cb.top + cb.height / 2
      const inside = cx > bb.left && cx < bb.right && cy > bb.top && cy < bb.bottom + 30
      box.classList.toggle('hot', inside)
      if (e.cancelable) e.preventDefault()
    }
    function pointerUp() {
      if (!dragging || done) return
      dragging = false
      coin.classList.remove('grabbing')
      if (box.classList.contains('hot')) {
        deposit()
      } else {
        coin.style.transition = 'transform .4s cubic-bezier(.2,1.4,.4,1)'
        coin.style.transform = ''
        setTimeout(() => (coin.style.transition = ''), 420)
      }
    }

    function deposit() {
      done = true
      box.classList.remove('hot')
      hint.style.opacity = '0'
      const bb = box.getBoundingClientRect(), cb = coin.getBoundingClientRect()
      const targetX = (bb.left + bb.width / 2) - (cb.left + cb.width / 2)
      const targetY = (bb.top + 18) - (cb.top + cb.height / 2)
      const [cx, cy] = getXY()
      coin.style.transition = 'transform .35s cubic-bezier(.6,0,.8,1), opacity .25s ease'
      coin.style.transform = `translate(${cx + targetX}px, ${cy + targetY}px) scale(.55)`
      setTimeout(() => { coin.style.opacity = '0'; clink(); fireBurst() }, 300)
    }

    function fireBurst() {
      const bb = (box.querySelector('.pushke') as HTMLElement).getBoundingClientRect()
      for (let i = 0; i < 3; i++) {
        const r = document.createElement('div')
        r.className = 'ripple'
        r.style.left = (bb.left + bb.width / 2) / window.innerWidth * 100 + '%'
        r.style.top = (bb.top + 18) / window.innerHeight * 100 + '%'
        r.style.width = r.style.height = '30px'
        r.style.animationDelay = (i * 0.12) + 's'
        document.querySelector('.kf404')!.appendChild(r)
        requestAnimationFrame(() => r.classList.add('go'))
      }
      burst.classList.add('go')
      setTimeout(() => { window.location.href = HOME }, 1700)
    }

    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !done) {
        e.preventDefault(); box.classList.add('hot'); deposit()
      }
    }

    coin.addEventListener('mousedown', pointerDown)
    window.addEventListener('mousemove', pointerMove)
    window.addEventListener('mouseup', pointerUp)
    coin.addEventListener('touchstart', pointerDown, { passive: false })
    window.addEventListener('touchmove', pointerMove, { passive: false })
    window.addEventListener('touchend', pointerUp)
    coin.addEventListener('keydown', onKey)

    for (let i = 0; i < 22; i++) {
      const s = document.createElement('span')
      s.style.left = Math.random() * 100 + '%'
      s.style.bottom = Math.random() * 40 + '%'
      s.style.animationDuration = (6 + Math.random() * 8) + 's'
      s.style.animationDelay = (Math.random() * 8) + 's'
      amb.appendChild(s)
    }

    return () => {
      muteBtn.removeEventListener('click', onMute)
      coin.removeEventListener('mousedown', pointerDown)
      window.removeEventListener('mousemove', pointerMove)
      window.removeEventListener('mouseup', pointerUp)
      coin.removeEventListener('touchstart', pointerDown)
      window.removeEventListener('touchmove', pointerMove)
      window.removeEventListener('touchend', pointerUp)
      coin.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div className="kf404" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <button className="mute" id="kf-mute" aria-label="השתקת צליל">השתק</button>

      <div className="ambient" id="kf-ambient" />

      <div className="stage">
        <div className="eyebrow">כפול · 404</div>
        <h1>לאן הגעת??</h1>
        <p className="notexist">העמוד לא קיים</p>
        <p className="sub">אם אתה כבר כאן אתה מוזמן להכניס את המטבע לקופה ולהוסיף עוד אור בעולם</p>
        <p className="hint" id="kf-hint">גרור את המטבע לקופה ↓</p>

        <div className="play">
          <div className="coin-wrap" id="kf-coin" role="button" tabIndex={0} aria-label="גרור את המטבע אל קופת הצדקה">
            <div className="coin-glow" />
            <div className="coin"><span className="mark">כ</span></div>
          </div>

          <div className="box" id="kf-box">
            <div className="pushke">
              <div className="ring" />
              <div className="slot" />
              <div className="heart">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <defs>
                    <linearGradient id="kfHeartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#ff8a7a" />
                      <stop offset="0.55" stopColor="#f15e4d" />
                      <stop offset="1" stopColor="#d8392a" />
                    </linearGradient>
                  </defs>
                  <path fill="url(#kfHeartGrad)" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>
            </div>
            <div className="box-label">קופת צדקה</div>
          </div>
        </div>

        <div className="fallback">
          <a href="/" id="kf-skip">קח אותי הביתה</a>
        </div>
      </div>

      <div className="burst" id="kf-burst"><div className="core" /></div>
    </div>
  )
}
