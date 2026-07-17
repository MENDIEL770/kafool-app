import { Heebo } from 'next/font/google'
import { createClient } from '@/lib/supabase/server'
import Footer from './_components/Footer'
import Landing, { type LandingContent } from './_home/Landing'

// Scoped to the landing page only — the rest of the app keeps its own font.
const heebo = Heebo({ subsets: ['hebrew', 'latin'], weight: ['400', '500', '700', '800', '900'], display: 'swap' })

// Everything here is editable through the CMS (page_content, page='home').
// These defaults render as-is until rows exist, so the page never depends on the
// DB being seeded. NOTE: the stats below are public claims — set your real
// figures in the CMS.
const HOME_DEFAULTS: LandingContent = {
  hero_kicker: 'כפול בהשפעה. כפול בתוצאה.',
  hero_line1: 'הדרך החדשה',
  hero_line2: 'לגייס יותר.',
  hero_line3: 'להשפיע יותר.',
  hero_sub: 'כפול בהשפעה. כפול בתוצאה.',
  hero_text:
    'כפול היא פלטפורמת גיוס התרומות המתקדמת לעמותות, בתי חב״ד, מוסדות חינוך וקהילות — לגייס יותר, לנהל בקלות ולהשפיע באמת.',
  stats_raised: '₪42M+',
  stats_campaigns: '1,800+',
  stats_success: '96%',
  stats_donors: '2M+',
  trust_title: 'אלפי עמותות וקהילות בוחרות בכפול',
  features_title: 'מערכת מתקדמת שחוסכת זמן ומביאה תוצאות',
  cta_title: 'מוכנים להכפיל את ההשפעה שלכם?',
  cta_text: 'הצטרפו לעמותות שכבר נהנות מניהול קמפיין חכם — ותתחילו לגייס כבר היום.',
}

async function getContent(): Promise<{ c: LandingContent; logos: string[] }> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('page_content').select('key, value').eq('page', 'home')
    const c: LandingContent = { ...HOME_DEFAULTS }
    let logos: string[] = []
    for (const row of data || []) {
      if (!row.key || row.value == null) continue
      if (row.key === 'trust_logos') {
        try { logos = JSON.parse(row.value) } catch { logos = [] }
        continue
      }
      if (row.key in c) (c as unknown as Record<string, string>)[row.key] = row.value
    }
    return { c, logos }
  } catch {
    return { c: HOME_DEFAULTS, logos: [] }
  }
}

export default async function HomePage() {
  const { c, logos } = await getContent()
  return (
    <div className={`${heebo.className} min-h-screen`}>
      <Landing c={c} logos={logos} />
      <Footer />
    </div>
  )
}
