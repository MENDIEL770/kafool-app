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
  const [form, setForm] = useState({
    title: '',
    description: '',
    goal_amount: '',
    bonus_goal_amount: '',
    primary_color: '#2563eb',
    about_text: '',
    button_radius: 'pill' as 'pill' | 'rounded' | 'square',
    countdown_end: '',
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
          primary_color: data.settings?.primary_color || '#2563eb',
          about_text: data.settings?.about_text || '',
          button_radius: data.settings?.button_radius || 'pill',
          countdown_end: data.settings?.countdown_end || '',
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

    // Preserve existing settings fields we don't edit here
    const { data: existing } = await supabase.from('campaigns').select('settings, video_url').eq('id', id).single()

    await supabase.from('campaigns').update({
      title: form.title,
      description: form.description || null,
      goal_amount: Number(form.goal_amount) || 0,
      bonus_goal_amount: form.bonus_goal_amount ? Number(form.bonus_goal_amount) : null,
      settings: {
        ...existing?.settings,
        primary_color: form.primary_color,
        about_text: form.about_text || null,
        button_radius: form.button_radius,
        countdown_end: form.countdown_end || null,
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
                ⏱ ספירה לאחור תוצג עד: {new Date(form.countdown_end).toLocaleString('he-IL')}
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
