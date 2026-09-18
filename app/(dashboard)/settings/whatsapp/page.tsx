'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getClientOrgId } from '@/lib/tenancy-client'
import { MessageCircle, CheckCircle2, Send, Check, Loader2, QrCode, Unlink } from 'lucide-react'

type Status = 'loading' | 'idle' | 'connecting' | 'qr' | 'connected' | 'manual'

export default function OrgWhatsAppPage() {
  const supabase = createClient()
  const [orgId, setOrgId] = useState('')
  const [status, setStatus] = useState<Status>('loading')
  const [qr, setQr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  // manual fallback
  const [idInstance, setIdInstance] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [saved, setSaved] = useState(false)
  // test
  const [to, setTo] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  // Poll QR + state; returns true once connected (authorized).
  const refresh = useCallback(async (): Promise<'connected' | 'qr' | 'none'> => {
    try {
      const r = await fetch('/api/whatsapp/qr').then(x => x.json())
      if (r.state === 'authorized') { setStatus('connected'); setQr(null); return 'connected' }
      if (r.state === 'no-instance' || r.state === 'no-org') return 'none'
      if (r.qr) setQr(r.qr)
      setStatus('qr'); return 'qr'
    } catch { return 'none' }
  }, [])

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('id', user.id).single()
      setOrgId(getClientOrgId(profile) || '')
      const r = await refresh()
      if (r === 'none') setStatus('idle')
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // While a QR is showing, poll until the number is scanned/authorized.
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (status !== 'qr') { if (timer.current) clearInterval(timer.current); return }
    timer.current = setInterval(refresh, 4000)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [status, refresh])

  async function connect() {
    setBusy(true); setErr(null)
    try {
      const r = await fetch('/api/whatsapp/connect', { method: 'POST' }).then(x => x.json())
      if (r.error) { setErr(r.error); setBusy(false); return }
      if (r.partner === false) { setStatus('manual'); setBusy(false); return } // no partner token → manual
      setStatus('qr'); await refresh()
    } catch { setErr('החיבור נכשל, נסו שוב') }
    setBusy(false)
  }

  async function saveManual() {
    if (!orgId) return
    setBusy(true); setErr(null)
    const whatsapp_config = idInstance.trim() && apiToken.trim()
      ? { provider: 'green', green: { id: idInstance.trim(), token: apiToken.trim() } } : null
    const { error } = await supabase.from('organizations').update({ whatsapp_config }).eq('id', orgId)
    setBusy(false)
    if (error) { setErr('השמירה נכשלה: ' + error.message); return }
    setSaved(true); setTimeout(() => setSaved(false), 2000)
    const r = await refresh()
    if (r === 'none') setStatus('connected') // manual instances are already scanned in GreenAPI
  }

  async function disconnect() {
    if (!confirm('לנתק את חיבור הוואטסאפ?')) return
    setBusy(true)
    await fetch('/api/whatsapp/disconnect', { method: 'POST' }).catch(() => {})
    setBusy(false); setQr(null); setIdInstance(''); setApiToken(''); setStatus('idle')
  }

  async function sendTest() {
    if (!to.trim()) return
    setTesting(true); setTestResult(null)
    try {
      const res = await fetch('/api/whatsapp/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: to.trim() }),
      })
      const d = await res.json().catch(() => ({}))
      setTestResult(res.ok ? { ok: true, msg: 'נשלח! בדוק את הוואטסאפ שלך.' } : { ok: false, msg: d.error || 'השליחה נכשלה' })
    } catch { setTestResult({ ok: false, msg: 'השליחה נכשלה' }) }
    setTesting(false)
  }

  const field = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400'

  return (
    <div className="max-w-2xl mx-auto space-y-5" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center"><MessageCircle className="w-5 h-5" /></span>
          חיבור וואטסאפ
        </h1>
        <p className="text-sm text-gray-500 mt-1">חברו את הוואטסאפ שלכם — ההודעות לתורמים ולמנהלי הקבוצות יישלחו מהמספר שלכם.</p>
      </div>

      {status === 'loading' && <div className="text-sm text-gray-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> טוען…</div>}

      {/* Not connected — one-click connect */}
      {status === 'idle' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><QrCode className="w-7 h-7" /></div>
          <h2 className="font-bold text-gray-900">חברו את הוואטסאפ שלכם</h2>
          <p className="text-sm text-gray-500">לחצו כדי לקבל קוד QR — תסרקו אותו עם מכשיר הטלפון שלכם (וואטסאפ → מכשירים מקושרים), וזהו.</p>
          <button onClick={connect} disabled={busy} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl disabled:opacity-50">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> מכין…</> : <><MessageCircle className="w-4 h-4" /> התחברות לוואטסאפ</>}
          </button>
          {err && <div className="text-sm text-red-600">{err}</div>}
        </div>
      )}

      {/* QR to scan */}
      {status === 'qr' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center space-y-3">
          <h2 className="font-bold text-gray-900">סרקו את הקוד</h2>
          <p className="text-sm text-gray-500">פתחו וואטסאפ בטלפון → <span className="font-semibold">הגדרות → מכשירים מקושרים → קישור מכשיר</span>, וסרקו:</p>
          <div className="mx-auto w-56 h-56 rounded-2xl border border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden">
            {qr ? <img src={qr} alt="QR" className="w-full h-full object-contain" /> : <Loader2 className="w-6 h-6 animate-spin text-gray-300" />}
          </div>
          <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> ממתין לסריקה… (מתעדכן אוטומטית)</p>
          <button onClick={disconnect} className="text-xs text-gray-400 hover:text-gray-600">ביטול</button>
        </div>
      )}

      {/* Connected */}
      {status === 'connected' && (
        <>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div className="text-sm"><div className="font-bold text-gray-900">מחובר</div><div className="text-gray-500 text-xs">הודעות תודה יישלחו אוטומטית בסיום תרומה.</div></div>
            </div>
            <button onClick={disconnect} disabled={busy} className="inline-flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-semibold"><Unlink className="w-4 h-4" /> ניתוק</button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-800 mb-1">בדיקת חיבור</h2>
            <p className="text-xs text-gray-400 mb-3">שלחו הודעת בדיקה למספר שלכם.</p>
            <div className="flex gap-2">
              <input value={to} onChange={e => setTo(e.target.value)} dir="ltr" placeholder="0501234567" className={field} />
              <button onClick={sendTest} disabled={testing || !to.trim()} className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl disabled:opacity-50 whitespace-nowrap">
                <Send className="w-4 h-4" /> {testing ? 'שולח…' : 'שלח בדיקה'}
              </button>
            </div>
            {testResult && <div className={`mt-3 text-sm rounded-xl px-3 py-2 ${testResult.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>{testResult.msg}</div>}
          </div>
        </>
      )}

      {/* Manual fallback (no platform partner token configured) */}
      {status === 'manual' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h2 className="font-bold text-gray-800">חיבור ידני (GreenAPI)</h2>
          <p className="text-xs text-gray-400">צרו instance ב-<a href="https://green-api.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">green-api.com</a>, סרקו QR, והדביקו כאן את הפרטים.</p>
          <div className="space-y-1"><label className="text-xs font-semibold text-gray-600">idInstance</label><input value={idInstance} onChange={e => setIdInstance(e.target.value)} dir="ltr" className={field} /></div>
          <div className="space-y-1"><label className="text-xs font-semibold text-gray-600">apiTokenInstance</label><input value={apiToken} onChange={e => setApiToken(e.target.value)} dir="ltr" className={field} /></div>
          <button onClick={saveManual} disabled={busy} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl disabled:opacity-50">
            {saved ? <><Check className="w-4 h-4" /> נשמר!</> : busy ? 'שומר…' : 'שמירה'}
          </button>
          {err && <div className="text-sm text-red-600">{err}</div>}
        </div>
      )}
    </div>
  )
}
