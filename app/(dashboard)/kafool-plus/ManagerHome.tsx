'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Building2, Users, Target, Trash2, Loader2, CheckCircle2, Clock, Megaphone, Send, UploadCloud, Phone } from 'lucide-react'
import NetworkImport from './NetworkImport'

export interface MasterCampaign {
  id: string; name: string; goal_amount: number; is_standalone: boolean; created_at: string
}
export interface Branch {
  id: string; master_campaign_id: string; name: string; coordinator_email: string | null; goal_amount: number
}
export interface Member {
  id: string; email: string; role: string; branch_id: string | null; user_id: string | null; is_active: boolean
}
export interface Group { id: string; display_name: string | null; branch_id: string | null }
export interface Promise_ { amount: number; status: string; caller_group_id: string | null }

export default function ManagerHome({ campaigns, branches, members, groups = [], promises = [], leadStatuses = [], callsCount = 0 }: {
  campaigns: MasterCampaign[]; branches: Branch[]; members: Member[]
  groups?: Group[]; promises?: Promise_[]; leadStatuses?: string[]; callsCount?: number
}) {
  const router = useRouter()
  const [showNetwork, setShowNetwork] = useState(false)
  const [branchEmails, setBranchEmails] = useState<Record<string, string>>({})
  const [selectedId, setSelectedId] = useState(campaigns[0]?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // new campaign
  const [showNew, setShowNew] = useState(campaigns.length === 0)
  const [cName, setCName] = useState('')
  const [cGoal, setCGoal] = useState('')
  const [cStandalone, setCStandalone] = useState(true)

  // new coordinator
  const [brName, setBrName] = useState('')
  const [brEmail, setBrEmail] = useState('')
  const [brGoal, setBrGoal] = useState('')

  const selected = campaigns.find(c => c.id === selectedId) || null
  const campaignBranches = branches.filter(b => b.master_campaign_id === selectedId)

  // org-wide dashboard
  const promisedTotal = promises.reduce((s, p) => s + (p.amount || 0), 0)
  const donatedCount = leadStatuses.filter(s => s === 'donated').length
  const promisedCount = leadStatuses.filter(s => s === 'promised').length
  const groupName = (id: string | null) => groups.find(g => g.id === id)?.display_name || 'טלפן'
  const byGroup = promises.reduce<Record<string, number>>((acc, p) => {
    if (p.caller_group_id) acc[p.caller_group_id] = (acc[p.caller_group_id] || 0) + (p.amount || 0)
    return acc
  }, {})
  const leaderboard = Object.entries(byGroup).map(([gid, amt]) => ({ gid, amt })).sort((a, b) => b.amt - a.amt).slice(0, 10)

  async function api(url: string, method: string, body: unknown): Promise<boolean> {
    setBusy(true); setError(null)
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setBusy(false)
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'הפעולה נכשלה'); return false }
    return true
  }

  async function createCampaign() {
    if (!cName.trim()) return
    if (await api('/api/kafoolplus/campaigns', 'POST', { name: cName, goal_amount: cGoal, is_standalone: cStandalone })) {
      setCName(''); setCGoal(''); setShowNew(false); router.refresh()
    }
  }
  async function addCoordinator() {
    if (!brName.trim() || !brEmail.trim()) return
    if (await api('/api/kafoolplus/coordinators', 'POST', { master_campaign_id: selectedId, name: brName, email: brEmail, goal_amount: brGoal })) {
      setBrName(''); setBrEmail(''); setBrGoal(''); router.refresh()
    }
  }
  async function removeBranch(id: string) {
    if (!confirm('להסיר את הסניף והרכז שלו? (הטלפנים והלידים בסניף יימחקו)')) return
    if (await api('/api/kafoolplus/coordinators', 'DELETE', { branch_id: id })) router.refresh()
  }
  async function assignEmail(branchId: string) {
    const email = (branchEmails[branchId] || '').trim()
    if (!email) return
    if (await api('/api/kafoolplus/coordinators', 'PATCH', { branch_id: branchId, email })) {
      setBranchEmails(s => ({ ...s, [branchId]: '' })); router.refresh()
    }
  }
  function shareLogin() {
    const url = `${window.location.origin}/kafool-plus-login`
    navigator.clipboard.writeText(url).catch(() => {})
    window.prompt('קישור התחברות (Google) — שלח לרכז. הוא יתחבר עם חשבון ה-Google של המייל הרשום:', url)
  }

  const coordinatorOf = (branchId: string) => members.find(m => m.branch_id === branchId && m.role === 'coordinator')

  return (
    <div dir="rtl" className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">מוקד גיוס — Kafool+</h1>
            <p className="text-sm text-gray-400">ניהול קמפיין ראשי, סניפים ורכזים</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href="/kafool-plus?preview=caller" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-700 border border-gray-200 bg-white hover:bg-gray-50">
            <Phone className="w-4 h-4" /> תצוגת מסך טלפן
          </a>
          <button onClick={() => setShowNew(v => !v)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold shadow-sm hover:opacity-90" style={{ background: '#4f46e5' }}>
            <Plus className="w-4 h-4" /> קמפיין ראשי חדש
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 text-xs font-bold">סגור</button>
        </div>
      )}

      {/* Org-wide dashboard */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat icon={Target} label="שיחות" value={callsCount.toLocaleString()} />
          <Stat icon={CheckCircle2} label="הבטחות (₪)" value={`₪${promisedTotal.toLocaleString()}`} />
          <Stat icon={Clock} label="ממתינים לתרומה" value={String(promisedCount)} />
          <Stat icon={Users} label="תרמו" value={String(donatedCount)} />
        </div>
      )}

      {leaderboard.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-3">דירוג טלפנים (לפי הבטחות)</h2>
          <div className="space-y-1.5">
            {leaderboard.map((row, i) => (
              <div key={row.gid} className="flex items-center gap-3 text-sm">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                <span className="flex-1 font-medium text-gray-700">{groupName(row.gid)}</span>
                <span className="font-black text-gray-900">₪{row.amt.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New campaign form */}
      {showNew && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-800">קמפיין ראשי חדש</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={cName} onChange={e => setCName(e.target.value)} placeholder="שם הקמפיין הראשי" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300" />
            <input value={cGoal} onChange={e => setCGoal(e.target.value)} type="number" dir="ltr" placeholder="יעד (₪)" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={cStandalone} onChange={e => setCStandalone(e.target.checked)} className="w-4 h-4" />
            מוקד עצמאי (ללא דף גיוס ציבורי מחובר)
          </label>
          <div className="flex gap-2">
            <button onClick={createCampaign} disabled={busy || !cName.trim()} className="px-4 py-2 rounded-lg text-white text-sm font-bold disabled:opacity-40" style={{ background: '#4f46e5' }}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'צור קמפיין'}
            </button>
            {campaigns.length > 0 && <button onClick={() => setShowNew(false)} className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100">ביטול</button>}
          </div>
        </div>
      )}

      {campaigns.length === 0 && !showNew ? null : campaigns.length > 0 && (
        <>
          {/* Campaign selector */}
          <div className="flex gap-2 flex-wrap">
            {campaigns.map(c => (
              <button key={c.id} onClick={() => setSelectedId(c.id)}
                className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${selectedId === c.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                {c.name}
                {c.is_standalone && <span className="mr-1.5 text-[10px] font-medium text-gray-400">· עצמאי</span>}
              </button>
            ))}
          </div>

          {selected && (
            <>
              {/* Campaign summary */}
              <div className="grid grid-cols-3 gap-3">
                <Stat icon={Target} label="יעד" value={`₪${(selected.goal_amount || 0).toLocaleString()}`} />
                <Stat icon={Building2} label="סניפים" value={String(campaignBranches.length)} />
                <Stat icon={Users} label="רכזים מחוברים" value={String(campaignBranches.filter(b => coordinatorOf(b.id)?.user_id).length)} />
              </div>

              {/* Coordinators / branches */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="font-bold text-gray-800 flex items-center gap-2"><Building2 className="w-4 h-4" /> סניפים ורכזים</h2>
                  <button onClick={() => setShowNetwork(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100"><UploadCloud className="w-4 h-4" /> ייבוא רשת סניפים</button>
                </div>

                {/* add coordinator */}
                <div className="grid sm:grid-cols-[1fr_1fr_120px_auto] gap-2 items-center bg-gray-50 rounded-xl p-3">
                  <input value={brName} onChange={e => setBrName(e.target.value)} placeholder="שם הסניף" className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300" />
                  <input value={brEmail} onChange={e => setBrEmail(e.target.value)} type="email" dir="ltr" placeholder="מייל הרכז" className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300" />
                  <input value={brGoal} onChange={e => setBrGoal(e.target.value)} type="number" dir="ltr" placeholder="יעד ₪" className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300" />
                  <button onClick={addCoordinator} disabled={busy || !brName.trim() || !brEmail.trim()} className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-bold disabled:opacity-40" style={{ background: '#4f46e5' }}>
                    <Plus className="w-4 h-4" /> הוסף
                  </button>
                </div>

                {campaignBranches.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">עוד לא נוספו סניפים. הוסיפו רכז למעלה — הוא יתחבר עם המייל שהוזן.</p>
                ) : (
                  <div className="space-y-2">
                    {campaignBranches.map(b => {
                      const coord = coordinatorOf(b.id)
                      const linked = !!coord?.user_id
                      return (
                        <div key={b.id} className="flex items-center justify-between gap-3 border border-gray-100 rounded-xl px-4 py-3">
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-gray-800">{b.name}</div>
                            {b.coordinator_email && <div className="text-xs text-gray-400 truncate" dir="ltr">{b.coordinator_email}</div>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {b.coordinator_email ? (
                              <>
                                {linked
                                  ? <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> התחבר</span>
                                  : <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500"><Clock className="w-3.5 h-3.5" /> ממתין</span>}
                                <button onClick={shareLogin} disabled={busy} title="העתק קישור התחברות לשליחה" className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-2.5 py-1.5">
                                  <Send className="w-3.5 h-3.5" /> קישור
                                </button>
                              </>
                            ) : (
                              <>
                                <input value={branchEmails[b.id] || ''} onChange={e => setBranchEmails(s => ({ ...s, [b.id]: e.target.value }))} type="email" dir="ltr" placeholder="מייל הרכז" className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs w-40 outline-none focus:ring-2 focus:ring-indigo-300" />
                                <button onClick={() => assignEmail(b.id)} disabled={busy || !(branchEmails[b.id] || '').trim()} className="text-[11px] font-bold text-white rounded-lg px-2.5 py-1.5 disabled:opacity-40" style={{ background: '#4f46e5' }}>הזן רכז</button>
                              </>
                            )}
                            <button onClick={() => removeBranch(b.id)} disabled={busy} className="w-8 h-8 rounded-lg border border-gray-200 text-red-500 hover:bg-red-50 flex items-center justify-center">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {showNetwork && selectedId && (
        <NetworkImport masterCampaignId={selectedId} onClose={() => setShowNetwork(false)} onDone={() => { setShowNetwork(false); router.refresh() }} />
      )}
    </div>
  )
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><Icon className="w-4 h-4" /> {label}</div>
      <div className="text-xl font-black text-gray-900">{value}</div>
    </div>
  )
}
