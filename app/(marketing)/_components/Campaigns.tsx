import { Loop } from './ui'

const Go = () => (
  <span className="go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M8 7h9v9" /></svg></span>
)

type Camp = { slug: string; cls: string; ar: string; title: string; sub: string }
const CAMPS: Camp[] = [
  { slug: 'einav', cls: 'ban', ar: '3840/2160', title: 'לבנה שבונה בית', sub: 'משכן קבע לבית חב״ד ענב' },
  { slug: 'skaya', cls: 'ban b2', ar: '750/480', title: 'חותמים לשנה טובה', sub: 'שותפות קבע בבית חב״ד סקיה, אור יהודה' },
  { slug: 'ogen', cls: 'ban b3', ar: '2576/1649', title: 'קובעים עוגן בשירגאו', sub: 'קונים את השטח לבית חב״ד בשירגאו' },
]

export default function Campaigns() {
  return (
    <section className="camps" id="campaigns" aria-labelledby="c-title">
      <div className="camps-g">
        <div>
          <div className="c-ico dk" data-iv><Loop /></div>
          <h2 className="h2 lines" id="c-title" data-rv>
            <span className="ln"><span style={{ '--i': 0 }}>קמפיינים</span></span>
            <span className="ln"><span style={{ '--i': 1 }}>שבחרו ׳כפול׳</span></span>
          </h2>
          <p className="c-body wf" data-wf>בתי חב״ד ומוסדות שבונים, קונים שטח וחותמים שותפויות עם דף גיוס של כפול. לחצו על באנר כדי לראות את הקמפיין.</p>
        </div>
        <ul className="c-cards">
          {CAMPS.map((c, i) => (
            <li data-iv style={{ '--dl': `${i * 140}ms` }} key={c.slug}>
              <a className={c.cls} href={`https://www.kafool.com/${c.slug}`} data-ban={c.slug}>
                <span className="im" style={{ '--ar': c.ar }}>
                  <span className="ph dk"><Loop /><b>{c.title}</b></span>
                </span>
                <span className="cap">
                  <span><b>{c.title}</b><span>{c.sub}</span></span>
                  <Go />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
