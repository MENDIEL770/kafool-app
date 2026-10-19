import type { ReactNode } from 'react'

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

type Feat = { ic: string; n: string; title: string; desc: string; icon: ReactNode }
const FEATS: Feat[] = [
  { ic: 'wa', n: '01', title: 'חיבור הפלטפורמה לוואטסאפ האישי', desc: 'שליחה אוטומטית של הודעות לתורמים ולשגרירים.',
    icon: <svg viewBox="0 0 24 24" {...S}><path d="M4 20l1.4-4A8 8 0 1 1 8 18.6z" /><path d="M9 10.5c.5 1.6 1.9 3 3.5 3.5l1.2-1.1 1.8.8-.3 1.6c-3.4.3-7-3.3-6.7-6.7l1.6-.3.8 1.8z" /></svg> },
  { ic: 'co', n: '02', title: 'מעקב אחרי תרומות שננטשו', desc: 'ניטור כל תרומה שהתחילה ולא הושלמה, כדי שאף תורם לא ילך לאיבוד.',
    icon: <svg viewBox="0 0 24 24" {...S}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v4h4" /><path d="M12 8v4l3 2" /></svg> },
  { ic: 'bl', n: '03', title: 'סנכרון אנשי קשר ושיחות התרמה', desc: 'פלטפורמה ייחודית לסנכרון אנשי הקשר שלכם וניהול שיחות ההתרמה בצורה מסודרת ועקבית.',
    icon: <svg viewBox="0 0 24 24" {...S}><circle cx="9" cy="8" r="3.5" /><path d="M3 20c.8-3.4 3.2-5 6-5s5.2 1.6 6 5" /><path d="M17 8.5h4M19 6.5v4" /></svg> },
]

function MqCard({ f, real }: { f: Feat; real: boolean }) {
  const extra = real ? { role: 'button', tabIndex: 0 } : { 'aria-hidden': true, tabIndex: -1 }
  return (
    <li className="mq-c" {...extra}>
      <span className={`mq-ic ${f.ic}`}>{f.icon}</span>
      <span className="mq-n">{f.n}</span>
      <h3>{f.title}</h3>
      <p>{f.desc}</p>
      <span className="mq-more">להדגמה<b>+</b></span>
    </li>
  )
}

export default function Features() {
  // Four copies for a seamless -50% CSS marquee loop; first copy is interactive.
  const copies = [0, 1, 2, 3]
  return (
    <>
      <section className="mq" id="wa" aria-labelledby="mq-t">
        <h2 className="sr-only" id="mq-t">הכלים של כפול</h2>
        <div className="mq-win">
          <ul className="mq-track">
            {copies.flatMap(c => FEATS.map((f, i) => <MqCard key={`${c}-${i}`} f={f} real={c === 0} />))}
          </ul>
        </div>
      </section>

      {/* Expand panel (grows from the tapped card on desktop; bottom sheet on phones) */}
      <div className="fx" id="fx" hidden>
        <div className="fx-scrim" data-fx-close />
        <section className="fx-p" id="fx-p" role="dialog" aria-modal="true" aria-labelledby="fx-t">
          <div className="fx-grab" id="fx-grab" aria-hidden="true"><i /></div>
          <button type="button" className="fx-x" data-fx-close aria-label="סגירה"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
          <div className="fx-demo fx-body" id="fx-demo" />
          <div className="fx-txt fx-body" id="fx-txt" />
        </section>
      </div>
    </>
  )
}
