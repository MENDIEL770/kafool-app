// 0% platform fees. The digit roll + "%" pop are pure CSS, triggered when
// `.z-in` gets `.on` from the scroll-reveal observer.
const REEL = Array.from({ length: 4 }).flatMap(() => [9, 8, 7, 6, 5, 4, 3, 2, 1, 0])

export default function Zero() {
  return (
    <section className="zero" id="zero" aria-labelledby="z-t">
      <div className="z-in" data-iv>
        <div className="z-copy">
          <p className="z-eye">בלי אותיות קטנות</p>
          <h2 className="z-h" id="z-t"><b className="sr-only">0% </b>עמלות סליקה <span>לפלטפורמה שלנו.</span></h2>
          <p className="z-p">כפול לא לוקחים אחוז מאף תרומה. הכסף נסלק ישר לחשבון של המוסד, דרך חברת הסליקה שלכם.</p>
          <ul className="z-pv" aria-label="חברות סליקה"><li>קשר</li><li>נדרים פלוס</li><li>קארדקום</li><li>Stripe</li></ul>
        </div>
        <div className="z-num" aria-hidden="true">
          <i className="z-glow" />
          <span className="z-win"><span className="z-reel">{REEL.map((d, i) => <span key={i}>{d}</span>)}</span></span>
          <em className="z-pct">%</em>
        </div>
      </div>
    </section>
  )
}
