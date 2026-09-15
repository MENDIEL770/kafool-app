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
  const [uploading, setUploading] = useState<'logo' | 'email' | 'hero' | null>(null)
  const [heroImage, setHeroImage] = useState('')
  const [heroDeclaration, setHeroDeclaration] = useState('')

  const [pricePerSoul, setPricePerSoul] = useState('50')
  const [maxSouls, setMaxSouls] = useState('20')
  const [introHtml, setIntroHtml] = useState('')
  const [aboutText, setAboutText] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailImage, setEmailImage] = useState('')
  // Record-into: funnel this kaparot page's donations into another campaign (+ group)
  const [recordCampaignSlug, setRecordCampaignSlug] = useState('')
  const [recordGroupSlug, setRecordGroupSlug] = useState('')
  const [orgCampaigns, setOrgCampaigns] = useState<{ slug: string; title: string }[]>([])
  const [targetGroups, setTargetGroups] = useState<{ slug: string; name: string }[]>([])

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('campaigns').select('org_id, settings').eq('id', id).single()
      const k = (data?.settings?.kaparot || {}) as Record<string, unknown>
      const ri = (k.record_into || {}) as { campaign_slug?: string; group_slug?: string }
      setRecordCampaignSlug(ri.campaign_slug || '')
      setRecordGroupSlug(ri.group_slug || '')
      // Other campaigns in this org (possible funnel targets — exclude this kaparot campaign itself)
      if (data?.org_id) {
        const { data: cams } = await supabase.from('campaigns')
          .select('slug, title, settings').eq('org_id', data.org_id).neq('id', id).order('created_at', { ascending: false })
        setOrgCampaigns((cams || [])
          .filter(c => (c.settings as { page_type?: string })?.page_type !== 'kaparot')
          .map(c => ({ slug: c.slug as string, title: c.title as string })))
      }
      setPricePerSoul(String(k.price_per_soul ?? 50))
      setMaxSouls(String(k.max_souls ?? 20))
      setIntroHtml(String(k.intro_html || ''))
      setAboutText(String(k.about_text || ''))
      setLogoUrl(String(k.chabad_logo_url || ''))
      setHeroImage(String(k.hero_image_url || ''))
      setHeroDeclaration(k.hero_declaration != null ? String(k.hero_declaration) : 'יחי אדוננו מורנו ורבינו מלך המשיח לעולם ועד')
      const em = (k.email || {}) as Record<string, string>
      setEmailSubject(em.subject || '')
      setEmailBody(em.body || '')
      setEmailImage(em.image_url || '')
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // When a funnel-target campaign is chosen, load its groups (to pick a group within it).
  useEffect(() => {
    if (!recordCampaignSlug) { setTargetGroups([]); return }
    let alive = true
    ;(async () => {
      const { data: cam } = await supabase.from('campaigns').select('id').eq('slug', recordCampaignSlug).maybeSingle()
      if (!cam?.id) { if (alive) setTargetGroups([]); return }
      const { data: grps } = await supabase.from('groups').select('slug, name').eq('campaign_id', cam.id).order('name')
      if (alive) setTargetGroups((grps || []).map(g => ({ slug: g.slug as string, name: g.name as string })))
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordCampaignSlug])

  const logoRef = useRef<HTMLInputElement>(null)
  const emailImgRef = useRef<HTMLInputElement>(null)
  async function upImg(file: File | undefined, which: 'logo' | 'email' | 'hero') {
    if (!file) return
    setUploading(which)
    try {
      const url = await uploadImage(file, `campaigns/${id}/kaparot-${which}-${Date.now()}`)
      if (which === 'logo') setLogoUrl(url); else if (which === 'hero') setHeroImage(url); else setEmailImage(url)
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
        hero_image_url: heroImage.trim() || null,
        hero_declaration: heroDeclaration.trim(),
        record_into: recordCampaignSlug.trim()
          ? { campaign_slug: recordCampaignSlug.trim(), group_slug: recordGroupSlug.trim() || null }
          : null,
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
        <CardHeader>
          <CardTitle className="text-base">להיכן נכנס הכסף</CardTitle>
          <p className="text-xs text-gray-400 mt-1">אפשר להפנות את התרומות מדף הכפרות לקמפיין קיים (הכסף והסכומים יתעדכנו שם). מומלץ גם לבחור קבוצה ייעודית בתוך אותו קמפיין כדי לעקוב בנפרד אחרי הכפרות. ריק = הכסף נשאר בקמפיין הכפרות הזה.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>קמפיין יעד</Label>
            <select
              value={recordCampaignSlug}
              onChange={e => { setRecordCampaignSlug(e.target.value); setRecordGroupSlug('') }}
              className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 text-sm"
            >
              <option value="">— נשאר בקמפיין הכפרות —</option>
              {orgCampaigns.map(c => <option key={c.slug} value={c.slug}>{c.title}</option>)}
            </select>
          </div>
          {recordCampaignSlug && (
            <div className="space-y-1">
              <Label>קבוצה בתוך הקמפיין (מומלץ)</Label>
              <select
                value={recordGroupSlug}
                onChange={e => setRecordGroupSlug(e.target.value)}
                className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 text-sm"
              >
                <option value="">— ללא קבוצה (ישירות לקמפיין) —</option>
                {targetGroups.map(g => <option key={g.slug} value={g.slug}>{g.name}</option>)}
              </select>
              {targetGroups.length === 0
                ? <p className="text-[11px] text-amber-600">לקמפיין היעד אין קבוצות. צרו קבוצה בשם ״כפרות״ בעמוד הקבוצות של אותו קמפיין ואז בחרו אותה כאן.</p>
                : <p className="text-[11px] text-gray-400">כך תוכלו לראות בנפרד כמה גויס דרך הכפרות, בתוך הסך הכולל של הקמפיין.</p>}
            </div>
          )}
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
        <CardHeader>
          <CardTitle className="text-base">תמונת רקע (Hero)</CardTitle>
          <p className="text-xs text-gray-400 mt-1">תמונה רחבה שתופיע ברקע ראש העמוד (למשל חוף / נוף בית חב״ד). ריק = רקע זהב עדין.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            {heroImage && <img src={heroImage} alt="" className="h-16 w-28 object-cover rounded border border-gray-100" />}
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 cursor-pointer">
              {uploading === 'hero' ? <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
              {heroImage ? 'החלף תמונה' : 'העלה תמונה'}
              <input type="file" accept="image/*" className="hidden" onChange={e => { upImg(e.target.files?.[0], 'hero'); e.target.value = '' }} />
            </label>
            {heroImage && <button onClick={() => setHeroImage('')} className="text-xs text-red-400 hover:text-red-600">הסר</button>}
          </div>
          <div className="space-y-1">
            <Label>הצהרה בראש העמוד (אופציונלי)</Label>
            <Input value={heroDeclaration} onChange={e => setHeroDeclaration(e.target.value)} placeholder="יחי אדוננו מורנו ורבינו מלך המשיח לעולם ועד" />
            <p className="text-[11px] text-gray-400">ריק = לא יוצג.</p>
          </div>
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
