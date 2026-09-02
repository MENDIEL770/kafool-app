'use client'

import { useState } from 'react'
import { X, Upload, Check, Loader2, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ImageCropper from '@/components/ImageCropper'

interface Props {
  isOpen: boolean
  onClose: () => void
  campaignId: string
  primaryColor: string
  // Pre-launch context (/join): don't surface a link to the group's campaign page.
  preLaunch?: boolean
}

export default function CreateGroupModal({ isOpen, onClose, campaignId, primaryColor, preLaunch = false }: Props) {
  const [form, setForm] = useState({
    name: '', managerName: '', managerPhone: '', goalAmount: '', imageUrl: '', lang: 'he',
  })
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ groupUrl: string; name: string } | null>(null)
  const [error, setError] = useState('')
  const [cropFile, setCropFile] = useState<File | null>(null)

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  // The picked file is cropped/positioned first; only the resulting square blob is uploaded.
  async function uploadCropped(blob: Blob) {
    setCropFile(null)
    setUploading(true)
    const fd = new FormData()
    fd.append('file', new File([blob], 'group.jpg', { type: 'image/jpeg' }))
    fd.append('path', `groups/public/${Date.now()}`)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (res.ok) {
      const { url } = await res.json()
      set('imageUrl', url)
    }
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!(Number(form.goalAmount) > 0)) { setError('יש להגדיר יעד גיוס לקבוצה'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/groups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          name: form.name,
          managerName: form.managerName,
          managerPhone: form.managerPhone,
          goalAmount: form.goalAmount,
          imageUrl: form.imageUrl,
          lang: form.lang,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'שגיאה'); return }
      setResult({ groupUrl: data.groupUrl, name: form.name })
    } catch {
      setError('שגיאת רשת')
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    setForm({ name: '', managerName: '', managerPhone: '', goalAmount: '', imageUrl: '', lang: 'he' })
    setResult(null)
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-black text-gray-900 text-lg">פתח קבוצת גיוס</h2>
            <p className="text-xs text-gray-400 mt-0.5">צור קבוצה ושתף עם חברים ומשפחה</p>
          </div>
          <button onClick={handleClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-5">
          {result ? (
            /* Success state */
            <div className="text-center space-y-5 py-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-white text-3xl shadow-lg"
                style={{ backgroundColor: primaryColor }}>
                ✓
              </div>
              <div>
                <h3 className="font-black text-xl text-gray-900">הקבוצה נוצרה!</h3>
                <p className="text-sm text-gray-500 mt-1">נשלח SMS עם הקישור למספר שהוזן</p>
              </div>
              {preLaunch ? (
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-sm text-gray-500 leading-relaxed">
                    שמרו את ה-SMS ששלחנו — הקישור לשיתוף ולניהול הקבוצה יהיה פעיל ברגע שהקמפיין יעלה לאוויר.
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                  <p className="text-xs text-gray-500">הקישור לקבוצה שלך:</p>
                  <p className="text-sm font-mono text-blue-600 break-all">{result.groupUrl}</p>
                  <a href={result.groupUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold mt-2 px-4 py-2 rounded-xl text-white transition-colors"
                    style={{ backgroundColor: primaryColor }}>
                    <ExternalLink className="w-3.5 h-3.5" />
                    פתח עמוד הקבוצה
                  </a>
                </div>
              )}
              <button onClick={handleClose} className="w-full py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                סגור
              </button>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Image upload */}
              <div className="flex justify-center">
                <label className="relative cursor-pointer">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-gray-300 hover:border-gray-400 flex items-center justify-center bg-gray-50 transition-colors"
                    style={form.imageUrl ? { borderColor: primaryColor, borderStyle: 'solid' } : {}}>
                    {form.imageUrl ? (
                      <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : uploading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    ) : (
                      <div className="text-center">
                        <Upload className="w-5 h-5 text-gray-400 mx-auto" />
                        <p className="text-[10px] text-gray-400 mt-1">תמונה</p>
                      </div>
                    )}
                  </div>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) setCropFile(f); e.target.value = '' }} />
                </label>
              </div>

              {cropFile && (
                <ImageCropper
                  file={cropFile}
                  lang={form.lang === 'en' ? 'en' : 'he'}
                  onCancel={() => setCropFile(null)}
                  onCropped={uploadCropped}
                />
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">שם הקבוצה *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} required
                  placeholder="משפחת כהן / חברי שיר..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">שם מנהל הקבוצה</label>
                <input value={form.managerName} onChange={e => set('managerName', e.target.value)}
                  placeholder="ישראל ישראלי"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">
                  טלפון *
                  <span className="text-gray-400 font-normal mr-1">(ישלח SMS עם הקישור)</span>
                </label>
                <input type="tel" value={form.managerPhone} onChange={e => set('managerPhone', e.target.value)} required
                  dir="ltr" placeholder="050-0000000"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">יעד גיוס (₪) <span className="text-red-400">*</span></label>
                <input type="number" value={form.goalAmount} onChange={e => set('goalAmount', e.target.value)}
                  required dir="ltr" placeholder="5000" min="1"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">שפת ברירת מחדל של עמוד הקבוצה</label>
                <div className="grid grid-cols-2 gap-2">
                  {([['he', 'עברית'], ['en', 'English']] as const).map(([val, lbl]) => (
                    <button key={val} type="button" onClick={() => set('lang', val)}
                      className={`rounded-xl border py-2.5 text-sm font-bold transition-colors ${form.lang === val ? 'text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                      style={form.lang === val ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}>
                      {lbl}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400">העמוד ייפתח בשפה זו למי שנכנס לקישור הקבוצה.</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-600 text-center">
                  {error}
                </div>
              )}

              <button type="submit" disabled={submitting || uploading}
                className="w-full py-3.5 rounded-xl font-black text-white text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                style={{ backgroundColor: primaryColor }}>
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> {form.lang === 'en' ? 'Creating...' : 'יוצר...'}</>
                  : uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> {form.lang === 'en' ? 'Uploading image…' : 'מעלה תמונה…'}</>
                  : <><Check className="w-4 h-4" /> {form.lang === 'en' ? 'Create group' : 'צור קבוצה'}</>}
              </button>

              <p className="text-center text-xs text-gray-400">
                לאחר יצירת הקבוצה תקבל SMS עם הקישור האישי שלך
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
