// Transactional email via Resend. No-op (logs) when not configured, so the rest
// of the app keeps working until RESEND_API_KEY + EMAIL_FROM are set.

export interface EmailTemplate {
  subject?: string
  body?: string      // plain text / simple HTML the manager wrote
  image?: string     // optional header image URL
}

const BRAND = '#2563eb'

function renderHtml(tpl: EmailTemplate, campaignTitle: string): string {
  const raw = tpl.body || ''
  // Body from the rich-text editor is already HTML; older plain bodies keep their
  // line breaks. Detect HTML by the presence of a tag.
  const isHtml = /<[a-z!/][\s\S]*>/i.test(raw)
  const bodyHtml = isHtml ? raw : raw.replace(/\n/g, '<br/>')
  const img = tpl.image
    ? `<img src="${tpl.image}" alt="" style="display:block;width:100%;max-width:560px;border-radius:16px;margin:0 auto 20px;" />`
    : ''
  return `<!doctype html><html dir="rtl"><body style="margin:0;background:#f6f7f9;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <div style="max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:#fff;border-radius:20px;padding:28px;box-shadow:0 2px 12px rgba(0,0,0,.05);">
        ${img}
        <div style="font-size:16px;line-height:1.7;${isHtml ? '' : 'white-space:pre-line;'}text-align:right;" dir="rtl">${bodyHtml}</div>
      </div>
      <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:18px;">${campaignTitle} · נשלח דרך Kafool</p>
      <div style="height:3px;width:60px;background:${BRAND};border-radius:3px;margin:10px auto 0;"></div>
    </div>
  </body></html>`
}

function esc(s: string): string { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string)) }

/** Confirmation email for a Kaparot (soul-redemption) order — lists the redeemed
 *  souls, the total, a Chabad-house block and the shliach's custom text. */
export function renderKaparotHtml(args: {
  orgName: string; logoUrl?: string | null; souls: number; names: string[]; amount: number
  customBody?: string | null; imageUrl?: string | null
}): string {
  const gold = '#b4882c', text = '#1c2340', bg = '#faf6ee', border = '#e7e0d2', muted = '#6f6a5c'
  const namesList = (args.names.filter(n => n && n.trim()).length
    ? args.names.filter(n => n && n.trim()).map(n => `<li style="padding:5px 0;border-bottom:1px solid ${border};">${esc(n.trim())}</li>`).join('')
    : `<li style="padding:5px 0;">${args.souls} נפשות</li>`)
  const img = args.imageUrl ? `<img src="${args.imageUrl}" alt="" style="display:block;width:100%;max-width:560px;border-radius:12px;margin:0 auto 20px;"/>` : ''
  const custom = args.customBody ? `<div style="font-size:15px;line-height:1.7;text-align:right;margin:16px 0 0;border-top:1px solid ${border};padding-top:14px;">${args.customBody}</div>` : ''
  return `<!doctype html><html dir="rtl"><body style="margin:0;background:${bg};font-family:Arial,Helvetica,sans-serif;color:${text};">
    <div style="max-width:600px;margin:0 auto;padding:24px;">
      <div style="text-align:center;margin-bottom:16px;">
        ${args.logoUrl ? `<img src="${args.logoUrl}" alt="${esc(args.orgName)}" style="height:56px;margin:0 auto 8px;display:block;"/>` : ''}
        <div style="font-weight:bold;">${esc(args.orgName)}</div>
      </div>
      <div style="background:#fff;border:1px solid ${border};border-radius:12px;padding:28px;">
        ${img}
        <h1 style="text-align:center;color:${gold};font-size:25px;margin:0 0 6px;">פדיון הכפרות התקבל בהצלחה</h1>
        <p style="text-align:center;color:${muted};margin:0 0 20px;">הפדיון נערך עבור ${args.souls} נפשות</p>
        <div style="background:${bg};border:1px solid ${border};border-radius:10px;padding:16px;margin-bottom:16px;">
          <div style="font-weight:bold;margin-bottom:6px;">הנפשות שנפדו:</div>
          <ul style="margin:0;padding:0 18px;list-style:none;">${namesList}</ul>
        </div>
        <table style="width:100%;font-size:15px;border-collapse:collapse;">
          <tr><td style="color:${muted};padding:3px 0;">מספר נפשות</td><td style="text-align:left;font-weight:bold;">${args.souls}</td></tr>
          <tr><td style="color:${muted};padding:3px 0;">סה״כ פדיון</td><td style="text-align:left;font-weight:bold;color:${gold};">₪${Math.round(args.amount).toLocaleString('he-IL')}</td></tr>
        </table>
        <div style="text-align:center;color:${muted};font-size:14px;border-top:1px solid ${border};padding-top:14px;margin-top:14px;">"זֶה הַכֶּסֶף יֵלֵךְ לִצְדָקָה, וַאֲנִי אֵלֵךְ לְחַיִּים טוֹבִים אֲרוּכִים וּלְשָׁלוֹם"</div>
        ${custom}
      </div>
      <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:18px;">${esc(args.orgName)} · קבלה מוכרת למס תישלח בנפרד · נשלח דרך Kafool</p>
    </div></body></html>`
}

/** Send a pre-rendered HTML email. Returns true if sent. */
export async function sendHtmlEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!key || !from || !to || !/.+@.+\..+/.test(to)) return false
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html }),
    })
    return res.ok
  } catch { return false }
}

/** Generic transactional email. Returns true if sent. */
export async function sendPlusEmail(to: string, subject: string, bodyHtml: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!key || !from || !to || !/.+@.+\..+/.test(to)) return false
  const html = `<!doctype html><html dir="rtl"><body style="margin:0;background:#f6f7f9;font-family:Arial,sans-serif;color:#1f2937;">
    <div style="max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:#fff;border-radius:20px;padding:28px;box-shadow:0 2px 12px rgba(0,0,0,.05);font-size:15px;line-height:1.7;" dir="rtl">${bodyHtml}</div>
      <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:18px;">Kafool · גיוס תרומות</p>
    </div></body></html>`
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html }),
    })
    return res.ok
  } catch { return false }
}

/**
 * Send a thank-you email. Returns true if actually sent.
 */
export async function sendThankYouEmail(
  to: string,
  tpl: EmailTemplate,
  campaignTitle: string,
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM // e.g. "Kafool <noreply@kafool.com>"
  if (!key || !from) {
    console.log('Email skipped — RESEND_API_KEY / EMAIL_FROM not set')
    return false
  }
  if (!to || !/.+@.+\..+/.test(to)) return false

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to,
        subject: tpl.subject?.trim() || `תודה על תרומתך — ${campaignTitle}`,
        html: renderHtml(tpl, campaignTitle),
      }),
    })
    if (!res.ok) { console.error('Resend error:', res.status, await res.text().catch(() => '')); return false }
    return true
  } catch (e) {
    console.error('sendThankYouEmail error:', e)
    return false
  }
}
