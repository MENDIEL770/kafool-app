'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogIn, Send, ChevronDown, KeyRound, Target, Megaphone, SlidersHorizontal, X, Check, Snowflake, Lock } from 'lucide-react'

export default function OrgActions({ orgId, status, slug, ownerEmail, hasFundraising = true, hasKafoolPlus = false }: {
  orgId: string
  status: string
  slug: string
  ownerEmail?: string
  hasFundraising?: boolean
  hasKafoolPlus?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  async function updateStatus(newStatus: 'active' | 'suspended') {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('organizations').update({ status: newStatus }).eq('id', orgId)
    if (newStatus === 'active') {
      const { data: org } = await supabase.from('organizations').select('owner_id').eq('id', orgId).single()
      if (org?.owner_id) {
        await supabase.from('profiles').update({ org_id: orgId }).eq('id', org.owner_id)
      }
    }
    router.refresh()
    setLoading(false)
  }

  // Toggle a module subscription; never let an org end up with neither.
  async function toggleModule(field: 'has_fundraising' | 'has_kafool_plus') {
    const next = field === 'has_fundraising' ? !hasFundraising : !hasKafoolPlus
    const other = field === 'has_fundraising' ? hasKafoolPlus : hasFundraising
    if (!next && !other) { alert('הארגון חייב להיות מנוי לפחות למודול אחד.'); return }
    setLoading(true)
    const supabase = createClient()
    await supabase.from('organizations').update({ [field]: next }).eq('id', orgId)
    router.refresh()
    setLoading(false)
  }

  // Enter the org context (sticky cookie) and navigate into the dashboard.
  async function enterOrg(target: string) {
    setMenuOpen(false)
    setLoading(true)
    // Drop the saved "default campaign" — it belongs to the previous org and
    // would otherwise make the sidebar jump into that org's campaign.
    try { localStorage.removeItem('kafool_default_campaign') } catch { /* ignore */ }
    await fetch('/api/super-admin/context', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orgId }),
    })
    router.push(target)
    router.refresh()
  }

  async function resetPassword() {
    setMenuOpen(false)
    const email = (window.prompt('מייל הבעלים (נדרש רק אם עדיין אין חשבון לארגון — אחרת אפשר להשאיר ריק):') || '').trim()
    const password = window.prompt('סיסמה לבעל הארגון (לפחות 6 תווים):')
    if (!password) return
    setLoading(true)
    const res = await fetch('/api/super-admin/orgs/set-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orgId, email, password }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (res.ok) router.refresh()
    alert(res.ok
      ? (data.created ? 'החשבון נוצר — אפשר להתחבר עם המייל והסיסמה.' : 'הסיסמה עודכנה — אפשר להתחבר.')
      : (data.error || 'הפעולה נכשלה'))
  }

  async function sendLoginLink() {
    setSending(true)
    setMenuOpen(false)
    const res = await fetch('/api/super-admin/orgs/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId }),
    })
    const data = await res.json()
    setSending(false)
    if (data.url) {
      await navigator.clipboard.writeText(data.url)
      alert('קישור הכניסה הועתק ללוח — שלח ללקוח')
    } else {
      alert(data.error || 'שגיאה')
    }
  }

  const busy = loading || sending

  return (
    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
      {/* Enter dashboard */}
      <button
        onClick={() => enterOrg('/dashboard')}
        disabled={busy || !['active', 'pending'].includes(status)}
        title="כניסה לדשבורד הארגון"
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-colors font-semibold disabled:opacity-40"
      >
        <LogIn className="w-3.5 h-3.5" />
        כניסה
      </button>

      {/* Manage / permissions */}
      <button
        onClick={() => setSettingsOpen(true)}
        disabled={busy}
        title="ניהול הרשאות ומנוי"
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 border border-violet-100 hover:bg-violet-100 transition-colors font-semibold disabled:opacity-40"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        ניהול
      </button>

      {/* More actions dropdown */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(o => !o)}
          disabled={busy}
          className="flex items-center gap-0.5 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[160px]">
              {/* Campaigns */}
              <button
                onClick={() => enterOrg('/campaigns')}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors text-right"
              >
                קמפיינים
              </button>

              {/* Copy login link */}
              <button
                onClick={sendLoginLink}
                disabled={!['active', 'pending'].includes(status)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                <Send className="w-3 h-3" />
                {sending ? 'יוצר...' : 'העתק קישור כניסה'}
              </button>

              {/* Reset owner password */}
              <button
                onClick={resetPassword}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <KeyRound className="w-3 h-3" />
                הגדר/אפס סיסמת בעלים
              </button>

              <div className="border-t border-gray-100 my-1" />

              {/* Module entitlements */}
              <div className="px-3 pt-1 pb-0.5 text-[10px] font-semibold text-gray-400">מנוי / מודולים</div>
              <button
                onClick={() => toggleModule('has_fundraising')}
                disabled={loading}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span className="flex items-center gap-2"><Target className="w-3 h-3" /> גיוס תרומות</span>
                <span className={`text-[10px] font-bold ${hasFundraising ? 'text-green-600' : 'text-gray-300'}`}>{hasFundraising ? 'פעיל' : 'כבוי'}</span>
              </button>
              <button
                onClick={() => toggleModule('has_kafool_plus')}
                disabled={loading}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span className="flex items-center gap-2"><Megaphone className="w-3 h-3" /> Kafool+</span>
                <span className={`text-[10px] font-bold ${hasKafoolPlus ? 'text-violet-600' : 'text-gray-300'}`}>{hasKafoolPlus ? 'פעיל' : 'כבוי'}</span>
              </button>

              <div className="border-t border-gray-100 my-1" />

              {/* Status actions */}
              {status === 'pending' && (
                <button
                  onClick={() => { updateStatus('active'); setMenuOpen(false) }}
                  disabled={loading}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-green-700 hover:bg-green-50 transition-colors font-semibold"
                >
                  ✓ אשר ארגון
                </button>
              )}
              {status === 'active' && (
                <button
                  onClick={() => { updateStatus('suspended'); setMenuOpen(false) }}
                  disabled={loading}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                >
                  השהה
                </button>
              )}
              {status === 'suspended' && (
                <button
                  onClick={() => { updateStatus('active'); setMenuOpen(false) }}
                  disabled={loading}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-blue-600 hover:bg-blue-50 transition-colors font-semibold"
                >
                  הפעל מחדש
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Manage / permissions modal ── */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setSettingsOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center"><SlidersHorizontal className="w-4.5 h-4.5 text-violet-600" /></div>
                <div>
                  <h2 className="font-black text-gray-900">ניהול מנהל / ארגון</h2>
                  {ownerEmail && <p className="text-[11px] text-gray-400" dir="ltr">{ownerEmail}</p>}
                </div>
              </div>
              <button onClick={() => setSettingsOpen(false)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"><X className="w-4 h-4 text-gray-400" /></button>
            </div>

            <div className="p-5 space-y-5">
              {/* Modules / subscription */}
              <div>
                <p className="text-xs font-bold text-gray-500 mb-2">מנוי / מודולים</p>
                <div className="space-y-2">
                  <button onClick={() => toggleModule('has_fundraising')} disabled={loading}
                    className={`w-full flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 transition-colors ${hasFundraising ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <span className="flex items-center gap-2.5 text-sm font-semibold text-gray-700"><Target className="w-4 h-4 text-blue-600" /> מערכת גיוס תרומות</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${hasFundraising ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{hasFundraising ? 'פעיל' : 'כבוי'}</span>
                  </button>
                  <button onClick={() => toggleModule('has_kafool_plus')} disabled={loading}
                    className={`w-full flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 transition-colors ${hasKafoolPlus ? 'border-violet-300 bg-violet-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <span className="flex items-center gap-2.5 text-sm font-semibold text-gray-700"><Megaphone className="w-4 h-4 text-violet-600" /> Kafool+ (טלפניה)</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${hasKafoolPlus ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{hasKafoolPlus ? 'פעיל' : 'כבוי'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">התפריט של המנהל נבנה לפי המודולים שמופעלים.</p>
              </div>

              {/* Account status / freeze */}
              <div>
                <p className="text-xs font-bold text-gray-500 mb-2">סטטוס חשבון</p>
                <div className="flex items-center gap-2">
                  {status === 'active' ? (
                    <button onClick={() => updateStatus('suspended')} disabled={loading}
                      className="flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100 font-semibold disabled:opacity-40">
                      <Snowflake className="w-4 h-4" /> הקפא חשבון
                    </button>
                  ) : (
                    <button onClick={() => updateStatus('active')} disabled={loading}
                      className="flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-xl bg-green-50 text-green-700 border border-green-100 hover:bg-green-100 font-semibold disabled:opacity-40">
                      <Check className="w-4 h-4" /> {status === 'pending' ? 'אשר והפעל' : 'הפעל מחדש'}
                    </button>
                  )}
                  <span className="text-xs text-gray-400">
                    {status === 'active' ? 'פעיל' : status === 'pending' ? 'ממתין לאישור' : 'מוקפא'}
                  </span>
                </div>
              </div>

              {/* Access */}
              <div>
                <p className="text-xs font-bold text-gray-500 mb-2">גישה</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={resetPassword} disabled={loading}
                    className="flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium disabled:opacity-40">
                    <Lock className="w-4 h-4" /> הגדר/אפס סיסמה
                  </button>
                  <button onClick={sendLoginLink} disabled={sending || !['active', 'pending'].includes(status)}
                    className="flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium disabled:opacity-40">
                    <Send className="w-4 h-4" /> {sending ? 'יוצר...' : 'העתק קישור כניסה'}
                  </button>
                </div>
              </div>

              {/* Future paid add-ons */}
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-3.5">
                <p className="text-xs font-bold text-gray-400 mb-1">תוספים בתשלום</p>
                <p className="text-[11px] text-gray-400">פיצ׳רים מתקדמים (יתווספו בהמשך) ינוהלו מכאן — הפעלה/כיבוי וחיוב לכל מנהל.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
