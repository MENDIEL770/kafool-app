import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Eye, PlayCircle, MousePointerClick, CreditCard, CheckCircle2, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function InsightsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  // access gate — the manager can only read their own campaign (RLS)
  const { data: campaign } = await supabase.from('campaigns').select('id, title').eq('id', id).single()
  if (!campaign) redirect('/campaigns')

  // events live in an RLS-locked table → read with the service client
  const admin = await createServiceClient()
  const events: { session_id: string; event_type: string }[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from('campaign_events').select('session_id, event_type')
      .eq('campaign_id', id).order('id', { ascending: true }).range(from, from + 999)
    if (error || !data?.length) break
    events.push(...data)
    if (data.length < 1000) break
  }

  const uniq = (t: string) => new Set(events.filter(e => e.event_type === t).map(e => e.session_id)).size
  const views = uniq('view')
  const videoPlays = uniq('video_play')
  const opened = uniq('donate_open')
  const payment = uniq('donate_payment')
  // "Completed" comes from the REAL donations (source of truth) — the browser
  // 'donate_complete' event is unreliable because most donors never land back on
  // /thanks (webhook records it; Bit/mobile especially never return). Cap at the
  // reached-payment count so the funnel stays visually monotonic.
  const { count: donationCount } = await admin
    .from('donations').select('*', { count: 'exact', head: true })
    .eq('campaign_id', id).eq('payment_status', 'completed')
  const completed = donationCount ?? 0
  const pct = (n: number, of: number) => (of > 0 ? Math.round((n / of) * 100) : 0)

  // gate=true → counts toward the strict drop-off chain. The video step is optional
  // (you can donate without watching), so it's shown but doesn't gate the funnel.
  const funnel = [
    { label: 'נכנסו לדף', value: views, icon: Eye, color: '#3b82f6', gate: true },
    { label: 'צפו בסרטון', value: videoPlays, icon: PlayCircle, color: '#8b5cf6', gate: false },
    { label: 'לחצו "לתרומה"', value: opened, icon: MousePointerClick, color: '#a855f7', gate: true },
    { label: 'הגיעו לתשלום', value: payment, icon: CreditCard, color: '#f59e0b', gate: true },
    { label: 'השלימו תרומה', value: completed, icon: CheckCircle2, color: '#10b981', gate: true },
  ]
  const droppedDetails = Math.max(0, opened - payment)   // opened the form but didn't reach payment
  const droppedPayment = Math.max(0, payment - completed) // reached payment but didn't finish

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6" dir="rtl">
      <div>
        <h1 className="text-xl font-black text-gray-900">סקירת תנועה</h1>
        <p className="text-sm text-gray-400 mt-0.5">איך מבקרים משתמשים בדף הגיוס — כניסות, סרטון, ומשפך התרומה.</p>
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-10 text-center text-gray-400">
          <Users className="w-10 h-10 mx-auto text-gray-200 mb-2" />
          <p className="text-sm">עדיין אין נתוני תנועה. ברגע שמבקרים ייכנסו לדף הגיוס, הנתונים יופיעו כאן.</p>
        </div>
      ) : (
        <>
          {/* top stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'מבקרים', value: views, icon: Eye, color: 'text-blue-700 bg-blue-50' },
              { label: 'צפו בסרטון', value: videoPlays, icon: PlayCircle, color: 'text-violet-700 bg-violet-50' },
              { label: 'התחילו תרומה', value: opened, icon: MousePointerClick, color: 'text-amber-700 bg-amber-50' },
              { label: 'אחוז המרה', value: `${pct(completed, views)}%`, icon: CheckCircle2, color: 'text-emerald-700 bg-emerald-50' },
            ].map(s => (
              <div key={s.label} className={`rounded-2xl border border-gray-100 p-4 ${s.color.split(' ')[1]}`}>
                <s.icon className={`w-4 h-4 ${s.color.split(' ')[0]}`} />
                <div className={`text-2xl font-black mt-1 ${s.color.split(' ')[0]}`}>{typeof s.value === 'number' ? s.value.toLocaleString('he-IL') : s.value}</div>
                <div className="text-xs font-semibold text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>

          {/* funnel */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-800 mb-4">משפך התרומה</h2>
            <div className="space-y-3">
              {(() => { let lastGate = views; return funnel.map((f, i) => {
                const width = views > 0 ? Math.max(4, pct(f.value, views)) : 0
                const drop = (f.gate && i > 0) ? Math.max(0, lastGate - f.value) : 0
                if (f.gate) lastGate = f.value
                return (
                  <div key={f.label}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-1.5 font-semibold text-gray-700">
                        <f.icon className="w-4 h-4" style={{ color: f.color }} /> {f.label}
                        {!f.gate && <span className="text-[10px] font-normal text-gray-300">(לא חובה במסע)</span>}
                      </span>
                      <span className="font-bold text-gray-900">{f.value.toLocaleString('he-IL')} <span className="text-xs font-normal text-gray-400">({pct(f.value, views)}%)</span></span>
                    </div>
                    <div className="h-7 bg-gray-100 rounded-lg overflow-hidden">
                      <div className="h-full rounded-lg transition-all" style={{ width: `${width}%`, background: f.color, opacity: f.gate ? 1 : 0.7 }} />
                    </div>
                    {drop > 0 && (
                      <div className="text-[11px] text-red-400 mt-0.5">↳ נשרו {drop.toLocaleString('he-IL')} בשלב הקודם</div>
                    )}
                  </div>
                )
              }) })()}
            </div>
          </div>

          {/* where they stopped */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
              <div className="text-2xl font-black text-amber-700">{droppedDetails.toLocaleString('he-IL')}</div>
              <div className="text-sm font-semibold text-gray-600">פתחו את הטופס ועזבו לפני התשלום</div>
              <div className="text-[11px] text-gray-400 mt-0.5">עצרו בשלב מילוי הפרטים/הסכום</div>
            </div>
            <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4">
              <div className="text-2xl font-black text-red-700">{droppedPayment.toLocaleString('he-IL')}</div>
              <div className="text-sm font-semibold text-gray-600">הגיעו לתשלום ולא השלימו</div>
              <div className="text-[11px] text-gray-400 mt-0.5">עצרו במסך התשלום</div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
