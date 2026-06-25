import type { Lead } from "./types";

// ============================================================================
// Callback-reminder notifications. In MVP these open the device SMS/WhatsApp
// composer with a ready message that includes a direct call link (tel:) to the
// lead — "טלפון לחזרה". When VoIP lands, the tel: link can become a system
// call link without changing callers.
// ============================================================================

export function callbackMessage(lead: Lead, whenLabel: string, callerName?: string, campaignName?: string): string {
  const tel = lead.phone.replace(/[^\d+]/g, "");
  return [
    `חזור ל${lead.full_name}${campaignName ? ` בקשר לקמפיין ${campaignName}` : ""}`,
    `מועד: ${whenLabel}`,
    `כל מה שנשאר — לחייג: tel:${tel}`,
    callerName ? `(${callerName})` : "",
  ].filter(Boolean).join("\n");
}

function digits(phone?: string): string {
  return (phone ?? "").replace(/[^\d]/g, "");
}

/** SMS composer link; if `toPhone` given it pre-fills the recipient */
export function smsLink(body: string, toPhone?: string): string {
  const d = digits(toPhone);
  return `sms:${d || ""}?&body=${encodeURIComponent(body)}`;
}

/** WhatsApp composer link; if `toPhone` given it opens that chat */
export function whatsappLink(body: string, toPhone?: string): string {
  const d = digits(toPhone);
  if (d) {
    const intl = d.startsWith("0") ? `972${d.slice(1)}` : d;
    return `https://wa.me/${intl}?text=${encodeURIComponent(body)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(body)}`;
}

export function openLink(url: string) {
  if (typeof window !== "undefined") window.open(url, "_blank");
}
