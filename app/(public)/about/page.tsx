import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Footer from '../_components/Footer'
import AnimatedKafoolLogo from '../_components/AnimatedKafoolLogo'

const ABOUT_DEFAULTS: Record<string, string> = {
  hero_title: 'כפול — הפלטפורמה שמכפילה את ההשפעה שלכם',
  hero_subtitle:
    'כפול נולדה מתוך הבנה פשוטה: לכל ארגון, מוסד ויוזמה מגיע כלי גיוס שעובד בשבילם — לא נגדם. בנינו פלטפורמה שמאחדת את כל מה שצריך כדי להפעיל קמפיין גיוס מצליח.',
  pricing_title: 'תשלום הוגן — בסכום קבוע, בלי אחוזים',
  pricing_text:
    'בניגוד לפלטפורמות אחרות שגוזרות אחוזים מכל תרומה, אצלנו התמחור פשוט וברור: סכום מוגדר מראש. כל שקל שנתרם מגיע ליעד שלו — בלי הפתעות ובלי עמלות שנגרעות מהקמפיין.',
  iframe_title: 'תרומה חלקה, מאובטחת ובתוך האתר שלכם',
  iframe_text:
    'כל החיוב אצלנו עובד באמצעות iFrame — כלומר התורם נשאר אצלכם, בתוך דף הקמפיין, לכל אורך תהליך התרומה. אין הפניות לאתרים חיצוניים.',
  services_title: 'לא רק טכנולוגיה — גם ליווי מלא',
  services_text:
    'מעבר לפלטפורמה, אנחנו מספקים שירותי גרפיקה, ייעוץ והכוונה. נעצב לכם דף קמפיין מרשים, נסייע בבניית המסר, ונלווה אתכם באסטרטגיית הגיוס.',
  tools_title: 'כלי ניהול חכמים',
  tools_text:
    'מעקב אחר יעדים, ניהול הקדשות, חלוקת לידים אוטומטית, וחמ"ל בזמן אמת — כל מה שצריך כדי לנהל קמפיין מנצח.',
  vision_title: 'החזון שלנו',
  vision_text:
    'אנחנו מאמינים שכל שקל שנתרם צריך להגיע ליעד שלו בדרך הקצרה והבטוחה ביותר — ושהטכנולוגיה צריכה לשרת את המטרה, לא לסבך אותה.',
  cta_text: 'הקימו דף גיוס ב-5 דקות',
}

async function getContent(): Promise<Record<string, string>> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('page_content')
      .select('key, value')
      .eq('page', 'about')
    if (!data || data.length === 0) return ABOUT_DEFAULTS
    const map: Record<string, string> = { ...ABOUT_DEFAULTS }
    for (const row of data) {
      if (row.key && row.value !== null && row.value !== undefined) {
        map[row.key] = row.value
      }
    }
    return map
  } catch {
    return ABOUT_DEFAULTS
  }
}

export default async function AboutPage() {
  const c = await getContent()

  const featureCards = [
    {
      icon: '',
      title: c.pricing_title,
      text: c.pricing_text,
    },
    {
      icon: '',
      title: c.iframe_title,
      text: c.iframe_text,
    },
    {
      icon: '',
      title: c.services_title,
      text: c.services_text,
    },
    {
      icon: '',
      title: c.tools_title,
      text: c.tools_text,
    },
  ]

  const whyItems = [
    'תמחור שקוף — סכום קבוע, בלי הפתעות',
    'כל שקל מגיע ליעד — אפס עמלות מהתרומות',
    'חוויית תרומה רציפה בתוך האתר שלכם',
    'גרפיקה וליווי מקצועי לכל קמפיין',
    'כלי ניהול מתקדמים וחמ"ל בזמן אמת',
    'מתאים לארגונים, מוסדות ויוזמות פרטיות',
  ]

  return (
    <div dir="rtl" className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          {/* animated logo (looping) in place of the word "כפול" */}
          <div className="flex justify-center mb-8">
            <AnimatedKafoolLogo className="w-56 sm:w-72 md:w-80 h-auto kafool-logo-float" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 mb-6 leading-tight">
            הפלטפורמה שמכפילה את ההשפעה שלכם
          </h1>
          <p className="text-lg text-gray-600 mb-10 leading-relaxed">
            {c.hero_subtitle}
          </p>
          <Link
            href="/contact"
            className="inline-block bg-blue-600 text-white font-black text-lg px-8 py-4 rounded-2xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            אני רוצה להקים דף גיוס ב-5 דקות
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 text-center mb-12">
            מה מקבלים עם כפול?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featureCards.map((card, i) => (
              <div
                key={i}
                className="bg-gray-50 rounded-3xl p-8 border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all"
              >
                {card.icon && <div className="text-4xl mb-4">{card.icon}</div>}
                <h3 className="text-xl font-black text-gray-900 mb-3">{card.title}</h3>
                <p className="text-gray-600 leading-relaxed">{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Kafool */}
      <section className="py-20 px-4 bg-blue-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 text-center mb-12">
            למה כפול?
          </h2>
          <div className="space-y-4">
            {whyItems.map((item, i) => (
              <div key={i} className="flex items-start gap-3 bg-white rounded-2xl p-5 shadow-sm">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-800 font-medium">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-black text-gray-900 mb-6">{c.vision_title}</h2>
          <p className="text-lg text-gray-600 leading-relaxed">{c.vision_text}</p>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-blue-600 py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-8">מוכנים להתחיל?</h2>
          <Link
            href="/contact"
            className="inline-block bg-white text-blue-600 font-black text-lg px-8 py-4 rounded-2xl hover:bg-blue-50 transition-colors shadow-lg"
          >
            הקימו דף גיוס עכשיו
          </Link>
        </div>
      </section>
    <Footer />
    </div>
  )
}
