// Phone helpers for Kafool+ — Israeli vs. overseas detection and picking the
// most-callable number when a contact has several.

export function digitsOnly(p: string): string {
  return (p ?? '').replace(/\D/g, '');
}

/** Is this an Israeli number? (local 0xx / +972). Anything with a foreign
 *  country code (+1, +33, 00xx…) is treated as overseas. */
export function isIsraeliPhone(phone: string): boolean {
  const raw = (phone ?? '').trim();
  const d = digitsOnly(raw);
  if (!d) return false;
  if (d.startsWith('972')) return true;                          // +972 / 972
  if (raw.startsWith('+') && !d.startsWith('972')) return false; // +1, +33, +44…
  if (d.startsWith('00') && !d.startsWith('00972')) return false;// 001…, 0033…
  if (d.startsWith('0')) return true;                            // local 05.., 03..
  return d.length <= 10;                                         // bare local ⇒ IL; long ⇒ overseas
}

const isIlMobile = (p: string) => { const d = digitsOnly(p); return /^0?5\d{8}$/.test(d) || /^9725\d{8}$/.test(d); };

/** From a contact's phone list, choose the primary (prefer an Israeli mobile,
 *  then any Israeli number, else the first) and return the rest. */
export function bestPhone(phones: string[]): { primary: string; others: string[] } {
  const clean = Array.from(new Set(phones.map(p => (p ?? '').trim()).filter(Boolean)));
  if (!clean.length) return { primary: '', others: [] };
  const primary = clean.find(isIlMobile) ?? clean.find(isIsraeliPhone) ?? clean[0];
  return { primary, others: clean.filter(p => p !== primary) };
}
