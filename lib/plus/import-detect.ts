// Smart Excel column auto-detection — by header aliases (Hebrew/English) and by
// content sniffing. Shared by the manager and coordinator import flows.

export function parseHistory(raw: string): { date: string; amount: number }[] {
  return String(raw || "")
    .split(/[;,\n]+/).map((t) => t.trim()).filter(Boolean)
    .map((tok) => {
      const [a, b] = tok.split(":");
      const amount = Number((b ?? a).replace(/[^\d.]/g, ""));
      const date = b ? a.trim() : "";
      return amount > 0 ? { date: date || "—", amount } : null;
    })
    .filter((x): x is { date: string; amount: number } => !!x);
}

export const ALIASES: Record<string, string[]> = {
  full_name: ["שם מלא", "שם התורם", "שם פרטי", "שם", "תורם", "איש קשר", "full name", "name", "donor", "contact"],
  phone: ["טלפון נייד", "טלפון", "נייד", "פלאפון", "פלאפ", "סלולרי", "מספר טלפון", "מס טלפון", "tel", "phone", "mobile", "cell", "whatsapp", "וואטסאפ"],
  email: ["אימייל", "דואל", "דואר אלקטרוני", "מייל", "email", "e-mail", "mail"],
  address: ["כתובת", "עיר", "ישוב", "יישוב", "רחוב", "address", "city", "street"],
  birthday: ["תאריך לידה", "יום הולדת", "לידה", "birthday", "dob"],
  notes: ["הערות", "הערה", "comment", "comments", "note", "notes"],
  branch: ["סניף", "קבוצה", "צוות", "קהילה", "branch", "team", "group"],
  coord_email: ["מייל רכז", "אימייל רכז", "רכז", "אחראי", "קפטן", "captain", "coordinator", "leader"],
};

const norm = (s: string) => s.toLowerCase().replace(/["'`׳״.\-_/]/g, "").replace(/\s+/g, " ").trim();

export function autoDetect(headers: string[], rows: Record<string, unknown>[]): { mapping: Record<string, string>; historyCols: string[] } {
  const sample = rows.slice(0, 25);
  const vals = (h: string) => sample.map((r) => String(r[h] ?? "").trim()).filter(Boolean);
  const frac = (arr: string[], f: (v: string) => boolean) => (arr.length ? arr.filter(f).length / arr.length : 0);
  const isPhone = (v: string) => { const d = v.replace(/\D/g, ""); return d.length >= 9 && d.length <= 11 && /^[\d\-+()\s]+$/.test(v); };
  const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const isAmount = (v: string) => { const n = Number(v.replace(/[₪$,\s]/g, "")); return /^[₪$\s]*[\d,]+(\.\d+)?[₪$\s]*$/.test(v) && n > 0; };
  const isName = (v: string) => /(?:[א-ת]{2,}\s+[א-ת]{2,})|(?:[A-Za-z]{2,}\s+[A-Za-z]{2,})/.test(v);
  const isYearHeader = (h: string) => {
    const t = (h || "").trim();
    return /(^|[^\d])(19|20)\d{2}([^\d]|$)/.test(t) || /תש[״"׳']?[עפסקרת]/.test(t) ||
      /^[א-ת]["'׳״][א-ת]$/.test(t) || // short Hebrew year like פ"ב, פ"ג
      /תרומ|סכום|donation|amount|pledge/i.test(t);
  };

  const used = new Set<string>();
  const mapping: Record<string, string> = {};
  for (const key of Object.keys(ALIASES)) {
    let best: string | null = null, bestScore = 0;
    for (const h of headers) {
      if (used.has(h)) continue;
      const nh = norm(h);
      let score = 0;
      for (const a of ALIASES[key]) { const na = norm(a); if (nh === na) score = Math.max(score, 3); else if (nh.includes(na) || na.includes(nh)) score = Math.max(score, 2); }
      if (score > bestScore) { bestScore = score; best = h; }
    }
    if (best && bestScore >= 2) { mapping[key] = best; used.add(best); }
  }
  if (!mapping.phone) { const h = headers.find((x) => !used.has(x) && frac(vals(x), isPhone) > 0.6); if (h) { mapping.phone = h; used.add(h); } }
  if (!mapping.email) { const h = headers.find((x) => !used.has(x) && frac(vals(x), isEmail) > 0.5); if (h) { mapping.email = h; used.add(h); } }
  if (!mapping.full_name) { const h = headers.find((x) => !used.has(x) && frac(vals(x), isName) > 0.4); if (h) { mapping.full_name = h; used.add(h); } }
  const historyCols = headers.filter((h) => !used.has(h) && (isYearHeader(h) || frac(vals(h), isAmount) > 0.6));
  return { mapping, historyCols };
}

/**
 * Find the header row in a raw sheet (array of arrays). Real-world sheets often
 * have a title/summary line before the headers — we look for the first row that
 * has a name column plus a contact/email column.
 */
export function findHeaderRow(raw: unknown[][]): number {
  for (let i = 0; i < Math.min(raw.length, 10); i++) {
    const cells = (raw[i] || []).map((c) => String(c ?? "").trim());
    const hasName = cells.some((c) => /^שם/.test(c) || /^name$/i.test(c) || /שם מלא|תורם/.test(c));
    const hasContact = cells.some((c) => /פלאפון|טלפון|נייד|מייל|אימייל|phone|email/i.test(c));
    if (hasName && hasContact) return i;
  }
  return -1;
}

/** Build a lead row from a sheet row using the detected mapping + history columns. */
export function buildLead(r: Record<string, unknown>, mapping: Record<string, string>, historyCols: string[]) {
  const history: { date: string; amount: number }[] = [];
  if (mapping.history) history.push(...parseHistory(String(r[mapping.history] ?? "")));
  for (const h of historyCols) {
    const n = Number(String(r[h] ?? "").replace(/[^\d.]/g, ""));
    if (n > 0) history.push({ date: h, amount: n });
  }
  return {
    full_name: String(r[mapping.full_name] ?? ""),
    phone: String(r[mapping.phone] ?? ""),
    email: mapping.email ? String(r[mapping.email]) : undefined,
    address: mapping.address ? String(r[mapping.address]) : undefined,
    birthday: mapping.birthday ? String(r[mapping.birthday]) : undefined,
    notes: mapping.notes ? String(r[mapping.notes]) : undefined,
    donation_history: history,
  };
}
