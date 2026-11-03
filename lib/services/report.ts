// Turns a set of answers into the fully-rendered report view-model — every
// display string precomputed. The snapshot is stored on the lead row (report
// jsonb) so the personal report page stays stable even if the formula changes
// later. Ported from the prototype's qVals()/result branch (Main.dc.html).

import {
  type Answers,
  computeReadiness,
  soAdvice,
  recommendedSteps,
  PROFILES,
  ils,
  kRound,
  goalLabelFor,
  QS,
} from './readiness'

export type ReportRow = { label: string; people: number | string; value: string; potential: string }
export type ReportPyrRow = { label: string; need: number; have: number; ok: boolean; status: string }

export type ReportSnapshot = {
  v: number // snapshot schema version
  score: number
  offset: number // stroke-dashoffset for the 100-score ring
  profile: string
  pTitle: string
  pDesc: string
  org: string
  low: string
  high: string
  verdict: string
  warn: string
  potRows: ReportRow[]
  potential: string
  rateRange: string
  promised: string
  soShow: boolean
  soAdvice: string[]
  soWorth: string
  pyrRows: ReportPyrRow[]
  steps: string[]
  waUrl: string
  // raw values kept for the admin view / later calibration
  raw: { score: number; low: number; high: number; potential: number; goal: number }
}

const qById = (id: string) => QS.find((q) => q.id === id)

export function buildReport(a: Answers, lead: { name: string; phone: string; org: string }): ReportSnapshot {
  const r = computeReadiness(a)
  const [pTitle, pDesc] = PROFILES[r.profile]
  const goalLabel = goalLabelFor(a)
  const advice = soAdvice(a)
  const soMonthly = a.soSum == null ? 0 : (qById('soSum')?.values?.[a.soSum] ?? 0)

  const summary = [
    'שלום, מילאתי את בדיקת המוכנות לקמפיין.',
    'שם: ' + lead.name,
    'טלפון: ' + lead.phone,
    'מוסד: ' + lead.org,
    'ציון: ' + r.score + '/100',
    'פרופיל: ' + pTitle,
    'טווח משוער: ' + kRound(r.low) + ' עד ' + kRound(r.high),
    'היעד שכתבתי: ' + goalLabel,
  ].join('\n')

  const potRows: ReportRow[] = r.rows.map((t) => ({
    label: t.label,
    people: t.people,
    value: ils(t.value),
    potential: ils(t.potential),
  }))
  if (r.ambCount) {
    potRows.push({ label: 'שגרירים × ממוצע גיוס', people: r.ambCount, value: ils(r.ambAvg), potential: ils(r.ambPotential) })
  }

  return {
    v: 1,
    score: r.score,
    offset: 389.56 * (1 - r.score / 100),
    profile: r.profile,
    pTitle,
    pDesc,
    org: lead.org,
    low: kRound(r.low),
    high: kRound(r.high),
    verdict:
      r.gap === 0
        ? 'היעד שכתבתם (' + goalLabel + ') נמצא בתוך הטווח או מתחתיו.'
        : 'כתבתם ' + goalLabel + '. כדי לסגור את הפער חסרים בערך ' + r.missing180.toLocaleString('en-US') + ' תורמי 180 ₪ בפועל, או תמהיל אחר בשווי דומה.',
    warn:
      r.people > r.touched
        ? 'סימנתם בערך ' + r.people.toLocaleString('en-US') + ' אנשים שיכולים לתרום, אבל הייתם בקשר עם פחות מזה בשנה האחרונה. כדאי לבדוק שם אחר שם, כי כנראה ההערכה גבוהה מדי.'
        : '',
    potRows,
    potential: ils(r.potential),
    rateRange: Math.round(r.rate - 10) + '%–' + Math.round(r.rate + 10) + '%',
    promised: ils(r.promised),
    soShow: advice.length > 0,
    soAdvice: advice,
    soWorth: soMonthly ? 'לפי התשובות, הוראות הקבע שלכם שוות בערך ' + ils(soMonthly * 12) + ' בשנה.' : '',
    pyrRows: r.pyramid.map((t) => ({
      label: t.label,
      need: t.need,
      have: t.have,
      ok: t.ok,
      status: t.ok ? 'מספיק' : 'חסרים ' + (t.need - t.have),
    })),
    steps: recommendedSteps(a),
    waUrl: 'https://wa.me/972535035770?text=' + encodeURIComponent(summary),
    raw: { score: r.score, low: r.low, high: r.high, potential: r.potential, goal: r.goal },
  }
}
