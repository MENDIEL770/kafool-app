'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Plus, Trash2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react'

// ─── Types (stored in campaign.settings) ───────────────────────────────
type FieldType = 'text' | 'tel' | 'email' | 'textarea' | 'address' | 'select' | 'note'

interface CustomField {
  id: string
  label: string
  type: FieldType
  required: boolean
  options?: string[]   // for type 'select'
}
interface CustomForm {
  id: string
  name: string
  fields: CustomField[]
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text',     label: 'טקסט קצר' },
  { value: 'textarea', label: 'טקסט ארוך' },
  { value: 'tel',      label: 'טלפון' },
  { value: 'email',    label: 'אימייל' },
  { value: 'address',  label: 'כתובת למשלוח' },
  { value: 'select',   label: 'בחירה מרשימה' },
  { value: 'note',     label: 'הערה' },
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

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.from('campaigns').select('settings').eq('id', id).single()
      const s = (data?.settings as Record<string, unknown>) || {}
      setForms(Array.isArray(s.custom_forms) ? (s.custom_forms as CustomForm[]) : [])
      setDefaultFormId(typeof s.default_custom_form_id === 'string' ? s.default_custom_form_id : '')
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
      .map(f => ({ ...f, name: f.name.trim(), fields: f.fields.filter(fl => fl.label.trim()) }))
      .filter(f => f.name)
    const validDefault = cleanForms.some(f => f.id === defaultFormId) ? defaultFormId : ''
    await supabase.from('campaigns').update({
      settings: { ...(existing?.settings as object), custom_forms: cleanForms, default_custom_form_id: validDefault || null },
    }).eq('id', id)
    setForms(cleanForms)
    setDefaultFormId(validDefault)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  // ─── form/field mutators ───
  function addForm() {
    setForms(f => [...f, { id: uid(), name: `טופס ${f.length + 1}`, fields: [] }])
  }
  function removeForm(fid: string) {
    setForms(f => f.filter(x => x.id !== fid))
    if (defaultFormId === fid) setDefaultFormId('')
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
            <button onClick={() => removeForm(form.id)} className="text-red-400 hover:text-red-600 transition-colors shrink-0" title="מחק טופס">
              <Trash2 className="w-4 h-4" />
            </button>
          </CardHeader>
          <CardContent className="space-y-3">
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
