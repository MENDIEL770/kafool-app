'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getClientOrgId } from '@/lib/tenancy-client'
import { uploadImage } from '@/lib/image-client'
import { MESSAGE_PRESETS, type WaMsgCategory, type WaMessages } from '@/lib/whatsapp-messages'
import { Check, Upload, X, MessageSquareText } from 'lucide-react'

const CATEGORIES = Object.keys(MESSAGE_PRESETS) as WaMsgCategory[]
const VARS = ['{{שם}}', '{{סכום}}', '{{קמפיין}}', '{{קבוצה}}', '{{קישור}}']

export default function WaMessagesEditor() {
  const supabase = createClient()
  const [orgId, setOrgId] = useState('')
  const [msgs, setMsgs] = useState<Record<WaMsgCategory, { text: string; media_url: string | null }>>(() => {
    const init = {} as Record<WaMsgCategory, { text: string; media_url: string | null }>
    for (const c of CATEGORIES) init[c] = { text: MESSAGE_PRESETS[c].variants[0], media_url: null }
    return init
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState<WaMsgCategory | null>(null)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('id', user.id).single()
      const oid = getClientOrgId(profile) || ''
      setOrgId(oid)
      if (oid) {
        try {
          const { data: org } = await supabase.from('organizations').select('whatsapp_config').eq('id', oid).maybeSingle()
          const stored = (org as { whatsapp_config?: { messages?: WaMessages } } | null)?.whatsapp_config?.messages
          if (stored) {
            setMsgs(prev => {
              const next = { ...prev }
              for (const c of CATEGORIES) if (stored[c]) next[c] = { text: stored[c]!.text || prev[c].text, media_url: stored[c]!.media_url || null }
              return next
            })
          }
        } catch { /* not migrated */ }
      }
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = (c: WaMsgCategory, patch: Partial<{ text: string; media_url: string | null }>) =>
    setMsgs(m => ({ ...m, [c]: { ...m[c], ...patch } }))

  async function upload(c: WaMsgCategory, file?: File) {
    if (!file || !orgId) return
    setUploading(c)
    try {
      const url = await uploadImage(file, `orgs/${orgId}/whatsapp-${c}-${Date.now()}`)
      set(c, { media_url: url })
    } catch { alert('העלאת הקובץ נכשלה') }
    setUploading(null)
  }

  async function save() {
    if (!orgId) return
    setSaving(true)
    const { data: org } = await supabase.from('organizations').select('whatsapp_config').eq('id', orgId).maybeSingle()
    const existing = (org as { whatsapp_config?: Record<string, unknown> } | null)?.whatsapp_config || {}
    const messages: WaMessages = {}
    for (const c of CATEGORIES) messages[c] = { text: msgs[c].text.trim(), media_url: msgs[c].media_url }
    const { error } = await supabase.from('organizations').update({ whatsapp_config: { ...existing, messages } }).eq('id', orgId)
    setSaving(false)
    if (error) { alert('השמירה נכשלה: ' + error.message); return }
    setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5" dir="rtl">
      <div className="flex items-center gap-2">
        <MessageSquareText className="w-5 h-5 text-emerald-600" />
        <h2 className="font-bold text-gray-800">נוסחי ההודעות</h2>
      </div>
      <p className="text-xs text-gray-400 -mt-3">בחרו נוסח לכל סוג הודעה, ערכו כרצונכם, וצרפו קובץ (אופציונלי). משתנים זמינים: {VARS.join(' ')}</p>

      {CATEGORIES.map(c => {
        const preset = MESSAGE_PRESETS[c]
        return (
          <div key={c} className="rounded-2xl border border-gray-100 p-4 space-y-2.5">
            <div>
              <div className="font-semibold text-gray-800 text-sm">{preset.label}</div>
              <div className="text-[11px] text-gray-400">{preset.hint}</div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {preset.variants.map((v, i) => (
                <button key={i} type="button" onClick={() => set(c, { text: v })}
                  className={`text-[11px] rounded-full px-2.5 py-1 border transition-colors ${msgs[c].text === v ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-300'}`}>
                  נוסח {i + 1}
                </button>
              ))}
            </div>
            <textarea value={msgs[c].text} onChange={e => set(c, { text: e.target.value })} rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400 whitespace-pre-wrap" />
            <div className="flex flex-wrap gap-1.5">
              {VARS.map(v => (
                <button key={v} type="button" onClick={() => set(c, { text: (msgs[c].text + ' ' + v).trim() })}
                  className="text-[11px] font-mono rounded-lg px-2 py-0.5 bg-gray-100 text-gray-500 hover:bg-gray-200">{v}</button>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-1">
              {msgs[c].media_url && <img src={msgs[c].media_url!} alt="" className="h-12 w-12 rounded-lg object-cover border border-gray-100" />}
              <label className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 cursor-pointer">
                {uploading === c ? <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
                {msgs[c].media_url ? 'החלפת קובץ' : 'צירוף קובץ'}
                <input type="file" accept="image/*" className="hidden" onChange={e => { upload(c, e.target.files?.[0]); e.target.value = '' }} />
              </label>
              {msgs[c].media_url && <button type="button" onClick={() => set(c, { media_url: null })} className="text-xs text-red-400 hover:text-red-600 inline-flex items-center gap-1"><X className="w-3 h-3" /> הסרה</button>}
            </div>
          </div>
        )
      })}

      <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl disabled:opacity-50">
        {saved ? <><Check className="w-4 h-4" /> נשמר!</> : saving ? 'שומר…' : 'שמירת נוסחים'}
      </button>
    </div>
  )
}
