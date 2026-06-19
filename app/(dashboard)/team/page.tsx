'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getClientOrgId } from '@/lib/tenancy-client'
import { UserPlus, Shield, User, MoreVertical, Check, X, Loader2 } from 'lucide-react'

interface Member {
  id: string
  full_name: string
  email?: string
  role: string
  is_active: boolean | null
  phone?: string
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'מנהל',
  viewer: 'צופה',
  super_admin: 'סופר מנהל',
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [currentUserId, setCurrentUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'viewer'>('admin')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  async function loadMembers() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUserId(user.id)

    const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('id', user.id).single()
    const ctxOrgId = getClientOrgId(profile)
    if (!ctxOrgId) return

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, is_active, phone')
      .eq('org_id', ctxOrgId)
      .order('role', { ascending: true })

    setMembers(data || [])
    setLoading(false)
  }

  useEffect(() => { loadMembers() }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setInviteMsg(null)
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) {
        setInviteMsg({ ok: false, text: data.error || 'שגיאה' })
      } else {
        setInviteMsg({ ok: true, text: data.method === 'invited' ? 'הזמנה נשלחה לאימייל!' : 'המשתמש עודכן לארגון' })
        setInviteEmail('')
        loadMembers()
      }
    } catch {
      setInviteMsg({ ok: false, text: 'שגיאת רשת' })
    }
    setInviting(false)
  }

  async function updateMember(userId: string, patch: { role?: string; is_active?: boolean }) {
    setUpdating(userId)
    await fetch('/api/team/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...patch }),
    })
    setOpenMenu(null)
    await loadMembers()
    setUpdating(null)
  }

  const initials = (name: string) =>
    name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'

  const colors = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500']
  const colorFor = (id: string) => colors[id.charCodeAt(0) % colors.length]

  return (
    <div className="max-w-2xl mx-auto space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">צוות</h1>
        <p className="text-sm text-gray-400 mt-1">נהל את המנהלים שיש להם גישה לדאשבורד</p>
      </div>

      {/* Invite form */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
        <h2 className="font-bold text-gray-800 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-blue-500" />
          הוסף מנהל חדש
        </h2>
        <form onSubmit={handleInvite} className="flex gap-2 flex-wrap">
          <input
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="אימייל..."
            required
            dir="ltr"
            className="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={inviteRole}
            onChange={e => setInviteRole(e.target.value as 'admin' | 'viewer')}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="admin">מנהל</option>
            <option value="viewer">צופה</option>
          </select>
          <button
            type="submit"
            disabled={inviting}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            הזמן
          </button>
        </form>
        {inviteMsg && (
          <div className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2 ${inviteMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
            {inviteMsg.ok ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {inviteMsg.text}
          </div>
        )}
        <p className="text-xs text-gray-400">המשתמש יקבל אימייל עם קישור כניסה ויצורף לארגון שלך.</p>
      </div>

      {/* Members list */}
      <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100 overflow-hidden">
        <div className="px-5 py-3.5">
          <h2 className="font-bold text-gray-800 text-sm">חברי הצוות ({members.length})</h2>
        </div>

        {loading && (
          <div className="py-10 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
          </div>
        )}

        {!loading && members.length === 0 && (
          <div className="py-10 text-center text-gray-400 text-sm">אין חברי צוות עדיין</div>
        )}

        {members.map((m) => {
          const isMe = m.id === currentUserId
          const isInactive = m.is_active === false
          const isUpdating = updating === m.id

          return (
            <div key={m.id} className={`flex items-center gap-3 px-5 py-4 ${isInactive ? 'opacity-50' : ''}`}>
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${colorFor(m.id)}`}>
                {initials(m.full_name || '')}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 text-sm truncate">{m.full_name || '—'}</span>
                  {isMe && <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full font-medium">אתה</span>}
                  {isInactive && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full font-medium">מושהה</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {m.role === 'admin' || m.role === 'super_admin'
                    ? <Shield className="w-3 h-3 text-blue-400" />
                    : <User className="w-3 h-3 text-gray-400" />
                  }
                  <span className="text-xs text-gray-400">{ROLE_LABELS[m.role] || m.role}</span>
                  {m.phone && <span className="text-xs text-gray-300 dir-ltr">{m.phone}</span>}
                </div>
              </div>

              {/* Actions — not for self */}
              {!isMe && (
                <div className="relative shrink-0">
                  <button
                    onClick={() => setOpenMenu(openMenu === m.id ? null : m.id)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreVertical className="w-4 h-4" />}
                  </button>

                  {openMenu === m.id && (
                    <div className="absolute left-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-10 py-1 text-sm overflow-hidden">
                      {m.role !== 'admin' && (
                        <button
                          onClick={() => updateMember(m.id, { role: 'admin' })}
                          className="w-full text-right px-4 py-2 hover:bg-gray-50 text-gray-700"
                        >
                          הפוך למנהל
                        </button>
                      )}
                      {m.role !== 'viewer' && (
                        <button
                          onClick={() => updateMember(m.id, { role: 'viewer' })}
                          className="w-full text-right px-4 py-2 hover:bg-gray-50 text-gray-700"
                        >
                          הפוך לצופה
                        </button>
                      )}
                      <div className="border-t border-gray-100 my-1" />
                      {isInactive ? (
                        <button
                          onClick={() => updateMember(m.id, { is_active: true })}
                          className="w-full text-right px-4 py-2 hover:bg-emerald-50 text-emerald-600"
                        >
                          הפעל מחדש
                        </button>
                      ) : (
                        <button
                          onClick={() => updateMember(m.id, { is_active: false })}
                          className="w-full text-right px-4 py-2 hover:bg-red-50 text-red-500"
                        >
                          השהה גישה
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
