import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Loop } from '../_components/ui'
import InnerRuntime from '../_components/InnerRuntime'

export const metadata: Metadata = {
  title: 'אודות · כפול',
  description: 'כפול מרכזת את כל מה שצריך כדי להריץ קמפיין גיוס מצליח: דף תרומה, סליקה, וואטסאפ, שגרירים וכלי ניהול.',
}

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
const Arrow = () => <svg className="ar" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>

type Card = { n: string; title: string; body: string; icon: ReactNode }
const CARDS: Card[] = [
  { n: '01', title: 'תשלום הוגן, בסכום קבוע', body: 'בלי אחוזים מהתרומות. מחיר קבוע וידוע מראש, גם כשהקמפיין מצליח מעל ומעבר.', icon: <svg viewBox="0 0 24 24" {...S}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg> },
  { n: '02', title: 'תרומה חלקה ומאובטחת, בתוך האתר שלכם', body: 'התשלום מתבצע בתוך דף הקמפיין, כך שהתורם לא עוזב את הדף עד שהתרומה הושלמה.', icon: <svg viewBox="0 0 24 24" {...S}><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg> },
  { n: '03', title: 'לא רק טכנולוגיה, גם ליווי מלא', body: 'עיצוב גרפי, ייעוץ ואסטרטגיה לקמפיין. אתם לא נשארים לבד מול המערכת.', icon: <svg viewBox="0 0 24 24" {...S}><path d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.4 7.2 17.9l.9-5.4L4.2 8.7l5.4-.8z" /></svg> },
  { n: '04', title: 'כלי ניהול חכמים', body: 'מעקב יעדים, ניהול הקדשות, חלוקת לידים אוטומטית ומוקד טלפוני בזמן אמת.', icon: <svg viewBox="0 0 24 24" {...S}><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-6" /></svg> },
]
const WHY = ['תמחור שקוף וקבוע, בלי הפתעות', '0% עמלה מהתרומות', 'חוויית תרומה רציפה בתוך האתר שלכם', 'עיצוב מקצועי וליווי צמוד', 'כלי ניהול מתקדמים ומוקד טלפוני חי', 'מתאים לעמותות, מוסדות ויוזמות פרטיות']
const SOL = ['דפי תרומה', 'מכירת כרטיסים ומוצרים', 'פדיון כפרות אונליין', 'קמפיין שגרירים ומתרימים', 'אסטרטגיה וניהול קמפיין']

export default function AboutPage() {
  return (
    <main className="pg" data-page="about">
      <header className="pg-hero">
        <div className="loopbg" aria-hidden="true"><Loop /></div>
        <span className="eyebrow rv">אודות</span>
        <h1 className="pg-t rv" style={{ '--d': '80ms' }}>הפלטפורמה שמכפילה<span>את ההשפעה שלכם.</span></h1>
        <p className="pg-sub rv" style={{ '--d': '160ms' }}>כפול מרכזת את כל מה שצריך כדי להריץ קמפיין גיוס מצליח: דף תרומה מעוצב, סליקה, וואטסאפ, שגרירים וכלי ניהול. בשביל עמותות, מוסדות ויוזמות.</p>
        <button type="button" className="pill light rv" style={{ '--d': '240ms' }} data-modal>אני רוצה דף גיוס ב-5 דקות <Arrow /></button>
      </header>

      <section className="pg-sec"><div className="pg-in">
        <span className="eyebrow rv">מה מקבלים</span>
        <h2 className="pg-h rv" style={{ '--d': '80ms' }}>מה מקבלים <em>עם כפול?</em></h2>
        <div className="ab-g">
          {CARDS.map((c, i) => (
            <article className="ab-c rv" style={{ '--d': `${i * 90}ms` }} key={c.n}>
              <span className="ic2">{c.icon}</span><span className="n">{c.n}</span>
              <h3>{c.title}</h3><p>{c.body}</p>
            </article>
          ))}
        </div>
      </div></section>

      <section className="pg-sec alt"><div className="pg-in">
        <span className="eyebrow rv">למה כפול</span>
        <h2 className="pg-h rv" style={{ '--d': '80ms' }}>כל הסיבות <em>במקום אחד.</em></h2>
        <ul className="why">{WHY.map((w, i) => <li className="rv" style={{ '--d': `${i * 60}ms` }} key={i}>{w}</li>)}</ul>
      </div></section>

      <section className="pg-sec dark"><div className="pg-in">
        <span className="eyebrow rv">החזון שלנו</span>
        <p className="vision rv" style={{ '--d': '80ms' }}>כל שקל שנתרם צריך להגיע ליעד שלו <span>בדרך הקצרה והבטוחה ביותר.</span></p>
        <p className="vision-sub rv" style={{ '--d': '160ms' }}>הטכנולוגיה צריכה לשרת את המטרה, לא לסבך אותה.</p>
      </div></section>

      <section className="pg-sec"><div className="pg-in">
        <span className="eyebrow rv">הפתרונות שלנו</span>
        <h2 className="pg-h rv" style={{ '--d': '80ms' }}>מה אפשר <em>להקים בכפול.</em></h2>
        <div className="sol">{SOL.map((s, i) => <a href="/contact" className="rv" style={{ '--d': `${i * 60}ms` }} key={i}><i />{s}</a>)}</div>
      </div></section>

      <section className="pg-sec alt"><div className="pg-in pg-cta">
        <div><span className="eyebrow rv">מתחילים</span><h2 className="pg-h rv" style={{ '--d': '80ms' }}>מוכנים <em>להתחיל?</em></h2><p className="pg-lead rv" style={{ '--d': '140ms' }}>עיצוב, תשלום וניהול. הכל במקום אחד.</p></div>
        <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
          <button type="button" className="pill solid rv" data-modal style={{ '--d': '200ms' }}>הקימו דף גיוס עכשיו <Arrow /></button>
          <a className="pill rv" href="/faq" style={{ '--d': '260ms', border: '1px solid var(--hairline)' }}>שאלות ותשובות <Arrow /></a>
        </div>
      </div></section>
      <InnerRuntime />
    </main>
  )
}
