'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCampaign } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewCampaignPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '',
    slug: '',
    description: '',
    goal_amount: '',
    bonus_goal_amount: '',
    start_at: '',
    end_at: '',
    primary_color: '#2563eb',
  })

  function set(key: string, value: string) {
    setForm((prev) => {
      const updated = { ...prev, [key]: value }
      if (key === 'title' && !prev.slug) {
        // keep Hebrew letters too, so a campaign can have a Hebrew URL
        updated.slug = value
          .toLowerCase()
          .replace(/[^a-z0-9֐-׿]+/g, '-')
          .replace(/^-+|-+$/g, '')
      }
      return updated
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await createCampaign({
      title: form.title,
      slug: form.slug,
      description: form.description,
      goal_amount: Number(form.goal_amount) || 0,
      bonus_goal_amount: form.bonus_goal_amount ? Number(form.bonus_goal_amount) : null,
      start_at: form.start_at || null,
      end_at: form.end_at || null,
      primary_color: form.primary_color,
    })

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push(`/campaigns/${result.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-900">קמפיין חדש</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">פרטי הקמפיין</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>שם הקמפיין</Label>
              <Input value={form.title} onChange={(e) => set('title', e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>כתובת קצרה (slug)</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400 shrink-0">kafool.com/</span>
                <Input
                  value={form.slug}
                  onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9֐-׿-]/g, ''))}
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>תיאור</Label>
              <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">יעדים</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>יעד ראשי (₪)</Label>
                <Input type="number" value={form.goal_amount} onChange={(e) => set('goal_amount', e.target.value)} dir="ltr" required />
              </div>
              <div className="space-y-1">
                <Label>יעד בונוס (₪)</Label>
                <Input type="number" value={form.bonus_goal_amount} onChange={(e) => set('bonus_goal_amount', e.target.value)} dir="ltr" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">תאריכים</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>תאריך התחלה</Label>
                <Input type="datetime-local" value={form.start_at} onChange={(e) => set('start_at', e.target.value)} dir="ltr" />
              </div>
              <div className="space-y-1">
                <Label>תאריך סיום</Label>
                <Input type="datetime-local" value={form.end_at} onChange={(e) => set('end_at', e.target.value)} dir="ltr" />
              </div>
            </div>
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

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? 'יוצר...' : 'צור קמפיין'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            ביטול
          </Button>
        </div>
      </form>
    </div>
  )
}
