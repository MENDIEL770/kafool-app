'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogIn, Send, ChevronDown, KeyRound } from 'lucide-react'

export default function OrgActions({ orgId, status, slug, ownerEmail }: {
  orgId: string
  status: string
  slug: string
  ownerEmail?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

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
    const password = window.prompt('הזן סיסמה חדשה לבעל הארגון (לפחות 6 תווים):')
    if (!password) return
    setLoading(true)
    const res = await fetch('/api/super-admin/orgs/set-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orgId, password }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    alert(res.ok ? 'הסיסמה עודכנה — אפשר להתחבר עם המייל והסיסמה החדשה.' : (data.error || 'עדכון הסיסמה נכשל'))
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
                אפס סיסמה לבעלים
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
    </div>
  )
}
