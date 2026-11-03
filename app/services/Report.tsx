import type { ReportSnapshot } from '@/lib/services/report'

// Renders a report snapshot. Used both for the inline result preview (inside the
// quiz) and for the personal report page (/report/[token]). Pure presentation —
// every value is precomputed in buildReport().
export default function Report({ report, showClosing = true }: { report: ReportSnapshot; showClosing?: boolean }) {
  const res = report
  return (
    <div className="q-a">
      <div className="q-hero">
        <div className="q-ring" role="img" aria-label={`ציון מוכנות ${res.score} מתוך 100`}>
          <svg viewBox="0 0 148 148" aria-hidden="true">
            <circle cx="74" cy="74" r="62" fill="none" stroke="#FFFFFF" strokeOpacity=".16" strokeWidth="10" />
            <circle cx="74" cy="74" r="62" fill="none" stroke="#FF7A63" strokeWidth="10" strokeLinecap="round" strokeDasharray="389.56" strokeDashoffset={res.offset} />
          </svg>
          <b>{res.score}<small>מתוך 100</small></b>
        </div>
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          {res.org ? <p style={{ margin: '0 0 6px', color: '#FF7A63' }}>{res.org}</p> : null}
          <h3 style={{ margin: 0, fontSize: 'clamp(28px,4vw,36px)', lineHeight: 1.15, fontWeight: 500 }}>{res.pTitle}</h3>
          <p style={{ margin: '10px 0 0', color: '#E3E6F1' }}>{res.pDesc}</p>
        </div>
      </div>

      <div className="q-block">
        <h4>טווח הגיוס המשוער</h4>
        <div className="q-range">
          <div className="num">{res.low} עד {res.high}</div>
          <p>{res.verdict}</p>
        </div>
        {res.warn ? <div className="q-note" style={{ marginTop: 12 }}>{res.warn}</div> : null}
      </div>

      <div className="q-block">
        <h4>הפוטנציאל שלכם</h4>
        <p>כמות האנשים שסימנתם כפול התרומה של כל אחד.</p>
        <div className="rt" role="table" aria-label="פוטנציאל לפי רמת תרומה">
          <div className="rt-row head" role="row">
            <div role="columnheader">רמת תרומה</div>
            <div role="columnheader">אנשים</div>
            <div role="columnheader">ערך לתורם</div>
            <div role="columnheader">פוטנציאל</div>
          </div>
          {res.potRows.map((r, i) => (
            <div className="rt-row" role="row" key={i}>
              <div role="cell">{r.label}</div>
              <div role="cell">{r.people}</div>
              <div role="cell">{r.value}</div>
              <div role="cell">{r.potential}</div>
            </div>
          ))}
          <div className="rt-row total" role="row"><div role="cell">סך הכל</div><div role="cell" /><div role="cell" /><div role="cell">{res.potential}</div></div>
          <div className="rt-row total" role="row"><div role="cell">אחוז מימוש לפי הציון</div><div role="cell" /><div role="cell" /><div role="cell">{res.rateRange}</div></div>
          <div className="rt-row total" role="row"><div role="cell">כסף שכבר הובטח</div><div role="cell" /><div role="cell" /><div role="cell">{res.promised}</div></div>
        </div>
      </div>

      {res.soShow ? (
        <div className="q-block">
          <h4>הזדמנות בהוראות הקבע</h4>
          {res.soWorth ? <p>{res.soWorth}</p> : null}
          <ul className="q-list">{res.soAdvice.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      ) : null}

      <div className="q-block">
        <h4>מה צריך כדי להגיע ליעד</h4>
        <p>דוגמה לחלוקת היעד לפי רמות תרומה, מול מה שצפוי לכם בפועל.</p>
        <div className="rt" role="table" aria-label="תורמים נדרשים מול צפויים">
          <div className="rt-row head" role="row">
            <div role="columnheader">רמת תרומה</div>
            <div role="columnheader">תורמים נדרשים</div>
            <div role="columnheader">צפוי אצלכם</div>
            <div role="columnheader">מצב</div>
          </div>
          {res.pyrRows.map((r, i) => (
            <div className="rt-row" role="row" key={i}>
              <div role="cell">{r.label}</div>
              <div role="cell">{r.need}</div>
              <div role="cell">{r.have}</div>
              <div role="cell"><span className={'chip ' + (r.ok ? 'ok' : 'gap')}>{r.status}</span></div>
            </div>
          ))}
        </div>
      </div>

      <div className="q-block">
        <h4>3 דברים לעשות השבוע</h4>
        <ol className="q-list">{res.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      </div>

      {showClosing ? (
        <>
          <div className="q-closing">
            <h4>כדי להגיע ליעדים האלה צריך אסטרטגיה ותכנון מדויק</h4>
            <p>נעבור יחד על התוצאה ונבנה תוכנית לקמפיין שלכם.</p>
            <a className="q-hot pill" href={res.waUrl}>קדימה אני רוצה לגייס כפול &gt;</a>
          </div>
          <p style={{ margin: '16px 0 0', fontSize: 14, color: '#4A5375' }}>הטווח הוא הערכה ראשונית לפי התשובות שלכם, ולא התחייבות לסכום גיוס.</p>
        </>
      ) : null}
    </div>
  )
}
