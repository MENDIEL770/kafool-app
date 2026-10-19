import { Wordmark } from './ui'

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
)
const ArrowIcon = () => (
  <svg className="ar" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
)

// Sticky translucent bar that appears on scroll (hidden until past the hero).
export function Bar() {
  return (
    <div className="bar" id="bar" aria-hidden="true" inert>
      <a className="bar-logo" href="#top" data-go aria-label="כפול, לראש הדף"><Wordmark /></a>
      <div className="bar-r">
        <button type="button" className="pill solid sm" data-modal>פתחו קמפיין</button>
        <button type="button" className="burger dark" data-burger aria-label="תפריט"><span><i /><i /></span></button>
      </div>
    </div>
  )
}

// Full-screen menu overlay.
export function Menu() {
  return (
    <div className="menu" id="menu" aria-hidden="true" inert>
      <div className="menu-bg" data-close />
      <div className="menu-p" role="dialog" aria-modal="true" aria-label="תפריט"><div className="menu-in">
        <div className="menu-top">
          <a className="brand dk" href="#top" data-go><Wordmark /></a>
          <button type="button" className="xbtn" data-close aria-label="סגירה"><XIcon /></button>
        </div>
        <nav className="menu-nav">
          <a href="#campaigns" data-go style={{ '--i': 0 }}>קמפיינים שבחרו ׳כפול׳</a>
          <a href="/about" style={{ '--i': 1 }}>אודות</a>
          <a href="/faq" style={{ '--i': 2 }}>שאלות ותשובות</a>
          <a href="/design" style={{ '--i': 3 }}>העיצובים שלנו</a>
          <button type="button" className="menu-cta" data-modal style={{ '--i': 4 }}>אני רוצה דף גיוס <ArrowIcon /></button>
        </nav>
        <div className="menu-bot"><nav><a href="/contact">צור קשר</a><a href="/login">כניסה למערכת</a></nav></div>
      </div></div>
    </div>
  )
}

// Contact / "open a campaign" modal.
export function Modal() {
  return (
    <div className="md" id="md" aria-hidden="true" inert>
      <div className="md-bg" data-mclose />
      <div className="md-p" role="dialog" aria-modal="true" aria-labelledby="md-t">
        <div className="md-h">
          <div>
            <span className="eyebrow">פתחו קמפיין</span>
            <h2 className="h2 lines" id="md-t" style={{ '--st': '90ms', '--du': '800ms' }}>
              <span className="ln"><span style={{ '--i': 0 }}>ספרו לנו</span></span>
              <span className="ln"><span style={{ '--i': 1 }}>על הקמפיין</span></span>
            </h2>
          </div>
          <button type="button" className="xbtn" data-mclose aria-label="סגירה"><XIcon /></button>
        </div>
        <form id="md-f" noValidate>
          <label><span>שם מלא</span><input name="name" id="md-name" placeholder="מנחם כהן" autoComplete="name" enterKeyHint="next" /></label>
          <label><span>טלפון</span><input name="phone" type="tel" inputMode="tel" dir="ltr" style={{ textAlign: 'right' }} placeholder="050-0000000" autoComplete="tel" enterKeyHint="next" /></label>
          <label><span>המוסד והקמפיין</span><textarea name="msg" rows={3} placeholder="בית חב״ד…, יעד של…, רוצים לעלות לפני…" /></label>
          <button type="submit" className="sub" id="md-sub">שליחה</button>
        </form>
        <div className="ok">
          <span className="ck"><svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg></span>
          <b>הפנייה התקבלה</b><p id="ok-p">תודה! נחזור אליכם בהקדם.</p>
          <button type="button" className="pill solid" data-mclose>סגירה</button>
        </div>
      </div>
    </div>
  )
}

export function Footer() {
  return (
    <footer className="ftr" id="contact-cta" style={{ margin: '0 .5rem .5rem' }}>
      <div className="f-cta">
        <div><span className="eyebrow lt">מתחילים</span><p className="big lines" data-rv><span className="ln"><span style={{ '--i': 0 }}>מוכנים</span></span><span className="ln"><span style={{ '--i': 1 }}>לקמפיין הבא?</span></span></p></div>
        <button type="button" className="pill cta lg" data-modal data-iv style={{ '--dl': '150ms', '--y': '20px' }}>
          <span>פתחו קמפיין</span>
          <span className="cta-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M16 16 8 8M8 14V8h6" /></svg></span>
        </button>
      </div>
      <div className="f-cols">
        <div>
          <a className="f-brand dk" href="#top" data-go aria-label="כפול"><Wordmark /></a>
          <p className="f-blurb">פלטפורמת גיוס תרומות לבתי חב״ד, עמותות ומוסדות. כפול בהשפעה. כפול בתוצאה.</p>
          <address className="f-addr"><a href="mailto:admin@kafool.com">admin@kafool.com</a><a href="/contact">טופס יצירת קשר</a></address>
        </div>
        <nav aria-label="פתרונות"><p className="f-h">פתרונות</p><div className="f-l"><a href="/contact">דפי גיוס</a><a href="/contact">מכירת כרטיסים ומוצרים</a><a href="/contact">פדיון כפרות</a><a href="/contact">שגרירים</a></div></nav>
        <nav aria-label="פלטפורמה"><p className="f-h">פלטפורמה</p><div className="f-l"><a href="/about">אודות</a><a href="/design">העיצובים שלנו</a><a href="/faq">שאלות ותשובות</a><a href="/contact">צור קשר</a></div></nav>
        <nav aria-label="מנהלי קמפיין"><p className="f-h">למנהלי קמפיין</p><div className="f-l"><a href="/login">כניסה למערכת</a><a href="/register">פתיחת חשבון</a><a href="/dashboard">דשבורד</a></div></nav>
      </div>
      <div className="f-bot"><span>© 2026 כפול. כל הזכויות שמורות.</span><nav><a href="/privacy">פרטיות</a><a href="/terms">תנאי שימוש</a><a href="/accessibility">נגישות</a><button type="button" id="replay" style={{ textDecoration: 'underline' }}>הפעל את הפתיחה שוב</button></nav></div>
    </footer>
  )
}
