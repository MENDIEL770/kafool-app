'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Phone, ChevronDown, ChevronLeft, MessageCircle, Copy, Check, Loader2,
  CalendarClock, HandCoins, Target, ScrollText, Star, UserPlus,
} from 'lucide-react'

interface Group { id: string; display_name: string | null; public_slug: string; donation_link: string | null; personal_goal: number }
interface Lead {
  id: string; full_name: string | null; phone: string | null; email: string | null; address: string | null
  birthday: string | null; notes: string | null; status: string; is_vip: boolean
  donation_history: { year: number; amount: number }[] | null
}
interface Call { id: string; lead_id: string; outcome: string | null; notes: string | null; called_at: string }
interface Reminder { id: string; lead_id: string; due_at: string; note: string | null; status: string }

const ACTIONABLE = ['new', 'no_answer', 'busy', 'callback']
const STATUS_HE: Record<string, string> = {
  new: 'חדש', no_answer: 'לא ענה', busy: 'תפוס', wrong_number: 'מספר שגוי',
  not_interested: 'לא מעוניין', removed: 'הוסר', callback: 'חזור אליו', promised: 'הבטיח', donated: 'תרם',
}
const QUICK: { key: string; label: string; tone: string }[] = [
  { key: 'no_answer', label: 'לא ענה', tone: 'bg-gray-100 text-gray-700' },
  { key: 'busy', label: 'תפוס', tone: 'bg-gray-100 text-gray-700' },
  { key: 'wrong_number', label: 'מספר שגוי', tone: 'bg-gray-100 text-gray-700' },
  { key: 'not_interested', label: 'לא מעוניין', tone: 'bg-orange-50 text-orange-700' },
  { key: 'removed', label: 'הסר אותי', tone: 'bg-red-50 text-red-600' },
]

export default function CallerScreen({ group, leads, calls, reminders, callScript }: {
  group: Group | null; leads: Lead[]; calls: Call[]; reminders: Reminder[]; callScript: unknown
}) {
  const router = useRouter()
  const vcfRef = useRef<HTMLInputElement>(null)
  const [idx, setIdx] = useState(0)
  const [busy, setBusy] = useState(false)
  const [importing, setImporting] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showScript, setShowScript] = useState(false)
  const [panel, setPanel] = useState<null | 'promise' | 'callback'>(null)
  const [amount, setAmount] = useState('')
  const [callbackAt, setCallbackAt] = useState('')
  const [copied, setCopied] = useState(false)

  if (!group) return <div dir="rtl" className="p-16 text-center text-gray-500">לא נמצא דף קבוצה.</div>

  const queue = leads.filter(l => ACTIONABLE.includes(l.status))
  const lead = queue[Math.min(idx, queue.length - 1)] || null
  const pendingReminders = reminders.length
  const promisedCount = leads.filter(l => l.status === 'promised').length
  const donatedCount = leads.filter(l => l.status === 'donated').length

  async function post(url: string, body: unknown): Promise<boolean> {
    setBusy(true)
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setBusy(false)
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error || 'הפעולה נכשלה'); return false }
    return true
  }
  function advance() { setPanel(null); setAmount(''); setCallbackAt(''); setShowDetails(false); router.refresh() }

  async function setStatus(outcome: string) {
    if (!lead) return
    if (await post('/api/kafoolplus/calls', { lead_id: lead.id, outcome })) advance()
  }
  async function savePromise() {
    if (!lead || !(Number(amount) > 0)) return
    if (await post('/api/kafoolplus/promises', { lead_id: lead.id, amount })) advance()
  }
  async function saveCallback() {
    if (!lead || !callbackAt) return
    if (await post('/api/kafoolplus/reminders', { lead_id: lead.id, due_at: new Date(callbackAt).toISOString() })) advance()
  }

  function sendWhatsApp() {
    if (!lead?.phone || !group?.donation_link) { alert('חסר טלפן או קישור תרומה'); return }
    const phone = lead.phone.replace(/\D/g, '').replace(/^0/, '972')
    const msg = `שלום ${lead.full_name || ''}, אפשר לתרום בקישור: ${group.donation_link}`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener')
  }
  function copyLink() {
    if (!group?.donation_link) return
    navigator.clipboard.writeText(group.donation_link); setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  async function saveContacts(leads: { full_name: string; phone: string }[]) {
    if (leads.length === 0) return
    setImporting(true)
    const res = await fetch('/api/kafoolplus/my-leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leads }) })
    const d = await res.json().catch(() => ({}))
    setImporting(false)
    if (!res.ok) { alert(d.error || 'הייבוא נכשל'); return }
    alert(`נוספו ${d.inserted} אנשי קשר${d.skipped ? ` (${d.skipped} כפילויות דולגו)` : ''}`)
    router.refresh()
  }

  // Native phone contact picker (Chrome on Android / PWA), else fall back to a .vcf file.
  async function importContacts() {
    const nav = navigator as Navigator & { contacts?: { select: (props: string[], opts: { multiple: boolean }) => Promise<{ name?: string[]; tel?: string[] }[]> } }
    if (nav.contacts?.select) {
      try {
        const picked = await nav.contacts.select(['name', 'tel'], { multiple: true })
        await saveContacts(picked.map(c => ({ full_name: (c.name?.[0] || '').trim(), phone: (c.tel?.[0] || '').trim() })))
      } catch { /* user cancelled */ }
    } else {
      vcfRef.current?.click()
    }
  }
  async function onVcf(file: File) {
    const text = await file.text()
    const cards = text.split(/BEGIN:VCARD/i).slice(1)
    const leads = cards.map(card => {
      const fn = card.match(/\nFN[^:]*:(.+)/i)?.[1]?.trim() || ''
      const tel = card.match(/\nTEL[^:]*:(.+)/i)?.[1]?.trim() || ''
      return { full_name: fn, phone: tel }
    }).filter(l => l.full_name || l.phone)
    await saveContacts(leads)
    if (vcfRef.current) vcfRef.current.value = ''
  }

  const leadCalls = lead ? calls.filter(c => c.lead_id === lead.id) : []
  const prevDonation = lead?.donation_history?.length ? Math.max(...lead.donation_history.map(d => d.amount)) : 0

  return (
    <div dir="rtl" className="max-w-xl mx-auto px-4 py-6 space-y-4">
      {/* Header + personal goal */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900">שלום, {group.display_name}</h1>
          <p className="text-xs text-gray-400">בתור: {queue.length} · חזרות: {pendingReminders} · הבטיחו: {promisedCount} · תרמו: {donatedCount}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={importContacts} disabled={importing} className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 disabled:opacity-50">
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} ייבוא אנשי קשר
          </button>
          {callScript != null && (
            <button onClick={() => setShowScript(v => !v)} className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2"><ScrollText className="w-4 h-4" /> תסריט</button>
          )}
        </div>
      </div>
      <input ref={vcfRef} type="file" accept=".vcf,text/vcard" className="hidden" onChange={e => e.target.files?.[0] && onVcf(e.target.files[0])} />

      {group.personal_goal > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1"><span className="flex items-center gap-1"><Target className="w-3.5 h-3.5" /> יעד אישי</span><span>₪{group.personal_goal.toLocaleString()}</span></div>
        </div>
      )}

      {showScript && callScript != null && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-line">
          {typeof callScript === 'string' ? callScript : JSON.stringify(callScript, null, 2)}
        </div>
      )}

      {!lead ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center space-y-2">
          <Check className="w-10 h-10 text-emerald-400 mx-auto" />
          <p className="font-bold text-gray-700">סיימת את התור! 🎉</p>
          <p className="text-sm text-gray-400">אין כרגע לידים לטיפול.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {/* card head */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-gray-900 truncate">{lead.full_name || 'ללא שם'}</h2>
                  {lead.is_vip && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5"><Star className="w-3 h-3 fill-amber-500 text-amber-500" /> VIP</span>}
                </div>
                <div className="text-gray-500 mt-0.5" dir="ltr">{lead.phone || '—'}</div>
              </div>
              <span className="text-[11px] font-bold text-gray-400 bg-gray-50 rounded-full px-2.5 py-1 shrink-0">{STATUS_HE[lead.status] || lead.status}</span>
            </div>
            {prevDonation > 0 && (
              <div className="mt-3 inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 rounded-lg px-3 py-1.5 text-sm font-bold">
                <HandCoins className="w-4 h-4" /> תרם בעבר: ₪{prevDonation.toLocaleString()}
              </div>
            )}
          </div>

          {/* details */}
          <button onClick={() => setShowDetails(v => !v)} className="w-full flex items-center justify-between px-5 py-2.5 text-sm text-gray-500 hover:bg-gray-50">
            פרטים נוספים <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          </button>
          {showDetails && (
            <div className="px-5 pb-3 text-sm text-gray-600 space-y-1">
              {lead.email && <div dir="ltr">✉️ {lead.email}</div>}
              {lead.address && <div>🏠 {lead.address}</div>}
              {lead.birthday && <div>🎂 {lead.birthday}</div>}
              {lead.notes && <div className="text-gray-500">📝 {lead.notes}</div>}
              {lead.donation_history?.length ? (
                <div className="pt-1">
                  <div className="text-xs font-bold text-gray-400">היסטוריית תרומות</div>
                  {lead.donation_history.map((d, i) => <div key={i} className="text-xs">{d.year}: ₪{d.amount.toLocaleString()}</div>)}
                </div>
              ) : null}
              {leadCalls.length > 0 && (
                <div className="pt-1">
                  <div className="text-xs font-bold text-gray-400">היסטוריית שיחות</div>
                  {leadCalls.map(c => <div key={c.id} className="text-xs">{new Date(c.called_at).toLocaleDateString('he-IL')} · {STATUS_HE[c.outcome || ''] || c.outcome}</div>)}
                </div>
              )}
            </div>
          )}

          {/* actions */}
          <div className="p-5 space-y-3 bg-gray-50/50">
            <div className="grid grid-cols-2 gap-2">
              <a href={lead.phone ? `tel:${lead.phone}` : undefined} className="flex items-center justify-center gap-2 py-3 rounded-xl text-white font-black text-base" style={{ background: '#16a34a' }}><Phone className="w-5 h-5" /> התקשר</a>
              <button onClick={sendWhatsApp} disabled={busy} className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-[#25D366] text-white"><MessageCircle className="w-5 h-5" /> שלח בוואטסאפ</button>
            </div>
            {group.donation_link && (
              <button onClick={copyLink} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold text-gray-600 border border-gray-200 hover:bg-white">
                {copied ? <><Check className="w-4 h-4 text-emerald-500" /> הועתק</> : <><Copy className="w-4 h-4" /> העתק קישור תרומה</>}
              </button>
            )}

            {/* promise / callback panels */}
            {panel === 'promise' && (
              <div className="flex items-center gap-2">
                <input value={amount} onChange={e => setAmount(e.target.value)} type="number" dir="ltr" placeholder="סכום ההבטחה ₪" autoFocus className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <button onClick={savePromise} disabled={busy || !(Number(amount) > 0)} className="px-4 py-2 rounded-lg text-white text-sm font-bold disabled:opacity-40" style={{ background: '#16a34a' }}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'שמור'}</button>
              </div>
            )}
            {panel === 'callback' && (
              <div className="flex items-center gap-2">
                <input value={callbackAt} onChange={e => setCallbackAt(e.target.value)} type="datetime-local" dir="ltr" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <button onClick={saveCallback} disabled={busy || !callbackAt} className="px-4 py-2 rounded-lg text-white text-sm font-bold disabled:opacity-40" style={{ background: '#4f46e5' }}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'קבע'}</button>
              </div>
            )}

            {!panel && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setPanel('promise'); setAmount('') }} disabled={busy} className="py-2.5 rounded-xl font-bold text-sm bg-emerald-600 text-white">הבטיח לתרום</button>
                  <button onClick={() => { setPanel('callback'); setCallbackAt('') }} disabled={busy} className="py-2.5 rounded-xl font-bold text-sm bg-indigo-600 text-white">חזור אליו</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {QUICK.map(q => (
                    <button key={q.key} onClick={() => setStatus(q.key)} disabled={busy} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${q.tone} disabled:opacity-40`}>{q.label}</button>
                  ))}
                </div>
              </>
            )}
            {panel && <button onClick={() => setPanel(null)} className="w-full text-xs text-gray-400 hover:text-gray-600">ביטול</button>}
          </div>

          {/* next */}
          {queue.length > 1 && (
            <button onClick={() => setIdx(i => (i + 1) % queue.length)} className="w-full flex items-center justify-center gap-1 py-2.5 text-xs text-gray-400 border-t border-gray-100 hover:bg-gray-50">
              דלג לליד הבא <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
