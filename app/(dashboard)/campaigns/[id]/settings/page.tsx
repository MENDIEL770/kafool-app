'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, X, ChevronUp, ChevronDown, GripVertical } from 'lucide-react'

interface DonationPlan {
  amount: number
  label: string
  image_url: string | null
}

interface Banner {
  url: string
  sort_order: number
}

export default function CampaignSettingsPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [plans, setPlans] = useState<DonationPlan[]>([
    { amount: 180, label: '', image_url: null },
    { amount: 360, label: '', image_url: null },
    { amount: 720, label: '', image_url: null },
    { amount: 1800, label: '', image_url: null },
    { amount: 3600, label: '', image_url: null },
  ])
  const [banners, setBanners] = useState<Banner[]>([])
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [uploadingPlan, setUploadingPlan] = useState<number | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    goal_amount: '',
    bonus_goal_amount: '',
    video_url: '',
    primary_color: '#2563eb',
    about_text: '',
    donation_page_url: '',
    button_radius: 'pill' as 'pill' | 'rounded' | 'square',
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.from('campaigns').select('*').eq('id', id).single()
      if (data) {
        setForm({
          title: data.title || '',
          description: data.description || '',
          goal_amount: String(data.goal_amount || ''),
          bonus_goal_amount: String(data.bonus_goal_amount || ''),
          video_url: data.video_url || '',
          primary_color: data.settings?.primary_color || '#2563eb',
          about_text: data.settings?.about_text || '',
          donation_page_url: data.settings?.donation_page_url || '',
          button_radius: data.settings?.button_radius || 'pill',
        })
        if (data.settings?.donation_plans?.length) {
          setPlans(data.settings.donation_plans)
        } else if (data.settings?.donation_amounts?.length) {
          setPlans(data.settings.donation_amounts.map((a: number) => ({ amount: a, label: '', image_url: null })))
        }
        if (data.settings?.banners?.length) {
          setBanners([...data.settings.banners].sort((a: Banner, b: Banner) => a.sort_order - b.sort_order))
        }
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
    await supabase.from('campaigns').update({
      title: form.title,
      description: form.description || null,
      goal_amount: Number(form.goal_amount) || 0,
      bonus_goal_amount: form.bonus_goal_amount ? Number(form.bonus_goal_amount) : null,
      video_url: form.video_url || null,
      settings: {
        donation_amounts: plans.map(p => p.amount),
        donation_plans: plans,
        primary_color: form.primary_color,
        about_text: form.about_text || null,
        donation_page_url: form.donation_page_url || null,
        button_radius: form.button_radius,
        banners: banners.map((b, i) => ({ ...b, sort_order: i })),
      },
    }).eq('id', id)
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  async function uploadBanner(file: File) {
    setUploadingBanner(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${id}/banners/banner_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('campaign-media').upload(path, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('campaign-media').getPublicUrl(path)
      setBanners(prev => [...prev, { url: publicUrl, sort_order: prev.length }])
    }
    setUploadingBanner(false)
  }

  function moveBanner(i: number, dir: -1 | 1) {
    setBanners(prev => {
      const next = [...prev]
      const j = i + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  function removeBanner(i: number) {
    setBanners(prev => prev.filter((_, j) => j !== i))
  }

  async function uploadPlanImage(planIndex: number, file: File) {
    setUploadingPlan(planIndex)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${id}/plans/plan_${plans[planIndex].amount}.${ext}`
    const { error } = await supabase.storage.from('campaign-media').upload(path, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('campaign-media').getPublicUrl(path)
      setPlans(ps => ps.map((p, i) => i === planIndex ? { ...p, image_url: publicUrl } : p))
    }
    setUploadingPlan(null)
  }

  const radiusMap = { pill: 'rounded-full', rounded: 'rounded-xl', square: 'rounded-md' }
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
              <Label>תיאור</Label>
              <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} />
            </div>
            <div className="space-y-1">
              <Label>טקסט אודות</Label>
              <Textarea value={form.about_text} onChange={(e) => set('about_text', e.target.value)} rows={4} />
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

        {/* ── באנרים ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">באנרים</CardTitle>
            <p className="text-xs text-gray-400 mt-1">מספר תמונות שיתחלפו אוטומטית כל 4 שניות. גודל מומלץ: <strong>1920×600px</strong></p>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* רשימת באנרים */}
            {banners.length > 0 && (
              <div className="space-y-2">
                {banners.map((b, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 border border-gray-100 rounded-xl bg-gray-50">
                    <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                    <img src={b.url} alt="" className="w-20 h-12 object-cover rounded-lg border border-gray-200 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 truncate">באנר {i + 1}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button type="button" onClick={() => moveBanner(i, -1)} disabled={i === 0}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 transition-colors">
                        <ChevronUp className="w-4 h-4 text-gray-600" />
                      </button>
                      <button type="button" onClick={() => moveBanner(i, 1)} disabled={i === banners.length - 1}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 transition-colors">
                        <ChevronDown className="w-4 h-4 text-gray-600" />
                      </button>
                      <button type="button" onClick={() => removeBanner(i)}
                        className="p-1 rounded hover:bg-red-100 transition-colors">
                        <X className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* העלאת באנר */}
            <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl py-8 cursor-pointer transition-colors ${uploadingBanner ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
              {uploadingBanner ? (
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Upload className="w-6 h-6 text-gray-400" />
                  <span className="text-sm text-gray-500 font-medium">לחץ להעלאת באנר</span>
                  <span className="text-xs text-gray-400">PNG, JPG, WEBP</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingBanner}
                onChange={e => e.target.files?.[0] && uploadBanner(e.target.files[0])}
              />
            </label>
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

        {/* עיגולי תרומה */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">עיגולי תרומה</CardTitle>
            <p className="text-xs text-gray-400 mt-1">גודל גרפיקה מומלץ: <strong>240×240px</strong> (PNG/JPG)</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              {plans.map((plan, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="relative w-[90px] h-[90px]">
                    <div className="w-full h-full rounded-full overflow-hidden border-2 border-gray-200 bg-gray-50">
                      {plan.image_url ? (
                        <img src={plan.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Upload className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <label className="absolute inset-0 rounded-full cursor-pointer flex items-center justify-center bg-black/0 hover:bg-black/30 transition-all group">
                      <Upload className="w-5 h-5 text-white opacity-0 group-hover:opacity-100" />
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => e.target.files?.[0] && uploadPlanImage(i, e.target.files[0])} />
                    </label>
                    {plan.image_url && (
                      <button type="button"
                        onClick={() => setPlans(ps => ps.map((p, j) => j === i ? { ...p, image_url: null } : p))}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white shadow">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    {uploadingPlan === i && (
                      <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="text-center space-y-1 w-[90px]">
                    <Input type="number" value={plan.amount}
                      onChange={e => setPlans(ps => ps.map((p, j) => j === i ? { ...p, amount: Number(e.target.value) } : p))}
                      className="h-7 text-xs text-center px-1" dir="ltr" />
                    <Input value={plan.label}
                      onChange={e => setPlans(ps => ps.map((p, j) => j === i ? { ...p, label: e.target.value } : p))}
                      placeholder="תווית..." className="h-7 text-xs text-center px-1" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* מדיה */}
        <Card>
          <CardHeader><CardTitle className="text-base">וידאו</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              <Label>קישור וידאו (YouTube / Vimeo)</Label>
              <Input type="url" value={form.video_url} onChange={(e) => set('video_url', e.target.value)} dir="ltr" placeholder="https://youtube.com/watch?v=..." />
            </div>
          </CardContent>
        </Card>

        {/* דף תרומה */}
        <Card>
          <CardHeader><CardTitle className="text-base">דף תרומה</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-500">קישור לדף תרומה חיצוני (קשר, PayPal וכו׳).</p>
            <div className="space-y-1">
              <Label>קישור לדף תרומה</Label>
              <Input type="url" value={form.donation_page_url} onChange={(e) => set('donation_page_url', e.target.value)} dir="ltr" placeholder="https://..." />
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
