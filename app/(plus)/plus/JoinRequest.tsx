'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { requestJoinBranch, type JoinableCampaign } from '@/lib/plus/actions'

export default function JoinRequest({
  joinable, pending, email,
}: { joinable: JoinableCampaign[]; pending: { campaignName: string } | null; email: string | null }) {
  const router = useRouter()
  const [campId, setCampId] = useState<string | null>(joinable.length === 1 ? joinable[0].id : null)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const camp = joinable.find(c => c.id === campId)
  const branches = useMemo(() => {
    const q = search.trim()
    return (camp?.branches ?? []).filter(b => !q || b.name.includes(q))
  }, [camp, search])

  async function signOut() {
    await createClient().auth.signOut()
    router.push('/kafool-plus-login')
  }

  async function submit(branchId: string, branchName: string) {
    setBusy(true); setError(null)
    try {
      await requestJoinBranch(branchId)
      setDone(branchName)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'הבקשה נכשלה')
    }
    setBusy(false)
  }

  const wrap = (children: React.ReactNode) => (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md card p-6 kp-fade">{children}</div>
    </div>
  )

  if (pending) {
    return wrap(
      <div className="text-center space-y-3">
        <div className="text-4xl">⏳</div>
        <h1 className="text-xl font-extrabold">בקשתך ממתינה לאישור</h1>
        <p className="text-sm text-muted">ביקשת להצטרף ל<b>{pending.campaignName}</b>. המנהל או הרכז יאשרו אותך בקרוב — ואז תוכל להיכנס.</p>
        <button onClick={signOut} className="btn-ghost text-sm px-4 py-2 rounded-xl mt-2" style={{ borderColor: 'var(--border)' }}>יציאה</button>
      </div>
    )
  }

  if (done) {
    return wrap(
      <div className="text-center space-y-3">
        <div className="text-4xl">✅</div>
        <h1 className="text-xl font-extrabold">הבקשה נשלחה!</h1>
        <p className="text-sm text-muted">ביקשת להצטרף לסניף <b>{done}</b>. שלחנו הודעה למנהל ולרכז — תקבל גישה ברגע שיאשרו.</p>
        <button onClick={signOut} className="btn-ghost text-sm px-4 py-2 rounded-xl mt-2" style={{ borderColor: 'var(--border)' }}>יציאה</button>
      </div>
    )
  }

  return wrap(
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-xl font-extrabold">בקשת הצטרפות ל-Kafool+</h1>
        <p className="text-xs text-muted mt-1">{email}</p>
      </div>

      {joinable.length === 0 ? (
        <p className="text-sm text-muted text-center py-4">אין כרגע קמפיינים פתוחים להצטרפות. פנה למנהל הקמפיין.</p>
      ) : !camp ? (
        <>
          <div className="text-sm font-semibold">בחר קמפיין</div>
          <div className="space-y-2">
            {joinable.map(c => (
              <button key={c.id} onClick={() => setCampId(c.id)} className="w-full text-right card p-3.5 hover:shadow-md transition-shadow">
                <div className="font-bold">{c.name}</div>
                <div className="text-xs text-muted">{c.branches.length} סניפים</div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <button onClick={() => { setCampId(joinable.length === 1 ? campId : null); setSearch('') }} className="text-xs text-muted">{joinable.length > 1 ? '→ החלף קמפיין' : ''}</button>
          <div className="text-sm font-semibold">בחר את הסניף שלך — <span className="text-muted font-normal">{camp.name}</span></div>
          <input
            value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש סניף…"
            className="w-full px-3.5 py-2.5 rounded-xl border bg-transparent outline-none focus:ring-2" style={{ borderColor: 'var(--border)' }}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="max-h-72 overflow-y-auto space-y-2">
            {branches.length === 0 ? (
              <p className="text-sm text-muted text-center py-4">לא נמצאו סניפים.</p>
            ) : branches.map(b => (
              <button key={b.id} disabled={busy} onClick={() => submit(b.id, b.name)}
                className="w-full text-right card p-3.5 flex items-center justify-between hover:shadow-md transition-shadow disabled:opacity-50">
                <span className="font-semibold">{b.name}</span>
                <span className="text-xs font-bold" style={{ color: 'var(--secondary)' }}>הצטרף ←</span>
              </button>
            ))}
          </div>
        </>
      )}

      <button onClick={signOut} className="w-full text-xs text-muted pt-1">יציאה</button>
    </div>
  )
}
