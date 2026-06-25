import { bestPhone } from "@/lib/plus/phone";

export type VCardRow = { full_name: string; phone: string; email?: string; notes?: string };

// Parse a vCard (.vcf) file — what iPhone/Android export when you share contacts.
// A contact can have several TEL lines — we pick the best number to call (Israeli
// mobile preferred) and keep the rest in notes.
export function parseVCards(text: string): VCardRow[] {
  // unfold folded lines (continuation lines start with a space/tab)
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const rows: VCardRow[] = [];
  for (const card of unfolded.split(/BEGIN:VCARD/i).slice(1)) {
    let name = "", email = "";
    const tels: string[] = [];
    for (const raw of card.split(/\r?\n/)) {
      const line = raw.trim();
      if (/^END:VCARD/i.test(line)) break;
      const val = line.slice(line.indexOf(":") + 1).trim();
      if (/^FN[;:]/i.test(line)) name = val;
      else if (/^N[;:]/i.test(line) && !name) { const p = val.split(";"); name = [p[1], p[0]].filter(Boolean).join(" ").trim(); }
      else if (/^TEL[;:]/i.test(line) && val) tels.push(val);
      else if (/^EMAIL[;:]/i.test(line) && !email) email = val;
    }
    const { primary, others } = bestPhone(tels);
    if (primary) rows.push({
      full_name: name || "ללא שם", phone: primary, email: email || undefined,
      notes: others.length ? `טלפונים נוספים: ${others.join(", ")}` : undefined,
    });
  }
  return rows;
}
