'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import RichTextEditor from '@/components/RichTextEditor'

export default function CampaignSettingsPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    title: '',
    tagline: '',
    description: '',
    goal_amount: '',
    bonus_goal_amount: '',
    primary_color: '#2563eb',
    about_text: '',
    about_text_en: '',
    button_radius: 'pill' as 'pill' | 'rounded' | 'square',
    donation_button_size: 'default' as 'default' | 'large',
    countdown_end: '',
    whatsapp_phone: '',
    whatsapp_message: '',
    thanks_title: '',
    thanks_message: '',
    logo_url: '',
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
          about_text_en: data.settings?.about_text_en || '',
          button_radius: data.settings?.button_radius || 'pill',
          donation_button_size: data.settings?.donation_button_size || 'default',
          countdown_end: data.settings?.countdown_end || '',
          whatsapp_phone: data.settings?.whatsapp_phone || '',
          whatsapp_message: data.settings?.whatsapp_message || '',
          thanks_title: data.settings?.thanks?.title || '',
          thanks_message: data.settings?.thanks?.message || '',
          logo_url: data.logo_url || '',
        })
      }
    }
    load()
  }, [id])

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    // Preserve existing settings fields we don't edit here (videos live in מדיה)
    const { data: existing } = await supabase.from('campaigns').select('settings').eq('id', id).single()

    await supabase.from('campaigns').update({
      title: form.title,
      description: form.description || null,
      goal_amount: Number(form.goal_amount) || 0,
      bonus_goal_amount: form.bonus_goal_amount ? Number(form.bonus_goal_amount) : null,
      settings: {
        ...existing?.settings,
        primary_color: form.primary_color,
        tagline: form.tagline || null,
        about_text: form.about_text || null,
        about_text_en: form.about_text_en || null,
        button_radius: form.button_radius,
        donation_button_size: form.donation_button_size,
        countdown_end: form.countdown_end || null,
        whatsapp_phone: form.whatsapp_phone || null,
        whatsapp_message: form.whatsapp_message || null,
        thanks: {
          title: form.thanks_title.trim() || null,
          message: form.thanks_message.trim() || null,
        },
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
              <RichTextEditor value={form.about_text} onChange={(html) => set('about_text', html)} placeholder="ספרו על הקמפיין... אפשר להדגיש, לצבוע, לשנות גודל, ליישר ולהוסיף קישורים" />
            </div>

            <div className="space-y-1">
              <Label className="flex items-center gap-2">
                טקסט אודות באנגלית
                <span className="text-[11px] font-normal text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">English</span>
              </Label>
              <RichTextEditor value={form.about_text_en} onChange={(html) => set('about_text_en', html)} dir="ltr" placeholder="About text shown when visitors switch the page to English" />
              <p className="text-[11px] text-gray-400">מוצג כשהמבקר עובר לאנגלית בדף הגיוס. ריק = יוצג הטקסט בעברית.</p>
            </div>

            <p className="text-[11px] text-gray-400">
              ניהול סרטוני הקמפיין עבר לעמוד{' '}
              <a href={`/campaigns/${id}/media`} className="text-blue-500 hover:underline font-medium">מדיה → סרטונים</a>.
            </p>
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

            {/* גודל כפתורי תרומה */}
            <div className="space-y-2">
              <Label>גודל כפתורי תרומה</Label>
              <p className="text-[11px] text-gray-400 -mt-1">קובע איך מוצגים מסלולי הסכומים בדף הגיוס</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: 'default', label: 'רגיל', desc: 'עיגולים קטנים (ברירת מחדל)', dots: [10, 10, 10] },
                  { key: 'large', label: 'גדול', desc: 'כפתורים גדולים 1:1 — גדול בנייד, עיגולים גדולים במחשב', dots: [22, 22] },
                ] as const).map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => set('donation_button_size', opt.key)}
                    className={`p-3 border-2 rounded-xl flex flex-col items-center gap-2 text-center transition-all ${form.donation_button_size === opt.key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex items-center justify-center gap-1.5 h-7">
                      {opt.dots.map((d, i) => (
                        <span key={i} className="rounded-full" style={{ width: d, height: d, backgroundColor: primaryColor }} />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-gray-700">{opt.label}</span>
                    <span className="text-[10px] text-gray-400 leading-tight">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── עמוד תודה ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">עמוד תודה (לאחר תרומה)</CardTitle>
            <p className="text-xs text-gray-400 mt-1">הלוגו של הקמפיין מוצג אוטומטית. אפשר להתאים אישית את הכותרת והטקסט שהתורם רואה אחרי התרומה.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>כותרת</Label>
              <Input
                value={form.thanks_title}
                onChange={(e) => set('thanks_title', e.target.value)}
                placeholder="תודה רבה!"
              />
            </div>
            <div className="space-y-1">
              <Label>טקסט</Label>
              <Textarea
                value={form.thanks_message}
                onChange={(e) => set('thanks_message', e.target.value)}
                rows={3}
                placeholder="תרומתך התקבלה בהצלחה"
              />
              <p className="text-[11px] text-gray-400">השאר ריק כדי להשתמש בברירת המחדל</p>
            </div>

            {/* תצוגה מקדימה חיה */}
            <div className="space-y-2">
              <Label>תצוגה מקדימה</Label>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6" dir="rtl">
                <div className="text-center space-y-4 max-w-sm mx-auto">
                  {form.logo_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={form.logo_url} alt="" className="h-14 w-auto object-contain mx-auto" />
                  )}
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow" style={{ backgroundColor: primaryColor + '20' }}>
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900">{form.thanks_title || 'תודה רבה!'}</h3>
                    <p className="text-gray-500 whitespace-pre-line mt-1">{form.thanks_message || 'תרומתך התקבלה בהצלחה'}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <p className="text-gray-600 text-xs leading-relaxed">קבלה תישלח לאימייל שלך בקרוב.<br />תרומתך תשנה חיים.</p>
                  </div>
                  <button type="button" disabled className="w-full py-2.5 rounded-xl font-bold text-white text-sm" style={{ backgroundColor: primaryColor }}>
                    חזרה לדף הקמפיין
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-gray-400">כך יראה התורם את העמוד מיד אחרי תרומה (הלוגו והצבע נלקחים מהגדרות הקמפיין).</p>
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
