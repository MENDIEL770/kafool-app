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
