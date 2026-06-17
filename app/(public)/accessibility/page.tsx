import Link from 'next/link'

export const metadata = { title: 'הצהרת נגישות — Kafool' }

const CONTACT_EMAIL = 'mendielharar@gmail.com'
const CONTACT_PHONE = '0535035770'

export default function AccessibilityPage() {
  const today = new Date().toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="max-w-3xl mx-auto px-4 py-12" dir="rtl" lang="he" id="main-content">
      <div className="space-y-8">
        <div>
          <div className="text-4xl mb-3">♿</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">הצהרת נגישות</h1>
          <p className="text-gray-500">עודכן לאחרונה: {today}</p>
        </div>

        <section className="space-y-3">
          <p className="text-gray-600 text-sm leading-relaxed">
            פלטפורמת <strong>Kafool (כפול)</strong> רואה חשיבות עליונה במתן שירות שוויוני לכלל הציבור, ופועלת
            להנגשת האתר ודפי הגיוס שמתארחים בו לאנשים עם מוגבלות, מתוך אמונה שלכל אדם מגיעה הזכות לתרום,
            לגייס ולהשתתף בפעילות בכבוד, בעצמאות ובנוחות.
          </p>
        </section>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 space-y-2">
          <h2 className="font-bold text-blue-800">רמת הציות</h2>
          <p className="text-blue-700 text-sm leading-relaxed">
            האתר הונגש בהתאם לדרישות <strong>תקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע״ג–2013</strong>,
            ולתקן הישראלי <strong>ת״י 5568</strong> לנגישות תכנים באינטרנט, המבוסס על הנחיות <strong>WCAG 2.1</strong> ברמה <strong>AA</strong>.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-gray-800">אמצעי הנגישות באתר</h2>
          <p className="text-gray-600 text-sm">בכל עמודי האתר זמין תפריט נגישות (סמל הנגישות בפינת המסך) המאפשר, בין היתר:</p>
          <ul className="space-y-2 text-gray-600 text-sm">
            {[
              'הגדלת גודל הטקסט עד פי 2 ללא איבוד תוכן או תפקודיות',
              'מצב ניגודיות גבוהה למשתמשים עם לקויות ראייה',
              'הדגשת קישורים והבלטתם',
              'מעבר לפונט קריא יותר (Arial) ורווח אותיות מוגדל',
              'תמיכה מלאה בניווט באמצעות מקלדת (Tab / Enter / Esc)',
              'תוויות ARIA ותיאורים חלופיים לאלמנטים אינטראקטיביים ולתמונות',
              'קישור "דלג לתוכן המרכזי" בראש העמוד',
              'מבנה כותרות היררכי וסמנטי לקריאה בעזרת קוראי מסך',
              'תאימות לקוראי מסך נפוצים, לרבות VoiceOver (iOS) ו-TalkBack (Android)',
              'תהליך תרומה פשוט וברור, ללא הסחות דעת מיותרות',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-green-500 shrink-0">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-gray-500 text-xs leading-relaxed">
            העדפות הנגישות שתבחר נשמרות בדפדפן שלך וייטענו אוטומטית בביקורים הבאים.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-gray-800">מגבלות ידועות</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            אנו עושים מאמץ מתמשך לשפר את נגישות האתר ועורכים בדיקות שוטפות. עם זאת, ייתכן שחלקים מסוימים —
            ובפרט תכנים שהועלו על ידי מנהלי קמפיינים (תמונות, קבצים מצורפים או סרטונים חיצוניים המוטמעים מצדדים שלישיים
            כגון YouTube) — טרם הונגשו במלואם או שאינם בשליטתנו המלאה. אנו פועלים לתקן ליקויים אלה ככל שהם מתגלים.
            נכון לתאריך {today} לא ידועות לנו מגבלות נגישות מהותיות נוספות.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-gray-800">פנייה לרכז הנגישות ודיווח על תקלה</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            אם נתקלת בבעיית נגישות, או שיש לך הצעה לשיפור — נשמח שתפנה אלינו. נטפל בפנייתך בהקדם האפשרי.
            בפנייתך נא לפרט את העמוד שבו נתקלת בבעיה, את מהות הבעיה, סוג הדפדפן והמכשיר שבהם השתמשת.
          </p>
          <div className="bg-gray-50 rounded-2xl p-5 space-y-2 text-sm text-gray-700">
            <p><strong>רכז הנגישות:</strong> מנדי אלהרר</p>
            <p><strong>דוא״ל:</strong> <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline" dir="ltr">{CONTACT_EMAIL}</a></p>
            <p><strong>טלפון:</strong> <a href={`tel:${CONTACT_PHONE}`} className="text-blue-600 hover:underline" dir="ltr">053-503-5770</a></p>
            <p><strong>שעות מענה:</strong> ימים א׳–ה׳, 09:00–18:00</p>
          </div>
          <p className="text-gray-500 text-xs leading-relaxed">
            אם פנייתך בנושא נגישות לא נענתה לשביעות רצונך, באפשרותך לפנות לנציבות שוויון זכויות לאנשים עם מוגבלות
            במשרד המשפטים.
          </p>
        </section>

        <div className="pt-4 border-t border-gray-100">
          <Link href="/" className="text-sm text-blue-600 hover:underline">← חזרה לדף הבית</Link>
        </div>
      </div>
    </div>
  )
}
