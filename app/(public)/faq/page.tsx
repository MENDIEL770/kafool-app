import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Footer from '../_components/Footer'
import FaqClient, { type FaqItem } from './FaqClient'

const FAQ_DEFAULTS: FaqItem[] = [
  { id: 'd1', question: 'מהי כפול?', answer: 'כפול היא פלטפורמה לניהול קמפייני גיוס תרומות. היא מאפשרת לארגונים, מוסדות ויחידים לבנות דף קמפיין מקצועי, לקבל תרומות באופן מאובטח ולנהל את כל התהליך ממקום אחד.', sort_order: 0, is_active: true },
  { id: 'd2', question: 'כמה זה עולה? איך עובד התמחור?', answer: 'התמחור אצלנו פשוט והוגן — סכום קבוע ומוגדר מראש, בלי אחוזים מהתרומות. כל שקל שנתרם מגיע במלואו ליעד, ואתם יודעים מראש בדיוק כמה תשלמו.', sort_order: 1, is_active: true },
  { id: 'd3', question: 'האם אתם גוזרים אחוזים מהתרומות?', answer: 'לא. בניגוד לפלטפורמות רבות, אנחנו לא לוקחים עמלה אחוזית מכל תרומה. אתם משלמים סכום קבוע — וזהו.', sort_order: 2, is_active: true },
  { id: 'd4', question: 'איך עובד תהליך התשלום?', answer: 'כל החיוב מתבצע באמצעות iFrame המוטמע ישירות בדף הקמפיין שלכם. התורם נשאר באתר שלכם לכל אורך התהליך, בלי הפניות לאתרים חיצוניים — חוויה רציפה, מאובטחת ואמינה.', sort_order: 3, is_active: true },
  { id: 'd5', question: 'האם התשלום מאובטח?', answer: 'כן. כל התרומות עוברות דרך מערכת סליקה מאובטחת, והנתונים מוצפנים. אנחנו שומרים על פרטיות התורמים ועל אבטחת המידע בקפדנות.', sort_order: 4, is_active: true },
  { id: 'd6', question: 'למי הפלטפורמה מתאימה?', answer: 'לכל גורם שמעוניין לגייס: מוסדות תורניים, עמותות, ארגוני חסד, מוסדות חינוך, גבאי צדקה ויוזמות פרטיות.', sort_order: 5, is_active: true },
  { id: 'd7', question: 'האם אתם עוזרים גם בעיצוב הדף?', answer: 'בהחלט. אנחנו מספקים שירותי גרפיקה, ייעוץ והכוונה — נעצב לכם דף קמפיין מרשים ונלווה אתכם באסטרטגיית הגיוס.', sort_order: 6, is_active: true },
  { id: 'd8', question: 'כמה זמן לוקח להקים קמפיין?', answer: 'אפשר להעלות דף גיוס בסיסי תוך כ-5 דקות. לקמפיינים מורכבים יותר הצוות שלנו מלווה אתכם בכל שלב.', sort_order: 7, is_active: true },
  { id: 'd9', question: 'אילו כלי ניהול אני מקבל כבעל קמפיין?', answer: 'מעקב אחר יעדים ותרומות, ניהול הקדשות, חלוקת לידים אוטומטית, תצוגת חמ"ל בזמן אמת, וכלים לשיתוף הקמפיין ברשתות החברתיות.', sort_order: 8, is_active: true },
  { id: 'd10', question: 'האם אפשר לקבל הקדשה על תרומה?', answer: 'כן. המערכת תומכת במודול הקדשות שמאפשר לתורמים להקדיש את תרומתם — לעילוי נשמה, לרפואה שלמה, להצלחה ועוד.', sort_order: 9, is_active: true },
  { id: 'd11', question: 'יש תמיכה אם נתקלתי בבעיה?', answer: 'בהחלט. צוות התמיכה שלנו זמין ללוות אתכם — מהקמת הקמפיין ועד סיומו. ניתן לפנות אלינו דרך עמוד צור קשר.', sort_order: 10, is_active: true },
]

async function getFaqItems(): Promise<FaqItem[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('faq_items')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
    if (!data || data.length === 0) return FAQ_DEFAULTS
    return data as FaqItem[]
  } catch {
    return FAQ_DEFAULTS
  }
}

export default async function FaqPage() {
  const items = await getFaqItems()

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-black text-gray-900 mb-4">שאלות ותשובות</h1>
          <p className="text-lg text-gray-600">כל מה שרציתם לדעת על כפול — במקום אחד</p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <FaqClient items={items} />
        </div>
      </section>

      <section className="py-16 px-4 bg-blue-600">
        <div className="max-w-2xl mx-auto text-center space-y-5">
          <h2 className="text-3xl font-black text-white">עדיין יש שאלות?</h2>
          <p className="text-blue-100 text-lg">הצוות שלנו כאן בשבילכם — נשמח לענות על כל שאלה</p>
          <Link
            href="/contact"
            className="inline-block bg-white text-blue-600 font-black text-base px-8 py-4 rounded-2xl hover:bg-blue-50 transition-colors shadow-lg"
          >
            דברו איתנו
          </Link>
        </div>
      </section>
    <Footer />
    </div>
  )
}
