import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Phone, MessageCircle, Mail, UserX } from 'lucide-react'
import { intentCompleted } from '@/lib/abandoned'

export const dynamic = 'force-dynamic'

const METHOD_LABEL: Record<string, string> = {
  bit: 'ביט', credit: 'אשראי', hok: 'הוראת קבע',
  transfer: 'העברה בנקאית', bank: 'העברה בנקאית', one_time: 'אשראי',
}

function waLink(phone: string): string {
  const d = phone.replace(/\D/g, '')
  const intl = d.startsWith('0') ? '972' + d.slice(1) : d
  return `https://wa.me/${intl}`
}

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `לפני ${mins} דק׳`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `לפני ${hrs} שע׳`
  return `לפני ${Math.round(hrs / 24)} ימים`
}

export default async function AbandonedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  // access gate — the manager can only read their own campaign (RLS)
  const { data: campaign } = await supabase.from('campaigns').select('id, title').eq('id', id).single()
  if (!campaign) redirect('/campaigns')

  // donation_intents is RLS-locked → read with the service client
  const admin = await createServiceClient()
  const { data: intents } = await admin
    .from('donation_intents')
    .select('id, phone, amount, custom_data, donor_email, group_slug, created_at')
    .eq('campaign_id', id)
    .order('created_at', { ascending: false })
    .limit(500)

  // Completed donations, to drop any intent whose donation actually landed (e.g.
  // Bit donations that record no phone) so they never show as "abandoned".
  const { data: completed } = await admin
    .from('donations')
    .select('donor_phone, donor_name, donor_email, amount, created_at')
    .eq('campaign_id', id)
    .eq('payment_status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1000)

  const openIntents = (intents || []).filter(it => {
    const cd = (it.custom_data || {}) as Record<string, unknown>
    return !intentCompleted(
      { phone: it.phone, donor_email: it.donor_email, name: cd.__name, amount: it.amount, created_at: it.created_at },
      completed || [],
    )
  })

  const rows = openIntents.map(it => {
    const cd = (it.custom_data || {}) as Record<string, unknown>
    const ageMin = (Date.now() - new Date(it.created_at).getTime()) / 60000
    return {
      id: it.id,
      name: String(cd.__name || '').trim() || '—',
      method: METHOD_LABEL[String(cd.__method || '')] || String(cd.__method || '') || '—',
      phone: it.phone || '',
      email: it.donor_email || '',
      amount: Math.round(Number(it.amount) || 0),
      group: it.group_slug || '',
      when: timeAgo(it.created_at),
      inProgress: ageMin < 5,        // may still complete
      notified: !!cd.__notified,     // manager was SMSed
      emailed: !!cd.__emailed,       // donor recovery email sent
    }
  })

  const totalAmount = rows.reduce((s, r) => s + r.amount, 0)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6" dir="rtl">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <UserX className="w-5 h-5 text-amber-500" /> לידים שנטשו
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          תורמים שמילאו פרטים ובחרו אמצעי תשלום אך לא השלימו את התרומה. שווה לחזור אליהם.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="text-2xl font-black text-gray-900">{rows.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">לידים שלא הושלמו</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="text-2xl font-black text-gray-900">₪{totalAmount.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-0.5">סכום פוטנציאלי</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="text-2xl font-black text-gray-900">{rows.filter(r => r.inProgress).length}</div>
          <div className="text-xs text-gray-500 mt-0.5">אולי עדיין בתהליך (5 דק׳)</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
          אין לידים שנטשו 🎉
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-gray-100">
                  <th className="text-right font-medium px-4 py-3">תורם</th>
                  <th className="text-right font-medium px-4 py-3">סכום</th>
                  <th className="text-right font-medium px-4 py-3">אמצעי</th>
                  <th className="text-right font-medium px-4 py-3">מתי</th>
                  <th className="text-right font-medium px-4 py-3">סטטוס</th>
                  <th className="text-right font-medium px-4 py-3">יצירת קשר</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-800">{r.name}</div>
                      {r.email && <div className="text-xs text-gray-400" dir="ltr">{r.email}</div>}
                      {r.phone && <div className="text-xs text-gray-400" dir="ltr">{r.phone}</div>}
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-800">₪{r.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">{r.method}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{r.when}</td>
                    <td className="px-4 py-3">
                      {r.inProgress ? (
                        <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">בתהליך</span>
                      ) : (
                        <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">נטש</span>
                      )}
                      <div className="mt-1 flex gap-1 text-[10px] text-gray-400">
                        {r.notified && <span title="נשלח SMS למנהל">📩 מנהל</span>}
                        {r.emailed && <span title="נשלח מייל לתורם">✉️ תורם</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {r.phone && (
                          <>
                            <a href={`tel:${r.phone}`} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700" title="חייג">
                              <Phone className="w-4 h-4" />
                            </a>
                            <a href={waLink(r.phone)} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-600" title="WhatsApp">
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          </>
                        )}
                        {r.email && (
                          <a href={`mailto:${r.email}`} className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600" title="מייל">
                            <Mail className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
