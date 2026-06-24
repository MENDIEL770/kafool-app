'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadImage } from '@/lib/image-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check } from 'lucide-react'

interface EmailTpl { subject?: string; body?: string; image?: string }
interface FormRef { id: string; name: string; email?: EmailTpl }
interface ButtonRef { amount: number; label?: string | null }

const EXAMPLE_EMAIL = `תודה מכל הלב ששלחת חיבוק של אור! 💞
כדי להעניק לך את הטוב ביותר, הערכות והיומנים שלנו נמצאים כעת בייצור מדוייק ומושקע.
הם ייארזו באהבה ויישלחו בעוד מספר שבועות.
נעדכן אותך ברגע שהחבילה תצא לדרך. תודה רבה על האמון והסבלנות

'אור בשקט'✨`

export default function CampaignEmailPage() {
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)   // 'default' | formId
  const [forms, setForms] = useState<FormRef[]>([])
  const [def, setDef] = useState<{ enabled: boolean; subject: string; body: string; image: string }>({
    enabled: false, subject: '', body: '', image: '',
  })
  const [formEmails, setFormEmails] = useState<Record<string, EmailTpl>>({})
  const [buttons, setButtons] = useState<ButtonRef[]>([])
  const [buttonEmails, setButtonEmails] = useState<Record<string, EmailTpl>>({})   // keyed by button amount

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.from('campaigns').select('settings').eq('id', id).single()
      const s = (data?.settings as Record<string, unknown>) || {}
      const cf = (Array.isArray(s.custom_forms) ? s.custom_forms : []) as FormRef[]
      setForms(cf.map(f => ({ id: f.id, name: f.name })))
      const te = s.thank_you_email as { enabled?: boolean; subject?: string; body?: string; image?: string } | undefined
      if (te) setDef({ enabled: !!te.enabled, subject: te.subject || '', body: te.body || '', image: te.image || '' })
      // form emails: dedicated map, falling back to any legacy form.email
      const fe = (s.form_emails as Record<string, EmailTpl>) || {}
      const seeded: Record<string, EmailTpl> = { ...fe }
      for (const f of cf) if (!seeded[f.id] && f.email) seeded[f.id] = f.email
      setFormEmails(seeded)
      const plans = (Array.isArray(s.donation_plans) ? s.donation_plans : []) as ButtonRef[]
      setButtons(plans.filter(p => Number(p.amount) > 0).map(p => ({ amount: Number(p.amount), label: p.label })))
      setButtonEmails((s.button_emails as Record<string, EmailTpl>) || {})
      setLoading(false)
    }
    load()
  }, [id])

  async function uploadImg(file: File, key: string) {
    setUploading(key)
    try {
      const url = await uploadImage(file, `campaigns/${id}/email-${Date.now()}`)
      if (key === 'default') setDef(p => ({ ...p, image: url }))
      else if (key.startsWith('btn:')) { const amt = key.slice(4); setButtonEmails(p => ({ ...p, [amt]: { ...(p[amt] || {}), image: url } })) }
      else setFormEmails(p => ({ ...p, [key]: { ...(p[key] || {}), image: url } }))
    } catch (e) { alert(e instanceof Error ? e.message : 'ההעלאה נכשלה') }
    setUploading(null)
  }

  function setFE(fid: string, patch: EmailTpl) {
    setFormEmails(p => ({ ...p, [fid]: { ...(p[fid] || {}), ...patch } }))
  }
  function setBE(amt: string, patch: EmailTpl) {
    setButtonEmails(p => ({ ...p, [amt]: { ...(p[amt] || {}), ...patch } }))
  }

  async function save() {
    setSaving(true)
    const supabase = createClient()
    const { data: existing } = await supabase.from('campaigns').select('settings').eq('id', id).single()
    const clean = (m: Record<string, EmailTpl>) => {
      const out: Record<string, EmailTpl> = {}
      for (const [k, e] of Object.entries(m)) {
        const subject = e.subject?.trim() || '', body = e.body?.trim() || '', image = e.image || ''
        if (subject || body || image) out[k] = { subject, body, image }
      }
      return out
    }
    await supabase.from('campaigns').update({
      settings: {
        ...(existing?.settings as object),
        thank_you_email: { enabled: def.enabled, subject: def.subject.trim(), body: def.body.trim(), image: def.image || '' },
        form_emails: clean(formEmails),
        button_emails: clean(buttonEmails),
      },
    }).eq('id', id)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return <div className="max-w-2xl mx-auto p-6 text-gray-400 text-sm">טוען…</div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">אימייל</h1>
        <p className="text-sm text-gray-500 mt-1">מייל התודה שנשלח לתורם אחרי עסקה — ברירת מחדל לכל הכפתורים, ומייל מותאם לכל טופס.</p>
      </div>

      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
        לשליחה בפועל צריך להגדיר ספק מייל (Resend): <code>RESEND_API_KEY</code> + <code>EMAIL_FROM</code> ב-env. עד אז ההגדרות נשמרות אבל מייל לא נשלח.
      </p>

      {/* Default email */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">מייל תודה (ברירת מחדל)</CardTitle>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={def.enabled} onChange={e => setDef(p => ({ ...p, enabled: e.target.checked }))} className="w-4 h-4" />
            פעיל
          </label>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1"><Label>נושא</Label><Input value={def.subject} onChange={e => setDef(p => ({ ...p, subject: e.target.value }))} placeholder="תודה על תרומתך 💞" /></div>
          <div className="space-y-1">
            <Label>תוכן</Label>
            <textarea value={def.body} onChange={e => setDef(p => ({ ...p, body: e.target.value }))} rows={7} placeholder={EXAMPLE_EMAIL}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-y leading-relaxed" />
            {!def.body && <button type="button" onClick={() => setDef(p => ({ ...p, body: EXAMPLE_EMAIL }))} className="text-[11px] text-blue-600 hover:underline">השתמש בטקסט הדוגמה</button>}
          </div>
          <div className="space-y-1">
            <Label>תמונת כותרת (אופציונלי)</Label>
            <div className="flex items-center gap-3">
              {def.image && <img src={def.image} alt="" className="h-16 rounded-lg object-cover" />}
              <label className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 cursor-pointer">
                {uploading === 'default' ? 'מעלה…' : def.image ? 'החלף תמונה' : 'העלה תמונה'}
                <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadImg(f, 'default'); e.target.value = '' }} />
              </label>
              {def.image && <button type="button" onClick={() => setDef(p => ({ ...p, image: '' }))} className="text-xs text-red-400 hover:text-red-600">הסר</button>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-form emails */}
      {forms.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">מייל מותאם לכל טופס</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-gray-400">דורס את ברירת המחדל כשהתרומה נעשתה דרך הטופס המתאים. השאר ריק כדי להשתמש בברירת המחדל.</p>
            {forms.map(f => {
              const e = formEmails[f.id] || {}
              return (
                <details key={f.id} className="rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2">
                  <summary className="text-sm font-semibold text-gray-700 cursor-pointer">{f.name || 'טופס ללא שם'}</summary>
                  <div className="space-y-2 pt-2">
                    <Input value={e.subject || ''} onChange={ev => setFE(f.id, { subject: ev.target.value })} placeholder="נושא המייל" />
                    <textarea value={e.body || ''} onChange={ev => setFE(f.id, { body: ev.target.value })} rows={4}
                      placeholder="תוכן המייל לטופס זה" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-y" />
                    <div className="flex items-center gap-3">
                      {e.image && <img src={e.image} alt="" className="h-12 rounded object-cover" />}
                      <label className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 cursor-pointer">
                        {uploading === f.id ? 'מעלה…' : e.image ? 'החלף תמונה' : 'העלה תמונה'}
                        <input type="file" accept="image/*" className="hidden" onChange={ev => { const file = ev.target.files?.[0]; if (file) uploadImg(file, f.id); ev.target.value = '' }} />
                      </label>
                      {e.image && <button type="button" onClick={() => setFE(f.id, { image: '' })} className="text-xs text-red-400 hover:text-red-600">הסר</button>}
                    </div>
                  </div>
                </details>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Per-button emails */}
      {buttons.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">מייל לכפתור תרומה ספציפי</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-gray-400">מייל שונה לתרומות שנעשו דרך כפתור מסוים (לפי הסכום). דורס את ברירת המחדל. השאר ריק לשימוש בברירת המחדל.</p>
            {buttons.map(b => {
              const k = String(b.amount)
              const e = buttonEmails[k] || {}
              return (
                <details key={k} className="rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2">
                  <summary className="text-sm font-semibold text-gray-700 cursor-pointer">כפתור ₪{b.amount.toLocaleString()}{b.label ? ` — ${b.label}` : ''}</summary>
                  <div className="space-y-2 pt-2">
                    <Input value={e.subject || ''} onChange={ev => setBE(k, { subject: ev.target.value })} placeholder="נושא המייל" />
                    <textarea value={e.body || ''} onChange={ev => setBE(k, { body: ev.target.value })} rows={4}
                      placeholder="תוכן המייל לכפתור זה" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-y" />
                    <div className="flex items-center gap-3">
                      {e.image && <img src={e.image} alt="" className="h-12 rounded object-cover" />}
                      <label className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 cursor-pointer">
                        {uploading === `btn:${k}` ? 'מעלה…' : e.image ? 'החלף תמונה' : 'העלה תמונה'}
                        <input type="file" accept="image/*" className="hidden" onChange={ev => { const file = ev.target.files?.[0]; if (file) uploadImg(file, `btn:${k}`); ev.target.value = '' }} />
                      </label>
                      {e.image && <button type="button" onClick={() => setBE(k, { image: '' })} className="text-xs text-red-400 hover:text-red-600">הסר</button>}
                    </div>
                  </div>
                </details>
              )
            })}
          </CardContent>
        </Card>
      )}

      <div className="sticky bottom-4">
        <Button onClick={save} disabled={saving} className="w-full">
          {saved ? <><Check className="w-4 h-4 ml-1" /> נשמר</> : saving ? 'שומר…' : 'שמור הגדרות מייל'}
        </Button>
      </div>
    </div>
  )
}
