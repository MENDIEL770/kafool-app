'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Group } from '@/types'

export default function GroupsPage() {
  const params = useParams()
  const campaignId = params.id as string

  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', goal_amount: '', manager_name: '', manager_phone: '' })

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('groups').select('*').eq('campaign_id', campaignId).order('created_at')
    setGroups(data || [])
  }

  useEffect(() => { load() }, [campaignId])

  function set(key: string, value: string) {
    setForm((prev) => {
      const updated = { ...prev, [key]: value }
      if (key === 'name' && !prev.slug) {
        updated.slug = value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
      }
      return updated
    })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user!.id).single()

    await supabase.from('groups').insert({
      campaign_id: campaignId,
      org_id: profile!.org_id,
      name: form.name,
      slug: form.slug,
      goal_amount: Number(form.goal_amount) || 0,
      manager_name: form.manager_name || null,
      manager_phone: form.manager_phone || null,
    })

    setForm({ name: '', slug: '', goal_amount: '', manager_name: '', manager_phone: '' })
    setShowForm(false)
    setLoading(false)
    load()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">קבוצות גיוס</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ קבוצה חדשה</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">קבוצה חדשה</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>שם הקבוצה</Label>
                  <Input value={form.name} onChange={(e) => set('name', e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label>slug</Label>
                  <Input value={form.slug} onChange={(e) => set('slug', e.target.value)} dir="ltr" required />
                </div>
              </div>
              <div className="space-y-1">
                <Label>יעד גיוס (₪)</Label>
                <Input type="number" value={form.goal_amount} onChange={(e) => set('goal_amount', e.target.value)} dir="ltr" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>ראש קבוצה</Label>
                  <Input value={form.manager_name} onChange={(e) => set('manager_name', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>טלפון</Label>
                  <Input type="tel" value={form.manager_phone} onChange={(e) => set('manager_phone', e.target.value)} dir="ltr" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>{loading ? 'יוצר...' : 'צור קבוצה'}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>ביטול</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {groups.length === 0 && (
          <Card><CardContent className="py-12 text-center text-gray-400">אין קבוצות עדיין</CardContent></Card>
        )}
        {groups.map((g) => {
          const pct = g.goal_amount > 0 ? Math.min(100, Math.round((g.raised_amount / g.goal_amount) * 100)) : 0
          return (
            <Card key={g.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{g.name}</div>
                    {g.manager_name && <div className="text-sm text-gray-400">ראש קבוצה: {g.manager_name}</div>}
                    <div className="text-xs text-gray-400 mt-1">/{g.slug}</div>
                  </div>
                  <div className="text-sm font-semibold text-blue-600">
                    ₪{(g.raised_amount || 0).toLocaleString()} / ₪{(g.goal_amount || 0).toLocaleString()}
                  </div>
                </div>
                <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
