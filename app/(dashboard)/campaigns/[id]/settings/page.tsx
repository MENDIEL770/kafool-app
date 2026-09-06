'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadImage } from '@/lib/image-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import RichTextEditor from '@/components/RichTextEditor'
import CampaignStatusToggle from '../CampaignStatusToggle'
import { SlidersHorizontal, Palette, CreditCard, Bell, Power, MessageCircle, Phone, Languages, Globe } from 'lucide-react'

export default function CampaignSettingsPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [status, setStatus] = useState('')
  const [copiedWebhook, setCopiedWebhook] = useState(false)
  // special "product" (e.g. brick wall) configured on this campaign, if any
  const [bricks, setBricks] = useState<{ total?: number; price?: number; label?: string } | null>(null)
  // which settings tab is open (the page has many sections — grouped into a menu)
  const [tab, setTab] = useState<'general' | 'design' | 'payments' | 'alerts' | 'status'>('general')
  const [form, setForm] = useState({
    title: '',
    tagline: '',
    description: '',
    goal_amount: '',
    bonus_goal_amount: '',
    primary_color: '#2563eb',
    about_text: '',
    about_text_en: '',
    about_image: '',
    button_radius: 'pill' as 'pill' | 'rounded' | 'square',
    donation_button_size: 'default' as 'default' | 'large',
    countdown_end: '',
    show_timer: true,
    show_bricks: true,
    show_goal: true,
    hok_months_mode: 'list',
    hok_default_months: '12',
    whatsapp_phone: '',
    whatsapp_message: '',
    manager_phone: '',
    manager_email: '',
    kafool_plus_sync: false,
    stripe_enabled: false,
    stripe_currency: 'usd',
    stripe_amounts: '18, 36, 100, 180',
    stripe_ils_rate: '3.7',
    default_lang: 'he',
    default_currency: 'ils',
    allow_usd: true,
    allow_eur: false,
    allow_gbp: false,
    thanks_title: '',
    thanks_message: '',
    thanks_sub_text: '',
    thanks_button_label: '',
    thanks_button_url: '',
    logo_url: '',
    nedarim_category: '',
    // Per-campaign payment override (empty = inherit the org's connection)
    pay_provider: '' as '' | 'kesher' | 'nedarim',
    pay_one_time: '',
    pay_hok: '',
    pay_bit: '',
    pay_bank: '',
    pay_nedarim_mosad: '',
    pay_nedarim_api: '',
    // Hide specific payment methods on this campaign (even if the org offers them)
    pay_disable_one_time: false,
    pay_disable_hok: false,
    pay_disable_bit: false,
    pay_disable_bank: false,
    // Bank-transfer details shown to the donor when they pick "העברה בנקאית"
    bank_account_name: '',
    bank_name: '',
    bank_branch: '',
    bank_account_number: '',
    bank_note: '',
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.from('campaigns').select('*').eq('id', id).single()
      if (data) {
        setStatus(data.status || 'draft')
        setBricks(data.settings?.bricks?.total > 0 ? data.settings.bricks : null)
        setForm({
          title: data.title || '',
          tagline: data.settings?.tagline || '',
          description: data.description || '',
          goal_amount: String(data.goal_amount || ''),
          bonus_goal_amount: String(data.bonus_goal_amount || ''),
          primary_color: data.settings?.primary_color || '#2563eb',
          about_text: data.settings?.about_text || '',
          about_text_en: data.settings?.about_text_en || '',
          about_image: data.settings?.about_image || '',
          button_radius: data.settings?.button_radius || 'pill',
          donation_button_size: data.settings?.donation_button_size || 'default',
          countdown_end: data.settings?.countdown_end || '',
          show_timer: data.settings?.show_timer !== false,
          show_bricks: data.settings?.show_bricks !== false,
          show_goal: data.settings?.show_goal !== false,
          hok_months_mode: data.settings?.hok_months_mode === 'range' ? 'range' : 'list',
          hok_default_months: String(data.settings?.hok_default_months || 12),
          whatsapp_phone: data.settings?.whatsapp_phone || '',
          whatsapp_message: data.settings?.whatsapp_message || '',
          manager_phone: data.settings?.manager_phone || '',
          manager_email: data.settings?.manager_email || '',
          kafool_plus_sync: data.settings?.kafool_plus_sync === true,
          stripe_enabled: data.settings?.stripe_enabled === true,
          stripe_currency: data.settings?.stripe_currency || 'usd',
          stripe_amounts: Array.isArray(data.settings?.stripe_amounts) ? data.settings.stripe_amounts.join(', ') : '18, 36, 100, 180',
          stripe_ils_rate: String(data.settings?.stripe_ils_rate || '3.7'),
          default_lang: data.settings?.default_lang === 'en' ? 'en' : 'he',
          default_currency: data.settings?.default_currency || 'ils',
          allow_usd: Array.isArray(data.settings?.allowed_currencies) ? data.settings.allowed_currencies.includes('usd') : true,
          allow_eur: Array.isArray(data.settings?.allowed_currencies) ? data.settings.allowed_currencies.includes('eur') : false,
          allow_gbp: Array.isArray(data.settings?.allowed_currencies) ? data.settings.allowed_currencies.includes('gbp') : false,
          thanks_title: data.settings?.thanks?.title || '',
          thanks_message: data.settings?.thanks?.message || '',
          thanks_sub_text: data.settings?.thanks?.sub_text || '',
          thanks_button_label: data.settings?.thanks?.button_label || '',
          thanks_button_url: data.settings?.thanks?.button_url || '',
          logo_url: data.logo_url || '',
          nedarim_category: data.settings?.nedarim_category || '',
          pay_provider: data.settings?.payment?.provider === 'kesher' || data.settings?.payment?.provider === 'nedarim' ? data.settings.payment.provider : '',
          pay_one_time: data.settings?.payment?.urls?.one_time || '',
          pay_hok: data.settings?.payment?.urls?.hok || '',
          pay_bit: data.settings?.payment?.urls?.bit || '',
          pay_bank: data.settings?.payment?.urls?.bank || '',
          pay_nedarim_mosad: data.settings?.payment?.nedarim?.mosad || '',
          pay_nedarim_api: data.settings?.payment?.nedarim?.api_valid || '',
          pay_disable_one_time: (data.settings?.payment?.disabled || []).includes('one_time'),
          pay_disable_hok: (data.settings?.payment?.disabled || []).includes('hok'),
          pay_disable_bit: (data.settings?.payment?.disabled || []).includes('bit'),
          pay_disable_bank: (data.settings?.payment?.disabled || []).includes('bank'),
          bank_account_name: data.settings?.bank_details?.account_name || '',
          bank_name: data.settings?.bank_details?.bank || '',
          bank_branch: data.settings?.bank_details?.branch || '',
          bank_account_number: data.settings?.bank_details?.account_number || '',
          bank_note: data.settings?.bank_details?.note || '',
        })
      }
    }
    load()
  }, [id])

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const aboutImgRef = useRef<HTMLInputElement>(null)
  const [uploadingAbout, setUploadingAbout] = useState(false)
  async function onAboutImage(file: File | undefined) {
    if (!file) return
    setUploadingAbout(true)
    try { set('about_image', await uploadImage(file, `campaigns/${id}/about-${crypto.randomUUID()}`)) }
    catch (e) { alert(e instanceof Error ? e.message : 'העלאה נכשלה') }
    setUploadingAbout(false)
    if (aboutImgRef.current) aboutImgRef.current.value = ''
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    // Preserve existing settings fields we don't edit here (videos live in מדיה)
    const { data: existing } = await supabase.from('campaigns').select('settings').eq('id', id).single()

    // Per-campaign payment override — only stored when the manager actually set
    // something; otherwise null so the campaign cleanly inherits the org.
    const disabledMethods = [
      ...(form.pay_disable_one_time ? ['one_time'] : []),
      ...(form.pay_disable_hok ? ['hok'] : []),
      ...(form.pay_disable_bit ? ['bit'] : []),
      ...(form.pay_disable_bank ? ['bank'] : []),
    ]
    const payFields = [form.pay_provider, form.pay_one_time, form.pay_hok, form.pay_bit, form.pay_bank, form.pay_nedarim_mosad, form.pay_nedarim_api]
    const paymentOverride = (payFields.some(v => (v || '').toString().trim()) || disabledMethods.length) ? {
      provider: form.pay_provider || null,
      urls: {
        one_time: form.pay_one_time.trim() || null,
        hok: form.pay_hok.trim() || null,
        bit: form.pay_bit.trim() || null,
        bank: form.pay_bank.trim() || null,
      },
      nedarim: {
        mosad: form.pay_nedarim_mosad.trim() || null,
        api_valid: form.pay_nedarim_api.trim() || null,
      },
      disabled: disabledMethods,
    } : null

    // Bank-transfer details (shown to the donor for a manual transfer) — null when empty.
    const bankFields = [form.bank_account_name, form.bank_name, form.bank_branch, form.bank_account_number, form.bank_note]
    const bankDetails = bankFields.some(v => (v || '').toString().trim()) ? {
      account_name: form.bank_account_name.trim() || null,
      bank: form.bank_name.trim() || null,
      branch: form.bank_branch.trim() || null,
      account_number: form.bank_account_number.trim() || null,
      note: form.bank_note.trim() || null,
    } : null

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
        about_image: form.about_image || null,
        button_radius: form.button_radius,
        donation_button_size: form.donation_button_size,
        countdown_end: form.countdown_end || null,
        show_timer: form.show_timer,
        show_bricks: form.show_bricks,
        show_goal: form.show_goal,
        hok_months_mode: form.hok_months_mode === 'range' ? 'range' : 'list',
        hok_default_months: Math.min(60, Math.max(2, Number(form.hok_default_months) || 12)),
        whatsapp_phone: form.whatsapp_phone || null,
        whatsapp_message: form.whatsapp_message || null,
        manager_phone: form.manager_phone || null,
        manager_email: form.manager_email || null,
        kafool_plus_sync: form.kafool_plus_sync,
        stripe_enabled: form.stripe_enabled,
        stripe_currency: form.stripe_currency || 'usd',
        stripe_amounts: form.stripe_amounts.split(',').map(a => Math.round(Number(a.trim())) || 0).filter(a => a > 0),
        stripe_ils_rate: Number(form.stripe_ils_rate) || 3.7,
        default_lang: form.default_lang === 'en' ? 'en' : 'he',
        default_currency: form.default_currency || 'ils',
        allowed_currencies: ['ils', ...(form.allow_usd ? ['usd'] : []), ...(form.allow_eur ? ['eur'] : []), ...(form.allow_gbp ? ['gbp'] : [])],
        thanks: {
          title: form.thanks_title.trim() || null,
          message: form.thanks_message.trim() || null,
          sub_text: form.thanks_sub_text.trim() || null,
          button_label: form.thanks_button_label.trim() || null,
          button_url: form.thanks_button_url.trim() || null,
        },
        nedarim_category: form.nedarim_category.trim() || null,
        payment: paymentOverride,
        bank_details: bankDetails,
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

      {/* Section menu — grouped so it's easy to jump between all the settings */}
      <div className="sticky top-0 z-10 -mx-1 flex gap-2 overflow-x-auto bg-gray-50/90 px-1 py-2 backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {([
          ['general', 'כללי', SlidersHorizontal],
          ['design', 'עיצוב ושפה', Palette],
          ['payments', 'תשלומים ומטבעות', CreditCard],
          ['alerts', 'התראות', Bell],
          ['status', 'סטטוס', Power],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${tab === id ? 'bg-blue-600 text-white shadow' : 'border border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {tab === 'general' && (<>
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
                תמונת אודות (עומדת)
                <span className="text-[11px] font-normal text-gray-400">מומלץ 1080×1350 px · יחס 4:5</span>
              </Label>
              <div className="flex items-center gap-3">
                {form.about_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.about_image} alt="" className="w-20 h-24 rounded-xl object-cover border border-gray-200" />
                ) : (
                  <div className="w-20 h-24 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50" />
                )}
                <input ref={aboutImgRef} type="file" accept="image/*" className="hidden" onChange={(e) => onAboutImage(e.target.files?.[0])} />
                <div className="flex flex-col gap-1.5">
                  <Button type="button" variant="outline" size="sm" onClick={() => aboutImgRef.current?.click()} disabled={uploadingAbout}>
                    {uploadingAbout ? 'מעלה...' : form.about_image ? 'החלף תמונה' : 'העלה תמונה'}
                  </Button>
                  {form.about_image && (
                    <button type="button" onClick={() => set('about_image', '')} className="text-xs text-red-500 hover:underline text-right">הסר תמונה</button>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-gray-400">מוצגת בקטע &quot;אודות&quot; בדף הגיוס, לצד הטקסט. לחיצה עליה מרחיבה אותה.</p>
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
                <Input type="number" value={form.bonus_goal_amount} onChange={(e) => set('bonus_goal_amount', e.target.value)} dir="ltr" placeholder="למשל 800" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">יעד בונוס גבוה מהיעד הראשי — כשעוברים את היעד הראשי פס ההתקדמות ממשיך להתמלא עד יעד הבונוס, האחוזים עולים מעל 100%, והחלק הנוסף מוצג בגוון בהיר יותר. השאר ריק כדי לכבות.</p>
            <label className="mt-4 flex items-center gap-2 cursor-pointer bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
              <input type="checkbox" checked={form.show_goal} onChange={(e) => setForm(prev => ({ ...prev, show_goal: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
              <span className="text-sm text-gray-700">הצג את יעד הגיוס בדף הציבורי</span>
            </label>
            <p className="text-xs text-gray-400 mt-1.5">כשמכובה — יוצג רק הסכום שגויס, בלי היעד, פס ההתקדמות והאחוזים.</p>
          </CardContent>
        </Card>

        {/* ── בחירת מספר חודשים בהוראת קבע ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">מספר חודשים בהוראת קבע</CardTitle>
            <p className="text-xs text-gray-400 mt-1">איך התורם יבחר את מספר החודשים כשבוחר הוראת קבע.</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                ['list', 'רשימה קבועה', 'אפשרויות נפוצות: 6 / 12 / 18 / 24 / 36 / 48 / 60 חודשים'],
                ['range', 'בחירה חופשית 2–60', 'התורם בוחר כל מספר חודשים בין 2 ל-60'],
              ] as const).map(([val, title, desc]) => (
                <button key={val} type="button" onClick={() => set('hok_months_mode', val)}
                  className={`text-right rounded-xl border px-3 py-2.5 transition-colors ${form.hok_months_mode === val ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <span className={`text-sm font-bold block ${form.hok_months_mode === val ? 'text-blue-700' : 'text-gray-600'}`}>{title}</span>
                  <span className="text-[11px] text-gray-400">{desc}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-1 max-w-[12rem]">
              <Label className="text-xs">ברירת מחדל (חודשים)</Label>
              <Input type="number" min="2" max="60" value={form.hok_default_months}
                onChange={(e) => set('hok_default_months', e.target.value)} dir="ltr" placeholder="12" />
              <p className="text-[11px] text-gray-400">המספר שיהיה מסומן מראש כשהתורם בוחר הוראת קבע (2–60).</p>
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
            <label className="flex items-center gap-2 cursor-pointer bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
              <input type="checkbox" checked={form.show_timer} onChange={(e) => setForm(prev => ({ ...prev, show_timer: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
              <span className="text-sm text-gray-700">הצג את הספירה לאחור בדף הציבורי</span>
            </label>
            <div className="space-y-1">
              <Label>תאריך וזמן סיום</Label>
              <Input
                type="datetime-local"
                value={form.countdown_end}
                onChange={(e) => set('countdown_end', e.target.value)}
                dir="ltr"
                disabled={!form.show_timer}
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

        {/* ── מוצר מיוחד (קיר לבנים) — מוצג רק אם הוגדר לקמפיין ── */}
        {bricks && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">מוצר מיוחד — קיר לבנים</CardTitle>
              <p className="text-xs text-gray-400 mt-1">
                לקמפיין זה הוגדר קיר לבנים ({bricks.total} לבנים · ₪{Number(bricks.price || 0).toLocaleString('he-IL')} ללבנה). אפשר לכבות/להדליק את התצוגה בדף הציבורי.
              </p>
            </CardHeader>
            <CardContent>
              <label className="flex items-center gap-2 cursor-pointer bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
                <input type="checkbox" checked={form.show_bricks} onChange={(e) => setForm(prev => ({ ...prev, show_bricks: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
                <span className="text-sm text-gray-700">הצג את קיר הלבנים בדף הציבורי</span>
              </label>
            </CardContent>
          </Card>
        )}

        </>)}

        {tab === 'payments' && (<>
        {/* ── חיבור סליקה ייעודי לקמפיין זה ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">חיבור סליקה לקמפיין זה</CardTitle>
            <p className="text-xs text-gray-400 mt-1">
              בררת מחדל: הקמפיין משתמש בחיבור הסליקה של הארגון. כאן אפשר לחבר <b>דף סליקה ייעודי</b> לקמפיין זה בלבד (למשל דף מכירה שמוגדר כתשלום ולא כתרומה). <b>כל שדה שנשאר ריק — יורש מהארגון, וכל הקמפיינים הקיימים ממשיכים לעבוד כרגיל.</b>
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>ספק סליקה</Label>
              <select
                value={form.pay_provider}
                onChange={(e) => set('pay_provider', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
              >
                <option value="">כמו הארגון (ברירת מחדל)</option>
                <option value="kesher">קשר</option>
                <option value="nedarim">נדרים</option>
              </select>
            </div>

            {/* Webhook URL to embed in the clearing page so donations (incl. future
                standing orders) report back to Kafool. */}
            <div className="space-y-1 rounded-xl bg-blue-50/50 border border-blue-100 p-3">
              <Label className="text-blue-900">כתובת Webhook להטמעה בדף הסליקה</Label>
              <p className="text-[11px] text-gray-500 mb-1">הדביקו את הכתובת הזו בהגדרות ה-Callback של דף הסליקה בקשר, כדי שתרומות (כולל הוראות קבע שיוקמו לחיוב עתידי) יירשמו אוטומטית באתר.</p>
              <div className="flex items-center gap-2">
                <Input readOnly value={form.pay_provider === 'nedarim' ? 'https://www.kafool.com/api/webhooks/nedarim' : 'https://www.kafool.com/api/webhooks/kesher'} dir="ltr" className="font-mono text-xs bg-white" onFocus={(e) => e.target.select()} />
                <Button type="button" variant="outline" className="shrink-0" onClick={() => {
                  const url = form.pay_provider === 'nedarim' ? 'https://www.kafool.com/api/webhooks/nedarim' : 'https://www.kafool.com/api/webhooks/kesher'
                  navigator.clipboard?.writeText(url).then(() => { setCopiedWebhook(true); setTimeout(() => setCopiedWebhook(false), 1800) }).catch(() => {})
                }}>{copiedWebhook ? '✓ הועתק' : 'העתק'}</Button>
              </div>
            </div>

            {/* Hide specific payment methods on this campaign */}
            <div className="space-y-1.5 rounded-xl bg-gray-50 border border-gray-100 p-3">
              <Label>הסתרת אמצעי תשלום בקמפיין זה</Label>
              <p className="text-[11px] text-gray-500 mb-1">סמנו אמצעי כדי שלא יופיע לתורם בקמפיין זה — גם אם הארגון מחובר אליו (למשל להסתיר ביט).</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['pay_disable_one_time', 'תשלום חד-פעמי'],
                  ['pay_disable_hok', 'הוראת קבע'],
                  ['pay_disable_bit', 'ביט'],
                  ['pay_disable_bank', 'העברה בנקאית'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={form[key] as boolean} onChange={(e) => setForm(prev => ({ ...prev, [key]: e.target.checked }))} className="w-4 h-4 accent-red-500" />
                    הסתר {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label>קישור דף סליקה — תשלום חד-פעמי</Label>
              <Input value={form.pay_one_time} onChange={(e) => set('pay_one_time', e.target.value)} dir="ltr" placeholder="https://…" />
            </div>
            <div className="space-y-1">
              <Label>קישור דף סליקה — הוראת קבע</Label>
              <Input value={form.pay_hok} onChange={(e) => set('pay_hok', e.target.value)} dir="ltr" placeholder="https://… (ריק = כמו הארגון)" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>קישור — ביט</Label>
                <Input value={form.pay_bit} onChange={(e) => set('pay_bit', e.target.value)} dir="ltr" placeholder="https://…" />
              </div>
              <div className="space-y-1">
                <Label>קישור — העברה בנקאית</Label>
                <Input value={form.pay_bank} onChange={(e) => set('pay_bank', e.target.value)} dir="ltr" placeholder="https://…" />
              </div>
            </div>
            {form.pay_provider === 'nedarim' && (
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 border border-gray-100 p-3">
                <div className="space-y-1">
                  <Label>מוסד נדרים (Mosad)</Label>
                  <Input value={form.pay_nedarim_mosad} onChange={(e) => set('pay_nedarim_mosad', e.target.value)} dir="ltr" placeholder="ריק = כמו הארגון" />
                </div>
                <div className="space-y-1">
                  <Label>ApiValid</Label>
                  <Input value={form.pay_nedarim_api} onChange={(e) => set('pay_nedarim_api', e.target.value)} dir="ltr" placeholder="ריק = כמו הארגון" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── פרטי העברה בנקאית ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">פרטי העברה בנקאית</CardTitle>
            <p className="text-xs text-gray-400 mt-1">כשהתורם בוחר "העברה בנקאית" יוצגו לו הפרטים האלה להעברה ידנית. השאר ריק כדי להסתיר את האפשרות.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>שם בעל החשבון</Label>
              <Input value={form.bank_account_name} onChange={(e) => set('bank_account_name', e.target.value)} placeholder="לדוגמה — עמותת חב״ד סקיה" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>בנק</Label><Input value={form.bank_name} onChange={(e) => set('bank_name', e.target.value)} placeholder="לאומי" /></div>
              <div className="space-y-1"><Label>סניף</Label><Input value={form.bank_branch} onChange={(e) => set('bank_branch', e.target.value)} dir="ltr" placeholder="123" /></div>
              <div className="space-y-1"><Label>מספר חשבון</Label><Input value={form.bank_account_number} onChange={(e) => set('bank_account_number', e.target.value)} dir="ltr" placeholder="456789" /></div>
            </div>
            <div className="space-y-1">
              <Label>הערות נוספות (אופציונלי)</Label>
              <Textarea value={form.bank_note} onChange={(e) => set('bank_note', e.target.value)} rows={2} placeholder="לדוגמה — נא לציין שם התורם בהעברה, או לשלוח אישור לוואטסאפ…" />
            </div>
          </CardContent>
        </Card>

        {/* ── נדרים פלוס ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">קטגוריית נדרים פלוס</CardTitle>
            <p className="text-xs text-gray-400 mt-1">
              שם הקטגוריה (Groupe) במערכת נדרים פלוס שתרומותיה יירשמו לקמפיין זה. רק תרומות שנכנסות בקטגוריה הזו יירשמו — תרומות מקטגוריות אחרות באותו מוסד יתעלמו.
            </p>
          </CardHeader>
          <CardContent className="space-y-1">
            <Label>שם הקטגוריה במערכת נדרים</Label>
            <Input
              value={form.nedarim_category}
              onChange={(e) => set('nedarim_category', e.target.value)}
              placeholder="לדוג׳ — אור בשקט"
            />
            <p className="text-[11px] text-gray-400">השאר ריק כדי להתאים לפי שם הקמפיין.</p>
          </CardContent>
        </Card>

        </>)}

        {tab === 'alerts' && (<>
        {/* ── וואטסאפ ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-gray-500" /> כפתור WhatsApp
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
            {form.whatsapp_phone && (() => {
              // Same normalization the public page uses: local 0-prefix → 972, 00 → strip.
              let d = form.whatsapp_phone.replace(/\D/g, '')
              if (d.startsWith('00')) d = d.slice(2)
              else if (d.startsWith('0')) d = '972' + d.slice(1)
              const href = `https://wa.me/${d}${form.whatsapp_message ? `?text=${encodeURIComponent(form.whatsapp_message)}` : ''}`
              return (
                <div className="space-y-1">
                  <a href={href} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-green-600 hover:underline">
                    <span className="text-base"></span> בדוק את הקישור
                  </a>
                  <p className="text-[11px] text-gray-400" dir="ltr">wa.me/{d}</p>
                </div>
              )
            })()}
          </CardContent>
        </Card>

        {/* התראות למנהל על תרומות שלא הושלמו */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500" /> התראות למנהל — תרומות שלא הושלמו
            </CardTitle>
            <p className="text-xs text-gray-400 mt-1">
              כשתורם ממלא פרטים ובוחר אמצעי תשלום אך לא משלים את התרומה, יישלח אליך SMS עם שם התורם, אמצעי התשלום, הסכום ומספר טלפון לחזרה. הליד יישמר במערכת.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>מספר טלפון לקבלת התראות (SMS)</Label>
              <Input
                type="tel"
                value={form.manager_phone}
                onChange={(e) => set('manager_phone', e.target.value.replace(/\s/g, ''))}
                dir="ltr"
                placeholder="0501234567"
              />
            </div>
            <div className="space-y-1">
              <Label>כתובת מייל לקבלת התראות</Label>
              <Input
                type="email"
                value={form.manager_email}
                onChange={(e) => set('manager_email', e.target.value.trim())}
                dir="ltr"
                placeholder="manager@example.com"
              />
            </div>
            <p className="text-[11px] text-gray-400">אפשר למלא טלפון, מייל, או שניהם — השאר ריק כדי לא לקבל התראה בערוץ זה. ההתראה נשלחת כ-5 דקות לאחר שהתרומה לא הושלמה (בביט — כ-30 דקות, כי התשלום מתבצע באפליקציה).</p>
          </CardContent>
        </Card>

        </>)}

        {tab === 'payments' && (<>
        {/* סנכרון עם Kafool+ (מערכת השגרירים) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-500" /> סנכרון עם Kafool+ (מערכת השגרירים)
            </CardTitle>
            <p className="text-xs text-gray-400 mt-1">
              כשמופעל — כל תרומה מוצלחת בקמפיין זה (אשראי / ביט / הוראת קבע) תישלח אוטומטית למערכת השגרירים Kafool+ לפי מספר הטלפון של התורם.
            </p>
          </CardHeader>
          <CardContent>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.kafool_plus_sync}
                onChange={(e) => setForm(prev => ({ ...prev, kafool_plus_sync: e.target.checked }))}
                className="w-4 h-4 accent-blue-600"
              />
              שלח תרומות מקמפיין זה ל-Kafool+
            </label>
          </CardContent>
        </Card>

        </>)}

        {tab === 'design' && (<>
        {/* שפת ברירת מחדל של דף הגיוס */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Languages className="w-4 h-4 text-gray-500" /> שפת ברירת מחדל
            </CardTitle>
            <p className="text-xs text-gray-400 mt-1">באיזו שפה ייפתח דף הגיוס למבקרים. הם תמיד יוכלו להחליף שפה בעצמם.</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-w-xs">
              <Label>שפת ברירת מחדל</Label>
              <select
                value={form.default_lang}
                onChange={(e) => set('default_lang', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
              >
                <option value="he">עברית</option>
                <option value="en">אנגלית (English)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        </>)}

        {tab === 'payments' && (<>
        {/* Stripe — תרומות מחו״ל */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-500" /> Stripe — תרומות מחו״ל
            </CardTitle>
            <p className="text-xs text-gray-400 mt-1">
              כפתור נוסף בדף הגיוס לתרומות מחו״ל דרך Stripe. התורם מועבר לדף תשלום מאובטח של Stripe, ובסיום התרומה נקלטת אוטומטית (webhook). תחילה יש לחבר את חשבון ה-Stripe בהגדרות → חיבור לתשלום.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.stripe_enabled}
                onChange={(e) => setForm(prev => ({ ...prev, stripe_enabled: e.target.checked }))}
                className="w-4 h-4 accent-blue-600"
              />
              הפעל תרומות מחו״ל (Stripe)
            </label>
            {form.stripe_enabled && (
              <div className="space-y-2 rounded-xl bg-gray-50 border border-gray-100 p-3">
                <p className="text-xs font-bold text-gray-600">מטבעות</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>מטבע ברירת מחדל</Label>
                    <select
                      value={form.default_currency}
                      onChange={(e) => set('default_currency', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
                    >
                      <option value="ils">₪ שקל (קשר)</option>
                      {form.allow_usd && <option value="usd">$ דולר (Stripe)</option>}
                      {form.allow_eur && <option value="eur">€ אירו (Stripe)</option>}
                      {form.allow_gbp && <option value="gbp">£ ליש״ט (Stripe)</option>}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>מטבעות מותרים לחיוב (בנוסף ל-₪)</Label>
                    <div className="flex flex-wrap gap-3 pt-1.5">
                      {([['allow_usd', '$ USD'], ['allow_eur', '€ EUR'], ['allow_gbp', '£ GBP']] as const).map(([k, l]) => (
                        <label key={k} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                          <input type="checkbox" checked={form[k]} onChange={(e) => setForm(prev => ({ ...prev, [k]: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
                          {l}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400">₪ מחייב דרך קשר. מטבע זר מחייב דרך Stripe (בתוך הדף). האתר באנגלית עובר אוטומטית למטבע זר. כפתור התרומה מחו״ל מופיע רק כשבוחרים מטבע זר.</p>
              </div>
            )}
            {form.stripe_enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="space-y-1">
                  <Label>מטבע</Label>
                  <select
                    value={form.stripe_currency}
                    onChange={(e) => set('stripe_currency', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
                    dir="ltr"
                  >
                    <option value="usd">USD ($)</option>
                    <option value="eur">EUR (€)</option>
                    <option value="gbp">GBP (£)</option>
                    <option value="ils">ILS (₪)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>סכומים מוצעים</Label>
                  <Input value={form.stripe_amounts} onChange={(e) => set('stripe_amounts', e.target.value)} dir="ltr" placeholder="18, 36, 100, 180" />
                </div>
                <div className="space-y-1">
                  <Label>שער המרה ל-₪ (לסך שגויס)</Label>
                  <Input type="number" step="0.1" value={form.stripe_ils_rate} onChange={(e) => set('stripe_ils_rate', e.target.value)} dir="ltr" placeholder="3.7" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        </>)}

        {tab === 'design' && (<>
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
              <Label>טקסט ראשי</Label>
              <Textarea
                value={form.thanks_message}
                onChange={(e) => set('thanks_message', e.target.value)}
                rows={3}
                placeholder="תרומתך התקבלה בהצלחה"
              />
              <p className="text-[11px] text-gray-400">השאר ריק כדי להשתמש בברירת המחדל</p>
            </div>
            <div className="space-y-1">
              <Label>טקסט משני (בתיבה)</Label>
              <Textarea
                value={form.thanks_sub_text}
                onChange={(e) => set('thanks_sub_text', e.target.value)}
                rows={2}
                placeholder="קבלה תישלח לאימייל שלך בקרוב.&#10;תרומתך תשנה חיים."
              />
              <p className="text-[11px] text-gray-400">הטקסט בתיבה הלבנה מתחת לכותרת. ריק = ברירת מחדל.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>טקסט הכפתור</Label>
                <Input value={form.thanks_button_label} onChange={(e) => set('thanks_button_label', e.target.value)} placeholder="חזרה לדף הקמפיין" />
              </div>
              <div className="space-y-1">
                <Label>קישור הכפתור</Label>
                <Input value={form.thanks_button_url} onChange={(e) => set('thanks_button_url', e.target.value)} dir="ltr" placeholder="ריק = דף הקמפיין" />
              </div>
            </div>
            <p className="text-[11px] text-gray-400 -mt-2">אם מזינים קישור (למשל קבוצת וואטסאפ) — הכפתור יוביל אליו, וההפניה האוטומטית לדף הקמפיין תבוטל.</p>

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
                    <p className="text-gray-600 text-xs leading-relaxed whitespace-pre-line">{form.thanks_sub_text || 'קבלה תישלח לאימייל שלך בקרוב.\nתרומתך תשנה חיים.'}</p>
                  </div>
                  <button type="button" disabled className="w-full py-2.5 rounded-xl font-bold text-white text-sm" style={{ backgroundColor: primaryColor }}>
                    {form.thanks_button_label || 'חזרה לדף הקמפיין'}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-gray-400">כך יראה התורם את העמוד מיד אחרי תרומה (הלוגו והצבע נלקחים מהגדרות הקמפיין).</p>
            </div>
          </CardContent>
        </Card>

        </>)}

        {tab !== 'status' && (
          <div className="flex gap-3">
            <Button type="submit" disabled={loading || uploadingAbout}>
              {saved ? '✓ נשמר' : loading ? 'שומר...' : uploadingAbout ? 'מעלה תמונה…' : 'שמור שינויים'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>חזרה</Button>
          </div>
        )}
      </form>

      {/* סטטוס קמפיין — הפעלה / עצירה */}
      {tab === 'status' && status && (
        <Card>
          <CardHeader><CardTitle className="text-base">סטטוס הקמפיין</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              {status === 'active'
                ? 'הקמפיין פעיל ודף הגיוס פתוח לתרומות. עצירה תסתיר את הדף הציבורי.'
                : 'הקמפיין אינו פעיל. הפעלה תפתח את דף הגיוס לתרומות.'}
            </p>
            <CampaignStatusToggle campaignId={id} currentStatus={status} onStatusChange={setStatus} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
