'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadImage } from '@/lib/image-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import RichTextEditor from '@/components/RichTextEditor'
import { Check, Upload } from 'lucide-react'

// Settings editor for a פדיון כפרות campaign (settings.kaparot).
export default function KaparotSettingsPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState<'logo' | 'email' | null>(null)

  const [pricePerSoul, setPricePerSoul] = useState('50')
  const [maxSouls, setMaxSouls] = useState('20')
  const [introHtml, setIntroHtml] = useState('')
  const [aboutText, setAboutText] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailImage, setEmailImage] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('campaigns').select('settings').eq('id', id).single()
      const k = (data?.settings?.kaparot || {}) as Record<string, unknown>
      setPricePerSoul(String(k.price_per_soul ?? 50))
      setMaxSouls(String(k.max_souls ?? 20))
      setIntroHtml(String(k.intro_html || ''))
      setAboutText(String(k.about_text || ''))
      setLogoUrl(String(k.chabad_logo_url || ''))
      const em = (k.email || {}) as Record<string, string>
      setEmailSubject(em.subject || '')
      setEmailBody(em.body || '')
      setEmailImage(em.image_url || '')
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const logoRef = useRef<HTMLInputElement>(null)
  const emailImgRef = useRef<HTMLInputElement>(null)
  async function upImg(file: File | undefined, which: 'logo' | 'email') {
    if (!file) return
    setUploading(which)
    try {
      const url = await uploadImage(file, `campaigns/${id}/kaparot-${which}-${Date.now()}`)
      if (which === 'logo') setLogoUrl(url); else setEmailImage(url)
    } catch { alert('העלאת התמונה נכשלה') }
    setUploading(null)
  }

  async function save() {
    setSaving(true)
    const { data: cur } = await supabase.from('campaigns').select('settings').eq('id', id).single()
    const settings = {
      ...(cur?.settings as object || {}),
      kaparot: {
        ...((cur?.settings as { kaparot?: object })?.kaparot || {}),
        price_per_soul: Math.max(1, Number(pricePerSoul) || 50),
        max_souls: Math.min(100, Math.max(1, Number(maxSouls) || 20)),
        intro_html: introHtml.trim() || null,
        about_text: aboutText.trim() || null,
        chabad_logo_url: logoUrl.trim() || null,
        email: {
          subject: emailSubject.trim() || null,
          body: emailBody.trim() || null,
          image_url: emailImage.trim() || null,
        },
      },
    }
    const { error } = await supabase.from('campaigns').update({ settings }).eq('id', id)
    if (error) { alert('השמירה נכשלה: ' + error.message); setSaving(false); return }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
    router.refresh()
  }

  if (loading) return <div className="p-6 text-sm text-gray-400" dir="rtl">טוען…</div>

  return (
    <div className="max-w-2xl mx-auto space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">הגדרות פדיון כפרות</h1>
        <p className="text-sm text-gray-500 mt-1">מחיר לנפש, טקסטים, לוגו בית חב״ד ותוכן מייל האישור.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">מחיר וכמות</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label>מחיר לנפש (₪)</Label><Input type="number" value={pricePerSoul} onChange={e => setPricePerSoul(e.target.value)} dir="ltr" /></div>
            <div className="space-y-1"><Label>מקסימום נפשות</Label><Input type="number" value={maxSouls} onChange={e => setMaxSouls(e.target.value)} dir="ltr" /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">לוגו בית חב״ד</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {logoUrl && <img src={logoUrl} alt="" className="h-14 w-auto object-contain rounded border border-gray-100" />}
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 cursor-pointer">
              {uploading === 'logo' ? <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
              {logoUrl ? 'החלף לוגו' : 'העלה לוגו'}
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => { upImg(e.target.files?.[0], 'logo'); e.target.value = '' }} />
            </label>
            {logoUrl && <button onClick={() => setLogoUrl('')} className="text-xs text-red-400 hover:text-red-600">הסר</button>}
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">ריק = הלוגו של הארגון.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">טקסט פתיח (מעל הטופס)</CardTitle></CardHeader>
        <CardContent><RichTextEditor value={introHtml} onChange={setIntroHtml} placeholder="ריק = טקסט ברירת המחדל על סדר הכפרות…" /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">אודות בית חב״ד</CardTitle></CardHeader>
        <CardContent><RichTextEditor value={aboutText} onChange={setAboutText} placeholder="פסקת אודות שתופיע בתחתית הדף…" /></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">מייל אישור לתורם</CardTitle>
          <p className="text-xs text-gray-400 mt-1">נשלח אוטומטית אחרי הפדיון וכולל את שמות הנפשות שנפדו. כאן מוסיפים כותרת, טקסט אישי ותמונת חג.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1"><Label>כותרת המייל</Label><Input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="אישור פדיון כפרות" /></div>
          <div className="space-y-1"><Label>טקסט אישי מהשליח</Label><RichTextEditor value={emailBody} onChange={setEmailBody} placeholder="ברכה או מסר אישי שיופיע במייל…" /></div>
          <div className="space-y-1">
            <Label>תמונת חג (בראש המייל)</Label>
            <div className="flex items-center gap-3">
              {emailImage && <img src={emailImage} alt="" className="h-14 w-auto object-contain rounded border border-gray-100" />}
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 cursor-pointer">
                {uploading === 'email' ? <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
                {emailImage ? 'החלף תמונה' : 'העלה תמונה'}
                <input ref={emailImgRef} type="file" accept="image/*" className="hidden" onChange={e => { upImg(e.target.files?.[0], 'email'); e.target.value = '' }} />
              </label>
              {emailImage && <button onClick={() => setEmailImage('')} className="text-xs text-red-400 hover:text-red-600">הסר</button>}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 bg-gray-50/90 backdrop-blur py-3">
        <Button onClick={save} disabled={saving || uploading !== null} className="w-full">
          {saved ? <><Check className="w-4 h-4" /> נשמר!</> : saving ? 'שומר…' : uploading ? 'מעלה תמונה…' : 'שמור הגדרות כפרות'}
        </Button>
      </div>
    </div>
  )
}
