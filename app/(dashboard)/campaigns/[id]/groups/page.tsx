'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ExternalLink, Pencil, MessageSquare, Send, X, Check, Loader2, ChevronDown, ChevronUp, Trash2, AlertTriangle } from 'lucide-react'
import type { Group } from '@/types'

interface CampaignInfo { slug: string; campaign_slug: string }

// Default welcome SMS sent to whoever opens a group via the public site.
// Placeholders: {שם} = manager name, {קישור} = group link. Keep in sync with app/api/groups/create/route.ts
const DEFAULT_WELCOME_SMS = `שלום {שם}!\nנפתחה קבוצת גיוס עבורך.\nהקישור שלך:\n{קישור}`

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ group, onClose, onSaved }: { group: Group; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: group.name,
    slug: group.slug,
    goal_amount: String(group.goal_amount || ''),
    manager_name: group.manager_name || '',
    manager_phone: group.manager_phone || '',
  })
  const [saving, setSaving] = useState(false)
  const [slugError, setSlugError] = useState('')

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSlugError('')
    // clean the slug → url-safe (latin / numbers / Hebrew / dash)
    const slug = form.slug.trim().toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9֐-׿-]/g, '')
      .replace(/^-+|-+$/g, '')
    if (!slug) { setSlugError('יש להזין כתובת (slug) תקינה'); return }

    setSaving(true)
    const supabase = createClient()

    // make sure the slug is free within this campaign (excluding this group)
    const { data: taken } = await supabase
      .from('groups').select('id')
      .eq('campaign_id', group.campaign_id).eq('slug', slug).neq('id', group.id)
      .maybeSingle()
    if (taken) { setSlugError('הכתובת (slug) כבר תפוסה בקמפיין — בחר אחרת'); setSaving(false); return }

    const { error } = await supabase.from('groups').update({
      name: form.name,
      slug,
      goal_amount: Number(form.goal_amount) || 0,
      manager_name: form.manager_name || null,
      manager_phone: form.manager_phone || null,
    }).eq('id', group.id)
    setSaving(false)
    if (error) { setSlugError(error.message); return }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()} dir="rtl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900 text-lg">עריכת קבוצה</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>שם הקבוצה</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>כתובת (slug)</Label>
              <Input value={form.slug} onChange={e => { set('slug', e.target.value); setSlugError('') }} dir="ltr" required />
            </div>
          </div>
          {slugError && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{slugError}</div>
          )}
          <div className="space-y-1">
            <Label>יעד גיוס (₪)</Label>
            <Input type="number" value={form.goal_amount} onChange={e => set('goal_amount', e.target.value)} dir="ltr" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>ראש קבוצה</Label>
              <Input value={form.manager_name} onChange={e => set('manager_name', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>טלפון</Label>
              <Input type="tel" value={form.manager_phone} onChange={e => set('manager_phone', e.target.value)} dir="ltr" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              שמור
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-medium transition-colors">
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Delete Modal ───────────────────────────────────────────────────────────────
function DeleteModal({ group, onClose, onDeleted }: { group: Group; onClose: () => void; onDeleted: () => void }) {
  const [donationCount, setDonationCount] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('donations').select('id', { count: 'exact', head: true }).eq('group_id', group.id)
      .then(({ count }) => setDonationCount(count ?? 0))
  }, [group.id])

  async function handleDelete() {
    setError('')
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('groups').delete().eq('id', group.id)
    setDeleting(false)
    if (error) { setError(error.message); return }
    onDeleted()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()} dir="rtl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <h2 className="font-bold text-gray-900 text-lg">מחיקת קבוצה</h2>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed">
          האם למחוק את הקבוצה <span className="font-semibold text-gray-900">"{group.name}"</span>? פעולה זו אינה הפיכה.
        </p>

        {donationCount === null ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> בודק תרומות מקושרות...
          </div>
        ) : donationCount > 0 ? (
          <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
            לקבוצה זו מקושרות <span className="font-semibold">{donationCount}</span> תרומות. התרומות יישמרו בקמפיין אך לא ישויכו יותר לקבוצה.
          </div>
        ) : (
          <div className="mt-3 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
            אין תרומות מקושרות לקבוצה זו.
          </div>
        )}

        {error && (
          <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
        )}

        <div className="flex gap-2 pt-5">
          <button onClick={handleDelete} disabled={deleting}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {deleting ? 'מוחק...' : 'מחק קבוצה'}
          </button>
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-medium transition-colors">
            ביטול
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Bulk SMS Modal ───────────────────────────────────────────────────────────
function BulkSmsModal({ groups, campaignInfo, onClose }: {
  groups: Group[]
  campaignInfo: CampaignInfo | null
  onClose: () => void
}) {
  const withPhone = groups.filter(g => g.manager_phone)
  const defaultMsg = `שלום {שם},\nהקישור לדף הקבוצה שלך:\n{קישור}\n\nבהצלחה!`
  const [template, setTemplate] = useState(defaultMsg)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; total: number } | null>(null)
  const [previewGroup, setPreviewGroup] = useState<Group | null>(withPhone[0] || null)

  function groupLink(g: Group) {
    return `https://kafool.com/${campaignInfo?.campaign_slug}/g/${g.slug}`
  }

  function renderPreview(g: Group) {
    return template
      .replaceAll('{שם}', g.manager_name || g.name)
      .replaceAll('{קישור}', groupLink(g))
  }

  async function handleSend() {
    setSending(true)
    // Build personalized messages per group
    const results = await Promise.all(withPhone.map(async g => {
      const msg = template
        .replaceAll('{שם}', g.manager_name || g.name)
        .replaceAll('{קישור}', groupLink(g))
      const res = await fetch('/api/groups/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupIds: [g.id], message: msg }),
      })
      return res.json()
    }))
    const sent = results.filter(r => r.ok && r.sent > 0).length
    setResult({ sent, total: withPhone.length })
    setSending(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()} dir="rtl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">שליחת SMS לכל מנהלי הקבוצות</h2>
            <p className="text-xs text-gray-400 mt-0.5">{withPhone.length} מנהלים עם טלפון מתוך {groups.length} קבוצות</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {result ? (
            <div className="text-center py-6 space-y-3">
              <div className="text-5xl">✅</div>
              <p className="font-bold text-gray-900">נשלח!</p>
              <p className="text-sm text-gray-500">{result.sent} מתוך {result.total} הודעות נשלחו בהצלחה</p>
              <button onClick={onClose} className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors">סגור</button>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>טקסט ההודעה</Label>
                <p className="text-[11px] text-gray-400">השתמש ב: <code className="bg-gray-100 px-1 rounded">{'{שם}'}</code> לשם המנהל, <code className="bg-gray-100 px-1 rounded">{'{קישור}'}</code> לקישור הקבוצה</p>
                <textarea
                  value={template}
                  onChange={e => setTemplate(e.target.value)}
                  rows={5}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                />
              </div>

              {previewGroup && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>תצוגה מקדימה</Label>
                    <select
                      value={previewGroup.id}
                      onChange={e => setPreviewGroup(withPhone.find(g => g.id === e.target.value) || null)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none"
                    >
                      {withPhone.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm whitespace-pre-wrap text-gray-700 font-mono text-xs">
                    {renderPreview(previewGroup)}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSend}
                  disabled={sending || withPhone.length === 0}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? 'שולח...' : `שלח ל-${withPhone.length} מנהלים`}
                </button>
                <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-medium transition-colors">
                  ביטול
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── SMS per group ─────────────────────────────────────────────────────────────
function GroupSmsButton({ group, campaignInfo }: { group: Group; campaignInfo: CampaignInfo | null }) {
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState(
    `שלום ${group.manager_name || group.name},\nהקישור לדף הקבוצה שלך:\nhttps://kafool.com/${campaignInfo?.campaign_slug}/g/${group.slug}\n\nבהצלחה!`
  )
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function send() {
    setSending(true)
    await fetch('/api/groups/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupIds: [group.id], message: msg }),
    })
    setSending(false)
    setSent(true)
    setTimeout(() => { setSent(false); setOpen(false) }, 2000)
  }

  if (!group.manager_phone) return (
    <button disabled title="אין טלפון למנהל" className="p-1.5 rounded-lg text-gray-200 cursor-not-allowed">
      <MessageSquare className="w-4 h-4" />
    </button>
  )

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        title="שלח SMS למנהל"
        className={`p-1.5 rounded-lg transition-colors ${open ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100 hover:text-blue-600'}`}
      >
        <MessageSquare className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl z-20 p-3 space-y-2" dir="rtl">
          <p className="text-xs font-semibold text-gray-700">SMS ל{group.manager_name || group.name}</p>
          <textarea
            value={msg}
            onChange={e => setMsg(e.target.value)}
            rows={4}
            className="w-full border border-gray-200 rounded-xl px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
          />
          <button
            onClick={send}
            disabled={sending || sent}
            className="w-full inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-xl transition-colors"
          >
            {sent ? <><Check className="w-3.5 h-3.5" /> נשלח!</> : sending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> שולח...</> : <><Send className="w-3.5 h-3.5" /> שלח</>}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Welcome SMS Modal ──────────────────────────────────────────────────────────
function WelcomeSmsModal({ campaignId, campaignInfo, initialValue, onClose, onSaved }: {
  campaignId: string
  campaignInfo: CampaignInfo | null
  initialValue: string
  onClose: () => void
  onSaved: (value: string) => void
}) {
  const [text, setText] = useState(initialValue || DEFAULT_WELCOME_SMS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const sampleLink = `https://kafool.com/${campaignInfo?.campaign_slug || 'campaign'}/g/123`
  const preview = text.replaceAll('{שם}', 'ראש הקבוצה').replaceAll('{קישור}', sampleLink)

  async function handleSave() {
    setError('')
    setSaving(true)
    const supabase = createClient()
    // Empty → null, so the API falls back to the built-in default.
    const value = text.trim()
    const { error } = await supabase.from('campaigns')
      .update({ group_welcome_sms: value || null }).eq('id', campaignId)
    setSaving(false)
    if (error) { setError(error.message); return }
    onSaved(value)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()} dir="rtl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">הודעת פתיחה לקבוצה</h2>
            <p className="text-xs text-gray-400 mt-0.5">SMS שנשלח אוטומטית למי שמקים קבוצה דרך האתר הציבורי</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label>טקסט ההודעה</Label>
            <p className="text-[11px] text-gray-400">השתמש ב: <code className="bg-gray-100 px-1 rounded">{'{שם}'}</code> לשם ראש הקבוצה, <code className="bg-gray-100 px-1 rounded">{'{קישור}'}</code> לקישור הקבוצה</p>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={5}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label>תצוגה מקדימה</Label>
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm whitespace-pre-wrap text-gray-700 font-mono text-xs">
              {preview}
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              שמור הודעה
            </button>
            <button type="button" onClick={() => setText(DEFAULT_WELCOME_SMS)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-medium transition-colors">
              אפס לברירת מחדל
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function GroupsPage() {
  const params = useParams()
  const campaignId = params.id as string

  const [groups, setGroups] = useState<Group[]>([])
  const [campaignInfo, setCampaignInfo] = useState<CampaignInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editGroup, setEditGroup] = useState<Group | null>(null)
  const [deleteGroup, setDeleteGroup] = useState<Group | null>(null)
  const [bulkSms, setBulkSms] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [welcomeSms, setWelcomeSms] = useState('')
  const [form, setForm] = useState({ name: '', slug: '', goal_amount: '', manager_name: '', manager_phone: '' })

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('groups').select('*').eq('campaign_id', campaignId).order('created_at')
    setGroups(data || [])

    // Get campaign + org slug for group page links
    const { data: campaign } = await supabase.from('campaigns').select('slug, org_id, group_welcome_sms').eq('id', campaignId).single()
    if (campaign) {
      setCampaignInfo({ slug: campaign.slug, campaign_slug: campaign.slug })
      setWelcomeSms(campaign.group_welcome_sms || '')
    }
  }

  useEffect(() => { load() }, [campaignId])

  function set(key: string, value: string) {
    setForm(prev => {
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

  const withPhone = groups.filter(g => g.manager_phone)

  return (
    <div className="max-w-2xl mx-auto space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">קבוצות גיוס</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowWelcome(true)}
            title="ערוך את ההודעה שנשלחת למקים קבוצה דרך האתר"
            className="inline-flex items-center gap-1.5 text-sm font-medium border border-gray-200 hover:border-blue-300 hover:text-blue-600 text-gray-600 px-3 py-2 rounded-xl transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            הודעת פתיחה
          </button>
          {withPhone.length > 0 && (
            <button
              onClick={() => setBulkSms(true)}
              className="inline-flex items-center gap-1.5 text-sm font-medium border border-gray-200 hover:border-blue-300 hover:text-blue-600 text-gray-600 px-3 py-2 rounded-xl transition-colors"
            >
              <Send className="w-4 h-4" />
              SMS לכולם
            </button>
          )}
          <button
            onClick={() => setShowForm(v => !v)}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            + קבוצה חדשה
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
          <h2 className="font-bold text-gray-800">קבוצה חדשה</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>שם הקבוצה</Label>
                <Input value={form.name} onChange={e => set('name', e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Slug</Label>
                <Input value={form.slug} onChange={e => set('slug', e.target.value)} dir="ltr" required />
              </div>
            </div>
            <div className="space-y-1">
              <Label>יעד גיוס (₪)</Label>
              <Input type="number" value={form.goal_amount} onChange={e => set('goal_amount', e.target.value)} dir="ltr" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>ראש קבוצה</Label>
                <Input value={form.manager_name} onChange={e => set('manager_name', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>טלפון</Label>
                <Input type="tel" value={form.manager_phone} onChange={e => set('manager_phone', e.target.value)} dir="ltr" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={loading}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? 'יוצר...' : 'צור קבוצה'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-medium transition-colors">
                ביטול
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Groups list */}
      <div className="space-y-3">
        {groups.length === 0 && (
          <div className="text-center py-14 text-gray-400">
            <p className="text-4xl mb-3">👥</p>
            <p>אין קבוצות עדיין</p>
          </div>
        )}

        {groups.map((g) => {
          const pct = g.goal_amount > 0 ? Math.min(100, Math.round((g.raised_amount / g.goal_amount) * 100)) : 0
          const groupUrl = campaignInfo ? `https://kafool.com/${campaignInfo.campaign_slug}/g/${g.slug}` : null

          return (
            <div key={g.id} className="bg-white border border-gray-200 rounded-2xl p-4 hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900">{g.name}</div>
                  {g.manager_name && (
                    <div className="text-sm text-gray-500 mt-0.5">
                      ראש קבוצה: {g.manager_name}
                      {g.manager_phone && <span className="text-gray-400 mr-2" dir="ltr">{g.manager_phone}</span>}
                    </div>
                  )}
                  {groupUrl && (
                    <a href={groupUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline mt-1">
                      {campaignInfo?.campaign_slug}/g/{g.slug}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <GroupSmsButton group={g} campaignInfo={campaignInfo} />
                  <button
                    onClick={() => setEditGroup(g)}
                    title="ערוך קבוצה"
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteGroup(g)}
                    title="מחק קבוצה"
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {groupUrl && (
                    <a href={groupUrl} target="_blank" rel="noopener noreferrer"
                      title="פתח דף קבוצה"
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">₪{(g.raised_amount || 0).toLocaleString('he-IL')}</span>
                  <span className="font-semibold text-blue-600">₪{(g.goal_amount || 0).toLocaleString('he-IL')} יעד</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="text-[10px] text-gray-400">{pct}%</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Edit modal */}
      {editGroup && (
        <EditModal group={editGroup} onClose={() => setEditGroup(null)} onSaved={load} />
      )}

      {/* Delete modal */}
      {deleteGroup && (
        <DeleteModal group={deleteGroup} onClose={() => setDeleteGroup(null)} onDeleted={load} />
      )}

      {/* Bulk SMS modal */}
      {bulkSms && (
        <BulkSmsModal groups={groups} campaignInfo={campaignInfo} onClose={() => setBulkSms(false)} />
      )}

      {/* Welcome SMS modal */}
      {showWelcome && (
        <WelcomeSmsModal
          campaignId={campaignId}
          campaignInfo={campaignInfo}
          initialValue={welcomeSms}
          onClose={() => setShowWelcome(false)}
          onSaved={setWelcomeSms}
        />
      )}
    </div>
  )
}
