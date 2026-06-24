import type { BrandingPreset, CallScript } from "./types";

// ============================================================================
// Branding presets — the "מאגר השינויים". Users pick one as a base, then tune.
// Global (not org-scoped). Stored in branding_presets in Supabase.
// ============================================================================

export interface ColorPreset {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_style: "light" | "dark" | "custom";
}

export const COLOR_PRESETS: { id: string; name: string; colors: ColorPreset }[] = [
  {
    id: "preset-blue-gold",
    name: "כחול־זהב",
    colors: { primary_color: "#1e3a8a", secondary_color: "#3b82f6", accent_color: "#f59e0b", background_style: "light" },
  },
  {
    id: "preset-green",
    name: "ירוק",
    colors: { primary_color: "#166534", secondary_color: "#22c55e", accent_color: "#84cc16", background_style: "light" },
  },
  {
    id: "preset-bordeaux",
    name: "בורדו",
    colors: { primary_color: "#7f1d1d", secondary_color: "#b91c1c", accent_color: "#f59e0b", background_style: "light" },
  },
  {
    id: "preset-black-gold",
    name: "שחור־זהב",
    colors: { primary_color: "#111827", secondary_color: "#374151", accent_color: "#d4af37", background_style: "dark" },
  },
  {
    id: "preset-royal-purple",
    name: "סגול מלכותי",
    colors: { primary_color: "#581c87", secondary_color: "#9333ea", accent_color: "#f0abfc", background_style: "light" },
  },
  {
    id: "preset-teal",
    name: "טורקיז",
    colors: { primary_color: "#115e59", secondary_color: "#14b8a6", accent_color: "#fbbf24", background_style: "light" },
  },
];

// Rich default script — used when a branch has no script yet, and as a starting
// point each coordinator can adapt to their campaign.
export const DEFAULT_SCRIPT: CallScript = {
  opening:
    "שלום {שם}, מדבר/ת [שם הטלפן] מ[שם הקמפיין]. מצאתי אותך בין התומכים היקרים שלנו — יש לך דקה?",
  story:
    "אנחנו באמצע מבצע גיוס חשוב שיאפשר לנו להמשיך בפעילות. בזכות תורמים כמוך הגענו רחוק — וכל תרומה, קטנה כגדולה, מקרבת אותנו ליעד. רציתי לשתף אותך ולהזמין אותך להיות חלק.",
  objections:
    "מענה להתנגדויות נפוצות:\n• \"אין לי זמן\" → אני אקצר, ממש דקה.\n• \"כבר תרמתי\" → תודה ענקית! אולי נוכל להוסיף השנה אפילו סכום קטן?\n• \"אין לי כסף עכשיו\" → בכיף — אפשר לרשום הבטחה לתאריך שנוח לך.\n• \"אתקשר אליכם\" → אשמח לקבוע יחד זמן לחזרה כדי לא להטריד.\n• \"צריך להתייעץ\" → בהחלט, אשלח קישור ותחזור אליי כשנוח.\nתמיד: הקשב/י קודם, אל תתווכח/י — כל התנגדות היא הזדמנות להבין מה חשוב לתורם.",
  closing:
    "סיום שיחה — בחר/י לפי מהלך השיחה:\n• תרם/הבטיח → \"מעולה! שולח/ת עכשיו קישור מאובטח. תודה רבה, זה משמעותי מאוד!\"\n• הערה / לחשוב → רשום/רשמי הערה ושלח/י קישור להמשך.\n• חזרה → קבע/י תזכורת לחזרה בזמן שנוח לתורם.\n• אין מענה / לא רלוונטי → סמן/י סטטוס וממשיכים לליד הבא.\nתמיד לסיים בחיוך ובתודה — גם אם לא תרם.",
};

export const SCRIPT_PRESETS: { id: string; name: string; script: CallScript }[] = [
  {
    id: "script-classic",
    name: "ברירת מחדל (מומלץ)",
    script: DEFAULT_SCRIPT,
  },
  {
    id: "script-warm",
    name: "תסריט חם ואישי",
    script: {
      opening: "שלום {שם}, מה שלומך? מדבר/ת [שם] — שמחתי להתקשר אליך אישית.",
      story:
        "רציתי לשתף אותך במה שהצלחנו לעשות בזכות תורמים כמוך, ולהזמין אותך להיות חלק מהפרק הבא.",
      objections:
        "הקשב/י קודם, אל תמכור/תמכרי. כל התנגדות = הזדמנות להבין מה חשוב לתורם.",
      closing: "תודה ענקית! שולח/ת קישור עכשיו. נשמח לעדכן אותך בהמשך על ההישגים.",
    },
  },
];

export const MESSAGE_PRESETS: {
  id: string;
  name: string;
  channel: "sms" | "whatsapp";
  body: string;
}[] = [
  {
    id: "msg-thanks-link",
    name: "תודה + קישור",
    channel: "whatsapp",
    body: "שלום {שם}! תודה על השיחה 🙏 הנה הקישור לתרומה: {קישור}. כל סכום מתקבל בברכה!",
  },
  {
    id: "msg-reminder",
    name: "תזכורת להבטחה",
    channel: "sms",
    body: "שלום {שם}, תזכורת ידידותית להבטחתך על סך {סכום} ש\"ח. לתרומה: {קישור}. תודה!",
  },
];

// Convenience: full preset list (as stored in DB)
export const ALL_PRESETS: BrandingPreset[] = [
  ...COLOR_PRESETS.map((p) => ({
    id: p.id,
    name: p.name,
    category: "colors" as const,
    config: p.colors as unknown as Record<string, unknown>,
    is_active: true,
  })),
  ...SCRIPT_PRESETS.map((p) => ({
    id: p.id,
    name: p.name,
    category: "script" as const,
    config: p.script as unknown as Record<string, unknown>,
    is_active: true,
  })),
  ...MESSAGE_PRESETS.map((p) => ({
    id: p.id,
    name: p.name,
    category: "message" as const,
    config: { channel: p.channel, body: p.body },
    is_active: true,
  })),
];
