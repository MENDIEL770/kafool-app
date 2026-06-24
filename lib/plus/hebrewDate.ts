// ============================================================================
// Hebrew (Jewish-calendar) date formatting + quick callback-date helpers.
// Uses the built-in Intl Hebrew calendar — no external deps.
// ============================================================================

const heWeekday = new Intl.DateTimeFormat("he", { weekday: "long" });
const heMonth = new Intl.DateTimeFormat("he-u-ca-hebrew", { month: "long" });
// day number in the Hebrew calendar (as an integer we convert to gematria)
const hebDayNum = new Intl.DateTimeFormat("en-u-ca-hebrew", { day: "numeric" });

const ONES = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
const TENS = ["", "י", "כ", "ל"]; // 10, 20, 30

/** Hebrew day-of-month as gematria, e.g. 25 → "כ״ה", 15 → "ט״ו", 10 → "י׳" */
function gematriaDay(n: number): string {
  if (n === 15) return "ט״ו";
  if (n === 16) return "ט״ז";
  const letters = (TENS[Math.floor(n / 10)] ?? "") + (ONES[n % 10] ?? "");
  if (letters.length <= 1) return letters + "׳";
  return letters.slice(0, -1) + "״" + letters.slice(-1);
}

function parts(d: Date) {
  const weekday = heWeekday.format(d).replace(/^יום\s+/, "");
  const day = gematriaDay(parseInt(hebDayNum.format(d), 10));
  const month = heMonth.format(d).replace(/^ב/, ""); // strip leading "ב" if present
  const greg = `${d.getDate()}/${d.getMonth() + 1}`;
  return { weekday, day, month, greg };
}

/** e.g. "חמישי, כ״ה אדר · 11/6" */
export function hebrewDateLabel(d: Date): string {
  const { weekday, day, month, greg } = parts(d);
  return `${weekday}, ${day} ${month} · ${greg}`;
}

/** short label used in lists/SMS, e.g. "חמישי 11/6 · כ״ה אדר" */
export function hebrewDateShort(d: Date): string {
  const { weekday, day, month, greg } = parts(d);
  return `${weekday} ${greg} · ${day} ${month}`;
}

export type TimeOfDay = "morning" | "noon" | "evening" | "any";

export const TIME_OF_DAY: { key: TimeOfDay; label: string; hour: number }[] = [
  { key: "morning", label: "בוקר", hour: 9 },
  { key: "noon", label: "צהריים", hour: 13 },
  { key: "evening", label: "ערב", hour: 19 },
];

export function timeOfDayLabel(t: TimeOfDay): string {
  return TIME_OF_DAY.find((x) => x.key === t)?.label ?? "כל היום";
}

function atHour(d: Date, hour: number): Date {
  const x = new Date(d);
  x.setHours(hour, 0, 0, 0);
  return x;
}

export function applyTimeOfDay(date: Date, t: TimeOfDay): Date {
  const meta = TIME_OF_DAY.find((x) => x.key === t);
  return atHour(date, meta?.hour ?? 10);
}

// ---- quick default options -------------------------------------------------
export interface QuickOption {
  key: string;
  label: string;
  date: Date;
}

/** push Fri (5) / Sat (6) forward to Sunday — no callbacks on Shabbat */
export function skipWeekend(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay(); // 0=Sun … 5=Fri, 6=Sat
  if (day === 5) x.setDate(x.getDate() + 2);
  else if (day === 6) x.setDate(x.getDate() + 1);
  return x;
}

export function quickOptions(now = new Date()): QuickOption[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  // "אחרי ה-10 לחודש": the 11th of this month, or next month if already past.
  // If it lands on Fri/Sat, push to Sunday.
  const after10raw = new Date(today.getFullYear(), today.getMonth(), 11);
  if (today.getDate() > 10) after10raw.setMonth(after10raw.getMonth() + 1);
  const after10 = skipWeekend(after10raw);

  return [
    { key: "today", label: "היום", date: today },
    { key: "tomorrow", label: "מחר", date: tomorrow },
    { key: "after10", label: "אחרי ה-10 לחודש", date: after10 },
  ];
}

/** upcoming N days as a selectable list */
export function upcomingDays(count = 21, now = new Date()): Date[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}
