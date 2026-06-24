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

export const SCRIPT_PRESETS: { id: string; name: string; script: CallScript }[] = [
  {
    id: "script-classic",
    name: "תסריט קלאסי",
    script: {
      opening: "שלום {שם}, מדבר/ת [שם הטלפן] מקמפיין [שם הקמפיין]. יש לך דקה?",
      story:
        "אנחנו פונים השנה לכל התומכים שלנו כדי לאפשר לנו להמשיך בפעילות החשובה. כל תרומה, קטנה כגדולה, עושה הבדל אמיתי.",
      objections:
        "\"אין לי זמן\" → אני אקצר. \"כבר תרמתי\" → תודה רבה! אולי תוכל/י להוסיף השנה? \"אין לי כסף עכשיו\" → אפשר להבטיח לתאריך נוח.",
      closing:
        "מעולה! אשלח לך קישור לתרומה מאובטח. תודה רבה על התמיכה — זה ממש משמעותי עבורנו!",
    },
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
