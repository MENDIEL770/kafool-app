import Link from 'next/link'

export const metadata = { title: 'מדיניות פרטיות — Kafool' }

const CONTACT_EMAIL = 'mendielharar@gmail.com'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-gray-800">{title}</h2>
      <div className="text-gray-600 text-sm leading-relaxed space-y-3">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  const today = new Date().toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="max-w-3xl mx-auto px-4 py-12" dir="rtl" lang="he" id="main-content">
      <div className="space-y-8">
        <div>
          <div className="text-4xl mb-3">🔒</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">מדיניות פרטיות</h1>
          <p className="text-gray-500">עודכן לאחרונה: {today}</p>
        </div>

        <Section title="1. כללי">
          <p>
            פלטפורמת <strong>Kafool (כפול)</strong> (להלן: &quot;הפלטפורמה&quot;, &quot;אנחנו&quot; או &quot;כפול&quot;),
            המופעלת באמצעות האתר <strong>kafool.com</strong>, מכבדת את פרטיות המשתמשים בה — תורמים, מנהלי קמפיינים, ארגונים וגולשים (להלן: &quot;המשתמש&quot; או &quot;אתה&quot;).
            מדיניות זו מתארת כיצד אנו אוספים, משתמשים, שומרים ומגנים על המידע, והיא נכתבה בלשון זכר מטעמי נוחות בלבד אך מופנית לכל המגדרים.
          </p>
          <p>
            השימוש בפלטפורמה מהווה הסכמה לתנאי מדיניות זו. אם אינך מסכים לתנאים — נא להימנע משימוש בשירות.
          </p>
        </Section>

        <Section title="2. המידע שאנו אוספים">
          <p>במסגרת השימוש בפלטפורמה אנו עשויים לאסוף את סוגי המידע הבאים:</p>
          <ul className="list-disc pr-5 space-y-1.5">
            <li><strong>מידע שאתה מוסר ביוזמתך</strong> — שם, מספר טלפון, כתובת דוא״ל והקדשה בעת ביצוע תרומה או הקמת קבוצת גיוס.</li>
            <li><strong>מידע על תרומות</strong> — סכום התרומה, מועדה והקמפיין/הקבוצה שאליהם שויכה.</li>
            <li><strong>פרטי משתמשים רשומים</strong> — מנהלי קמפיינים וארגונים: שם מלא, דוא״ל, טלפון ופרטי הארגון.</li>
            <li><strong>מידע טכני</strong> — כתובת IP, סוג הדפדפן והמכשיר, ונתוני שימוש ועמודים שנצפו, הנאספים באופן אוטומטי.</li>
            <li><strong>קובצי Cookie</strong> ואחסון מקומי (Local Storage) — לרבות שמירת העדפות נגישות ושמירת מצב התחברות.</li>
          </ul>
          <p>
            <strong>פרטי אמצעי תשלום (כרטיס אשראי):</strong> תהליך הסליקה מתבצע באמצעות ספק סליקה חיצוני ומאובטח.
            <strong> איננו אוספים, רואים או שומרים את פרטי כרטיס האשראי שלך</strong> בשרתי הפלטפורמה.
          </p>
        </Section>

        <Section title="3. השימוש במידע">
          <p>אנו עושים שימוש במידע למטרות הבאות:</p>
          <ul className="list-disc pr-5 space-y-1.5">
            <li>ביצוע התרומה והנפקת אישור/קבלה.</li>
            <li>הצגת התרומה בפיד התורמים הציבורי (שם וסכום) — ראה סעיף &quot;פרסום ופומביות&quot; להלן.</li>
            <li>תקשורת עם המשתמש, לרבות שליחת קישורים, הודעות SMS ועדכונים הקשורים לקמפיין.</li>
            <li>תפעול, אבטחה ושיפור של הפלטפורמה ומניעת שימוש לרעה והונאות.</li>
            <li>עמידה בדרישות הדין ובהוראות רשויות מוסמכות.</li>
          </ul>
        </Section>

        <Section title="4. פרסום ופומביות של תרומות">
          <p>
            שים לב: בעת ביצוע תרומה, שם התורם וסכום התרומה (וכן הקדשה, אם הוזנה) עשויים להופיע באופן
            <strong> פומבי </strong> בעמוד הגיוס — ב&quot;קהילת התורמים&quot; ובחלוניות עדכון. אם אינך מעוניין ששמך יוצג,
            ניתן לתרום כ&quot;אנונימי&quot; או לפנות אלינו להסרת הפרט.
          </p>
        </Section>

        <Section title="5. מסירת מידע לצדדים שלישיים">
          <p>איננו מוכרים ואיננו משכירים את המידע. מידע עשוי להימסר לצדדים שלישיים במקרים הבאים בלבד:</p>
          <ul className="list-disc pr-5 space-y-1.5">
            <li><strong>ספקי שירות</strong> — ספק סליקת תשלומים, שירותי אירוח וענן, ושירות משלוח הודעות SMS, ככל שהדבר נדרש לאספקת השירות.</li>
            <li><strong>הארגון / מנהל הקמפיין</strong> שאליו ביצעת את התרומה, לצורך ניהול הקמפיין והפקת קבלות.</li>
            <li><strong>חובה שבדין</strong> — מכוח צו שיפוטי או דרישת רשות מוסמכת.</li>
          </ul>
        </Section>

        <Section title="6. אבטחת מידע">
          <p>
            אנו נוקטים אמצעים מקובלים להגנה על המידע, לרבות העברה מוצפנת (HTTPS/TLS) ובקרת הרשאות גישה.
            עם זאת, אין באפשרותנו להבטיח חסינות מוחלטת מפני חדירה או שימוש בלתי מורשה, ואיננו אחראים לנזק שייגרם
            כתוצאה מאירוע אבטחה שאינו בשליטתנו הסבירה.
          </p>
        </Section>

        <Section title="7. קובצי Cookie">
          <p>
            הפלטפורמה משתמשת בעוגיות ובאחסון מקומי לצורך תפעול תקין, שמירת העדפות (כגון הגדרות נגישות) וניתוח שימוש.
            ניתן לחסום או למחוק עוגיות דרך הגדרות הדפדפן, אך הדבר עלול לפגוע בחלק מהפונקציונליות.
          </p>
        </Section>

        <Section title="8. זכויותיך במידע">
          <p>
            בהתאם ל<strong>חוק הגנת הפרטיות, התשמ״א–1981</strong>, אתה זכאי לעיין במידע המוחזק אודותיך, לבקש את תיקונו
            או מחיקתו. לבקשות בנושא זה ניתן לפנות אלינו בכתובת הדוא״ל המופיעה בתחתית עמוד זה.
          </p>
        </Section>

        <Section title="9. שמירת מידע">
          <p>
            המידע יישמר כל עוד הוא נדרש למטרות שלשמן נאסף, או כפי שנדרש על פי דין (לדוגמה, חובות שמירת תיעוד
            חשבונאי וקבלות על תרומות).
          </p>
        </Section>

        <Section title="10. קטינים">
          <p>
            השירות אינו מיועד לשימוש על ידי קטינים מתחת לגיל 18 ללא הסכמת הורה או אפוטרופוס. אם נודע לנו כי נאסף
            מידע מקטין ללא הסכמה כאמור, נפעל למחיקתו.
          </p>
        </Section>

        <Section title="11. שינויים במדיניות">
          <p>
            אנו רשאים לעדכן מדיניות זו מעת לעת. הנוסח המעודכן יפורסם בעמוד זה ויחול ממועד פרסומו. מומלץ לעיין
            במדיניות מעת לעת.
          </p>
        </Section>

        <Section title="12. יצירת קשר">
          <p>
            בכל שאלה או בקשה בנושא פרטיות ניתן לפנות אלינו בדוא״ל:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline" dir="ltr">{CONTACT_EMAIL}</a>.
          </p>
        </Section>

        <div className="pt-4 border-t border-gray-100 flex gap-4">
          <Link href="/terms" className="text-sm text-blue-600 hover:underline">תנאי שימוש</Link>
          <Link href="/" className="text-sm text-blue-600 hover:underline">← חזרה לדף הבית</Link>
        </div>
      </div>
    </div>
  )
}
