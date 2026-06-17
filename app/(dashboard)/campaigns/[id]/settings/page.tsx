'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function CampaignSettingsPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [videos, setVideos] = useState<{ url: string; title: string }[]>([])
  const [mainVideo, setMainVideo] = useState(0)
  const [form, setForm] = useState({
    title: '',
    tagline: '',
    description: '',
    goal_amount: '',
    bonus_goal_amount: '',
    primary_color: '#2563eb',
    about_text: '',
    button_radius: 'pill' as 'pill' | 'rounded' | 'square',
    countdown_end: '',
    whatsapp_phone: '',
    whatsapp_message: '',
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.from('campaigns').select('*').eq('id', id).single()
      if (data) {
        setForm({
          title: data.title || '',
          tagline: data.settings?.tagline || '',
          description: data.description || '',
          goal_amount: String(data.goal_amount || ''),
          bonus_goal_amount: String(data.bonus_goal_amount || ''),
          primary_color: data.settings?.primary_color || '#2563eb',
          about_text: data.settings?.about_text || '',
          button_radius: data.settings?.button_radius || 'pill',
          countdown_end: data.settings?.countdown_end || '',
          whatsapp_phone: data.settings?.whatsapp_phone || '',
          whatsapp_message: data.settings?.whatsapp_message || '',
        })
        const rawVids: (string | { url: string; title?: string })[] = data.settings?.videos?.length
          ? data.settings.videos
          : (data.video_url ? [data.video_url] : [])
        const vids = rawVids.map(v => typeof v === 'string' ? { url: v, title: '' } : { url: v.url || '', title: v.title || '' })
        setVideos(vids)
        setMainVideo(Math.max(0, vids.findIndex(v => v.url === data.video_url)))
      }
    }
    load()
  }, [id])

  function setVideoField(i: number, field: 'url' | 'title', val: string) {
    setVideos(v => v.map((x, idx) => (idx === i ? { ...x, [field]: val } : x)))
  }
  function addVideo() { setVideos(v => [...v, { url: '', title: '' }]) }
  function removeVideo(i: number) {
    setVideos(v => v.filter((_, idx) => idx !== i))
    setMainVideo(m => (i === m ? 0 : i < m ? m - 1 : m))
  }

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    // Preserve existing settings fields we don't edit here
    const { data: existing } = await supabase.from('campaigns').select('settings, video_url').eq('id', id).single()

    // Videos: keep the chosen main first; video_url stays the main (banner + social preview)
    const mainUrl = (videos[mainVideo]?.url || '').trim()
    const cleanVideos = videos
      .map(v => ({ url: v.url.trim(), title: v.title.trim() }))
      .filter(v => v.url)
    const orderedVideos = mainUrl
      ? [...cleanVideos.filter(v => v.url === mainUrl), ...cleanVideos.filter(v => v.url !== mainUrl)]
      : cleanVideos

    await supabase.from('campaigns').update({
      title: form.title,
      description: form.description || null,
      goal_amount: Number(form.goal_amount) || 0,
      bonus_goal_amount: form.bonus_goal_amount ? Number(form.bonus_goal_amount) : null,
      video_url: orderedVideos[0]?.url || null,
      settings: {
        ...existing?.settings,
        videos: orderedVideos,
        primary_color: form.primary_color,
        tagline: form.tagline || null,
        about_text: form.about_text || null,
        button_radius: form.button_radius,
        countdown_end: form.countdown_end || null,
        whatsapp_phone: form.whatsapp_phone || null,
        whatsapp_message: form.whatsapp_message || null,
      },
    }).eq('id', id)
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  const primaryColor = form.primary_color

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">הגדרות קמפיין</h1>

      <form onSubmit={handleSave} className="space-y-6">

        {/* פרטים */}
        <Card>
          <CardHeader><CardTitle className="text-base">פרטים</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>שם הקמפיין</Label>
              <Input value={form.title} onChange={(e) => set('title', e.target.value)} required />
            </div>

            <div className="space-y-1">
              <Label className="flex items-center gap-2">
                תיאור קצר — שורת כותרת בראש הדף
                <span className="text-[11px] font-normal text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">מופיע בהדר</span>
              </Label>
              <div className="relative">
                <Input
                  value={form.tagline}
                  onChange={(e) => set('tagline', e.target.value.slice(0, 120))}
                  placeholder='לדוג׳ — "גיוס מיוחד לרגל חג הפסח תשפ״ה"'
                  maxLength={120}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-300 tabular-nums">
                  {form.tagline.length}/120
                </span>
              </div>
              <p className="text-[11px] text-gray-400">משפט קצר שמופיע בצד שמאל של ה-Header הדביק בדף הציבורי</p>
            </div>

            <div className="space-y-1">
              <Label>תיאור</Label>
              <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} />
            </div>
            <div className="space-y-1">
              <Label>טקסט אודות</Label>
              <Textarea value={form.about_text} onChange={(e) => set('about_text', e.target.value)} rows={4} />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                סרטוני הקמפיין
                <span className="text-[11px] font-normal text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">YouTube / Vimeo</span>
              </Label>
              <p className="text-[11px] text-gray-400">
                הוסף קישורי סרטונים. הסרטון המסומן כ<strong>ראשי</strong> מופיע על באנר הקמפיין ובתצוגה לרשתות;
                כל הסרטונים מוצגים מעל כפתור התרומה ומעל מקטע &quot;אודות&quot;.
              </p>

              <div className="space-y-3">
                {videos.map((v, i) => (
                  <div key={i} className="flex items-start gap-2 border border-gray-100 rounded-xl p-2.5 bg-gray-50/50">
                    <label className="flex flex-col items-center gap-0.5 text-[11px] text-gray-500 shrink-0 cursor-pointer pt-1.5" title="קבע כסרטון ראשי">
                      <input type="radio" name="mainVideo" checked={mainVideo === i} onChange={() => setMainVideo(i)} className="accent-blue-600" />
                      ראשי
                    </label>
                    <div className="flex-1 space-y-2 min-w-0">
                      <Input
                        value={v.url}
                        onChange={(e) => setVideoField(i, 'url', e.target.value)}
                        placeholder="https://youtube.com/watch?v=...  או  https://vimeo.com/..."
                        dir="ltr"
                      />
                      <Input
                        value={v.title}
                        onChange={(e) => setVideoField(i, 'title', e.target.value)}
                        placeholder="כותרת לסרטון (אופציונלי) — מוצגת בסרטונים הנוספים"
                      />
                    </div>
                    <button type="button" onClick={() => removeVideo(i)} title="הסר"
                      className="w-9 h-9 rounded-lg text-red-400 hover:bg-red-50 flex items-center justify-center shrink-0">✕</button>
                  </div>
                ))}
              </div>

              <button type="button" onClick={addVideo}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700">+ הוסף סרטון</button>
            </div>
          </CardContent>
        </Card>

        {/* יעדים */}
        <Card>
          <CardHeader><CardTitle className="text-base">יעדים</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>יעד ראשי (₪)</Label>
                <Input type="number" value={form.goal_amount} onChange={(e) => set('goal_amount', e.target.value)} dir="ltr" />
              </div>
              <div className="space-y-1">
                <Label>יעד בונוס (₪)</Label>
                <Input type="number" value={form.bonus_goal_amount} onChange={(e) => set('bonus_goal_amount', e.target.value)} dir="ltr" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── ספירה לאחור ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ספירה לאחור</CardTitle>
            <p className="text-xs text-gray-400 mt-1">תאריך ושעה שיוצגו בדף הציבורי כספירה לאחור לסיום הקמפיין</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>תאריך וזמן סיום</Label>
              <Input
                type="datetime-local"
                value={form.countdown_end}
                onChange={(e) => set('countdown_end', e.target.value)}
                dir="ltr"
              />
            </div>
            {form.countdown_end && (
              <p className="text-xs text-blue-600">
                ספירה לאחור תוצג עד: {new Date(form.countdown_end).toLocaleString('he-IL')}
              </p>
            )}
            {form.countdown_end && (
              <button
                type="button"
                onClick={() => set('countdown_end', '')}
                className="text-xs text-red-500 hover:underline"
              >
                הסר ספירה לאחור
              </button>
            )}
          </CardContent>
        </Card>

        {/* ── וואטסאפ ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-lg"></span> כפתור WhatsApp
            </CardTitle>
            <p className="text-xs text-gray-400 mt-1">כפתור צף בדף הגיוס שפותח שיחת WhatsApp עם מנהל הקמפיין</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>מספר טלפון (עם קידומת מדינה)</Label>
              <Input
                type="tel"
                value={form.whatsapp_phone}
                onChange={(e) => set('whatsapp_phone', e.target.value.replace(/\s/g, ''))}
                dir="ltr"
                placeholder="+972501234567"
              />
              <p className="text-[11px] text-gray-400">השאר ריק כדי להסתיר את הכפתור</p>
            </div>
            <div className="space-y-1">
              <Label>הודעה פותחת (אופציונלי)</Label>
              <Textarea
                value={form.whatsapp_message}
                onChange={(e) => set('whatsapp_message', e.target.value)}
                rows={2}
                placeholder="שלום, אשמח לקבל מידע נוסף על הקמפיין..."
              />
            </div>
            {form.whatsapp_phone && (
              <a
                href={`https://wa.me/${form.whatsapp_phone.replace(/\D/g, '')}${form.whatsapp_message ? `?text=${encodeURIComponent(form.whatsapp_message)}` : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-green-600 hover:underline"
              >
                <span className="text-base"></span> בדוק את הקישור
              </a>
            )}
          </CardContent>
        </Card>

        {/* ── עיצוב כפתורים ── */}
        <Card>
          <CardHeader><CardTitle className="text-base">עיצוב</CardTitle></CardHeader>
          <CardContent className="space-y-5">

            {/* צבע ראשי */}
            <div className="space-y-1">
              <Label>צבע ראשי</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={(e) => set('primary_color', e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border border-gray-200"
                />
                <span className="text-sm text-gray-500 font-mono">{form.primary_color}</span>
              </div>
            </div>

            {/* עיצוב כפתורים */}
            <div className="space-y-2">
              <Label>סגנון כפתורים</Label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { key: 'pill', label: 'עגול', preview: 'rounded-full' },
                  { key: 'rounded', label: 'מעוגל', preview: 'rounded-xl' },
                  { key: 'square', label: 'מרובע', preview: 'rounded-md' },
                ] as const).map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => set('button_radius', opt.key)}
                    className={`p-3 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${form.button_radius === opt.key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div
                      className={`px-4 py-1.5 text-xs font-bold text-white ${opt.preview}`}
                      style={{ backgroundColor: primaryColor }}
                    >
                      תרום
                    </div>
                    <span className="text-xs text-gray-600">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {saved ? '✓ נשמר' : loading ? 'שומר...' : 'שמור שינויים'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>חזרה</Button>
        </div>
      </form>
    </div>
  )
}
