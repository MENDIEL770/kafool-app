import { Wordmark, Cta } from './ui'

const LOOP_D = 'M2990.8 -180.2A272.0 272.0 0 1 0 2990.8 -529.8L2697.4 -180.2A272.0 272.0 0 1 1 2697.4 -529.8Z'

export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="plate" aria-hidden="true">
        <div className="plate-in" id="plate">
          <div className="plate-fb" id="plate-fb">
            <svg viewBox="2084 -825 1520 940">
              <g transform="translate(2844.1 -355.0) skewX(-12) translate(-2844.1 355.0)">
                <path className="pf-track" d={LOOP_D} />
                <path className="pf-run" id="pf-run" d={LOOP_D} />
                <path className="pf-run b" id="pf-run2" d={LOOP_D} />
              </g>
            </svg>
          </div>
        </div>
        <div className="plate-ov" />
      </div>

      <header className="hdr">
        <nav className="hdr-s hdr-nav" aria-label="ראשי">
          <a href="#campaigns" data-go>קמפיינים שבחרו ׳כפול׳</a>
          <a href="/about">על הפלטפורמה</a>
        </nav>
        <div className="hdr-c"><a className="brand dk" href="#top" data-go aria-label="כפול"><Wordmark /></a></div>
        <div className="hdr-s hdr-e">
          <button type="button" className="hdr-cta" data-modal>פתחו קמפיין</button>
          <button type="button" className="burger" id="burger" aria-label="תפריט" aria-expanded="false"><span><i /><i /></span></button>
        </div>
      </header>

      <div className="h-bot">
        <div className="h-main">
          <h1 className="h-title" id="h-title" data-gate>
            <span className="hl"><span className="clip"><span style={{ '--dl': '0ms' }}>כפול</span></span> <span className="clip"><span style={{ '--dl': '140ms' }}>בהשפעה.</span></span></span>
            <span className="hl c"><span className="clip"><span style={{ '--dl': '280ms' }}>כפול</span></span> <span className="clip"><span style={{ '--dl': '420ms' }}>בתוצאה.</span></span></span>
          </h1>
          <p className="h-tag-sub" data-iv data-gate style={{ '--dl': '600ms', '--y': '16px' }}>
            דף תרומה, מוקד טלפנים, והוואטסאפ של המוסד מחובר: תודה לכל תורם, תזכורת למי שעצר, ועדכון לכל שגריר.
          </p>
          <div className="h-ctas" data-iv data-gate style={{ '--dl': '720ms', '--y': '16px' }}>
            <Cta data-modal>פתחו קמפיין</Cta>
          </div>
        </div>
        <div className="h-cl" />
      </div>
    </section>
  )
}
