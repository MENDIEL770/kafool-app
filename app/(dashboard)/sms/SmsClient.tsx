'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'

interface Campaign { id: string; title: string }
interface SmsLog { id: string; to_phone: string; message: string; status: string; created_at: string }
interface Rule {
  id: string
  campaign_id: string
  trigger_event: string
  action_type: string
  template: string
  delay_minutes: number
  is_active: boolean
  campaigns?: { title: string } | null
}

const TRIGGER_LABELS: Record<string, string> = {
  donation_completed: 'תרומה הושלמה',
  lead_assigned: 'ליד שויך למגייס',
  callback_due: 'תזכורת חזרה',
}

const TRIGGER_VARS: Record<string, string[]> = {
  donation_completed: ['{{שם}}', '{{סכום}}', '{{קמפיין}}'],
  lead_assigned: ['{{שם}}', '{{טלפון}}', '{{קמפיין}}'],
  callback_due: ['{{שם}}', '{{טלפון}}'],
}

const EMPTY_FORM = {
  campaign_id: '',
  trigger_event: 'donation_completed',
  template: '',
  delay_minutes: '0',
}

interface Props {
  initialRules: Rule[]
  initialLogs: SmsLog[]
  campaigns: Campaign[]
  orgId: string
}

export default function SmsClient({ initialRules, initialLogs, campaigns, orgId }: Props) {
  const router = useRouter()
  const [rules, setRules] = useState<Rule[]>(initialRules)
  const [logs] = useState<SmsLog[]>(initialLogs)
  const [open, setOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // manual SMS blast
  const [manual, setManual] = useState({ phones: '', message: '' })
  const [manualSending, setManualSending] = useState(false)
  const [manualResult, setManualResult] = useState('')

  async function handleManualSend() {
    const phones = manual.phones.split(/[\s,;]+/).map(p => p.trim()).filter(Boolean)
    if (phones.length === 0 || !manual.message.trim()) { setManualResult('יש להזין מספרים והודעה'); return }
    setManualSending(true); setManualResult('')
    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phones, message: manual.message }),
      })
      const data = await res.json()
      setManualResult(res.ok ? `נשלח ל-${data.count} מספרים` : `${data.error || 'שליחה נכשלה'}`)
      if (res.ok) setManual(m => ({ ...m, message: '' }))
    } catch {
      setManualResult('שגיאת רשת')
    }
    setManualSending(false)
  }
  const [, startTransition] = useTransition()

  function openCreate() {
    setEditingRule(null)
    setForm({ ...EMPTY_FORM, campaign_id: campaigns[0]?.id || '' })
    setError('')
    setOpen(true)
  }

  function openEdit(rule: Rule) {
    setEditingRule(rule)
    setForm({
      campaign_id: rule.campaign_id,
      trigger_event: rule.trigger_event,
      template: rule.template,
      delay_minutes: String(rule.delay_minutes),
    })
    setError('')
    setOpen(true)
  }

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (key === 'trigger_event') {
      setForm((prev) => ({ ...prev, [key]: value, template: '' }))
    }
  }

  function insertVar(v: string) {
    setForm((prev) => ({ ...prev, template: prev.template + v }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.campaign_id) { setError('יש לבחור קמפיין'); return }
    if (!form.template.trim()) { setError('יש להזין תבנית הודעה'); return }

    setSaving(true)
    setError('')
    const supabase = createClient()

    const payload = {
      org_id: orgId,
      campaign_id: form.campaign_id,
      trigger_event: form.trigger_event,
      action_type: 'send_sms',
      template: form.template.trim(),
      delay_minutes: Number(form.delay_minutes) || 0,
      is_active: true,
    }

    if (editingRule) {
      const { data, error: err } = await supabase
        .from('automation_rules')
        .update(payload)
        .eq('id', editingRule.id)
        .select('*, campaigns(title)')
        .single()

      if (err) { setError('שגיאה בשמירה'); setSaving(false); return }
      setRules((prev) => prev.map((r) => r.id === editingRule.id ? data : r))
    } else {
      const { data, error: err } = await supabase
        .from('automation_rules')
        .insert(payload)
        .select('*, campaigns(title)')
        .single()

      if (err) { setError('שגיאה ביצירה'); setSaving(false); return }
      setRules((prev) => [data, ...prev])
    }

    setSaving(false)
    setOpen(false)
    startTransition(() => router.refresh())
  }

  async function toggleActive(rule: Rule) {
    const supabase = createClient()
    const newVal = !rule.is_active
    await supabase.from('automation_rules').update({ is_active: newVal }).eq('id', rule.id)
    setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, is_active: newVal } : r))
  }

  async function deleteRule(id: string) {
    if (!confirm('למחוק את החוק?')) return
    const supabase = createClient()
    await supabase.from('automation_rules').delete().eq('id', id)
    setRules((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">SMS ואוטומציות</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />} onClick={openCreate}>
            + חוק חדש
          </DialogTrigger>
          <DialogContent className="max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'עריכת חוק' : 'חוק אוטומציה חדש'}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSave} className="space-y-4 mt-2">
              {/* Campaign */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">קמפיין</label>
                <select
                  value={form.campaign_id}
                  onChange={(e) => set('campaign_id', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  required
                >
                  <option value="">בחר קמפיין...</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              {/* Trigger */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">טריגר</label>
                <select
                  value={form.trigger_event}
                  onChange={(e) => set('trigger_event', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Delay */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">עיכוב שליחה (דקות)</label>
                <input
                  type="number"
                  value={form.delay_minutes}
                  onChange={(e) => set('delay_minutes', e.target.value)}
                  min="0"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  dir="ltr"
                />
                <p className="text-xs text-gray-400">0 = שליחה מיידית</p>
              </div>

              {/* Template */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">תבנית הודעה</label>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {(TRIGGER_VARS[form.trigger_event] || []).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVar(v)}
                      className="text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 hover:bg-blue-100 font-mono"
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <textarea
                  value={form.template}
                  onChange={(e) => set('template', e.target.value)}
                  rows={4}
                  placeholder={
                    form.trigger_event === 'donation_completed'
                      ? 'שלום {{שם}}, תרומתך בסך ₪{{סכום}} התקבלה בהצלחה! תודה רבה.'
                      : 'שלום {{שם}}, יש ליד חדש לטיפולך.'
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="text-xs text-gray-400">
                  {form.template.length}/160 תווים
                  {form.template.length > 160 && ' — תישלח כ-2 SMS'}
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? 'שומר...' : editingRule ? 'שמור שינויים' : 'צור חוק'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  ביטול
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Manual send */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">שליחה ידנית</CardTitle>
          <p className="text-xs text-gray-400 mt-0.5">שלח SMS למספר אחד או לכמה מספרים בבת אחת</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">נמענים (מספרי טלפון)</label>
            <textarea
              value={manual.phones}
              onChange={e => setManual(m => ({ ...m, phones: e.target.value }))}
              rows={2} dir="ltr"
              placeholder="0501234567, 0521234567 ..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-400">הפרד בפסיק / רווח / שורה חדשה — אפשר להדביק כמה מספרים יחד.</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">הודעה</label>
            <textarea
              value={manual.message}
              onChange={e => setManual(m => ({ ...m, message: e.target.value }))}
              rows={3}
              placeholder="תוכן ההודעה..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-400">{manual.message.length} תווים</p>
          </div>
          {manualResult && (
            <div className="text-sm text-center bg-gray-50 border border-gray-100 rounded-lg py-2">{manualResult}</div>
          )}
          <Button onClick={handleManualSend} disabled={manualSending} className="w-full">
            {manualSending ? 'שולח...' : 'שלח SMS'}
          </Button>
        </CardContent>
      </Card>

      {/* Rules list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">חוקי אוטומציה</CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <div className="text-3xl mb-2"></div>
              <p className="text-sm">אין חוקים עדיין — צור את הראשון</p>
            </div>
          )}
          <div className="space-y-3">
            {rules.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-3 p-4 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800">
                      {TRIGGER_LABELS[r.trigger_event] || r.trigger_event}
                    </span>
                    {r.delay_minutes > 0 && (
                      <span className="text-xs text-gray-400">אחרי {r.delay_minutes} דק׳</span>
                    )}
                    <Badge variant={r.is_active ? 'default' : 'secondary'} className="text-xs">
                      {r.is_active ? 'פעיל' : 'כבוי'}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500 mb-1">
                    {(r as { campaigns?: { title: string } | null }).campaigns?.title || 'קמפיין לא ידוע'}
                  </div>
                  <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-2 py-1 font-mono truncate">
                    {r.template}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleActive(r)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${r.is_active ? 'bg-blue-500' : 'bg-gray-200'}`}
                    title={r.is_active ? 'כבה' : 'הפעל'}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${r.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                  <button
                    onClick={() => openEdit(r)}
                    className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50"
                  >
                    עריכה
                  </button>
                  <button
                    onClick={() => deleteRule(r.id)}
                    className="text-xs text-gray-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50"
                  >
                    מחק
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SMS Log */}
      <Card>
        <CardHeader><CardTitle className="text-base">לוג SMS (20 אחרונות)</CardTitle></CardHeader>
        <CardContent>
          {logs.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">אין הודעות</p>
          )}
          <div className="divide-y divide-gray-50">
            {logs.map((l) => (
              <div key={l.id} className="py-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono text-gray-700" dir="ltr">{l.to_phone}</div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">{l.message}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {new Date(l.created_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <Badge variant={l.status === 'sent' || l.status === 'delivered' ? 'default' : 'secondary'} className="text-xs shrink-0">
                  {l.status === 'sent' ? 'נשלח' : l.status === 'delivered' ? 'נמסר' : l.status === 'failed' ? 'נכשל' : l.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
