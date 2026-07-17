import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Footer from './_components/Footer'
import AnimatedKafoolLogo from './_components/AnimatedKafoolLogo'
import { Palette, ShieldCheck, Wallet, LayoutDashboard, Users, BarChart3, ArrowLeft } from 'lucide-react'

// Editable through the super-admin CMS (page_content, page='home'); these
// defaults render as-is until rows exist, so the landing page never depends on
// the DB being seeded.
const HOME_DEFAULTS: Record<string, string> = {
  hero_title: 'הפלטפורמה שמכפילה את ההשפעה שלכם',
  hero_subtitle:
    'כל מה שצריך כדי להפעיל קמפיין גיוס מצליח — דף גיוס מעוצב, סליקה מאובטחת בתוך האתר שלכם, כלי ניהול בזמן אמת וליווי מקצועי. בתמחור קבוע, בלי אחוזים מהתרומות.',
  services_title: 'השירותים שלנו',
  services_subtitle: 'הכל במקום אחד — מהעיצוב ועד השקל האחרון שנכנס.',
  how_title: 'איך זה עובד?',
  vision_title: 'החזון שלנו',
  vision_text:
    'אנחנו מאמינים שכל שקל שנתרם צריך להגיע ליעד שלו בדרך הקצרה והבטוחה ביותר — ושהטכנולוגיה צריכה לשרת את המטרה, לא לסבך אותה.',
}

async function getContent(): Promise<Record<string, string>> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('page_content').select('key, value').eq('page', 'home')
    if (!data || data.length === 0) return HOME_DEFAULTS
    const map: Record<string, string> = { ...HOME_DEFAULTS }
    for (const row of data) {
      if (row.key && row.value !== null && row.value !== undefined) map[row.key] = row.value
    }
    return map
  } catch {
    return HOME_DEFAULTS
  }
}

const SERVICES = [
  {
    Icon: Palette,
    title: 'דפי גיוס מעוצבים',
    text: 'עיצוב מותאם אישית לכל קמפיין — גרפיקה מקצועית, סרטונים, קבוצות ויעדים. אנחנו מקימים לכם את הדף.',
  },
  {
    Icon: ShieldCheck,
    title: 'תרומה בתוך האתר שלכם',
    text: 'כל תהליך התרומה רץ ב-iFrame מאובטח — התורם נשאר אצלכם לכל אורך הדרך, בלי הפניות לאתרים חיצוניים.',
  },
  {
    Icon: Wallet,
    title: 'תמחור הוגן — סכום קבוע',
    text: 'בלי אחוזים מכל תרומה. התמחור מוגדר מראש, כך שכל שקל שנתרם מגיע ליעד שלו — בלי הפתעות.',
  },
  {
    Icon: LayoutDashboard,
    title: 'ניהול וחמ״ל בזמן אמת',
    text: 'מעקב אחר יעדים, ניהול הקדשות, חלוקת לידים אוטומטית וחמ״ל חי — כל מה שצריך כדי לנהל קמפיין מנצח.',
  },
  {
    Icon: Users,
    title: 'טלפנים, קבוצות ולידים',
    text: 'נהלו צוותי טלפנים, חלקו לידים אוטומטית, ועקבו אחרי הביצועים של כל קבוצה וכל מתרים בנפרד.',
  },
  {
    Icon: BarChart3,
    title: 'אוטומציות ודוחות',
    text: 'תודות אוטומטיות ב-SMS ובמייל, תזכורות לתרומות שלא הושלמו, סקירת תנועה ודוחות מלאים בלחיצה.',
  },
]

const STEPS = [
  { n: '1', title: 'מקימים דף גיוס', text: 'אנחנו מעצבים ומקימים לכם דף קמפיין מרשים — כולל גרפיקה, יעדים וקבוצות.' },
  { n: '2', title: 'משתפים', text: 'שולחים לתורמים, לקבוצות ולמתרימים — בוואטסאפ, ב-SMS ובכל מקום.' },
  { n: '3', title: 'עוקבים בזמן אמת', text: 'רואים כל תרומה, כל יעד וכל טלפן — חי, מהדשבורד ומהחמ״ל.' },
]

const WHY = [
  'תמחור שקוף — סכום קבוע, בלי הפתעות',
  'כל שקל מגיע ליעד — אפס עמלות מהתרומות',
  'חוויית תרומה רציפה בתוך האתר שלכם',
  'גרפיקה וליווי מקצועי לכל קמפיין',
  'כלי ניהול מתקדמים וחמ״ל בזמן אמת',
  'מתאים לארגונים, מוסדות ויוזמות פרטיות',
]

export default async function HomePage() {
  const c = await getContent()

  return (
    <div dir="rtl" className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex justify-center mb-8">
            <AnimatedKafoolLogo className="w-56 sm:w-72 md:w-80 h-auto kafool-logo-float" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 mb-6 leading-tight">
            {c.hero_title}
          </h1>
          <p className="text-lg text-gray-600 mb-10 leading-relaxed">{c.hero_subtitle}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/contact"
              className="w-full sm:w-auto inline-block bg-blue-600 text-white font-black text-lg px-8 py-4 rounded-2xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
              הקימו דף גיוס ב-5 דקות
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-blue-700 font-bold text-lg px-8 py-4 rounded-2xl border border-blue-200 hover:bg-blue-50 transition-colors"
            >
              כניסה למערכת
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 text-center mb-3">{c.services_title}</h2>
          <p className="text-gray-500 text-center mb-12">{c.services_subtitle}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((s, i) => (
              <div
                key={i}
                className="bg-gray-50 rounded-3xl p-7 border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center mb-4">
                  <s.Icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-blue-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 text-center mb-12">{c.how_title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((s) => (
              <div key={s.n} className="bg-white rounded-3xl p-8 text-center shadow-sm">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white text-xl font-black flex items-center justify-center mx-auto mb-4">
                  {s.n}
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Kafool */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 text-center mb-12">למה כפול?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {WHY.map((item, i) => (
              <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-800 font-medium text-sm">{item}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/about" className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1">
              קראו עוד עלינו
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Vision */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-black text-gray-900 mb-6">{c.vision_title}</h2>
          <p className="text-lg text-gray-600 leading-relaxed">{c.vision_text}</p>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-blue-600 py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-3">מוכנים להתחיל?</h2>
          <p className="text-blue-100 mb-8">נקים לכם דף גיוס מרשים — ותתחילו לגייס כבר היום.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/contact"
              className="w-full sm:w-auto inline-block bg-white text-blue-600 font-black text-lg px-8 py-4 rounded-2xl hover:bg-blue-50 transition-colors shadow-lg"
            >
              הקימו דף גיוס עכשיו
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-block text-white font-bold text-lg px-8 py-4 rounded-2xl border border-white/40 hover:bg-white/10 transition-colors"
            >
              כניסה למערכת
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
