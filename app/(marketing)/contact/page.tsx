import type { Metadata } from 'next'
import { Loop } from '../_components/ui'
import InnerRuntime from '../_components/InnerRuntime'

export const metadata: Metadata = {
  title: 'צור קשר · כפול',
  description: 'ספרו לנו על הקמפיין שלכם ונחזור אליכם. וואטסאפ, טלפון 053-503-5770, admin@kafool.com.',
}

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
const WA = 'https://wa.me/972535035770?text=%D7%94%D7%99%D7%99%2C%20%D7%90%D7%A0%D7%99%20%D7%9E%D7%A2%D7%95%D7%A0%D7%99%D7%99%D7%9F%20%D7%91%D7%93%D7%A3%20%D7%92%D7%99%D7%95%D7%A1'

export default function ContactPage() {
  return (
    <main className="pg" data-page="contact">
      <header className="pg-hero">
        <div className="loopbg" aria-hidden="true"><Loop /></div>
        <span className="eyebrow rv">צור קשר</span>
        <h1 className="pg-t rv" style={{ '--d': '80ms' }}>נשמח<span>לשמוע מכם.</span></h1>
        <p className="pg-sub rv" style={{ '--d': '160ms' }}>ספרו לנו על הקמפיין שלכם ונחזור אליכם.</p>
      </header>
      <section className="pg-sec"><div className="ct-g">
        <aside className="ct-side">
          <a className="ct-c wa rv" href={WA} target="_blank" rel="noopener"><span className="ic3"><svg viewBox="0 0 24 24" {...S}><path d="M4 20l1.4-4A8 8 0 1 1 8 18.6z" /></svg></span><span><b className="he">צ׳אט בוואטסאפ</b><small>מענה מהיר</small></span></a>
          <a className="ct-c rv" style={{ '--d': '60ms' }} href="tel:0535035770"><span className="ic3"><svg viewBox="0 0 24 24" {...S}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg></span><span><b>053-503-5770</b><small>טלפון</small></span></a>
          <a className="ct-c rv" style={{ '--d': '120ms' }} href="mailto:admin@kafool.com"><span className="ic3"><svg viewBox="0 0 24 24" {...S}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg></span><span><b>admin@kafool.com</b><small>מייל</small></span></a>
          <div className="ct-c rv" style={{ '--d': '180ms' }}><span className="ic3"><svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg></span><span><b className="he">א׳–ה׳, 09:00–18:00</b><small>שעות פעילות</small></span></div>
        </aside>
        <div className="ct-f rv" style={{ '--d': '100ms' }} id="ct-f">
          <form id="ct-form" noValidate>
            <h2>שלחו לנו הודעה</h2><p>שדות עם <span style={{ color: 'var(--coral)' }}>*</span> הם חובה.</p>
            <div className="ct-row two">
              <div className="fld" data-req><label htmlFor="cf-n">שם מלא <i>*</i></label><input id="cf-n" name="name" autoComplete="name" required /><span className="em">נשמח לדעת איך קוראים לך</span></div>
              <div className="fld"><label htmlFor="cf-p">טלפון</label><input id="cf-p" name="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" style={{ textAlign: 'right' }} /></div>
            </div>
            <div className="ct-row"><div className="fld" data-em><label htmlFor="cf-e">אימייל</label><input id="cf-e" name="email" type="email" inputMode="email" autoComplete="email" dir="ltr" style={{ textAlign: 'right' }} /><span className="em">כתובת המייל לא תקינה</span></div></div>
            <div className="ct-row"><div className="fld"><span className="lbl" id="cf-tl">נושא הפנייה <small style={{ color: 'var(--ink-soft)', fontWeight: 400 }}>(אפשר לבחור כמה)</small></span><div className="chips" role="group" aria-labelledby="cf-tl"><button type="button" aria-pressed="false">הקמת דף גיוס</button><button type="button" aria-pressed="false">ניהול ואסטרטגיה לקמפיין</button><button type="button" aria-pressed="false">עיצוב</button><button type="button" aria-pressed="false">אחר</button></div></div></div>
            <div className="ct-row"><div className="fld"><label htmlFor="cf-h">איך שמעתם עלינו?</label><select id="cf-h" name="heard"><option value="">בחרו</option><option>חבר או היכרות אישית</option><option>רשתות חברתיות</option><option>גוגל או חיפוש</option><option>פרסום ממומן</option><option>פודקאסט או כנס</option><option>קמפיין של כפול שראיתי</option><option>אחר</option></select></div></div>
            <div className="ct-row"><div className="fld" data-req><label htmlFor="cf-m">הודעה <i>*</i></label><textarea id="cf-m" name="msg" required placeholder="ספרו לנו בקצרה על הקמפיין" /><span className="em">כתבו לנו כמה מילים</span></div></div>
            <button type="submit" className="pill solid ct-send">שלח פנייה <svg className="ar" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg></button>
          </form>
          <div className="ct-ok" role="status"><span className="ck"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" /></svg></span><b>הפנייה נשלחה!</b><p>תודה, נחזור אליכם בהקדם.</p><a className="pill solid" href="/">חזרה לדף הבית</a></div>
        </div>
      </div></section>
      <InnerRuntime />
    </main>
  )
}
