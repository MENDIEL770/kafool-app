import type { Metadata } from 'next'
import { Rubik } from 'next/font/google'
import './services.css'
import { Mark, NavLogo, WaIcon } from './_svg'
import Quiz from './Quiz'
import ContactForm from './ContactForm'
import ServicesRuntime from './ServicesRuntime'

const rubik = Rubik({ subsets: ['hebrew', 'latin'], weight: ['400', '500'], display: 'swap', variable: '--font-services-rubik' })

const WA = 'https://wa.me/972535035770?text=' + encodeURIComponent('שלום, אני רוצה לשמוע על שירות הקמפיין המלא של כפול.')

export const metadata: Metadata = {
  title: 'שירות קמפיין מלא — כפול',
  description: 'עיצוב, כתיבה, אסטרטגיה, דף גיוס וליווי צמוד. שירות קמפיין מלא למוסדות ועמותות, מול בן אדם אחד. בדקו כמה הקמפיין שלכם מוכן.',
}

const navH: React.CSSProperties = { boxSizing: 'border-box', width: 'min(1040px, calc(100% - 32px))', margin: '16px auto 0', padding: '7px 20px 7px 7px', borderRadius: 1000, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }

export default function ServicesPage() {
  return (
    <div className={'kp ' + rubik.variable} dir="rtl" id="top">
      <ServicesRuntime />

      {/* Floating translucent nav */}
      <div style={{ position: 'sticky', top: 16, zIndex: 20, height: 0 }}>
        <nav className="glass" aria-label="ניווט ראשי" style={navH}>
          <a href="#top" aria-label="כפול, לראש הדף" style={{ display: 'block' }}><NavLogo /></a>
          <div className="nav-links" style={{ display: 'flex', gap: 2 }}>
            <a className="nav-link" href="#campaigns">קמפיינים</a>
            <a className="nav-link" href="#steps">התהליך</a>
            <a className="nav-link" href="#system">המערכת</a>
            <a className="nav-link" href="#check">בדיקת מוכנות</a>
            <a className="nav-link" href="#prices">מחירים</a>
          </div>
          <a className="pill" href="#contact" style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 20px', borderRadius: 1000, background: '#FFFFFF', color: '#14204A', fontSize: 15, fontWeight: 500, textDecoration: 'none' }}>דברו איתנו</a>
        </nav>
      </div>

      {/* Hero */}
      <section style={{ position: 'relative', overflow: 'hidden', background: '#14204A', color: '#FFFFFF', minHeight: 'min(100vh, 860px)', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div className="glow" aria-hidden="true" style={{ width: 700, height: 700, left: -180, bottom: -320, background: 'radial-gradient(closest-side, rgba(62,93,179,.7), rgba(62,93,179,0))' }} />
        <div className="glow" aria-hidden="true" style={{ width: 620, height: 620, right: -160, top: -300, background: 'radial-gradient(closest-side, rgba(255,122,99,.14), rgba(255,122,99,0))' }} />
        <svg className="field" viewBox="0 0 1400 760" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
          <defs><filter id="soft-hero" filterUnits="userSpaceOnUse" x="-900" y="-500" width="1800" height="1000"><feGaussianBlur stdDeviation="24" /></filter></defs>
          <g transform="translate(700 390) scale(.98)" strokeLinejoin="round">
            <path d="M146.7 174.8A272 272 0 1 0 146.7 -174.8L-146.7 174.8A272 272 0 1 1 -146.7 -174.8Z" stroke="#FFFFFF" strokeOpacity=".035" strokeWidth="100" />
            <path className="run" filter="url(#soft-hero)" d="M146.7 174.8A272 272 0 1 0 146.7 -174.8L-146.7 174.8A272 272 0 1 1 -146.7 -174.8Z" stroke="#FF7A63" strokeOpacity=".32" strokeWidth="90" strokeLinecap="round" />
          </g>
        </svg>
        <div style={{ position: 'relative', maxWidth: 880, boxSizing: 'border-box', padding: 'clamp(112px,14vw,140px) 24px clamp(64px,9vw,96px)' }}>
          <p className="fade-in" style={{ margin: '0 0 20px', fontSize: 'clamp(16px,1.6vw,19px)', color: '#FF7A63' }}>שירות קמפיין מלא למוסדות ועמותות</p>
          <h1 style={{ margin: 0, fontSize: 'clamp(44px,8vw,96px)', lineHeight: 1.08, fontWeight: 500 }}>
            <span className="hl"><span>כל הקמפיין.</span></span>
            <span className="hl second"><span style={{ color: '#FF7A63' }}>מול בן אדם אחד.</span></span>
          </h1>
          <p className="fade-in" style={{ margin: '24px auto 0', maxWidth: 600, fontSize: 'clamp(18px,2vw,22px)', lineHeight: 1.5, color: 'rgba(255,255,255,.88)' }}>עיצוב, כתיבה, אסטרטגיה, דף גיוס וליווי צמוד. אנחנו לוקחים איתכם את הקמפיין צעד אחר צעד עד הסוף.</p>
          <div className="fade-in later" style={{ marginTop: 36, display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            <a className="pill" href="#prices" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 54, padding: '0 30px', borderRadius: 1000, background: '#FFFFFF', color: '#14204A', fontSize: 17, fontWeight: 500, textDecoration: 'none' }}>לשירותים ולמחירים</a>
            <a className="pill" href={WA} style={{ display: 'inline-flex', alignItems: 'center', minHeight: 54, padding: '0 30px', borderRadius: 1000, background: 'rgba(255,255,255,.12)', color: '#FFFFFF', fontSize: 17, fontWeight: 500, textDecoration: 'none' }}>שלחו לנו וואטסאפ</a>
          </div>
        </div>
      </section>

      {/* Campaigns */}
      <section id="campaigns" aria-label="קמפיינים שליווינו" style={{ maxWidth: 1080, margin: '0 auto', boxSizing: 'border-box', padding: 'clamp(80px,12vw,152px) 24px clamp(40px,6vw,72px)', textAlign: 'center' }}>
        <Mark center />
        <h2 className="rv" style={{ margin: '0 0 clamp(40px,6vw,72px)', fontSize: 'clamp(32px,5vw,60px)', lineHeight: 1.12, fontWeight: 500 }}>קמפיינים שעשינו ביחד</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: 'clamp(40px,5vw,64px)' }}>
          {[
            { href: 'https://www.kafool.com/ogen', n: '587K', name: 'חב״ד שירגאו', cls: 'rv' },
            { href: 'https://www.kafool.com/einav', n: '460K', name: 'חב״ד ענב', cls: 'rv d1' },
            { href: 'https://www.kafool.com/skaya', n: '168K', name: 'חב״ד סקיה', cls: 'rv d2' },
          ].map((c) => (
            <div className={c.cls} key={c.href}>
              <a className="card" href={c.href} style={{ display: 'block', textDecoration: 'none' }}>
                <div style={{ fontSize: 'clamp(56px,7vw,84px)', lineHeight: 1.05, fontWeight: 500, color: '#3E5DB3' }}><span className="count">{c.n}</span></div>
                <div style={{ marginTop: 10, fontSize: 20 }}>{c.name}</div>
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section id="steps" style={{ maxWidth: 1080, margin: '0 auto', boxSizing: 'border-box', padding: 'clamp(72px,11vw,136px) 24px clamp(88px,13vw,168px)' }}>
        <div className="split">
          <div className="split-head">
            <Mark />
            <h2 className="rv" style={{ margin: 0, fontSize: 'clamp(32px,5vw,60px)', lineHeight: 1.12, fontWeight: 500 }}>צעד אחר צעד,<br />ביחד</h2>
          </div>
          <div className="split-body tl-wrap">
            <div className="tl-track" aria-hidden="true"><div className="tl-fill" /></div>
            <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {[
                { t: 'מכירים', d: 'שיחת זום היכרות על המוסד והקמפיין.' },
                { t: 'מתכננים', d: 'אסטרטגיה, יעד גיוס ולוח זמנים לפרסומים.' },
                { t: 'מייצרים', d: 'כותבים, מעצבים ומקימים את דף הגיוס.' },
                { t: 'מלווים', d: 'נשארים איתכם לאורך הקמפיין ומנתחים כל מהלך.', last: true },
              ].map((s, i) => (
                <li className={'tl' + (s.last ? ' last' : '')} key={i}>
                  <span className="tl-node" aria-hidden="true" />
                  <h3 style={{ margin: '0 0 6px', fontSize: 'clamp(22px,2.4vw,28px)', lineHeight: 1.25, fontWeight: 500 }}>{s.t}</h3>
                  <p style={{ margin: 0, fontSize: 'clamp(17px,1.7vw,20px)' }}>{s.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* System */}
      <section id="system" style={{ background: '#14204A', color: '#FFFFFF' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', boxSizing: 'border-box', padding: 'clamp(88px,13vw,168px) 24px' }}>
          <div style={{ textAlign: 'center' }}>
            <Mark center tone="onDark" />
            <h2 className="rv" style={{ margin: 0, fontSize: 'clamp(32px,5vw,60px)', lineHeight: 1.12, fontWeight: 500 }}>כל קמפיין רץ<br />על פלטפורמת כפול</h2>
          </div>
          <ul className="feat">
            <li className="rv late wide">
              <svg className="feat-icon" viewBox="0 0 24 24" aria-hidden="true"><path pathLength={1} d="M19 5 5 19" /><circle pathLength={1} cx="7" cy="7" r="2.5" /><circle pathLength={1} cx="17" cy="17" r="2.5" /></svg>
              <span style={{ color: '#FF7A63', fontWeight: 500 }}>0%</span> עמלות סליקה למערכת כפול
            </li>
            <li className="rv late wide s2">
              <svg className="feat-icon" viewBox="0 0 24 24" aria-hidden="true"><circle pathLength={1} cx="12" cy="5" r="2" /><path pathLength={1} d="M5 9.5h14" /><path pathLength={1} d="M12 9.5V14" /><path pathLength={1} d="m12 14-3 7" /><path pathLength={1} d="m12 14 3 7" /></svg>
              אתר מזמין ונגיש
            </li>
            <li className="rv late s3">
              <svg className="feat-icon" viewBox="0 0 24 24" aria-hidden="true"><path pathLength={1} d="M3 12h4l3-8 4 16 3-8h4" /></svg>
              מערכת ניטור ומעקב אחרי תרומות שלא הושלמו
            </li>
            <li className="rv late s4">
              <svg className="feat-icon" viewBox="0 0 24 24" aria-hidden="true"><path pathLength={1} d="M6 9a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path pathLength={1} d="M10 21a2 2 0 0 0 4 0" /></svg>
              שליחת תזכורת אוטומטית לתורם שלא השלים את התרומה
            </li>
            <li className="rv late s5">
              <svg className="feat-icon" viewBox="0 0 24 24" aria-hidden="true"><path pathLength={1} d="M14 3H6v18h12V7z" /><path pathLength={1} d="M14 3v4h4" /><path pathLength={1} d="m9 14 2 2 4-4" /></svg>
              שליחת אישור תרומה מסודר לאחר השלמת תרומה
            </li>
          </ul>
        </div>
      </section>

      {/* Readiness check */}
      <section id="check" style={{ maxWidth: 1080, margin: '0 auto', boxSizing: 'border-box', padding: 'clamp(88px,13vw,168px) 24px 0', textAlign: 'center' }}>
        <Mark center />
        <h2 className="rv" style={{ margin: 0, fontSize: 'clamp(32px,5vw,60px)', lineHeight: 1.12, fontWeight: 500 }}>כמה הקמפיין שלכם<br />באמת מוכן?</h2>
        <p className="rv" style={{ margin: '16px auto 0', maxWidth: 560, fontSize: 'clamp(17px,1.7vw,20px)' }}>ענו על כמה שאלות קצרות וקבלו תמונת מצב לפני שאתם יוצאים לדרך.</p>
        <Quiz />
      </section>

      {/* Prices */}
      <section id="prices" style={{ maxWidth: 1080, margin: '0 auto', boxSizing: 'border-box', padding: 'clamp(88px,13vw,168px) 24px clamp(48px,7vw,88px)' }}>
        <div className="split">
          <div className="split-head">
            <Mark />
            <h2 className="rv" style={{ margin: 0, fontSize: 'clamp(32px,5vw,60px)', lineHeight: 1.12, fontWeight: 500 }}>מה כלול<br />וכמה זה עולה</h2>
            <p className="rv" style={{ margin: '16px 0 0', fontSize: 'clamp(17px,1.7vw,20px)' }}>בוחרים רק את מה שחסר לכם, או לוקחים הכל במחיר אחד.</p>
          </div>
          <div className="split-body">
            {[
              { t: 'ליווי צמוד', p: '3,000 ₪', items: ['שיחת זום היכרות', 'בניית תוכנית, לוח זמנים לפרסומים ותכנון אסטרטגיה', 'קביעת יעד הגיוס', 'ליווי במהלך הקמפיין וניתוח מהלכים', 'איתור נותני שירות: דפוס, צלם, מתנה לתורמים ועוד'] },
              { t: 'עיצוב', p: '3,500 ₪', items: ['מודעה ראשית', '8 טיזרים', 'אלבום עד 12 עמודים', 'עיצוב וכפתורים לאתר הגיוס'] },
              { t: 'אתר גיוס', p: '4,000 ₪', items: ['דף גיוס על מערכת כפול', 'חיבור לחברת הסליקה שלכם: קשר, נדרים פלוס, קארדקום או Stripe', 'הודעות וואטסאפ אוטומטיות לתורמים ולשגרירים', 'מעקב אחרי תרומות שננטשו'] },
              { t: 'כתיבה', p: '1,000 ₪', items: ['כתיבת התוכן של הקמפיין בשבילכם', 'תסריט לצילום סרטון'], tight: true },
            ].map((row) => (
              <div className="rv" key={row.t} style={{ borderTop: '1px solid #C4CAD8', padding: row.tight ? '24px 0 8px' : '24px 0 28px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 'clamp(22px,2.4vw,28px)', fontWeight: 500 }}>{row.t}</h3>
                  <div style={{ flex: 'none', fontSize: 'clamp(22px,2.4vw,28px)', fontWeight: 500, color: '#3E5DB3' }}>{row.p}</div>
                </div>
                <ul style={{ margin: '12px 0 0', padding: '0 20px 0 0', fontSize: 17 }}>{row.items.map((it, i) => <li key={i}>{it}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Package */}
      <section style={{ maxWidth: 1080, margin: '0 auto', boxSizing: 'border-box', padding: '0 24px clamp(88px,13vw,168px)' }}>
        <div className="rv" style={{ background: '#3E5DB3', color: '#FFFFFF', borderRadius: 'clamp(32px,6vw,72px)', padding: 'clamp(48px,8vw,96px) 24px', textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(30px,4vw,48px)', lineHeight: 1.15, fontWeight: 500 }}>כל החבילה</h2>
          <p style={{ margin: '8px 0 0', fontSize: 'clamp(17px,1.7vw,20px)' }}>ליווי צמוד, עיצוב, אתר גיוס וכתיבה.</p>
          <div style={{ marginTop: 24, fontSize: 'clamp(60px,10vw,120px)', lineHeight: 1.05, fontWeight: 500 }}><span className="count" data-from="11500">9,999 ₪</span></div>
          <p style={{ margin: '16px 0 0', fontSize: 18, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <del className="strike">11,500 ₪</del>
            <strong style={{ padding: '4px 14px', borderRadius: 1000, background: '#FF7A63', color: '#14204A', fontWeight: 500 }}>חוסכים 1,501 ₪</strong>
          </p>
          <a className="pill" href="#contact" style={{ marginTop: 32, display: 'inline-flex', alignItems: 'center', minHeight: 54, padding: '0 32px', borderRadius: 1000, background: '#FFFFFF', color: '#14204A', fontSize: 17, fontWeight: 500, textDecoration: 'none' }}>אני רוצה את כל החבילה</a>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" style={{ position: 'relative', overflow: 'hidden', background: '#14204A', color: '#FFFFFF' }}>
        <svg className="field" viewBox="0 0 1400 700" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
          <g transform="translate(700 360) scale(.9)" strokeLinejoin="round">
            <path d="M146.7 174.8A272 272 0 1 0 146.7 -174.8L-146.7 174.8A272 272 0 1 1 -146.7 -174.8Z" stroke="#FFFFFF" strokeOpacity=".03" strokeWidth="100" />
          </g>
        </svg>
        <div style={{ position: 'relative', maxWidth: 1080, margin: '0 auto', boxSizing: 'border-box', padding: 'clamp(80px,12vw,152px) 24px clamp(48px,7vw,80px)' }}>
          <div className="split">
            <div className="split-head rv">
              <Mark tone="onDark" />
              <h2 style={{ margin: 0, fontSize: 'clamp(32px,5vw,60px)', lineHeight: 1.12, fontWeight: 500 }}>נדבר על<br /><span style={{ color: '#FF7A63' }}>הקמפיין שלכם?</span></h2>
              <p style={{ margin: '16px 0 28px', fontSize: 'clamp(17px,1.7vw,20px)', color: 'rgba(255,255,255,.88)' }}>ספרו לנו מה אתם מתכננים, ונחזור אליכם.</p>
              <a className="pill" href={WA} aria-label="וואטסאפ 053-5035770" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minHeight: 54, padding: '0 26px', borderRadius: 1000, background: '#0F7F43', color: '#FFFFFF', fontSize: 18, fontWeight: 500, textDecoration: 'none' }}><WaIcon /><span dir="ltr">053-5035770</span></a>
            </div>
            <ContactForm />
          </div>
          <footer style={{ marginTop: 'clamp(48px,7vw,80px)', display: 'flex', flexWrap: 'wrap', gap: '4px 24px', alignItems: 'center', justifyContent: 'space-between', fontSize: 15, color: 'rgba(255,255,255,.78)' }}>
            <div>כפול בהשפעה. כפול בתוצאה.</div>
            <a href="mailto:admin@kafool.com" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44 }}>admin@kafool.com</a>
          </footer>
        </div>
      </section>
    </div>
  )
}
