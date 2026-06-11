'use client'

import { useState, useEffect, useRef } from 'react'

const TARGET = 127500
const SCENES = [
  { key: 'fund', label: 'עמוד גיוס', url: 'kafool.com/yeshivat-or',
    title: 'דף גיוס שממיר', desc: 'תרומה חלקה ב-iFrame בתוך הדף — התורם לא יוצא החוצה, והסכום עולה בזמן אמת' },
  { key: 'admin', label: 'דשבורד ניהול', url: 'kafool.com/dashboard',
    title: 'הכל במקום אחד', desc: 'קמפיינים, תורמים, קבוצות ודוחות — שליטה מלאה בלחיצה אחת' },
  { key: 'callers', label: 'חמ״ל טלפנים', url: 'kafool.com/war-room',
    title: 'חמ״ל טלפנים חי', desc: 'הקצאת לידים אוטומטית ומעקב שיחות בזמן אמת — שמכפילים את הגיוס' },
]
const DONORS = [
  { name: 'משפחת כהן', amount: 360 },
  { name: 'אנונימי', amount: 180 },
  { name: 'דוד לוי', amount: 540 },
]
const BARS = [42, 68, 55, 88, 72, 95]
const CALLERS = [
  { name: 'יוסי', state: 'מדבר', cls: 'talk', raised: '₪4,200' },
  { name: 'מירי', state: 'ממתין', cls: 'wait', raised: '₪2,750' },
  { name: 'אבי', state: 'מדבר', cls: 'talk', raised: '₪6,100' },
]

const CSS = `
.lshow{position:relative;width:100%;max-width:400px;margin:0 auto}
.lshow-frame{
  position:relative;z-index:2;background:#fff;border-radius:20px;overflow:hidden;
  box-shadow:0 24px 60px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.6);
  animation:lshow-float 6s ease-in-out infinite;
}
@keyframes lshow-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
.lshow-top{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#f1f4fa;border-bottom:1px solid #e8edf6}
.lshow-dots{display:flex;gap:5px}
.lshow-dots i{width:9px;height:9px;border-radius:50%;display:block}
.lshow-dots i:nth-child(1){background:#ff5f57}.lshow-dots i:nth-child(2){background:#febc2e}.lshow-dots i:nth-child(3){background:#28c840}
.lshow-url{flex:1;background:#fff;border:1px solid #e2e8f0;border-radius:8px;font-size:11px;color:#64748b;padding:4px 10px;text-align:center;direction:ltr;font-weight:500;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.lshow-body{position:relative;height:248px;padding:16px;background:#fafbfe}
.lshow-scene{position:absolute;inset:0;padding:16px;animation:lshow-scenein .5s ease both}
@keyframes lshow-scenein{0%{opacity:0;transform:translateY(10px) scale(.985)}100%{opacity:1;transform:none}}

/* head shared */
.lshow-head{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.lshow-ava{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:15px;flex-shrink:0}
.lshow-org{font-weight:800;color:#0f172a;font-size:13px;line-height:1.2}
.lshow-live{display:flex;align-items:center;gap:5px;font-size:10.5px;color:#16a34a;font-weight:600;margin-top:2px}
.lshow-live .dot{width:7px;height:7px;border-radius:50%;background:#22c55e;animation:lshow-pulse 1.6s ease-out infinite}
@keyframes lshow-pulse{0%{box-shadow:0 0 0 0 rgba(34,197,94,.55)}70%{box-shadow:0 0 0 8px rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}

/* fund scene */
.lshow-amount{font-weight:900;font-size:28px;color:#0f172a;letter-spacing:-.5px;line-height:1}
.lshow-goal{font-size:11.5px;color:#64748b;margin:5px 0 10px;font-weight:500}
.lshow-bar{height:8px;border-radius:99px;background:#e8edf6;overflow:hidden;position:relative}
.lshow-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,#1d4ed8,#3b82f6);position:relative;transition:width .25s ease}
.lshow-fill::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);transform:translateX(-100%);animation:lshow-shimmer 1.8s linear infinite}
@keyframes lshow-shimmer{to{transform:translateX(100%)}}
.lshow-feed{margin-top:13px;display:flex;flex-direction:column;gap:7px}
.lshow-donor{display:flex;align-items:center;gap:9px;background:#f6f8fc;border:1px solid #eef2f9;border-radius:11px;padding:7px 9px;opacity:0;animation:lshow-donorin 4.5s ease-in-out infinite}
.lshow-donor.d0{animation-delay:.3s}.lshow-donor.d1{animation-delay:1.6s}.lshow-donor.d2{animation-delay:2.9s}
@keyframes lshow-donorin{0%{opacity:0;transform:translateY(10px)}10%{opacity:1;transform:none}88%{opacity:1}100%{opacity:0;transform:translateY(-5px)}}
.lshow-davatar{width:24px;height:24px;border-radius:7px;background:#dbe6fb;color:#1d4ed8;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;flex-shrink:0}
.lshow-dname{font-size:12px;font-weight:600;color:#334155;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lshow-damount{font-size:12px;font-weight:800;color:#16a34a}

/* admin scene */
.lshow-tiles{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px}
.lshow-tile{background:#fff;border:1px solid #eef2f9;border-radius:12px;padding:9px;text-align:center;animation:lshow-pop .5s ease both}
.lshow-tile:nth-child(2){animation-delay:.08s}.lshow-tile:nth-child(3){animation-delay:.16s}
@keyframes lshow-pop{0%{opacity:0;transform:scale(.9)}100%{opacity:1;transform:none}}
.lshow-tnum{font-weight:900;font-size:16px;color:#1d4ed8}
.lshow-tlabel{font-size:9.5px;color:#94a3b8;margin-top:1px}
.lshow-chart{display:flex;align-items:flex-end;gap:8px;height:96px;padding:8px 4px 0;border-top:1px solid #eef2f9}
.lshow-colwrap{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;height:100%;justify-content:flex-end}
.lshow-col{width:100%;border-radius:6px 6px 3px 3px;background:linear-gradient(180deg,#60a5fa,#2563eb);height:0;animation:lshow-grow .9s cubic-bezier(.2,.8,.3,1) forwards}
.lshow-colwrap span{font-size:9px;color:#cbd5e1}
@keyframes lshow-grow{to{height:var(--h)}}

/* callers scene */
.lshow-caller{display:flex;align-items:center;gap:9px;background:#fff;border:1px solid #eef2f9;border-radius:11px;padding:8px 10px;margin-bottom:8px;animation:lshow-pop .5s ease both}
.lshow-caller:nth-child(2){animation-delay:.1s}.lshow-caller:nth-child(3){animation-delay:.2s}
.lshow-cdot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
.lshow-cdot.talk{background:#22c55e;animation:lshow-pulse 1.4s ease-out infinite}
.lshow-cdot.wait{background:#f59e0b}
.lshow-cname{font-size:12.5px;font-weight:700;color:#334155;flex:1}
.lshow-cstate{font-size:10.5px;color:#64748b}
.lshow-craised{font-size:12px;font-weight:800;color:#16a34a;margin-inline-start:8px}
.lshow-newlead{margin-top:6px;text-align:center;font-size:11px;font-weight:700;color:#1d4ed8;background:#eaf1ff;border:1px solid #d6e4ff;border-radius:10px;padding:7px;animation:lshow-blink 2s ease-in-out infinite}
@keyframes lshow-blink{0%,100%{opacity:.6}50%{opacity:1}}

/* design scene */
.lshow-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.lshow-poster{aspect-ratio:3/4;border-radius:10px;opacity:0;animation:lshow-pop .5s ease both;box-shadow:0 6px 16px rgba(0,0,0,.12)}
.lshow-poster:nth-child(1){animation-delay:0s}.lshow-poster:nth-child(2){animation-delay:.07s}.lshow-poster:nth-child(3){animation-delay:.14s}.lshow-poster:nth-child(4){animation-delay:.21s}.lshow-poster:nth-child(5){animation-delay:.28s}.lshow-poster:nth-child(6){animation-delay:.35s}

/* caption */
.lshow-cap{text-align:center;margin-top:16px;min-height:52px;animation:lshow-scenein .5s ease both;position:relative;z-index:2}
.lshow-cap-title{color:#fff;font-weight:800;font-size:16px}
.lshow-cap-desc{color:rgba(255,255,255,.78);font-size:12.5px;margin-top:3px;line-height:1.45;max-width:34ch;margin-inline:auto}

/* tabs */
.lshow-tabs{display:flex;gap:7px;justify-content:center;margin-top:14px;flex-wrap:wrap;position:relative;z-index:2}
.lshow-tab{font-size:11.5px;font-weight:600;color:rgba(255,255,255,.7);background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.16);border-radius:99px;padding:6px 13px;transition:all .35s ease;position:relative;overflow:hidden}
.lshow-tab.on{color:#fff;background:rgba(255,255,255,.22);border-color:rgba(255,255,255,.45);transform:translateY(-2px);box-shadow:0 6px 18px rgba(0,0,0,.18)}
.lshow-tab.on::after{content:"";position:absolute;left:0;bottom:0;height:2px;background:#fff;width:0;animation:lshow-progress 4.4s linear forwards}
@keyframes lshow-progress{to{width:100%}}

/* falling coin */
.lshow-coin{position:absolute;left:50%;top:-24px;z-index:1;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:14px;background:radial-gradient(circle at 32% 28%,#93b4f7,#3b82f6 50%,#1d4ed8);box-shadow:0 6px 16px rgba(0,0,0,.3),inset 0 2px 4px rgba(255,255,255,.45);opacity:0;animation:lshow-drop 6s ease-in infinite}
@keyframes lshow-drop{0%{opacity:0;transform:translateX(-50%) translateY(-8px) scale(.8)}5%{opacity:1}26%{opacity:1;transform:translateX(-50%) translateY(30px) scale(1)}34%{opacity:0;transform:translateX(-50%) translateY(36px) scale(.5)}100%{opacity:0}}

@media (prefers-reduced-motion:reduce){
  .lshow-frame,.lshow-coin,.lshow-donor,.lshow-fill::after,.lshow-live .dot,.lshow-cdot.talk,.lshow-newlead,.lshow-tab.on::after{animation:none}
  .lshow-donor,.lshow-poster{opacity:1}.lshow-col{height:var(--h)}.lshow-coin{display:none}
}
`

function easeOut(p: number) { return 1 - Math.pow(1 - p, 3) }

export default function LoginShowcase() {
  const [amount, setAmount] = useState(0)
  const [scene, setScene] = useState(0)
  const rafRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    let start: number | null = null
    const dur = 3600
    const run = (t: number) => {
      if (start === null) start = t
      const p = Math.min((t - start) / dur, 1)
      setAmount(Math.floor(TARGET * easeOut(p)))
      if (p < 1) rafRef.current = requestAnimationFrame(run)
      else setTimeout(() => { start = null; rafRef.current = requestAnimationFrame(run) }, 2200)
    }
    rafRef.current = requestAnimationFrame(run)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  useEffect(() => {
    const id = setInterval(() => setScene(s => (s + 1) % SCENES.length), 4400)
    return () => clearInterval(id)
  }, [])

  const pct = Math.min(Math.round((amount / TARGET) * 100), 100)
  const cur = SCENES[scene]

  return (
    <div className="lshow" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div style={{ position: 'relative' }}>
        {scene === 0 && <span className="lshow-coin">₪</span>}
        <div className="lshow-frame">
          {/* browser top bar */}
          <div className="lshow-top">
            <div className="lshow-dots"><i /><i /><i /></div>
            <div className="lshow-url">{cur.url}</div>
          </div>

          {/* scene body */}
          <div className="lshow-body">
            <div className="lshow-scene" key={cur.key}>
              {scene === 0 && (
                <>
                  <div className="lshow-head">
                    <div className="lshow-ava">א</div>
                    <div>
                      <div className="lshow-org">קמפיין ישיבת אור</div>
                      <div className="lshow-live"><span className="dot" />גיוס פעיל עכשיו</div>
                    </div>
                  </div>
                  <div className="lshow-amount" suppressHydrationWarning>₪{amount.toLocaleString()}</div>
                  <div className="lshow-goal" suppressHydrationWarning>מתוך ₪{TARGET.toLocaleString()} · {pct}% מהיעד</div>
                  <div className="lshow-bar"><div className="lshow-fill" style={{ width: `${pct}%` }} /></div>
                  <div className="lshow-feed">
                    {DONORS.map((d, i) => (
                      <div key={i} className={`lshow-donor d${i}`}>
                        <span className="lshow-davatar">{d.name[0]}</span>
                        <span className="lshow-dname">{d.name}</span>
                        <span className="lshow-damount">₪{d.amount}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {scene === 1 && (
                <>
                  <div className="lshow-tiles">
                    <div className="lshow-tile"><div className="lshow-tnum">₪127K</div><div className="lshow-tlabel">גויס החודש</div></div>
                    <div className="lshow-tile"><div className="lshow-tnum">1,284</div><div className="lshow-tlabel">תורמים</div></div>
                    <div className="lshow-tile"><div className="lshow-tnum">12</div><div className="lshow-tlabel">קמפיינים</div></div>
                  </div>
                  <div className="lshow-chart">
                    {BARS.map((h, i) => (
                      <div className="lshow-colwrap" key={i}>
                        <div className="lshow-col" style={{ ['--h' as string]: `${h}%`, animationDelay: `${i * 0.08}s` }} />
                        <span>{['א', 'ב', 'ג', 'ד', 'ה', 'ו'][i]}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {scene === 2 && (
                <>
                  <div className="lshow-head">
                    <div className="lshow-ava">☎</div>
                    <div>
                      <div className="lshow-org">חמ״ל טלפנים</div>
                      <div className="lshow-live"><span className="dot" />4 טלפנים פעילים</div>
                    </div>
                  </div>
                  {CALLERS.map((c, i) => (
                    <div className="lshow-caller" key={i}>
                      <span className={`lshow-cdot ${c.cls}`} />
                      <span className="lshow-cname">{c.name}</span>
                      <span className="lshow-cstate">{c.state}</span>
                      <span className="lshow-craised">{c.raised}</span>
                    </div>
                  ))}
                  <div className="lshow-newlead">📞 ליד חדש נכנס לתור</div>
                </>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* explainer caption (changes per scene) */}
      <div className="lshow-cap" key={cur.key + '-cap'}>
        <div className="lshow-cap-title">{cur.title}</div>
        <div className="lshow-cap-desc">{cur.desc}</div>
      </div>

      {/* feature tabs */}
      <div className="lshow-tabs">
        {SCENES.map((s, i) => (
          <span key={s.key} className={`lshow-tab${i === scene ? ' on' : ''}`}>{s.label}</span>
        ))}
      </div>
    </div>
  )
}
