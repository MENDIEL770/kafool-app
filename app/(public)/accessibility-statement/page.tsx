import Link from 'next/link'

export const metadata = { title: 'הצהרת נגישות — Kafool' }

export default function AccessibilityStatementPage() {
  const today = new Date().toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="max-w-3xl mx-auto px-4 py-12" dir="rtl" lang="he" id="main-content">
      <div className="space-y-8">
        <div>
          <div className="text-4xl mb-3">♿</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">הצהרת נגישות</h1>
          <p className="text-gray-500">עודכן לאחרונה: {today}</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 space-y-2">
          <h2 className="font-bold text-blue-800">רמת ציות</h2>
          <p className="text-blue-700 text-sm">
            Kafool פועלת בהתאם לדרישות <strong>תקן ישראלי 5568</strong> (המבוסס על WCAG 2.1 רמה AA)
            ו<strong>תקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות)</strong>.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-gray-800">אמצעי נגישות באתר</h2>
          <ul className="space-y-2 text-gray-600 text-sm">
            {[
              'שינוי גודל הטקסט עד פי 2 ללא איבוד תוכן',
              'מצב ניגודיות גבוהה למשתמשים עם לקויות ראייה',
              'תמיכה מלאה בניווט מקלדת',
              'תוויות ARIA לכל אלמנט אינטראקטיבי',
              'עצירת אנימציות ותנועה',
              'פונט קריא ורווח אותיות מוגדל',
              'סמן גדול למשתמשים עם קשיי מיקוד',
              'מצב תרומה נגיש — תהליך תרומה פשוט ללא הסחות',
              'דף "דלג לתוכן" לניווט מהיר',
              'תמיכה ב-VoiceOver ו-TalkBack',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-green-500 shrink-0">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-gray-800">מגבלות ידועות</h2>
          <p className="text-gray-600 text-sm">
            אנו עורכים בדיקות נגישות שוטפות. נכון לתאריך {today} לא ידועות לנו מגבלות נגישות משמעותיות.
            אם נתקלת בבעיה — נשמח לשמוע.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-gray-800">פרטי רכז נגישות</h2>
          <div className="bg-gray-50 rounded-2xl p-5 space-y-2 text-sm text-gray-700">
            <p><strong>שם:</strong> רכז הנגישות של Kafool</p>
            <p><strong>אימייל:</strong> <a href="mailto:accessibility@kafool.com" className="text-blue-600 hover:underline">accessibility@kafool.com</a></p>
            <p><strong>טלפון:</strong> <a href="tel:1800000000" className="text-blue-600 hover:underline" dir="ltr">1-800-000-000</a></p>
            <p><strong>שעות מענה:</strong> ימים א׳–ה׳, 9:00–17:00</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800">משוב ודיווח על בעיות נגישות</h2>
          <p className="text-gray-600 text-sm">נתקלת בבעיית נגישות? מלא את הטופס ונטפל בהקדם.</p>
          <form className="space-y-4 bg-gray-50 rounded-2xl p-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="a11y-name" className="text-sm font-medium text-gray-700">שם</label>
                <input id="a11y-name" type="text" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" required />
              </div>
              <div className="space-y-1">
                <label htmlFor="a11y-email" className="text-sm font-medium text-gray-700">אימייל</label>
                <input id="a11y-email" type="email" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" dir="ltr" required />
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="a11y-message" className="text-sm font-medium text-gray-700">תיאור הבעיה</label>
              <textarea id="a11y-message" rows={4} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none" required />
            </div>
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
              שלח משוב
            </button>
          </form>
        </section>

        <div className="pt-4 border-t border-gray-100">
          <Link href="/" className="text-sm text-blue-600 hover:underline">← חזרה לדף הבית</Link>
        </div>
      </div>
    </div>
  )
}
