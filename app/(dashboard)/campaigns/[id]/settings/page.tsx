'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, X } from 'lucide-react'

interface DonationPlan {
  amount: number
  label: string
  image_url: string | null
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
        })
        if (data.settings?.donation_plans?.length) {
          setPlans(data.settings.donation_plans)
        } else if (data.settings?.donation_amounts?.length) {
          setPlans(data.settings.donation_amounts.map((a: number) => ({ amount: a, label: '', image_url: null })))
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
        secondary_color: '#1e40af',
        about_text: form.about_text || null,
        donation_page_url: form.donation_page_url || null,
      },
    }).eq('id', id)
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">הגדרות קמפיין</h1>

      <form onSubmit={handleSave} className="space-y-6">
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

        <Card>
          <CardHeader><CardTitle className="text-base">יעדים</CardTitle></CardHeader>
          <CardContent className="space-y-4">
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

        <Card>
          <CardHeader><CardTitle className="text-base">מדיה</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>קישור וידאו (YouTube / Vimeo / Google Drive)</Label>
              <Input type="url" value={form.video_url} onChange={(e) => set('video_url', e.target.value)} dir="ltr" placeholder="https://youtube.com/watch?v=..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">דף תרומה</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-500">הדבק קישור לדף תרומה קיים (קשר, ירושלים, PayPal וכו׳). לחיצה על "לתרומה" תפתח אותו ב-popup.</p>
            <div className="space-y-1">
              <Label>קישור לדף תרומה</Label>
              <Input type="url" value={form.donation_page_url} onChange={(e) => set('donation_page_url', e.target.value)} dir="ltr" placeholder="https://..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">עיגולי תרומה</CardTitle>
            <p className="text-xs text-gray-400 mt-1">
              גודל גרפיקה מומלץ: <strong>240×240px</strong> (עיגול, PNG/JPG)
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              {plans.map((plan, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  {/* עיגול */}
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
                    {/* כפתורי פעולה */}
                    <label className="absolute inset-0 rounded-full cursor-pointer flex items-center justify-center bg-black/0 hover:bg-black/30 transition-all group">
                      <Upload className="w-5 h-5 text-white opacity-0 group-hover:opacity-100" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => e.target.files?.[0] && uploadPlanImage(i, e.target.files[0])}
                      />
                    </label>
                    {plan.image_url && (
                      <button
                        type="button"
                        onClick={() => setPlans(ps => ps.map((p, j) => j === i ? { ...p, image_url: null } : p))}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white shadow"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    {uploadingPlan === i && (
                      <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  {/* כמות + תווית */}
                  <div className="text-center space-y-1 w-[90px]">
                    <Input
                      type="number"
                      value={plan.amount}
                      onChange={e => setPlans(ps => ps.map((p, j) => j === i ? { ...p, amount: Number(e.target.value) } : p))}
                      className="h-7 text-xs text-center px-1"
                      dir="ltr"
                    />
                    <Input
                      value={plan.label}
                      onChange={e => setPlans(ps => ps.map((p, j) => j === i ? { ...p, label: e.target.value } : p))}
                      placeholder="תווית..."
                      className="h-7 text-xs text-center px-1"
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400">לחץ על עיגול להעלאת גרפיקה. ניתן לשנות סכום ותווית.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">מיתוג</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              <Label>צבע ראשי</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.primary_color} onChange={(e) => set('primary_color', e.target.value)} className="w-10 h-10 rounded cursor-pointer border border-gray-200" />
                <span className="text-sm text-gray-500 font-mono">{form.primary_color}</span>
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
