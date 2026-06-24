# תוכנית שילוב Kafool+ (טלפניה) לתוך Kafool

מקור: `~/Documents/כפול/כפול +` (Next 15, mock zustand). יעד: ריפו Kafool הקיים.
היקף: **טלפניה בלבד**. אסטרטגיה: **לבנות חדש בצד, להשאיר את הישן עובד, ולעשות cutover בסוף.**

## החלטות שאושרו
- **לא דורסים את הישן** — בונים מקביל (`kp_*` + `/plus/*`), הישן (`kafoolplus_*` + `/kafool-plus`) ממשיך לעבוד עד cutover.
- **מנט:** `/plus/*` פנימי + תת-דומיין **plus.kafool.com** (rewrite).
- **תוכנית מלאה קודם** (המסמך הזה), ואז ביצוע שלב-אחר-שלב עם אישור.

## עקרונות מיזוג (לא לשכפל תשתית)
- `organizations` → **הטבלה הקיימת של Kafool** (כולל `has_kafool_plus`). כל ישות נושאת `org_id`.
- משתמשים → **`profiles` + Supabase Auth (Google) הקיימים**. אין auth שני. אין login מדומה.
- `members` → טבלת חברות/תפקיד חדשה `kp_members`, ממופה ל-`auth.users`/`profiles` לפי מייל (claim בכניסה ראשונה — אותו דפוס כמו `lib/kafoolplus.ts` הקיים).

## מיפוי טבלאות (סכמת המקור → Kafool, עם prefix `kp_`)
| מקור | יעד | הערות |
|---|---|---|
| `organizations` | (קיים) `organizations` | לא נוצר מחדש |
| `members` | `kp_members` | org_id, email, user_id→auth, role enum (manager/coordinator/caller), kp_campaign_id, kp_caller_group_id, status, is_active |
| `campaigns` | `kp_campaigns` | היררכיית מוקד (parent_campaign_id), `linked_kafool_campaign_id`→`campaigns.id` של Kafool |
| `campaign_branding` | `kp_campaign_branding` | |
| `branding_presets` | `kp_branding_presets` | |
| `caller_groups` | `kp_caller_groups` | |
| `leads` | `kp_leads` | |
| `calls` | `kp_calls` | |
| `promises` | `kp_promises` | |
| `reminders` | `kp_reminders` | |
| `message_templates` | `kp_message_templates` | |

> השמות `campaigns`/`members` תפוסים ב-Kafool → לכן prefix `kp_`.

## החלפת ה-store (zustand mock) בשכבת נתונים אמיתית
מימוש כל פעולה מול Supabase, **באותן חתימות**, עטוף ב-hooks כדי שה-UI לא ישתנה.

| פעולת store | מימוש Supabase |
|---|---|
| `membershipsFor(email)` | `kp_members` where email, פעיל/ממתין |
| `requestJoin / approveMember / rejectMember / addMember` | insert/update `kp_members` (+ claim user_id בכניסה) |
| `addEmailPool / approveToPool / assignFromPool` | bulk insert `kp_members` (pending) → update role/scope |
| `addCallerGroup / updateCallerGroup` | insert/update `kp_caller_groups` (+ public_slug ייחודי) |
| `importLeads` (Excel) | bulk insert `kp_leads` + דה-דופ לפי טלפון |
| `assignLeadsEvenly / assignLead / setCallDecision` | update `kp_leads.assigned_caller_group_id` |
| `updateLead / deleteLead / setLeadStatus` | update/delete `kp_leads` (+ cascade calls) |
| `logCall` | insert `kp_calls` + update `kp_leads.status` |
| `addPromise` | insert `kp_promises` (+ סטטוס lead='promised') |
| `addReminder / updateReminder` | insert/update `kp_reminders` |
| `updateBranding` | upsert `kp_campaign_branding` (מדיה→Storage) |

מימוש כ-API routes תחת `app/api/plus/*` או Server Actions, עם service-client + בדיקות scope (manager/coordinator/caller) — בדיוק כמו ה-Kafool+ הקיים.

## Auth + סקופ
- Reuse `/kafool-plus-login` (Google) + `/auth/callback`.
- פונקציית קונטקסט חדשה `getPlusContext` (מבוססת על `getKafoolPlusContext` הקיים) שקוראת מ-`kp_members`: super-admin=god, owner=manager מובלע, אחרת לפי השורה. claim לפי מייל בכניסה ראשונה.
- חסום מאחורי `has_kafool_plus` (כבר נבנה). טלפנים/רכזים נעולים למודול.

## קוד נייד 1:1 (להעתיק עם התאמת imports בלבד)
- מסכים: `src/app/{caller,coordinator,manager/*,admin}` → `app/(dashboard)/plus/*`
- קומפוננטות: `AppShell, ThemeRoot, ui, CallbackPicker, ManagerNav, Logo`
- ספרייה טהורה: `types, theme, dialer, hebrewDate, notify, presets`
- `charidy.ts` → לחבר ל-API/דוחות תרומות אמיתיים של Kafool (או `linked_kafool_campaign_id`)
- **למחוק:** `store.ts, seed.ts, useAuth.ts, app/page.tsx` (login מדומה)

## מדיה
לוגו/באנר/רקע: dataURL → העלאה אמיתית ל-Supabase Storage scoped ל-org (במסך branding).

## שלבי ביצוע (כל שלב = commit + build + אישור)
0. **Scaffolding** — להעתיק `types/theme/dialer/hebrewDate/notify/presets` + קומפוננטות לתוך `app/(dashboard)/plus/_lib` + `_components` (בלי wiring).
1. **DB** — מיגרציות `kp_*` + RLS (לצד הישן). אספק SQL להרצה ידנית.
2. **שכבת נתונים** — `app/api/plus/*` / server actions, באותן חתימות store.
3. **Auth** — `getPlusContext` מול `kp_members`.
4. **מסכים** — port לפי הסדר: caller → coordinator → manager (import/filter/assign/members/branding/callers) → admin. החלפת store→data layer.
5. **מדיה ל-Storage**.
6. **Charidy/תרומות** — חיבור אמיתי.
7. **מנט + cutover** — `/plus/*` + גייט `has_kafool_plus`; rewrite `plus.kafool.com`→`/plus`; הפניית התפריט מ-`/kafool-plus` ל-`/plus`; השבתת/מחיקת הישן (בסוף, בנפרד).
8. **QA** — בידוד org (RLS), סקופ תפקידים, מאגר→שיוך, חזרות+תזכורות (דילוג שבת), תצוגה מקדימה חיה, ייבוא Excel + דה-דופ.

## סיכונים
- התנגשות שמות (פתור ע"י `kp_`).
- `charidy` בדמו — דורש החלטה: לחבר לדוחות Kafool או להשאיר stub בשלב 1.
- תת-דומיין: דורש הגדרת DNS + דומיין ב-Vercel + middleware rewrite (שלב 7).
