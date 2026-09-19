// WhatsApp message templates. Three categories, three preset variants each. The
// manager picks a variant, may edit the text, uploads an optional media file, and
// saves the choice. Stored per-org in organizations.whatsapp_config.messages.
//
// Variables (Hebrew, double-brace): {{שם}} donor name, {{סכום}} amount,
// {{קמפיין}} campaign, {{קבוצה}} group, {{קישור}} campaign link.

export type WaMsgCategory = 'donation_success' | 'donation_failed' | 'group_manager'

export interface WaMessage { text?: string; media_url?: string | null }
export type WaMessages = Partial<Record<WaMsgCategory, WaMessage>>

export const MESSAGE_PRESETS: Record<WaMsgCategory, { label: string; hint: string; variants: string[] }> = {
  donation_success: {
    label: 'תודה לתורם — לאחר תרומה מוצלחת',
    hint: 'נשלח לתורם מיד לאחר שהתרומה נקלטה.',
    variants: [
      'שלום {{שם}} 🙏\nתרומתך על סך ₪{{סכום}} ל{{קמפיין}} התקבלה בהצלחה. תודה רבה על השותפות!',
      '{{שם}} יקר/ה 💙\nקיבלנו את תרומתך בסך ₪{{סכום}}. יישר כוח ותודה שאתם איתנו!',
      'תודה {{שם}}!\nהתרומה שלך (₪{{סכום}}) נקלטה בהצלחה. שנזכה יחד להמשך הצלחה 🙏',
    ],
  },
  donation_failed: {
    label: 'לתורם — לאחר תרומה שנכשלה',
    hint: 'נשלח לתורם אם התשלום לא הושלם. ניתן לצרף קישור לניסיון חוזר.',
    variants: [
      'שלום {{שם}}, נראה שהתרומה על סך ₪{{סכום}} לא הושלמה. אפשר לנסות שוב כאן:\n{{קישור}}',
      '{{שם}}, לצערנו התשלום לא עבר. נשמח אם תנסה/י שוב 🙏\n{{קישור}}',
      'היי {{שם}}, התרומה לא נקלטה. אם צריך עזרה אנחנו כאן, ואפשר לנסות שוב:\n{{קישור}}',
    ],
  },
  group_manager: {
    label: 'למנהל קבוצה — עדכון על תרומה',
    hint: 'נשלח למנהל הקבוצה כשנכנסת תרומה דרך הקבוצה שלו.',
    variants: [
      '🎉 תרומה חדשה בקבוצה "{{קבוצה}}"!\n₪{{סכום}} מ{{שם}} · {{קמפיין}}',
      'מזל טוב! נכנסה תרומה של ₪{{סכום}} דרך {{שם}} לקבוצה שלך 💪',
      'עדכון: {{שם}} תרם/ה ₪{{סכום}} לקבוצה "{{קבוצה}}". כל הכבוד!',
    ],
  },
}

/** The manager's chosen text for a category, or the first preset as fallback. */
export function messageFor(messages: WaMessages | undefined, cat: WaMsgCategory): { text: string; media_url: string | null } {
  const m = messages?.[cat]
  const text = (m?.text && m.text.trim()) || MESSAGE_PRESETS[cat].variants[0]
  return { text, media_url: m?.media_url || null }
}
