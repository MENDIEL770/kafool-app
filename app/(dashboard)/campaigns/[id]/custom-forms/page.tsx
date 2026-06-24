'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadImage } from '@/lib/image-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Plus, Trash2, ChevronUp, ChevronDown, GripVertical, Copy } from 'lucide-react'

// ─── Types (stored in campaign.settings) ───────────────────────────────
type FieldType = 'text' | 'tel' | 'email' | 'textarea' | 'address' | 'select' | 'note' | 'quantity'

interface PriceTier { minQty: number; discountPercent: number }
interface CustomField {
  id: string
  label: string
  type: FieldType
  required: boolean
  options?: string[]    // for type 'select'
  unitPrice?: number    // for type 'quantity' — base price per unit
  tiers?: PriceTier[]   // for type 'quantity' — % discount from a minimum quantity
}
interface EmailTpl { subject?: string; body?: string; image?: string }
interface CustomForm {
  id: string
  name: string
  headerTitle?: string   // shown at the top of the donor modal when this form is active
  email?: EmailTpl       // per-form thank-you email (overrides the campaign default)
  paymentNote?: string   // optional note shown above the payment button
  fields: CustomField[]
}

// An optional choice step shown BEFORE the donor-details form. Each option
// routes to a form: '' = the regular donor form, or a custom form id.
type PreStepType = 'choice' | 'info' | 'consent'
interface PreStepOption { id: string; label: string; formId?: string }
interface PreStep {
  enabled: boolean
  type: PreStepType
  title: string
  body?: string          // info / consent message
  image?: string         // optional image (info)
  consentLabel?: string  // the checkbox label (consent)
  options: PreStepOption[]
}
const emptyPreStep = (): PreStep => ({
  enabled: false,
  type: 'choice',
  title: 'מה תרצה לעשות?',
  body: '',
  image: '',
  consentLabel: 'אני מאשר/ת',
  options: [{ id: uid(), label: '', formId: '' }, { id: uid(), label: '', formId: '' }],
})

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text',     label: 'טקסט קצר' },
  { value: 'textarea', label: 'טקסט ארוך' },
  { value: 'tel',      label: 'טלפון' },
  { value: 'email',    label: 'אימייל' },
  { value: 'address',  label: 'כתובת למשלוח' },
  { value: 'select',   label: 'בחירה מרשימה' },
  { value: 'note',     label: 'הערה' },
  { value: 'quantity', label: 'בחירת כמות (תמחור)' },
]

const uid = () => Math.random().toString(36).slice(2, 10)

export default function CustomFormsPage() {
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [forms, setForms] = useState<CustomForm[]>([])
  const [defaultFormId, setDefaultFormId] = useState<string>('')   // '' = the built-in form
  const [preStep, setPreStep] = useState<PreStep>(emptyPreStep())
  const [uploadingEmailImg, setUploadingEmailImg] = useState(false)
  const [paymentNote, setPaymentNote] = useState('')   // campaign default note above the payment button

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.from('campaigns').select('settings').eq('id', id).single()
      const s = (data?.settings as Record<string, unknown>) || {}
      setForms(Array.isArray(s.custom_forms) ? (s.custom_forms as CustomForm[]) : [])
      setDefaultFormId(typeof s.default_custom_form_id === 'string' ? s.default_custom_form_id : '')
      const ps = s.pre_donation_step as PreStep | undefined
      if (ps) setPreStep({
        enabled: !!ps.enabled,
        type: ps.type || 'choice',
        title: ps.title || 'מה תרצה לעשות?',
        body: ps.body || '',
        image: ps.image || '',
        consentLabel: ps.consentLabel || 'אני מאשר/ת',
        options: Array.isArray(ps.options) && ps.options.length ? ps.options : emptyPreStep().options,
      })
      if (typeof s.payment_note === 'string') setPaymentNote(s.payment_note)
      setLoading(false)
    }
    load()
  }, [id])

  async function save() {
    setSaving(true)
    const supabase = createClient()
    // re-fetch so we never clobber edits from another tab
    const { data: existing } = await supabase.from('campaigns').select('settings').eq('id', id).single()
    const cleanForms = forms
      .map(f => ({ ...f, name: f.name.trim(), headerTitle: f.headerTitle?.trim() || '', fields: f.fields.filter(fl => fl.label.trim()) }))
      .filter(f => f.name)
    const validDefault = cleanForms.some(f => f.id === defaultFormId) ? defaultFormId : ''
    const cleanOptions = preStep.options.map(o => ({ ...o, label: o.label.trim() })).filter(o => o.label)
    const cleanPreStep: PreStep = {
      type: preStep.type,
      // "available" (shown when a button selects the pre-step): choice needs 2+
      // options; info/consent need a message or title.
      enabled: preStep.type === 'choice' ? cleanOptions.length >= 2 : !!(preStep.body?.trim() || preStep.title.trim()),
      title: preStep.title.trim() || (preStep.type === 'choice' ? 'בחר אפשרות' : ''),
      body: preStep.body?.trim() || '',
      image: preStep.image || '',
      consentLabel: preStep.consentLabel?.trim() || 'אני מאשר/ת',
      options: cleanOptions,
    }
    await supabase.from('campaigns').update({
      settings: { ...(existing?.settings as object), custom_forms: cleanForms, default_custom_form_id: validDefault || null, pre_donation_step: cleanPreStep, payment_note: paymentNote.trim() || null },
    }).eq('id', id)
    setForms(cleanForms)
    setDefaultFormId(validDefault)
    setPreStep(prev => ({ ...cleanPreStep, options: cleanOptions.length ? cleanOptions : prev.options }))
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function uploadPreStepImage(file: File) {
    setUploadingEmailImg(true)
    try { const url = await uploadImage(file, `campaigns/${id}/prestep-${Date.now()}`); setPreStep(p => ({ ...p, image: url })) }
    catch (e) { alert(e instanceof Error ? e.message : 'ההעלאה נכשלה') }
    setUploadingEmailImg(false)
  }

  // ─── form/field mutators ───
  function addForm() {
    setForms(f => [...f, { id: uid(), name: `טופס ${f.length + 1}`, fields: [] }])
  }
  function removeForm(fid: string) {
    setForms(f => f.filter(x => x.id !== fid))
    if (defaultFormId === fid) setDefaultFormId('')
  }
  function duplicateForm(fid: string) {
    setForms(fs => {
      const i = fs.findIndex(f => f.id === fid)
      if (i < 0) return fs
      const src = fs[i]
      const copy: CustomForm = {
        ...src,
        id: uid(),
        name: `${src.name || 'טופס'} (עותק)`,
        fields: src.fields.map(fl => ({ ...fl, id: uid() })),
      }
      return [...fs.slice(0, i + 1), copy, ...fs.slice(i + 1)]
    })
  }
  function setFormName(fid: string, name: string) {
    setForms(f => f.map(x => (x.id === fid ? { ...x, name } : x)))
  }
  function addField(fid: string) {
    setForms(f => f.map(x => x.id === fid
      ? { ...x, fields: [...x.fields, { id: uid(), label: '', type: 'text', required: false }] }
      : x))
  }
  function updateField(fid: string, fieldId: string, patch: Partial<CustomField>) {
    setForms(f => f.map(x => x.id === fid
      ? { ...x, fields: x.fields.map(fl => (fl.id === fieldId ? { ...fl, ...patch } : fl)) }
      : x))
  }
  function removeField(fid: string, fieldId: string) {
    setForms(f => f.map(x => x.id === fid ? { ...x, fields: x.fields.filter(fl => fl.id !== fieldId) } : x))
  }
  function moveField(fid: string, idx: number, dir: -1 | 1) {
    setForms(f => f.map(x => {
      if (x.id !== fid) return x
      const fields = [...x.fields]
      const j = idx + dir
      if (j < 0 || j >= fields.length) return x
      ;[fields[idx], fields[j]] = [fields[j], fields[idx]]
      return { ...x, fields }
    }))
  }

  // ─── pre-step mutators ───
  function addOption() { setPreStep(p => ({ ...p, options: [...p.options, { id: uid(), label: '', formId: '' }] })) }
  function removeOption(oid: string) { setPreStep(p => ({ ...p, options: p.options.filter(o => o.id !== oid) })) }
  function updateOption(oid: string, patch: Partial<PreStepOption>) { setPreStep(p => ({ ...p, options: p.options.map(o => (o.id === oid ? { ...o, ...patch } : o)) })) }

  if (loading) return <div className="max-w-2xl mx-auto p-6 text-gray-400 text-sm">טוען…</div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">התאמות אישיות</h1>
        <p className="text-sm text-gray-500 mt-1">
          ברירת המחדל היא טופס פרטי-התורם הקיים. כאן אפשר להוסיף טופס מותאם עם שדות נוספים
          (כתובת למשלוח, הערות ועוד), להגדיר אילו שדות חובה ולסדר אותם — ולהחיל אותו על התרומות.
        </p>
      </div>

      {/* Default form applied to all donations */}
      <Card>
        <CardHeader><CardTitle className="text-base">החלה על כל התרומות</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Label>טופס ברירת המחדל לכל כפתורי התרומה</Label>
          <select
            value={defaultFormId}
            onChange={e => setDefaultFormId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">טופס פרטי-התורם הרגיל (ברירת מחדל)</option>
            {forms.map(f => <option key={f.id} value={f.id}>{f.name || 'ללא שם'}</option>)}
          </select>
          <p className="text-[11px] text-gray-400">החלה לכפתור ספציפי תתווסף בהמשך — בינתיים הבחירה כאן חלה על כל התרומות בקמפיין.</p>
        </CardContent>
      </Card>

      {/* Pre-step choice — built here, activated per-button in the buttons settings */}
      <Card>
        <CardHeader><CardTitle className="text-base">שלב מקדים (לפני הטופס)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-gray-400">
            מסך שמופיע מיד אחרי לחיצה על &quot;תרומה&quot;, לפני טופס פרטי-התורם. בחר סוג, בנה אותו, ו<strong>הפעל אותו לכל כפתור בנפרד</strong> דרך &quot;מדיה ← כפתורי תרומה ← טופס שנפתח: שלב מקדים&quot;.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700 shrink-0">סוג:</span>
            {([['choice', 'בחירה'], ['info', 'מסך מידע'], ['consent', 'אישור / הסכמה']] as const).map(([val, label]) => (
              <button key={val} type="button" onClick={() => setPreStep(p => ({ ...p, type: val }))}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${preStep.type === val ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'}`}>{label}</button>
            ))}
          </div>
          <div className="space-y-1">
            <Label>כותרת</Label>
            <Input value={preStep.title} onChange={e => setPreStep(p => ({ ...p, title: e.target.value }))} placeholder={preStep.type === 'choice' ? 'מה תרצה לעשות?' : 'כותרת המסך'} />
          </div>

          {preStep.type === 'choice' && (
            <div className="space-y-2">
              <Label>אפשרויות</Label>
              {preStep.options.map((o, i) => (
                <div key={o.id} className="flex items-start gap-2">
                  <span className="text-xs text-gray-400 w-5 shrink-0 pt-2.5">{i + 1}.</span>
                  <div className="flex-1 space-y-1.5">
                    <Input value={o.label} onChange={e => updateOption(o.id, { label: e.target.value })} placeholder="לדוגמה: אני רוצה לקנות ערכה ולקבל במשלוח הביתה" />
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400 shrink-0">פותח טופס:</span>
                      <select value={o.formId || ''} onChange={e => updateOption(o.id, { formId: e.target.value })}
                        className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-400">
                        <option value="">טופס רגיל (פרטי-תורם)</option>
                        {forms.map(f => <option key={f.id} value={f.id}>{f.name || 'ללא שם'}</option>)}
                      </select>
                    </div>
                  </div>
                  <button onClick={() => removeOption(o.id)} disabled={preStep.options.length <= 2} className="text-red-400 hover:text-red-600 disabled:opacity-30 transition-colors shrink-0 pt-2.5" title="מחק אפשרות">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addOption} className="w-full">
                <Plus className="w-4 h-4 ml-1" /> הוסף אפשרות
              </Button>
              <p className="text-[11px] text-gray-400">צריך לפחות 2 אפשרויות עם טקסט.</p>
            </div>
          )}

          {(preStep.type === 'info' || preStep.type === 'consent') && (
            <div className="space-y-1">
              <Label>טקסט המסך</Label>
              <textarea value={preStep.body || ''} onChange={e => setPreStep(p => ({ ...p, body: e.target.value }))} rows={4}
                placeholder="הטקסט שיוצג לתורם לפני שממשיך לטופס…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-y leading-relaxed" />
            </div>
          )}

          {preStep.type === 'info' && (
            <div className="space-y-1">
              <Label>תמונה (אופציונלי)</Label>
              <div className="flex items-center gap-3">
                {preStep.image && <img src={preStep.image} alt="" className="h-14 rounded-lg object-cover" />}
                <label className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 cursor-pointer">
                  {uploadingEmailImg ? 'מעלה…' : preStep.image ? 'החלף תמונה' : 'העלה תמונה'}
                  <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadPreStepImage(f); e.target.value = '' }} />
                </label>
                {preStep.image && <button type="button" onClick={() => setPreStep(p => ({ ...p, image: '' }))} className="text-xs text-red-400 hover:text-red-600">הסר</button>}
              </div>
            </div>
          )}

          {preStep.type === 'consent' && (
            <div className="space-y-1">
              <Label>טקסט תיבת הסימון</Label>
              <Input value={preStep.consentLabel || ''} onChange={e => setPreStep(p => ({ ...p, consentLabel: e.target.value }))} placeholder="אני מאשר/ת את התנאים" />
            </div>
          )}

          <p className="text-[11px] text-gray-400">ההפעלה היא לכל כפתור בנפרד (מסך כפתורי התרומה ← &quot;שלב מקדים&quot;).</p>
        </CardContent>
      </Card>

      {/* Default note above the payment button */}
      <Card>
        <CardHeader><CardTitle className="text-base">הערה מעל כפתור התשלום (ברירת מחדל)</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          <p className="text-xs text-gray-400">מוצגת מעל כפתור התשלום בכל התרומות (אלא אם לטופס מסוים מוגדרת הערה משלו).</p>
          <textarea value={paymentNote} onChange={e => setPaymentNote(e.target.value)} rows={2}
            placeholder="לדוגמה: הערכות כרגע בשלב הייצור ויישלחו במהלך החודש הקרוב…"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-y" />
        </CardContent>
      </Card>

      {/* Custom forms */}
      {forms.map(form => (
        <Card key={form.id}>
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <Input
              value={form.name}
              onChange={e => setFormName(form.id, e.target.value)}
              placeholder="שם הטופס"
              className="max-w-xs font-bold"
            />
            <button onClick={() => duplicateForm(form.id)} className="text-gray-400 hover:text-blue-600 transition-colors shrink-0" title="שכפל טופס">
              <Copy className="w-4 h-4" />
            </button>
            <button onClick={() => removeForm(form.id)} className="text-red-400 hover:text-red-600 transition-colors shrink-0" title="מחק טופס">
              <Trash2 className="w-4 h-4" />
            </button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>כותרת בראש הטופס (אופציונלי)</Label>
              <Input
                value={form.headerTitle || ''}
                onChange={e => setForms(fs => fs.map(x => (x.id === form.id ? { ...x, headerTitle: e.target.value } : x)))}
                placeholder='לדוגמה: "פרטי תשלום" / "פרטי תרומה"'
              />
            </div>

            <div className="space-y-1">
              <Label>הערה מעל כפתור התשלום (אופציונלי)</Label>
              <textarea value={form.paymentNote || ''} onChange={e => setForms(fs => fs.map(x => (x.id === form.id ? { ...x, paymentNote: e.target.value } : x)))}
                rows={2} placeholder="לדוגמה: הערכות כרגע בשלב הייצור ויישלחו במהלך החודש הקרוב…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-y" />
            </div>
            {form.fields.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-3">אין שדות עדיין — הוסף שדה ראשון.</p>
            )}
            {form.fields.map((field, idx) => (
              <div key={field.id} className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col text-gray-300">
                    <button onClick={() => moveField(form.id, idx, -1)} disabled={idx === 0} className="disabled:opacity-30 hover:text-gray-600" title="העלה"><ChevronUp className="w-4 h-4" /></button>
                    <button onClick={() => moveField(form.id, idx, 1)} disabled={idx === form.fields.length - 1} className="disabled:opacity-30 hover:text-gray-600" title="הורד"><ChevronDown className="w-4 h-4" /></button>
                  </div>
                  <GripVertical className="w-4 h-4 text-gray-200 shrink-0" />
                  <Input
                    value={field.label}
                    onChange={e => updateField(form.id, field.id, { label: e.target.value })}
                    placeholder="שם השדה (לדוגמה: כתובת למשלוח)"
                    className="flex-1"
                  />
                  <button onClick={() => removeField(form.id, field.id)} className="text-red-400 hover:text-red-600 transition-colors shrink-0" title="מחק שדה">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3 flex-wrap pr-12">
                  <select
                    value={field.type}
                    onChange={e => updateField(form.id, field.id, { type: e.target.value as FieldType })}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={e => updateField(form.id, field.id, { required: e.target.checked })}
                      className="w-4 h-4"
                    />
                    שדה חובה
                  </label>
                  {field.type === 'select' && (
                    <Input
                      value={(field.options || []).join(', ')}
                      onChange={e => updateField(form.id, field.id, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                      placeholder="אפשרויות מופרדות בפסיק"
                      className="flex-1 min-w-[12rem] text-sm"
                    />
                  )}
                </div>
                {field.type === 'quantity' && (() => {
                  const tiers = field.tiers || []
                  const setTiers = (next: PriceTier[]) => updateField(form.id, field.id, { tiers: next })
                  return (
                    <div className="pr-12 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-500 shrink-0 font-medium">מחיר ליחידה — גיבוי (₪):</span>
                        <input type="number" min="0" value={field.unitPrice ?? ''} dir="ltr"
                          onChange={e => updateField(form.id, field.id, { unitPrice: Number(e.target.value) || 0 })}
                          placeholder="230"
                          className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
                      </div>
                      <p className="text-[11px] text-gray-400">מחיר היחידה נלקח מהסכום שהוגדר בכפתור התרומה; השדה למעלה משמש רק כגיבוי אם אין סכום. ההנחות מופעלות מכמות מינימלית (אופציונלי — לדוגמה: מ-10 יח׳ — 13% הנחה):</p>
                      {tiers.map((tier, ti) => (
                        <div key={ti} className="flex items-center gap-2">
                          <span className="text-[11px] text-gray-400 shrink-0">מ-</span>
                          <input type="number" min="1" value={tier.minQty} dir="ltr"
                            onChange={e => setTiers(tiers.map((tt, j) => (j === ti ? { ...tt, minQty: Number(e.target.value) || 1 } : tt)))}
                            className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
                          <span className="text-[11px] text-gray-400 shrink-0">יח׳ —</span>
                          <input type="number" min="0" max="100" value={tier.discountPercent} dir="ltr"
                            onChange={e => setTiers(tiers.map((tt, j) => (j === ti ? { ...tt, discountPercent: Number(e.target.value) || 0 } : tt)))}
                            className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
                          <span className="text-[11px] text-gray-400 shrink-0">% הנחה</span>
                          <button type="button" onClick={() => setTiers(tiers.filter((_, j) => j !== ti))}
                            className="text-red-400 hover:text-red-600 shrink-0" title="מחק מדרגה"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" onClick={() => setTiers([...tiers, { minQty: 1, discountPercent: 0 }])} className="text-xs">
                        <Plus className="w-3.5 h-3.5 ml-1" /> הוסף הנחת כמות
                      </Button>
                    </div>
                  )
                })()}
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => addField(form.id)} className="w-full">
              <Plus className="w-4 h-4 ml-1" /> הוסף שדה
            </Button>
          </CardContent>
        </Card>
      ))}

      <Button type="button" variant="outline" onClick={addForm} className="w-full border-dashed">
        <Plus className="w-4 h-4 ml-1" /> טופס מותאם חדש
      </Button>

      <div className="sticky bottom-4">
        <Button onClick={save} disabled={saving} className="w-full">
          {saved ? <><Check className="w-4 h-4 ml-1" /> נשמר</> : saving ? 'שומר…' : 'שמור התאמות'}
        </Button>
      </div>
    </div>
  )
}
