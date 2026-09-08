'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadImage } from '@/lib/image-client'
import { Mail, ChevronDown, Check, Upload, Trash2, Image as ImageIcon } from 'lucide-react'

interface Copy { subject?: string; message?: string; closing?: string; button_label?: string; image_url?: string }

const DEFAULTS: Required<Omit<Copy, 'image_url'>> = {
  subject: 'תרומתך ל{{campaign}} ממתינה להשלמה',
  message: 'שלום וברכה,\nתודה על בחירתך לתמוך ב{{campaign}}! שמנו לב שתרומתך באתר לא הושלמה.\nעזרתך חיונית, ותרומתך נמצאת במרחק לחיצת כפתור:',
  closing: 'לנדיבותך יש השפעה אמיתית, ואנו מעריכים את מחויבותך.',
  button_label: 'להשלמת התרומה',
}

// Per-campaign editor for the abandoned-donation recovery email. Saves to
// campaign.settings.abandoned_email (merged, so other settings survive).
export default function AbandonedEmailEditor({ campaignId, initial }: { campaignId: string; initial: Copy | null }) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState(initial?.subject ?? DEFAULTS.subject)
  const [message, setMessage] = useState(initial?.message ?? DEFAULTS.message)
  const [closing, setClosing] = useState(initial?.closing ?? DEFAULTS.closing)
  const [buttonLabel, setButtonLabel] = useState(initial?.button_label ?? DEFAULTS.button_label)
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setUploading(true); setError(null)
    try {
      const url = await uploadImage(f, `campaigns/${campaignId}/abandoned-email-${Date.now()}`)
      setImageUrl(url)
    } catch { setError('העלאת התמונה נכשלה') }
    setUploading(false)
    e.target.value = ''
  }

  async function save() {
    setSaving(true); setError(null); setSaved(false)
    try {
      // merge so we never clobber the campaign's other settings
      const { data: row } = await supabase.from('campaigns').select('settings').eq('id', campaignId).single()
      const settings = { ...((row?.settings as Record<string, unknown>) || {}) }
      settings.abandoned_email = {
        subject: subject.trim(), message: message.trim(), closing: closing.trim(),
        button_label: buttonLabel.trim(), ...(imageUrl ? { image_url: imageUrl } : {}),
      }
      const { error: upErr } = await supabase.from('campaigns').update({ settings }).eq('id', campaignId)
      if (upErr) { setError('השמירה נכשלה'); setSaving(false); return }
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch { setError('השמירה נכשלה') }
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100" dir="rtl">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4">
        <span className="flex items-center gap-2 font-bold text-gray-800"><Mail className="w-5 h-5 text-blue-500" /> עריכת מייל התזכורת לתורם</span>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-50 pt-4">
          <p className="text-xs text-gray-400 leading-relaxed">
            זהו המייל שנשלח אוטומטית לתורם שהתחיל תרומה ולא סיים. אפשר להשתמש ב-<code className="bg-gray-100 px-1 rounded">{'{{campaign}}'}</code> לשם הקמפיין ו-<code className="bg-gray-100 px-1 rounded">{'{{org}}'}</code> לשם הארגון.
          </p>

          {/* image */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><ImageIcon className="w-4 h-4" /> תמונה בראש המייל (אופציונלי)</label>
            {imageUrl ? (
              <div className="flex items-center gap-3">
                <img src={imageUrl} alt="" className="w-28 h-20 object-cover rounded-lg border border-gray-200" />
                <button onClick={() => setImageUrl('')} className="inline-flex items-center gap-1 text-sm text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /> הסר תמונה</button>
              </div>
            ) : (
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 border border-blue-200 rounded-xl px-3 py-2 cursor-pointer hover:bg-blue-50 w-fit">
                <Upload className="w-4 h-4" /> {uploading ? 'מעלה…' : 'העלה תמונה'}
                <input type="file" accept="image/*" onChange={onFile} className="hidden" disabled={uploading} />
              </label>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">כותרת המייל (נושא)</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">גוף ההודעה (מעל הכפתור)</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 leading-relaxed" />
            <p className="text-[11px] text-gray-400">כל שורה תוצג כפסקה נפרדת.</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">טקסט הכפתור</label>
            <input value={buttonLabel} onChange={e => setButtonLabel(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">טקסט סיום (מתחת לכפתור)</label>
            <textarea value={closing} onChange={e => setClosing(e.target.value)} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 leading-relaxed" />
            <p className="text-[11px] text-gray-400">החתימה "{'בברכה, {{org}} ומערכת ׳כפול׳'}" מתווספת אוטומטית.</p>
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</div>}

          <div className="flex items-center gap-2">
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl px-5 py-2.5">
              {saved ? <><Check className="w-4 h-4" /> נשמר!</> : saving ? 'שומר…' : 'שמור נוסח'}
            </button>
            <button
              onClick={() => { setSubject(DEFAULTS.subject); setMessage(DEFAULTS.message); setClosing(DEFAULTS.closing); setButtonLabel(DEFAULTS.button_label) }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >שחזר ברירת מחדל</button>
          </div>
        </div>
      )}
    </div>
  )
}
