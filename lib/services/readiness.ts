// Campaign-readiness questionnaire — the single source of truth for the question
// set, the donor tiers and the scoring formula. Ported verbatim from the approved
// prototype (Main.dc.html). The browser may show a live preview, but the SAVED
// score/range is always recomputed here on the server.
//
// Formula values are OPENING ASSUMPTIONS, not yet calibrated — keep them here,
// in one editable place.

export type Answers = Record<string, number> // question id → chosen option index

export type Tier = { id: string; label: string; value: number; share: number }

export const TIERS: Tier[] = [
  { id: 't1000', label: '1,000 ₪ × 12 חודשים', value: 12000, share: 0.25 },
  { id: 't500', label: '500 ₪ × 12 חודשים', value: 6000, share: 0.2 },
  { id: 't180', label: '180 ₪ ומעלה × 12 חודשים', value: 2160, share: 0.25 },
  { id: 't100', label: '100 ₪ × 12 חודשים', value: 1200, share: 0.15 },
  { id: 't50', label: '50 ₪ × 12 חודשים', value: 600, share: 0.1 },
  { id: 'tfree', label: 'סכום חופשי עד 350 ₪', value: 350, share: 0.05 },
]

// Counts/midpoints shared by the six "how many people can give X" tier questions.
const COUNTS = ['0', '1–3', '3–5', '5–10', '10–20', '20–30', '30–50', '50–70', '70–100', '100–150', '150–250', 'מעל 250']
const MIDS = [0, 2, 4, 8, 15, 25, 40, 60, 85, 125, 200, 300]

export type Question = {
  id: string
  group: string
  title: string
  options: string[]
  points?: number[]
  values?: number[]
  skipIf?: (a: Answers) => boolean
}

export const QS: Question[] = [
  { id: 'why', group: 'הסיבה', title: 'למה אתם יוצאים לקמפיין?', options: ['בנייה או רכישת מקום', 'תקציב שוטף', 'פרויקט חדש', 'כיסוי חוב'] },
  { id: 'deadline', group: 'הסיבה', title: 'יש תאריך יעד אמיתי?', options: ['כן, ויש דחיפות', 'יש תאריך, אבל גמיש', 'עדיין לא'], points: [2, 1, 0] },
  { id: 'list', group: 'הקהל', title: 'איך נראית רשימת אנשי הקשר שלכם?', options: ['מסודרת באקסל', 'מפוזרת בטלפונים ובקבוצות', 'כמעט אין רשימה'], points: [15, 7, 0] },
  { id: 'contacts', group: 'הקהל', title: 'כמה אנשי קשר יש לכם?', options: ['עד 500', '500–2,000', '2,000–10,000', 'מעל 10,000'], values: [250, 1250, 6000, 15000] },
  { id: 'touched', group: 'הקהל', title: 'עם כמה אנשים הייתם בקשר בשנה האחרונה?', options: ['עד 100', '100–500', '500–1,000', '1,000–2,000', 'מעל 2,000'], values: [50, 300, 750, 1500, 3000], points: [2, 5, 7, 8, 10] },
  { id: 'donors', group: 'הקהל', title: 'כמה אנשים תרמו לכם בשנה האחרונה?', options: ['עד 20', '20–50', '50–100', '100–200', '200–500', 'מעל 500'], points: [1, 3, 5, 7, 9, 10] },
  { id: 'biggest', group: 'הקהל', title: 'מה התרומה הגדולה ביותר שקיבלתם?', options: ['עד 1,000 ₪', '1,000–2,500 ₪', '2,500–5,000 ₪', '5,000–10,000 ₪', '10,000–25,000 ₪', '25,000–50,000 ₪', 'מעל 50,000 ₪'] },
  { id: 'soCount', group: 'הוראות קבע', title: 'מכמה אנשים יש לכם הוראות קבע?', options: ['אין', 'עד 20', '20–100', 'מעל 100'], points: [0, 2, 4, 5] },
  { id: 'soSum', group: 'הוראות קבע', title: 'מה הסכום החודשי המצטבר של כל הוראות הקבע?', options: ['עד 500 ₪', '500–1,000 ₪', '1,000–2,000 ₪', '2,000–5,000 ₪', '5,000–10,000 ₪', 'מעל 10,000 ₪'], values: [250, 750, 1500, 3500, 7500, 15000], skipIf: (a) => a.soCount === 0 },
  { id: 'soGoal', group: 'הוראות קבע', title: 'אתם רוצים לחדש או להגדיל הוראות קבע קיימות?', options: ['לחדש', 'להגדיל', 'גם וגם', 'לא כרגע'], skipIf: (a) => a.soCount === 0 },
  { id: 'soType', group: 'הוראות קבע', title: 'לכמה זמן הוגדרו רוב הוראות הקבע?', options: ['ל-12 חודשים', 'ללא הגבלה', 'יש מכל סוג'], skipIf: (a) => a.soCount === 0 || a.soGoal === 3 },
  { id: 'soStart', group: 'הוראות קבע', title: 'מתי בערך התחיל החיוב ברובן?', options: ['בחצי השנה האחרונה', 'לפני 6–10 חודשים', 'לפני 10–12 חודשים', 'לפני יותר משנה'], skipIf: (a) => a.soCount === 0 || a.soGoal === 3 },
  { id: 'last', group: 'הניסיון', title: 'מתי עשיתם קמפיין לאחרונה?', options: ['לפני שנה', 'לפני שנתיים', 'לפני שלוש שנים או יותר', 'אף פעם לא'], points: [10, 7, 4, 0] },
  { id: 'outcome', group: 'הניסיון', title: 'איך הקמפיין הזה נגמר?', options: ['עברנו את היעד', 'הגענו ליעד', 'לא הגענו ליעד'], points: [8, 6, 3], skipIf: (a) => a.last === 3 },
  ...TIERS.map((t) => ({ id: t.id, group: 'התורמים שלכם', title: 'כמה אנשים יש לכם שיכולים לתת ' + t.label + '?', options: COUNTS, values: MIDS })),
  { id: 'goal', group: 'היעד', title: 'כמה אתם חושבים שתגייסו?', options: ['עד 100,000 ₪', '100,000–300,000 ₪', '300,000–700,000 ₪', 'מעל 700,000 ₪'], values: [75000, 200000, 500000, 900000] },
  { id: 'promised', group: 'היעד', title: 'כמה כסף כבר הובטח לכם לפני שהקמפיין מתחיל?', options: ['כלום', 'עד 25,000 ₪', '25,000–100,000 ₪', 'מעל 100,000 ₪'], values: [0, 12500, 62500, 150000], points: [0, 3, 7, 10] },
  { id: 'manager', group: 'הצוות', title: 'מי ינהל את הקמפיין?', options: ['אני לבד, לצד התפקידים הרגילים שלי', 'אדם שזה התפקיד שלו', 'צוות', 'עדיין לא יודעים'], points: [4, 12, 15, 0] },
  { id: 'amb', group: 'הצוות', title: 'כמה שגרירים יהיו לכם?', options: ['אין', '1–5', '5–10', '10–20', '20–30', '30–50', '50–100', 'מעל 100'], values: [0, 3, 8, 15, 25, 40, 75, 130], points: [0, 3, 5, 8, 10, 12, 14, 15] },
  { id: 'ambAvg', group: 'הצוות', title: 'כמה כל שגריר יכול לגייס בממוצע מהאנשים שלו?', options: ['עד 1,000 ₪', '1,000–2,500 ₪', '2,500–5,000 ₪', '5,000–10,000 ₪', 'מעל 10,000 ₪'], values: [500, 1750, 3750, 7500, 12500], skipIf: (a) => a.amb === 0 },
  { id: 'worry', group: 'החסם', title: 'מה הכי מדאיג אתכם?', options: ['לא יודעים מאיפה להתחיל', 'אין מספיק תורמים', 'אין זמן וצוות', 'הכתיבה והעיצוב'] },
]

export type ProfileKey = 'ready' | 'vision' | 'audience' | 'start' | 'track'
export const PROFILES: Record<ProfileKey, [string, string]> = {
  ready: ['מוכנים לזינוק', 'יש לכם קהל, צוות ובסיס כספי. עכשיו הכל תלוי בתוכנית ובביצוע.'],
  vision: ['חזון גדול, בסיס קטן', 'היעד שכתבתם גבוה בהרבה ממה שהקהל הנוכחי יכול לתת. צריך להרחיב את הבסיס או להציב שלב ראשון ריאלי.'],
  audience: ['יש קהל, אין מערכת', 'יש לכם הרבה קשרים, אבל הם עדיין לא מסודרים כך שאפשר לפנות אליהם ולמדוד תוצאות.'],
  start: ['מתחילים מהבסיס', 'לפני שמכריזים על קמפיין, כדאי לבנות רשימה, צוות וכמה התחייבויות ראשונות.'],
  track: ['בדרך הנכונה', 'יש לכם בסיס טוב. כמה חיזוקים ממוקדים יכולים להעלות משמעותית את התוצאה.'],
}

const qById = (id: string) => QS.find((q) => q.id === id)
export const visibleQuestions = (a: Answers): Question[] => QS.filter((q) => !(q.skipIf && q.skipIf(a)))

export type PyramidRow = { label: string; need: number; have: number; ok: boolean }
export type PotRow = { label: string; people: number; value: number; potential: number }
export type ReadinessResult = {
  score: number; rate: number; rows: (Tier & { people: number; potential: number })[]
  ambCount: number; ambAvg: number; ambPotential: number
  potential: number; people: number; promised: number
  low: number; high: number; goal: number; gap: number; missing180: number; touched: number
  pyramid: PyramidRow[]; profile: ProfileKey
}

export function computeReadiness(a: Answers): ReadinessResult {
  const pick = (id: string, key: 'values' | 'points') => { const q = qById(id); const i = a[id]; return (i == null || !q || !q[key]) ? 0 : (q[key] as number[])[i] || 0 }
  let score = 0
  QS.forEach((q) => { if (q.points && a[q.id] != null && !(q.skipIf && q.skipIf(a))) score += q.points[a[q.id]] })
  score = Math.min(100, score)
  const rate = 40 + score * 0.4
  const rows = TIERS.map((t) => { const people = pick(t.id, 'values'); return { ...t, people, potential: people * t.value } })
  const ambCount = pick('amb', 'values')
  const ambAvg = ambCount ? pick('ambAvg', 'values') : 0
  const ambPotential = ambCount * ambAvg
  const potential = rows.reduce((s, r) => s + r.potential, 0) + ambPotential
  const people = rows.reduce((s, r) => s + r.people, 0)
  const promised = pick('promised', 'values')
  const low = potential * (rate - 10) / 100 + promised
  const high = potential * (rate + 10) / 100 + promised
  const goal = pick('goal', 'values')
  const touched = pick('touched', 'values')
  const gap = Math.max(0, goal - high)
  const missing180 = Math.ceil(gap / (2160 * rate / 100))
  const fromDonors = Math.max(0, goal - promised - ambPotential * rate / 100)
  const pyramid: PyramidRow[] = rows.map((r) => {
    const need = Math.ceil(fromDonors * r.share / r.value)
    const have = Math.round(r.people * rate / 100)
    return { label: r.label, need, have, ok: have >= need }
  })
  let profile: ProfileKey = 'track'
  if (score >= 70 && gap === 0) profile = 'ready'
  else if (goal > high * 1.5) profile = 'vision'
  else if (a.list !== 0 && pick('contacts', 'values') >= 1250) profile = 'audience'
  else if (score < 35) profile = 'start'
  return { score, rate, rows, ambCount, ambAvg, ambPotential, potential, people, promised, low, high, goal, gap, missing180, touched, pyramid, profile }
}

export function soAdvice(a: Answers): string[] {
  if (!a.soCount || a.soGoal === 3 || a.soType == null || a.soStart == null) return []
  const out: string[] = []
  if (a.soType !== 1) out.push([
    'הוראות הקבע ל-12 חודשים עוד בתחילת הדרך. כדאי לתכנן את החידוש שלהן למועד מאוחר יותר.',
    'הוראות הקבע ל-12 חודשים יסתיימו בעוד כמה חודשים. כדאי לשלב את החידוש שלהן בתכנון הקמפיין.',
    'הוראות הקבע ל-12 חודשים לקראת סיום. זה הזמן לפנות לחידוש, לפני שהן נעצרות.',
    'ייתכן שרוב הוראות הקבע ל-12 חודשים כבר הסתיימו. כדאי לבדוק מי נעצר ולפנות אליו לחידוש.',
  ][a.soStart])
  if (a.soType !== 0) out.push([
    'בהוראות ללא הגבלה עוד מוקדם לבקש הגדלה. כדאי לחכות עד שתעבור שנה.',
    'בהוראות ללא הגבלה עוד מוקדם לבקש הגדלה. כדאי לחכות עד שתעבור שנה.',
    'הוראות ללא הגבלה מתקרבות לשנה. אפשר להתחיל לתכנן בקשה להגדלה.',
    'בהוראות ללא הגבלה עברה יותר משנה, אז אפשר לבקש מהתורמים להגדיל.',
  ][a.soStart])
  return out
}

export function recommendedSteps(a: Answers): string[] {
  const s: string[] = []
  if (a.list !== 0) s.push('סדרו את כל אנשי הקשר בקובץ אחד, עם סיווג לפי פוטנציאל תרומה.')
  if (a.promised <= 1) s.push('סגרו מראש התחייבויות מהתורמים הקרובים, לפני שהקמפיין עולה לאוויר.')
  if (a.amb <= 2) s.push('גייסו שגרירים שיפיצו את הקמפיין לחברים שלהם.')
  if (a.manager === 0 || a.manager === 3) s.push('הגדירו מי מנהל את הקמפיין, עם זמן מוגדר בכל שבוע.')
  if (a.deadline === 2) s.push('קבעו תאריך יעד אמיתי וסיבה ברורה למה דווקא עכשיו.')
  s.push('עברו שם אחר שם ברשימה וקבעו לכל תורם סכום ואדם שפונה אליו.')
  s.push('בנו לוח זמנים לפרסומים מהיום ועד סיום הקמפיין.')
  s.push('הכינו לשגרירים הודעה מוכנה שאפשר לשלוח לאנשים שלהם.')
  return s.slice(0, 3)
}

// Formatting helpers (match the prototype).
export const ils = (v: number) => Math.round(v).toLocaleString('en-US') + ' ₪'
export const kRound = (v: number) => (Math.round(v / 1000) * 1000).toLocaleString('en-US') + ' ₪'

export const goalLabelFor = (a: Answers) => qById('goal')?.options[a.goal] ?? ''
