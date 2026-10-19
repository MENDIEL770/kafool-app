import type { Metadata } from 'next'
import MarketingShell from '../../(marketing)/_components/MarketingShell'
import { Loop } from '../../(marketing)/_components/ui'
import InnerRuntime from '../../(marketing)/_components/InnerRuntime'

export const metadata: Metadata = {
  title: 'העיצובים שלנו · כפול',
  description: 'תיק העבודות של כפול — עיצובים, מודעות וקמפיינים שיצרנו ללקוחות שלנו.',
}

const BASE = 'https://dkvxbzxnqfqprkxuksqv.supabase.co/storage/v1/object/public/campaign-media/portfolio/'
type Work = { cat: string; link: string; title: string; img: string; ar: string }
const WORKS: Work[] = [
  { cat: 'מכירות', link: '/design/proj-vvhlwl', title: 'הסוד של הרבי', img: '289b87ad-9481-40d0-b3eb-6aec2613ffa3.jpg', ar: '4/5' },
  { cat: 'קמפיין גיוס', link: '/design/machzikim', title: 'מחזיקים את הגן של הרבי', img: '13534e72-0c6c-4cd5-8dcf-c5e155b5f6ae.png', ar: '1/1' },
  { cat: 'עיצוב ללקוח', link: '/design/barak', title: 'ברק גרוסברג', img: '3f753592-c67e-4ed4-8c52-c2c84a505cd2/11c724c9-bd11-4eea-925b-d6419f50c482.jpg', ar: '3/4' },
  { cat: 'עיצוב ללקוח', link: '/design/achot', title: 'אחות התמימים', img: '6c0db628-87d2-4fc5-88d1-7687c985c26e.jpg', ar: '4/5' },
  { cat: 'קמפיין גיוס', link: '/design/mimal', title: 'תל אביב מתחזקת', img: '15f49ed4-66a6-49f1-91b5-05cbf4dc104e.jpg', ar: '1/1' },
  { cat: 'מכירות', link: '/design/proj-nd9krj', title: 'עבודת מכירות', img: '0440dc9d-f7be-4660-85d3-d5394a7444af.jpg', ar: '3/4' },
  { cat: 'עיצוב ללקוח', link: '/design/proj-nezuot', title: 'עבודת עיצוב', img: '8e4b9a25-a898-451c-b27e-e29e5e5b5ce2.jpg', ar: '4/5' },
  { cat: 'עיצוב ללקוח', link: '', title: 'עבודת עיצוב', img: 'aa5a3ec6-0794-41c8-889c-755191e5ae1b.png', ar: '1/1' },
  { cat: 'מיתוג', link: '/design/proj-j2q2ie', title: 'מגמות · ישיבת חב״ד יצהר', img: '5f361295-7277-430a-8612-d9e6ef955060/8078b309-fc5e-4479-8b83-7f25632f6090.jpg', ar: '3/4' },
  { cat: 'קמפיין גיוס', link: '/design/levena', title: 'לבנה שבונה בית', img: 'e2562ee5-7a90-4670-bd85-a58ea083f15f.jpg', ar: '4/5' },
  { cat: 'מיתוג', link: '', title: 'מיתוג', img: 'bc1a8aa8-43be-4535-ab4f-874612146222.jpg', ar: '1/1' },
  { cat: 'עיצוב ללקוח', link: '', title: 'עבודת עיצוב', img: '42eb73f8-1120-4b50-8848-615ebfb01d33.jpg', ar: '3/4' },
  { cat: 'עיצוב ללקוח', link: '', title: 'עבודת עיצוב', img: 'b0eb5957-fb1d-489b-8252-bfda4673edd2.jpg', ar: '4/5' },
  { cat: 'מכירות', link: '/design/proj-vg9fye', title: 'משחק קופסה', img: 'e738a098-c091-4df7-9970-447c280b0b78.jpg', ar: '1/1' },
  { cat: 'מיתוג', link: '/design/proj-yj0rl7', title: 'קורסים · ממעל ממש', img: '1c80396e-b767-411d-81d6-70966d71994c/67133ef8-9c3f-4a9d-8522-463df6877cef.jpg', ar: '3/4' },
  { cat: 'מיתוג', link: '/design/proj-pc1127', title: 'סופ״ש רוחני', img: '9456b407-f1fc-42ef-b084-3d105178fde0.jpg', ar: '4/5' },
  { cat: 'מכירות', link: '', title: 'מכירות', img: '9ef7b65f-89b1-4820-88f3-a7f8f6eeeebc.jpg', ar: '1/1' },
  { cat: 'עיצוב ללקוח', link: '', title: 'עבודת עיצוב', img: '63839be8-6cf8-418b-83cc-f823646b80fd.jpg', ar: '3/4' },
  { cat: 'עיצוב ללקוח', link: '', title: 'עבודת עיצוב', img: 'a8006853-5b6f-4bb2-8c2c-f5e3c5077d9b.jpg', ar: '4/5' },
  { cat: 'מיתוג', link: '/design/proj-dm0fvg', title: 'מיתוג', img: '6910d319-2081-452b-b163-7783ee268998.jpg', ar: '1/1' },
  { cat: 'עיצוב ללקוח', link: '', title: 'עבודת עיצוב', img: '0de5c148-caac-4084-9fec-32f23c4cc126.jpg', ar: '3/4' },
  { cat: 'עיצוב ללקוח', link: '/design/proj-mnrgl0', title: 'עבודת עיצוב', img: 'dfa4f684-2268-4164-b4c6-3a7c92a140b9.jpg', ar: '4/5' },
]
const FILTERS: [string, number][] = [['הכל', 22], ['מכירות', 4], ['קמפיין גיוס', 3], ['עיצוב ללקוח', 10], ['מיתוג', 5]]
const Lp = () => <svg className="lp-svg" viewBox="0 0 1400 840" aria-hidden="true"><use href="#kf-loop" /></svg>

export default function DesignsPage() {
  return (
    <MarketingShell>
      <main className="pg" data-page="designs">
        <header className="pg-hero">
          <div className="loopbg" aria-hidden="true"><Lp /></div>
          <span className="eyebrow rv">העיצובים שלנו</span>
          <h1 className="pg-t rv" style={{ '--d': '80ms' }}>תיק העבודות<span>שלנו.</span></h1>
          <p className="pg-sub rv" style={{ '--d': '160ms' }}>עיצובים, מודעות וקמפיינים שיצרנו ללקוחות שלנו. לחצו על עבודה כדי לראות אותה בגדול.</p>
        </header>
        <section className="pg-sec"><div className="pg-in">
          <div className="ds-f" role="group" aria-label="סינון">
            {FILTERS.map(([f, n], i) => <button type="button" data-f={f} aria-pressed={i === 0} key={f}>{f}<b>{n}</b></button>)}
          </div>
          <div className="ds-g">
            {WORKS.map((w, i) => (
              <button type="button" className="ds-c rv" data-cat={w.cat} data-i={i} data-link={w.link} style={{ '--d': `${(i % 6) * 50}ms` }} key={i}>
                <span className="ds-im">
                  <img loading="lazy" decoding="async" alt={w.title} data-src={BASE + w.img} />
                  <span className={`ds-ph c${i % 4}`} style={{ '--ar': w.ar }}><Lp /><b>{w.title}</b><small>{w.cat}</small></span>
                </span>
                <span className="ds-cap"><b>{w.title}</b><span className="ds-tag">{w.cat}</span></span>
              </button>
            ))}
          </div>
        </div></section>
      </main>

      <div className="lb" id="lb" hidden role="dialog" aria-modal="true" aria-label="תצוגת עבודה">
        <div className="lb-bg" data-lbx />
        <button type="button" className="lb-x" data-lbx aria-label="סגירה"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        <button type="button" className="lb-nav p" data-lbn="-1" aria-label="הקודם"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg></button>
        <button type="button" className="lb-nav n" data-lbn="1" aria-label="הבא"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg></button>
        <div className="lb-p"><div className="lb-im" id="lb-im" /><div className="lb-cap"><b id="lb-t" /><span className="ds-tag" id="lb-c" /><a className="pill light sm" id="lb-a" target="_blank" rel="noopener">לפרויקט המלא</a></div></div>
      </div>
      <InnerRuntime />
    </MarketingShell>
  )
}
