import type { Metadata } from 'next'
import { Loop } from '../_components/ui'
import InnerRuntime from '../_components/InnerRuntime'

export const metadata: Metadata = {
  title: 'שאלות ותשובות · כפול',
  description: 'כל מה שרציתם לדעת על כפול — תמחור, סליקה, אבטחה, ליווי וכלי ניהול.',
}

const QA: [string, string][] = [
  ['מה זה ׳כפול׳?', 'כפול היא פלטפורמה לניהול קמפייני גיוס תרומות: דף תרומה מעוצב, סליקה, וואטסאפ אוטומטי, שגרירים וכלי ניהול. הכל במקום אחד, לבתי חב״ד, מוסדות, עמותות ויוזמות פרטיות.'],
  ['כמה זה עולה?', 'המחיר הוא סכום קבוע שנקבע מראש לפי היקף הקמפיין והשירותים שתבחרו. בלי אחוזים מהתרומות. דברו איתנו ונבנה לכם הצעה מסודרת.'],
  ['איך עובד התמחור?', 'משלמים סכום קבוע וידוע מראש, בלי עמלות נסתרות ובלי אחוז מכל תרומה. גם אם הקמפיין מצליח מעל ומעבר, המחיר לא משתנה.'],
  ['האם אתם גוזרים אחוזים מהתרומות?', 'לא. 0% עמלה לכפול. הכסף נסלק ישירות לחשבון של המוסד, דרך חברת הסליקה שלכם.'],
  ['איך עובד תהליך התשלום?', 'התורם משלם בתוך דף הקמפיין, בלי לעבור לאתר אחר, דרך חברת הסליקה של המוסד: קשר, נדרים פלוס, קארדקום או Stripe. הכסף נכנס ישר לחשבון שלכם.'],
  ['האם התשלום מאובטח?', 'כן. הסליקה מתבצעת אצל חברות סליקה מורשות, בחיבור מאובטח ומוצפן.'],
  ['למי הפלטפורמה מתאימה?', 'לבתי חב״ד, ישיבות, מוסדות, עמותות ויוזמות פרטיות, מכל גודל. מקמפיין קטן לחג ועד קמפיין בנייה גדול.'],
  ['האם אתם עוזרים גם בעיצוב הדף?', 'כן. מעבר לטכנולוגיה, אנחנו מלווים בעיצוב גרפי, בכתיבת תוכן ובאסטרטגיה לקמפיין.'],
  ['כמה זמן לוקח להקים קמפיין?', 'דף גיוס בסיסי אפשר להקים תוך דקות. קמפיין מלא עם עיצוב ואסטרטגיה בונים איתכם לפי לוח הזמנים שלכם.'],
  ['אילו כלי ניהול אני מקבל כבעל קמפיין?', 'מעקב יעדים בזמן אמת, ניהול הקדשות, חלוקת לידים אוטומטית, מוקד טלפוני חי, וואטסאפ אוטומטי לתורמים ולשגרירים, ומעקב אחרי תרומות שננטשו.'],
  ['האם אפשר לקבל הקדשה על תרומה?', 'כן. התורם יכול להוסיף הקדשה, והיא נשמרת ומנוהלת אצלכם במערכת.'],
  ['יש תמיכה אם נתקלתי בבעיה?', 'כן. צוות זמין לכם אישית בטלפון, בוואטסאפ ובמייל, גם באמצע הקמפיין.'],
]
const Plus = () => <span className="pl"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></span>
const WA = 'https://wa.me/972535035770?text=%D7%94%D7%99%D7%99%2C%20%D7%99%D7%A9%20%D7%9C%D7%99%20%D7%A9%D7%90%D7%9C%D7%94%20%D7%A2%D7%9C%20%D7%9B%D7%A4%D7%95%D7%9C'

export default function FaqPage() {
  return (
    <main className="pg" data-page="faq">
      <header className="pg-hero">
        <div className="loopbg" aria-hidden="true"><Loop /></div>
        <span className="eyebrow rv">שאלות ותשובות</span>
        <h1 className="pg-t rv" style={{ '--d': '80ms' }}>כל מה<span>שרציתם לדעת.</span></h1>
        <label className="fq-s rv" style={{ '--d': '160ms' }}>
          <span className="sr-only">חיפוש שאלה</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input type="search" id="fq-in" placeholder="חפשו שאלה, למשל: עמלה" autoComplete="off" />
        </label>
      </header>
      <section className="pg-sec"><div className="fq-l" id="fq-l">
        {QA.map(([q, a], i) => (
          <div className="fq-i rv" style={{ '--d': `${Math.min(i, 6) * 50}ms` }} key={i}>
            <button type="button" className="fq-q" aria-expanded="false" aria-controls={`fqa${i}`} id={`fqq${i}`}>{q}<Plus /></button>
            <div className="fq-a" id={`fqa${i}`} role="region" aria-labelledby={`fqq${i}`}><div><p>{a}</p></div></div>
          </div>
        ))}
        <p className="fq-none" id="fq-none">לא מצאנו שאלה כזו. כתבו לנו ונענה אישית.</p>
      </div></section>
      <section className="pg-sec alt"><div className="pg-in pg-cta">
        <div><span className="eyebrow rv">עדיין יש שאלה?</span><h2 className="pg-h rv" style={{ '--d': '80ms' }}>דברו <em>איתנו.</em></h2><p className="pg-lead rv" style={{ '--d': '140ms' }}>א׳–ה׳, 09:00–18:00.</p></div>
        <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
          <a className="pill solid rv" style={{ '--d': '200ms' }} href={WA} target="_blank" rel="noopener">צ׳אט בוואטסאפ</a>
          <a className="pill rv" style={{ '--d': '260ms', border: '1px solid var(--hairline)' }} href="/contact">טופס יצירת קשר</a>
        </div>
      </div></section>
      <InnerRuntime />
    </main>
  )
}
