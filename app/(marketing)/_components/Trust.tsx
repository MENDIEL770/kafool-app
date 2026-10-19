import type { ReactNode } from 'react'

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

type Badge = { title: string; sub: string; icon: ReactNode }
const BADGES: Badge[] = [
  { title: 'הקמה מהירה', sub: 'תוך דקות ספורות', icon: <svg className="ic" viewBox="0 0 24 24" {...S}><path d="M13 3L5 14h6l-1 7 8-11h-6z" /></svg> },
  { title: 'תשלום קבוע מראש', sub: 'ללא עמלות סליקה', icon: <svg className="ic" viewBox="0 0 24 24" {...S}><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10h18M16 14.5h1.5" /></svg> },
  { title: 'תמיכה אישית', sub: 'צוות מקצועי זמין לכם', icon: <svg className="ic" viewBox="0 0 24 24" {...S}><path d="M4 15v-3a8 8 0 0 1 16 0v3" /><rect x="3" y="14" width="4" height="6" rx="1.5" /><rect x="17" y="14" width="4" height="6" rx="1.5" /></svg> },
  { title: 'אבטחה ברמה גבוהה', sub: 'הנתונים שלכם מוגנים', icon: <svg className="ic" viewBox="0 0 24 24" {...S}><path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z" /></svg> },
]

export default function Trust() {
  return (
    <section className="tbs" aria-label="למה כפול">
      <div className="tbs-in">
        <ul className="tb">
          {BADGES.map((b, i) => (
            <li data-iv style={{ '--dl': `${i * 80}ms` }} key={i}>
              <span className="tb-i">{b.icon}</span>
              <span><b>{b.title}</b><small>{b.sub}</small></span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
