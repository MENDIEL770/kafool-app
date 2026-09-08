import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendHtmlEmail } from '@/lib/email'

export const runtime = 'nodejs'

// Email the payment receipt to the customer through the system (Resend), instead
// of opening the manager's own mail app. Org-scoped; looks the order up server-side.
function receiptOf(row: { receipt_url?: string | null; kesher_raw?: Record<string, unknown> | null }): string | null {
  if (row.receipt_url) return row.receipt_url
  const raw = (row.kesher_raw || {}) as Record<string, unknown>
  for (const k of ['receiptLink', 'receipturl', 'receipt_url', 'receiptUrl', 'ReceiptLink', 'ReceiptUrl']) {
    const v = raw[k]
    if (typeof v === 'string' && v.startsWith('http')) return v
  }
  return null
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('id', user.id).single()
  const { data: campaign } = await supabase.from('campaigns').select('title, org_id').eq('id', id).single()
  if (!campaign) return NextResponse.json({ error: 'campaign not found' }, { status: 404 })
  if (profile?.role !== 'super_admin' && profile?.org_id !== campaign.org_id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const donationId = String(body.donationId || '')
  const { data: d } = await supabase
    .from('donations')
    .select('donor_name, donor_email, amount, receipt_url, kesher_raw')
    .eq('id', donationId).eq('campaign_id', id).single()
  if (!d) return NextResponse.json({ error: 'הזמנה לא נמצאה' }, { status: 404 })

  const to = String(body.to || d.donor_email || '').trim()
  if (!/.+@.+\..+/.test(to)) return NextResponse.json({ error: 'לא נמצאה כתובת מייל ללקוח' }, { status: 400 })
  const receipt = receiptOf(d)
  if (!receipt) return NextResponse.json({ error: 'אין קבלה שמורה על הזמנה זו' }, { status: 400 })

  const ils = '₪' + Math.round(Number(d.amount) || 0).toLocaleString('he-IL')
  const name = (d.donor_name || '').trim()
  const html = `<!doctype html><html dir="rtl"><body style="margin:0;background:#f6f7f9;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <div style="max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:#fff;border-radius:20px;padding:28px;box-shadow:0 2px 12px rgba(0,0,0,.05);text-align:right;font-size:16px;line-height:1.7;">
        <p>שלום${name ? ' ' + name : ''},</p>
        <p>מצורפת הקבלה על התשלום שלך על סך <strong>${ils}</strong> ל${campaign.title || 'הארגון'}.</p>
        <p style="text-align:center;margin:24px 0;">
          <a href="${receipt}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:bold;padding:14px 30px;border-radius:12px;font-size:16px;">צפייה בקבלה</a>
        </p>
        <p style="font-size:13px;color:#6b7280;">אם הכפתור אינו עובד, הקישור לקבלה:<br/><a href="${receipt}" style="color:#2563eb;word-break:break-all;">${receipt}</a></p>
      </div>
      <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:18px;">${campaign.title || ''} · נשלח דרך Kafool</p>
    </div></body></html>`

  const ok = await sendHtmlEmail(to, `קבלה — ${campaign.title || ''}`, html)
  if (!ok) return NextResponse.json({ error: 'שליחת המייל נכשלה — ודא שהמייל מוגדר במערכת.' }, { status: 500 })
  return NextResponse.json({ ok: true, to })
}
