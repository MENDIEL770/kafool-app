import type { ReactNode } from 'react'
import { Wordmark, Cta } from './ui'

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

type Card = { title: string; pro: string; sol: string; icon: ReactNode }
const CARDS: Card[] = [
  { title: 'אסטרטגיה', pro: 'מאיפה מתחילים? אין תוכנית', sol: 'בונים איתכם תוכנית ויעד',
    icon: <svg className="ic" viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></svg> },
  { title: 'כתיבת תוכן', pro: 'טיוטה מס׳ 7, עדיין לא זה', sol: 'כותבים את התוכן בשבילכם',
    icon: <svg className="ic" viewBox="0 0 24 24" {...S}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></svg> },
  { title: 'לרדוף אחרי מעצב', pro: '3 הודעות, אין תשובה', sol: 'עיצוב מותאם, בלי לרדוף',
    icon: <svg className="ic" viewBox="0 0 24 24" {...S}><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.5-.8 1.5-1.5 0-.9-.6-1.3-.6-2.1 0-.9.7-1.4 1.6-1.4H17a4 4 0 0 0 4-4c0-4.9-4-9-9-9z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7" r="1" /><circle cx="14.5" cy="7" r="1" /></svg> },
  { title: 'אתר', pro: 'מי בונה? כמה זה יעלה?', sol: 'דף גיוס מוכן ומעוצב',
    icon: <svg className="ic" viewBox="0 0 24 24" {...S}><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M3 9h18M7 6.5h.01M10 6.5h.01" /></svg> },
  { title: 'חיבור לסליקה', pro: 'ממתין לאישור כבר שבוע', sol: 'מחוברים לקשר, נדרים וקארדקום',
    icon: <svg className="ic" viewBox="0 0 24 24" {...S}><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10h18M7 15h4" /></svg> },
]

const Check = () => (
  <svg className="ic" viewBox="0 0 24 24" {...S}><path d="M5 13l4 4L19 7" /></svg>
)

export default function Pain() {
  return (
    <section className="pain" id="pain" aria-labelledby="pain-t">
      <div className="pain-stick">
        <div className="pain-copy">
          <span className="eyebrow">בלי כפול / עם כפול</span>
          <h2 className="h2" id="pain-t">כל כאבי הראש<br />של מנהל קמפיין.</h2>
          <div className="pain-count" aria-live="polite"><b className="tnum" id="pain-n">5</b><span id="pain-l">כאבי ראש פתוחים</span></div>
          <p className="pain-end" id="pain-end">הכל <span>במקום אחד!</span></p>
          <Cta className="pain-cta" data-modal>אני רוצה דף גיוס</Cta>
          <p className="pain-hint" id="pain-hint">גללו וראו אותם מסתדרים</p>
        </div>
        <div className="pain-stage" id="pain-stage">
          <div className="pain-veil" id="pain-veil" />
          <div className="pain-big" id="pain-big" aria-hidden="true"><b /><span /></div>
          <div className="pain-panel" id="pain-panel">
            <div className="pp-h">
              <span className="pp-logo dk"><Wordmark /></span>
              <span className="pp-st"><i />הכל בטיפול</span>
            </div>
          </div>
          <ul className="pain-cards" id="pain-cards">
            {CARDS.map((c, i) => (
              <li className="pc" data-i={i} key={i}>
                <span className="pc-ic"><span className="a">{c.icon}</span><span className="b"><Check /></span></span>
                <span className="pc-t">
                  <b>{c.title}</b>
                  <span className="pc-s">
                    <span className="a"><i />{c.pro}</span>
                    <span className="b">{c.sol}</span>
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
