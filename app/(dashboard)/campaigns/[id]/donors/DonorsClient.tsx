'use client'

import { Fragment, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pencil, Trash2, X, Check, Plus, Search, FileSpreadsheet, Upload, Download, ChevronDown, Copy, ClipboardList } from 'lucide-react'

// One parsed row from the uploaded spreadsheet
interface ImportRow {
  amount: number
  donor_name: string | null
  donor_phone: string | null
  donor_email: string | null
  dedication: string | null
  valid: boolean
}

// Find a column value by matching the header against a list of synonyms
function pickCol(row: Record<string, unknown>, synonyms: string[]): string {
  for (const key of Object.keys(row)) {
    const norm = String(key).trim().toLowerCase()
    if (synonyms.some(s => norm.includes(s))) {
      const v = row[key]
      return v == null ? '' : String(v).trim()
    }
  }
  return ''
}

interface Donation {
  id: string
  amount: number
  donor_name: string | null
  donor_phone: string | null
  donor_email: string | null
  dedication: string | null
  payment_status: string
  created_at: string
  kesher_transaction_id: string | null
  group_id: string | null
  payment_type?: string | null
  installments?: number | null
  monthly_amount?: number | null
  custom_data?: Record<string, string> | null
}

const CUR_SYM: Record<string, string> = { usd: '$', eur: '€', gbp: '£' }

// Foreign (Stripe) donations store `amount` in ₪ (for campaign totals) but keep the
// original currency + amount in custom_data. Show the manager the original figure
// (e.g. $50) — matching the public page — with the ₪ equivalent kept as a small note.
function foreignOf(d: { custom_data?: Record<string, string> | null }): { sym: string; amount: number } | null {
  const cur = String(d.custom_data?.stripe_currency || 'ils').toLowerCase()
  const orig = Number(d.custom_data?.stripe_amount) || 0
  if (cur === 'ils' || orig <= 0) return null
  return { sym: CUR_SYM[cur] || cur.toUpperCase() + ' ', amount: orig }
}

// How the donation was paid. Manual donations carry it in custom_data.payment_method;
// online ones (Kesher / Nedarim) are credit-card by default.
const PAYMENT_METHODS = [
  { value: 'credit', label: 'אשראי' },
  { value: 'bit', label: 'ביט' },
  { value: 'transfer', label: 'העברה' },
  { value: 'cash', label: 'מזומן' },
] as const
const METHOD_LABEL: Record<string, string> = { credit: 'אשראי', bit: 'ביט', transfer: 'העברה', cash: 'מזומן' }
function donationMethod(d: { custom_data?: Record<string, string> | null; kesher_transaction_id?: string | null }): string | null {
  const m = d.custom_data?.payment_method
  if (m && METHOD_LABEL[m]) return METHOD_LABEL[m]
  if (d.kesher_transaction_id) return 'אשראי' // online via Kesher/Nedarim = credit card
  return null
}

// Where a donation came in FROM: Stripe (foreign card), Kesher / Nedarim (online
// via the site), or manual (entered by a manager). Stripe donations also carry a
// transaction id, so check the Stripe marker first, then online vs manual.
function donationSource(
  d: { custom_data?: Record<string, string> | null; kesher_transaction_id?: string | null },
  provider: string,
): { label: string; cls: string } {
  if (d.custom_data?.payment_method === 'stripe') return { label: 'סטרייפ', cls: 'bg-indigo-50 text-indigo-700' }
  if (!d.kesher_transaction_id) return { label: 'ידני', cls: 'bg-blue-50 text-blue-700' }
  return provider === 'nedarim'
    ? { label: 'נדרים', cls: 'bg-green-50 text-green-700' }
    : { label: 'קשר', cls: 'bg-green-50 text-green-700' }
}

interface GroupOption { id: string; name: string }
interface PlanOption { amount: number; label: string | null }

interface Campaign {
  id: string
  title: string
  slug: string
  raised_amount: number
  goal_amount: number
  org_id: string
}

export default function DonorsClient({ campaign, donations: initial, groups, plans, paymentProvider = 'kesher' }: { campaign: Campaign; donations: Donation[]; groups: GroupOption[]; plans: PlanOption[]; paymentProvider?: string }) {
  const router = useRouter()
  const [donations, setDonations] = useState(initial)
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState('')   // '' = all groups
  const [sortBy, setSortBy] = useState<'recent' | 'name_asc' | 'name_desc' | 'amount_desc' | 'amount_asc' | 'source'>('recent')
  const [sourceFilter, setSourceFilter] = useState('')   // '' = all sources
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Donation>>({})
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }
  // custom-form values captured at donation time (quantity, shipping, note…), as label→value
  const customEntries = (d: Donation): [string, string][] =>
    Object.entries(d.custom_data && typeof d.custom_data === 'object' ? d.custom_data : {})
      .map(([k, v]) => [k, String(v ?? '')] as [string, string])
      .filter(([, v]) => v.trim() !== '')
  function copyText(text: string) { navigator.clipboard?.writeText(text).catch(() => {}) }
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ amount: '', donor_name: '', donor_phone: '', donor_email: '', dedication: '', group_id: '', payment_type: 'one_time', installments: '', payment_method: 'credit', manager_note: '', anonymous: false })
  const [saving, setSaving] = useState(false)
  const [addError, setAddError] = useState('')

  const [fixingTotals, setFixingTotals] = useState(false)
  const [totalsFixed, setTotalsFixed] = useState(false)

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkGroupId, setBulkGroupId] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)

  // Excel import
  const [showImport, setShowImport] = useState(false)
  const [importRows, setImportRows] = useState<ImportRow[]>([])
  const [importGroupId, setImportGroupId] = useState('')
  const [importFileName, setImportFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const importRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()
  const groupName = (id: string | null) => groups.find(g => g.id === id)?.name || null

  // Distinct sources actually present in this campaign's donations (so the manager
  // sees only the sources that exist, e.g. only "ידני" + "קשר").
  const sourcesPresent = [...new Set(donations.map(d => donationSource(d, paymentProvider).label))].sort((a, b) => a.localeCompare(b, 'he'))

  const filtered = donations.filter(d =>
    (!groupFilter || (groupFilter === '__none__' ? !d.group_id : d.group_id === groupFilter)) &&
    (!sourceFilter || donationSource(d, paymentProvider).label === sourceFilter) &&
    (!search ||
      d.donor_name?.includes(search) ||
      d.donor_phone?.includes(search) ||
      d.donor_email?.includes(search) ||
      String(d.amount).includes(search))
  )

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'name_asc': return (a.donor_name || '').localeCompare(b.donor_name || '', 'he')
      case 'name_desc': return (b.donor_name || '').localeCompare(a.donor_name || '', 'he')
      case 'amount_desc': return (b.amount || 0) - (a.amount || 0)
      case 'amount_asc': return (a.amount || 0) - (b.amount || 0)
      case 'source': {
        // group by source (Kesher / Nedarim / Stripe / Manual), then newest first within each
        const s = donationSource(a, paymentProvider).label.localeCompare(donationSource(b, paymentProvider).label, 'he')
        return s !== 0 ? s : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime() // recent
    }
  })

  const total = donations.reduce((s, d) => s + (d.amount || 0), 0)
  // Online = paid through the site (has a Kesher transaction); manual = entered by hand
  const onlineTotal = donations.reduce((s, d) => s + (d.kesher_transaction_id ? (d.amount || 0) : 0), 0)
  const manualTotal = total - onlineTotal

  // Does the campaign's stored raised_amount drift from the real donations sum?
  const realRaised = donations.reduce((s, d) => s + (d.payment_status === 'completed' ? (d.amount || 0) : 0), 0)
  const totalsMismatch = !totalsFixed && Math.round(realRaised) !== Math.round(campaign.raised_amount || 0)

  // ── Export all donors to an Excel file ──
  async function exportExcel() {
    const XLSX = await import('xlsx')
    const groupName = (gid: string | null) => groups.find(g => g.id === gid)?.name || ''
    const rows = sorted.map(d => ({
      'שם': d.donor_name || '',
      'טלפון': d.donor_phone || '',
      'אימייל': d.donor_email || '',
      'סכום (₪)': d.amount || 0,
      'מטבע מקורי': foreignOf(d) ? String(d.custom_data?.stripe_currency).toUpperCase() : 'ILS',
      'סכום מקורי': foreignOf(d)?.amount ?? (d.amount || 0),
      'סוג תשלום': d.payment_type === 'hok' ? 'הוראת קבע' : 'חד״פ',
      'תשלומים': d.payment_type === 'hok' ? (d.installments ?? '') : '',
      'סכום חודשי (₪)': d.payment_type === 'hok' ? (d.monthly_amount ?? '') : '',
      'קבוצה': groupName(d.group_id),
      'הקדשה': d.dedication || '',
      'סטטוס': d.payment_status === 'completed' ? 'הושלם' : d.payment_status,
      'אמצעי תשלום': donationMethod(d) || '',
      'מקור': donationSource(d, paymentProvider).label,
      'מזהה עסקה': d.kesher_transaction_id || '',
      'תאריך': new Date(d.created_at).toLocaleString('he-IL'),
      // custom-form fields (shipping etc.) become their own columns, keyed by label
      ...(d.custom_data && typeof d.custom_data === 'object' ? d.custom_data : {}),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'תורמים')
    const safe = (campaign.title || 'תורמים').replace(/[\\/:*?"<>|]/g, '_')
    XLSX.writeFile(wb, `תורמים - ${safe}.xlsx`)
  }

  async function fixTotals() {
    setFixingTotals(true)
    const allGroups = donations.map(d => d.group_id).filter(Boolean) as string[]
    await syncTotals(donations, allGroups)
    setFixingTotals(false)
    setTotalsFixed(true)
    router.refresh()
  }

  // ── עריכה ──
  function startEdit(d: Donation) {
    setEditId(d.id)
    const isHok = d.payment_type === 'hok'
    setEditForm({
      donor_name: d.donor_name || '', donor_phone: d.donor_phone || '', donor_email: d.donor_email || '',
      dedication: d.dedication || '', group_id: d.group_id,
      payment_type: isHok ? 'hok' : 'one_time',
      installments: d.installments ?? null,
      // the amount field holds the MONTHLY amount when it's a הו"ק, else the full amount
      amount: isHok ? (d.monthly_amount ?? d.amount) : d.amount,
      custom_data: { ...(d.custom_data || {}), payment_method: d.custom_data?.payment_method || (d.kesher_transaction_id ? 'credit' : 'transfer') },
    })
  }

  async function saveEdit() {
    if (!editId) return
    setSaving(true)
    const original = donations.find(d => d.id === editId)
    const newGroupId = editForm.group_id || null
    // For a הו"ק the edited amount is the MONTHLY amount; store the full total.
    const isHok = editForm.payment_type === 'hok'
    const months = isHok ? (Number(editForm.installments) || 0) : 0
    const inputAmount = Number(editForm.amount) || 0
    const newAmount = isHok && months > 0 ? inputAmount * months : inputAmount
    const newType = isHok ? 'hok' : 'one_time'
    const newInstallments = isHok && months > 0 ? months : null
    const newMonthly = isHok ? inputAmount : null
    const { error } = await supabase.from('donations').update({
      donor_name: editForm.donor_name || null,
      donor_phone: editForm.donor_phone || null,
      donor_email: editForm.donor_email || null,
      dedication: editForm.dedication || null,
      amount: newAmount,
      group_id: newGroupId,
      payment_type: newType,
      installments: newInstallments,
      monthly_amount: newMonthly,
      custom_data: { ...(original?.custom_data || {}), ...(editForm.custom_data || {}), payment_method: editForm.custom_data?.payment_method || 'credit' },
    }).eq('id', editId)
    if (!error) {
      const next = donations.map(d => d.id === editId ? { ...d, ...editForm, amount: newAmount, group_id: newGroupId, payment_type: newType, installments: newInstallments, monthly_amount: newMonthly } : d)
      setDonations(next)
      const affected = [original?.group_id, newGroupId].filter(Boolean) as string[]
      await syncTotals(next, affected)
      setEditId(null)
    }
    setSaving(false)
  }

  // Quick inline toggle: hide the donor's name on the PUBLIC page (shows "אנונימי")
  // while the manager keeps seeing the real name here.
  const isAnon = (d: Donation) => d.custom_data?.anonymous === 'true'
  async function toggleAnonymous(d: Donation) {
    const next = !isAnon(d)
    const cd = { ...(d.custom_data || {}), anonymous: next ? 'true' : '' }
    setDonations(ds => ds.map(x => x.id === d.id ? { ...x, custom_data: cd } : x))
    await supabase.from('donations').update({ custom_data: cd }).eq('id', d.id)
    fetch('/api/revalidate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: campaign.slug }) }).catch(() => {})
  }

  // ── חישוב סכום אמיתי (לא צובר טעויות) ──
  // raised_amount = סכום כל התרומות שהושלמו. כך מחיקה/עריכה אף פעם לא יוצרות מינוס.
  function sumCompleted(list: Donation[]) {
    return list.reduce((s, d) => s + (d.payment_status === 'completed' ? (d.amount || 0) : 0), 0)
  }
  async function syncTotals(next: Donation[], affectedGroupIds: Iterable<string>) {
    await supabase.from('campaigns').update({ raised_amount: sumCompleted(next) }).eq('id', campaign.id)
    const seen = new Set<string>()
    for (const gid of affectedGroupIds) {
      if (!gid || seen.has(gid)) continue
      seen.add(gid)
      const gSum = sumCompleted(next.filter(d => d.group_id === gid))
      await supabase.from('groups').update({ raised_amount: gSum }).eq('id', gid)
    }
    // רענון מיידי של הדף הציבורי (אחרת הסכום מתעדכן רק אחרי מטמון ה-ISR)
    fetch('/api/revalidate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: campaign.slug }) }).catch(() => {})
  }

  // ── מחיקה ──
  async function deleteDonation(id: string, groupId: string | null) {
    if (!confirm('למחוק תרומה זו?')) return
    // .select() מחזיר את השורות שנמחקו בפועל — כדי לזהות חסימת RLS (0 שורות)
    const { data, error } = await supabase.from('donations').delete().eq('id', id).select('id')
    if (error) { alert('מחיקה נכשלה: ' + error.message); return }
    if (!data || data.length === 0) {
      alert('המחיקה לא בוצעה (הרשאה חסרה). יש להריץ את add_donations_delete_policy.sql ב-Supabase.')
      return
    }
    const next = donations.filter(d => d.id !== id)
    setDonations(next)
    await syncTotals(next, groupId ? [groupId] : [])
    setSelected(s => { const n = new Set(s); n.delete(id); return n })
  }

  // ── בחירה מרובה ──
  function toggleSelect(id: string) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function clearSelection() { setSelected(new Set()) }

  async function bulkDelete() {
    const ids = [...selected]
    if (ids.length === 0) return
    if (!confirm(`למחוק ${ids.length} תרומות?`)) return
    setBulkBusy(true)
    const rows = donations.filter(d => selected.has(d.id))
    const { data, error } = await supabase.from('donations').delete().in('id', ids).select('id')
    if (error) { alert('מחיקה נכשלה: ' + error.message); setBulkBusy(false); return }
    if (!data || data.length === 0) {
      alert('המחיקה לא בוצעה (הרשאה חסרה). יש להריץ את add_donations_delete_policy.sql ב-Supabase.')
      setBulkBusy(false); return
    }
    const deletedIds = new Set(data.map(r => r.id))
    const affected = rows.filter(r => deletedIds.has(r.id)).map(r => r.group_id).filter(Boolean) as string[]
    const next = donations.filter(d => !deletedIds.has(d.id))
    setDonations(next)
    await syncTotals(next, affected)
    clearSelection()
    setBulkBusy(false)
    router.refresh()
  }

  async function bulkAssignGroup() {
    const ids = [...selected]
    if (ids.length === 0) return
    const newGroupId = bulkGroupId || null
    setBulkBusy(true)
    const rows = donations.filter(d => selected.has(d.id))
    const { error } = await supabase.from('donations').update({ group_id: newGroupId }).in('id', ids)
    if (error) { alert('השיוך נכשל: ' + error.message); setBulkBusy(false); return }
    const affected = new Set<string>()
    for (const r of rows) { if (r.group_id) affected.add(r.group_id) }
    if (newGroupId) affected.add(newGroupId)
    const next = donations.map(d => selected.has(d.id) ? { ...d, group_id: newGroupId } : d)
    setDonations(next)
    await syncTotals(next, affected)
    clearSelection()
    setBulkGroupId('')
    setBulkBusy(false)
    router.refresh()
  }

  // ── הוספה ידנית ──
  async function addDonation() {
    const inputAmount = Number(addForm.amount)
    if (!inputAmount) { setAddError('יש להזין סכום'); return }
    setSaving(true)
    setAddError('')
    // For a הו"ק the entered amount is the MONTHLY amount; we store the full total.
    const isHok = addForm.payment_type === 'hok'
    const months = isHok ? (Number(addForm.installments) || 0) : 0
    const amount = isHok && months > 0 ? inputAmount * months : inputAmount
    const { data, error } = await supabase.from('donations').insert({
      campaign_id: campaign.id,
      org_id: campaign.org_id, // ← היה undefined (הבאג): org_id הוא NOT NULL
      amount,
      donor_name: addForm.donor_name || null,
      donor_phone: addForm.donor_phone || null,
      donor_email: addForm.donor_email || null,
      dedication: addForm.dedication || null,
      group_id: addForm.group_id || null,
      payment_status: 'completed',
      payment_type: isHok ? 'hok' : 'one_time',
      installments: isHok && months > 0 ? months : null,
      monthly_amount: isHok ? inputAmount : null,
      custom_data: { payment_method: addForm.payment_method, ...(addForm.anonymous ? { anonymous: 'true' } : {}), ...(addForm.manager_note.trim() ? { manager_note: addForm.manager_note.trim() } : {}) },
    }).select().single()
    if (error || !data) {
      setAddError(error?.message || 'הוספת התרומה נכשלה')
      setSaving(false)
      return
    }
    const next = [data, ...donations]
    setDonations(next)
    await syncTotals(next, addForm.group_id ? [addForm.group_id] : [])
    setAddForm({ amount: '', donor_name: '', donor_phone: '', donor_email: '', dedication: '', group_id: '', payment_type: 'one_time', installments: '', payment_method: 'credit', manager_note: '', anonymous: false })
    setShowAdd(false)
    setSaving(false)
    router.refresh()
  }

  // ── ייבוא מאקסל ──
  async function parseImportFile(file: File) {
    setImportError('')
    setImportFileName(file.name)
    try {
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
      const rows: ImportRow[] = raw.map(r => {
        const amount = Number(pickCol(r, ['סכום', 'amount', 'sum', 'תרומה', 'שקל']).replace(/[^\d.]/g, ''))
        // Combine separate first/last-name columns when present; otherwise a single name column
        const firstName = pickCol(r, ['שם פרטי', 'פרטי', 'first'])
        const lastName = pickCol(r, ['שם משפחה', 'משפחה', 'last'])
        const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()
        return {
          amount: amount || 0,
          donor_name: fullName || pickCol(r, ['שם', 'name', 'תורם', 'donor']) || null,
          donor_phone: pickCol(r, ['טלפון', 'נייד', 'פלא', 'phone', 'tel', 'mobile']) || null,
          donor_email: pickCol(r, ['אימייל', 'מייל', 'דוא', 'email', 'mail']) || null,
          dedication: pickCol(r, ['הקדשה', 'dedication', 'לעילוי', 'הערה', 'note']) || null,
          valid: !!amount && amount > 0,
        }
      })
      if (rows.length === 0) { setImportError('הקובץ ריק או לא נקרא'); return }
      setImportRows(rows)
    } catch (e) {
      setImportError('קריאת הקובץ נכשלה. ודא שזה קובץ Excel/CSV תקין.')
      console.error(e)
    }
  }

  async function runImport() {
    const valid = importRows.filter(r => r.valid)
    if (valid.length === 0) { setImportError('אין שורות תקינות לייבוא (חסר סכום)'); return }
    setImporting(true)
    setImportError('')
    const groupId = importGroupId || null
    const payload = valid.map(r => ({
      campaign_id: campaign.id,
      org_id: campaign.org_id,
      amount: r.amount,
      donor_name: r.donor_name,
      donor_phone: r.donor_phone,
      donor_email: r.donor_email,
      dedication: r.dedication,
      group_id: groupId,
      payment_status: 'completed',
    }))
    const { data, error } = await supabase.from('donations').insert(payload).select()
    if (error || !data) {
      setImportError(error?.message || 'הייבוא נכשל')
      setImporting(false)
      return
    }
    const next = [...data, ...donations]
    setDonations(next)
    await syncTotals(next, groupId ? [groupId] : [])
    setImportRows([])
    setImportFileName('')
    setImportGroupId('')
    setShowImport(false)
    setImporting(false)
    router.refresh()
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">תורמים</h1>
          <p className="text-sm text-gray-500 mt-0.5">{campaign.title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={exportExcel} disabled={sorted.length === 0} title="מייצא לפי הסינון הנוכחי" className="gap-2">
            <Download className="w-4 h-4" />
            ייצוא לאקסל
          </Button>
          <Button variant="outline" onClick={() => { setShowImport(true); setShowAdd(false) }} className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            ייבוא מאקסל
          </Button>
          <Button onClick={() => { setShowAdd(true); setShowImport(false) }} className="gap-2">
            <Plus className="w-4 h-4" />
            הוסף תרומה ידנית
          </Button>
        </div>
      </div>

      {/* Totals mismatch warning + one-click fix */}
      {totalsMismatch && (
        <div className="flex flex-wrap items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <span className="text-sm text-amber-800">
            הסכום המוצג בקמפיין (₪{Math.round(campaign.raised_amount || 0).toLocaleString()}) אינו תואם לסכום התרומות בפועל (₪{Math.round(realRaised).toLocaleString()}).
          </span>
          <button onClick={fixTotals} disabled={fixingTotals}
            className="mr-auto px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-semibold">
            {fixingTotals ? 'מתקן...' : 'תקן סכום'}
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'סה"כ גויס', val: `₪${total.toLocaleString()}`, accent: 'text-gray-900' },
          { label: 'נכנס באתר', val: `₪${onlineTotal.toLocaleString()}`, accent: 'text-green-600' },
          { label: 'נכנס ידני', val: `₪${manualTotal.toLocaleString()}`, accent: 'text-blue-600' },
          { label: 'סה"כ תורמים', val: donations.length, accent: 'text-gray-900' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
            <div className={`text-2xl font-black ${s.accent}`}>{s.val}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search + group filter + sort */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[12rem]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם, טלפון, אימייל..."
            className="pr-9"
          />
        </div>
        {groups.length > 0 && (
          <select
            value={groupFilter}
            onChange={e => setGroupFilter(e.target.value)}
            aria-label="סינון לפי קבוצה"
            className="shrink-0 h-10 border border-gray-200 rounded-md px-3 text-sm bg-white outline-none cursor-pointer focus:ring-2 focus:ring-blue-400"
          >
            <option value="">כל הקבוצות</option>
            <option value="__none__">ללא קבוצה</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
        <select
          value={sortBy}
          onChange={e => { const v = e.target.value as typeof sortBy; setSortBy(v); if (v !== 'source') setSourceFilter('') }}
          aria-label="מיון תורמים"
          className="shrink-0 h-10 border border-gray-200 rounded-md px-3 text-sm bg-white outline-none cursor-pointer focus:ring-2 focus:ring-blue-400"
        >
          <option value="recent">לפי זמן (אחרונים)</option>
          <option value="name_asc">שם: א → ת</option>
          <option value="name_desc">שם: ת → א</option>
          <option value="amount_desc">סכום: גבוה → נמוך</option>
          <option value="amount_asc">סכום: נמוך → גבוה</option>
          <option value="source">לפי מקור התרומה</option>
        </select>
        {sortBy === 'source' && (
          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            aria-label="סינון לפי מקור"
            className="shrink-0 h-10 border border-gray-200 rounded-md px-3 text-sm bg-white outline-none cursor-pointer focus:ring-2 focus:ring-blue-400"
          >
            <option value="">כל המקורות</option>
            {sourcesPresent.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-blue-900">הוספת תרומה ידנית</h3>
            <button onClick={() => setShowAdd(false)}><X className="w-4 h-4 text-blue-400" /></button>
          </div>

          {plans.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">מסלולי תרומה</Label>
              <div className="flex flex-wrap gap-2">
                {plans.map((p, i) => {
                  const active = addForm.amount === String(p.amount)
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAddForm(f => ({ ...f, amount: String(p.amount) }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200 hover:border-blue-400'}`}
                    >
                      ₪{p.amount.toLocaleString()}{p.label ? ` · ${p.label}` : ''}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{addForm.payment_type === 'hok' ? 'סכום חודשי (₪) *' : 'סכום (₪) *'}</Label>
              <Input type="number" value={addForm.amount} onChange={e => setAddForm(f => ({ ...f, amount: e.target.value }))} placeholder="180" />
              {addForm.payment_type === 'hok' && Number(addForm.amount) > 0 && Number(addForm.installments) > 0 && (
                <p className="text-[11px] text-gray-400">סה״כ ₪{(Number(addForm.amount) * Number(addForm.installments)).toLocaleString()}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">סוג תרומה</Label>
              <div className="flex gap-2">
                <select
                  value={addForm.payment_type}
                  onChange={e => setAddForm(f => ({ ...f, payment_type: e.target.value }))}
                  className="flex-1 h-9 border border-gray-200 rounded-md px-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="one_time">חד״פ</option>
                  <option value="hok">הו״ק</option>
                </select>
                {addForm.payment_type === 'hok' && (
                  <Input type="number" min="1" value={addForm.installments} onChange={e => setAddForm(f => ({ ...f, installments: e.target.value }))} placeholder="חודשים" className="w-24" dir="ltr" />
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">אופן תשלום</Label>
              <select
                value={addForm.payment_method}
                onChange={e => setAddForm(f => ({ ...f, payment_method: e.target.value }))}
                className="w-full h-9 border border-gray-200 rounded-md px-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-400"
              >
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">שם תורם</Label>
              <Input value={addForm.donor_name} onChange={e => setAddForm(f => ({ ...f, donor_name: e.target.value }))} />
              <label className="flex items-center gap-1.5 pt-1 cursor-pointer text-xs text-gray-600">
                <input type="checkbox" checked={addForm.anonymous} onChange={e => setAddForm(f => ({ ...f, anonymous: e.target.checked }))} className="w-3.5 h-3.5 accent-blue-600" />
                תרומה אנונימית (השם לא יוצג בדף הציבורי)
              </label>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">טלפון</Label>
              <Input value={addForm.donor_phone} onChange={e => setAddForm(f => ({ ...f, donor_phone: e.target.value }))} dir="ltr" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">אימייל</Label>
              <Input type="email" value={addForm.donor_email} onChange={e => setAddForm(f => ({ ...f, donor_email: e.target.value }))} dir="ltr" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">הקדשה</Label>
              <Input value={addForm.dedication} onChange={e => setAddForm(f => ({ ...f, dedication: e.target.value }))} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">הערה פנימית (לא מתפרסם בחוץ)</Label>
              <Input value={addForm.manager_note} onChange={e => setAddForm(f => ({ ...f, manager_note: e.target.value }))} placeholder="לעיני המנהל בלבד" />
            </div>
            {groups.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">שיוך לקבוצה</Label>
                <select
                  value={addForm.group_id}
                  onChange={e => setAddForm(f => ({ ...f, group_id: e.target.value }))}
                  className="w-full h-9 border border-gray-200 rounded-md px-3 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">ללא קבוצה</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            )}
          </div>
          {addError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-center">{addError}</div>
          )}
          <Button onClick={addDonation} disabled={saving || !addForm.amount} className="w-full">
            {saving ? 'שומר...' : 'הוסף תרומה'}
          </Button>
        </div>
      )}

      {/* Import from Excel */}
      {showImport && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-emerald-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" /> ייבוא תורמים מאקסל
            </h3>
            <button onClick={() => { setShowImport(false); setImportRows([]); setImportFileName(''); setImportError('') }}>
              <X className="w-4 h-4 text-emerald-400" />
            </button>
          </div>

          <p className="text-xs text-emerald-700 leading-relaxed">
            העלה קובץ Excel / CSV. השורה הראשונה צריכה להיות כותרות. נזהה אוטומטית את העמודות:
            <strong> סכום</strong> (חובה), שם, טלפון, אימייל, הקדשה.
          </p>

          {/* File picker */}
          <div
            onClick={() => importRef.current?.click()}
            className="cursor-pointer rounded-xl border-2 border-dashed border-emerald-300 bg-white hover:bg-emerald-50/50 transition-colors px-4 py-6 flex flex-col items-center justify-center text-center"
          >
            <Upload className="w-6 h-6 text-emerald-400 mb-2" />
            <p className="text-sm font-medium text-emerald-800">{importFileName || 'גרור קובץ או לחץ לבחירה'}</p>
            <p className="text-[11px] text-emerald-500 mt-0.5">.xlsx · .xls · .csv</p>
            <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) parseImportFile(f); e.target.value = '' }} />
          </div>

          {importError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-center">{importError}</div>
          )}

          {/* Preview */}
          {importRows.length > 0 && (() => {
            const validRows = importRows.filter(r => r.valid)
            const invalid = importRows.length - validRows.length
            const sum = validRows.reduce((s, r) => s + r.amount, 0)
            return (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="bg-white border border-emerald-200 rounded-full px-2.5 py-1 font-semibold text-emerald-700">{validRows.length} שורות תקינות</span>
                  {invalid > 0 && <span className="bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 font-semibold text-amber-700">{invalid} ידולגו (חסר סכום)</span>}
                  <span className="bg-white border border-emerald-200 rounded-full px-2.5 py-1 font-semibold text-emerald-700">סה"כ ₪{sum.toLocaleString()}</span>
                </div>

                {groups.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs">שיוך כל הרשימה לקבוצה (אופציונלי)</Label>
                    <select
                      value={importGroupId}
                      onChange={e => setImportGroupId(e.target.value)}
                      className="w-full h-9 border border-gray-200 rounded-md px-3 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-400"
                    >
                      <option value="">ללא קבוצה</option>
                      {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                )}

                <div className="bg-white rounded-lg border border-emerald-100 overflow-x-auto max-h-56 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-emerald-50/70 sticky top-0">
                      <tr>{['שם', 'טלפון', 'אימייל', 'הקדשה', 'סכום'].map(h => (
                        <th key={h} className="text-right px-3 py-2 font-semibold text-emerald-700">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {importRows.slice(0, 50).map((r, i) => (
                        <tr key={i} className={r.valid ? '' : 'opacity-40'}>
                          <td className="px-3 py-1.5">{r.donor_name || <span className="text-gray-300">—</span>}</td>
                          <td className="px-3 py-1.5" dir="ltr">{r.donor_phone || '—'}</td>
                          <td className="px-3 py-1.5" dir="ltr">{r.donor_email || '—'}</td>
                          <td className="px-3 py-1.5 max-w-[120px] truncate">{r.dedication || '—'}</td>
                          <td className="px-3 py-1.5 font-bold">{r.valid ? `₪${r.amount.toLocaleString()}` : <span className="text-red-400">חסר</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {importRows.length > 50 && <p className="text-[11px] text-emerald-600 text-center">מציג 50 שורות ראשונות מתוך {importRows.length}</p>}

                <Button onClick={runImport} disabled={importing || validRows.length === 0} className="w-full bg-emerald-600 hover:bg-emerald-700">
                  {importing ? 'מייבא...' : `ייבא ${validRows.length} תרומות (₪${sum.toLocaleString()})`}
                </Button>
              </div>
            )
          })()}
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2.5 shadow-lg">
          <span className="font-bold text-sm">{selected.size} נבחרו</span>
          <div className="flex-1" />
          {groups.length > 0 && (
            <div className="flex items-center gap-1.5">
              <select
                value={bulkGroupId}
                onChange={e => setBulkGroupId(e.target.value)}
                aria-label="בחר קבוצה לשיוך"
                className="h-8 rounded-lg px-2 text-sm text-gray-800 bg-white outline-none"
              >
                <option value="">ללא קבוצה</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <button onClick={bulkAssignGroup} disabled={bulkBusy}
                className="h-8 px-3 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-semibold disabled:opacity-50">
                שייך לקבוצה
              </button>
            </div>
          )}
          <button onClick={bulkDelete} disabled={bulkBusy}
            className="h-8 px-3 rounded-lg bg-red-500 hover:bg-red-600 text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">
            <Trash2 className="w-4 h-4" /> מחק
          </button>
          <button onClick={clearSelection} disabled={bulkBusy}
            className="h-8 px-3 rounded-lg hover:bg-white/20 text-sm font-medium">
            נקה
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {sorted.length === 0 ? (
          <div className="text-center py-12 text-gray-400">אין תרומות להצגה</div>
        ) : (
          <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    aria-label="בחר הכל"
                    className="w-4 h-4 cursor-pointer accent-blue-600"
                    checked={sorted.length > 0 && sorted.every(d => selected.has(d.id))}
                    onChange={e => setSelected(e.target.checked ? new Set(sorted.map(d => d.id)) : new Set())}
                  />
                </th>
                {['תאריך', 'שם', 'טלפון', 'סכום', 'סוג', 'אמצעי', 'הקדשה', 'מקור', 'סטטוס', ''].map(h => (
                  <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map(d => (
                <Fragment key={d.id}>
                <tr className={`transition-colors ${selected.has(d.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                  {editId === d.id ? (
                    // ── שורת עריכה ──
                    <>
                      <td className="px-4 py-2 w-10">
                        <input type="checkbox" className="w-4 h-4 cursor-pointer accent-blue-600" checked={selected.has(d.id)} onChange={() => toggleSelect(d.id)} />
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-400">
                        {new Date(d.created_at).toLocaleDateString('he-IL')}
                        <span className="block text-[11px] text-gray-300">{new Date(d.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="px-4 py-2">
                        <Input value={editForm.donor_name || ''} onChange={e => setEditForm(f => ({ ...f, donor_name: e.target.value }))} className="h-7 text-xs" />
                        {groups.length > 0 && (
                          <select
                            value={editForm.group_id || ''}
                            onChange={e => setEditForm(f => ({ ...f, group_id: e.target.value || null }))}
                            aria-label="שיוך לקבוצה"
                            className="mt-1 w-full h-7 border border-gray-200 rounded-md px-2 text-xs bg-white outline-none focus:ring-2 focus:ring-blue-400"
                          >
                            <option value="">ללא קבוצה</option>
                            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <Input value={editForm.donor_phone || ''} onChange={e => setEditForm(f => ({ ...f, donor_phone: e.target.value }))} className="h-7 text-xs" dir="ltr" />
                      </td>
                      <td className="px-4 py-2">
                        <Input type="number" value={editForm.amount || ''} onChange={e => setEditForm(f => ({ ...f, amount: Number(e.target.value) }))} className="h-7 text-xs w-20" dir="ltr" />
                        {editForm.payment_type === 'hok' && (
                          <span className="block text-[10px] text-gray-400 mt-0.5">
                            חודשי{Number(editForm.installments) > 0 ? ` ·= ₪${((Number(editForm.amount) || 0) * Number(editForm.installments)).toLocaleString()}` : ''}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={editForm.payment_type === 'hok' ? 'hok' : 'one_time'}
                          onChange={e => setEditForm(f => ({ ...f, payment_type: e.target.value, installments: e.target.value === 'hok' ? (f.installments || 12) : null }))}
                          aria-label="סוג תרומה"
                          className="h-7 w-full border border-gray-200 rounded-md px-1 text-xs bg-white outline-none focus:ring-2 focus:ring-blue-400"
                        >
                          <option value="one_time">חד״פ</option>
                          <option value="hok">הו״ק</option>
                        </select>
                        {editForm.payment_type === 'hok' && (
                          <input
                            type="number" min="1" value={editForm.installments ?? ''}
                            onChange={e => setEditForm(f => ({ ...f, installments: Number(e.target.value) }))}
                            className="mt-1 h-7 w-full border border-gray-200 rounded-md px-1 text-xs outline-none focus:ring-2 focus:ring-blue-400"
                            dir="ltr" placeholder="חודשים"
                          />
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={editForm.custom_data?.payment_method || 'credit'}
                          onChange={e => setEditForm(f => ({ ...f, custom_data: { ...(f.custom_data || {}), payment_method: e.target.value } }))}
                          aria-label="אופן תשלום"
                          className="h-7 w-full border border-gray-200 rounded-md px-1 text-xs bg-white outline-none focus:ring-2 focus:ring-blue-400"
                        >
                          {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <Input value={editForm.dedication || ''} onChange={e => setEditForm(f => ({ ...f, dedication: e.target.value }))} className="h-7 text-xs" placeholder="הקדשה" />
                        <Input
                          value={editForm.custom_data?.manager_note || ''}
                          onChange={e => setEditForm(f => ({ ...f, custom_data: { ...(f.custom_data || {}), manager_note: e.target.value } }))}
                          className="h-7 text-xs mt-1" placeholder="הערה פנימית (לא מתפרסם)"
                        />
                      </td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <button onClick={saveEdit} disabled={saving} className="p-1 rounded hover:bg-green-100 text-green-600"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditId(null)} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    // ── שורה רגילה ──
                    <>
                      <td className="px-4 py-3 w-10">
                        <input type="checkbox" className="w-4 h-4 cursor-pointer accent-blue-600" checked={selected.has(d.id)} onChange={() => toggleSelect(d.id)} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(d.created_at).toLocaleDateString('he-IL')}
                        <span className="block text-[11px] text-gray-300">{new Date(d.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        <span className={isAnon(d) ? 'line-through text-gray-400' : ''}>{d.donor_name || <span className="text-gray-300">ללא שם</span>}</span>
                        {groupName(d.group_id) && (
                          <span className="block text-[11px] text-gray-400 font-normal mt-0.5">{groupName(d.group_id)}</span>
                        )}
                        {/* hide the name publicly (shown as "אנונימי") — manager still sees it */}
                        <label className="flex items-center gap-1 text-[11px] text-gray-400 mt-1 cursor-pointer w-fit" title="הסתר את השם בדף הציבורי">
                          <input type="checkbox" checked={isAnon(d)} onChange={() => toggleAnonymous(d)} className="w-3 h-3 accent-blue-600" />
                          אנונימי (מוסתר בחוץ)
                        </label>
                        {d.custom_data?.manager_note && (
                          <span className="block text-[11px] text-amber-600 mt-0.5" title="הערה פנימית">📝 {d.custom_data.manager_note}</span>
                        )}
                        {customEntries(d).length > 0 && (
                          <button
                            onClick={() => toggleExpand(d.id)}
                            className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full px-2 py-0.5 transition-colors"
                          >
                            <ClipboardList className="w-3 h-3" />
                            פרטי הזמנה ({customEntries(d).length})
                            <ChevronDown className={`w-3 h-3 transition-transform ${expanded.has(d.id) ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs" dir="ltr">{d.donor_phone || '—'}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">
                        {(() => {
                          const f = foreignOf(d)
                          const isHok = d.payment_type === 'hok' && d.monthly_amount && d.installments
                          return (
                            <div>
                              {f
                                ? <><div dir="ltr" className="text-right">{f.sym}{f.amount.toLocaleString()}</div><div className="text-[10px] font-normal text-gray-400">≈ ₪{(d.amount || 0).toLocaleString()}</div></>
                                : <>₪{(d.amount || 0).toLocaleString()}</>}
                              {isHok ? <div className="text-[10px] font-normal text-gray-400" dir="ltr">₪{Number(d.monthly_amount).toLocaleString()}×{d.installments}</div> : null}
                            </div>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        {d.payment_type === 'hok' ? (
                          <div className="space-y-0.5">
                            <span
                              title={d.monthly_amount ? `₪${Number(d.monthly_amount).toLocaleString()} לחודש × ${d.installments ?? '?'}` : undefined}
                              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 whitespace-nowrap"
                            >
                              הו״ק{d.installments ? ` · ${d.installments} ח׳` : ''}
                            </span>
                            {(d.custom_data?.__charge_day || d.custom_data?.__starts_at) && (
                              <div className="text-[10px] text-gray-400 whitespace-nowrap">
                                {d.custom_data?.__charge_day ? `מחויב ב-${d.custom_data.__charge_day} לחודש` : ''}
                                {d.custom_data?.__charge_day && d.custom_data?.__starts_at ? ' · ' : ''}
                                {d.custom_data?.__starts_at ? `מתחיל ${d.custom_data.__starts_at}` : ''}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-500">חד״פ</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {donationMethod(d)
                          ? <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 whitespace-nowrap">{donationMethod(d)}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-[120px] truncate">{d.dedication || '—'}</td>
                      <td className="px-4 py-3">
                        {(() => { const s = donationSource(d, paymentProvider); return (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                        ) })()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${d.payment_status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {d.payment_status === 'completed' ? 'הושלם' : d.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(d)} className="p-1.5 rounded hover:bg-blue-50 text-blue-400 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteDonation(d.id, d.group_id)} className="p-1.5 rounded hover:bg-red-50 text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>

                {editId !== d.id && expanded.has(d.id) && customEntries(d).length > 0 && (
                  <tr className="bg-blue-50/30">
                    <td colSpan={11} className="px-6 pb-4 pt-0">
                      <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                            <ClipboardList className="w-4 h-4 text-blue-500" /> פרטי הזמנה מהטופס
                          </h4>
                          <button
                            onClick={() => copyText(customEntries(d).map(([k, v]) => `${k}: ${v}`).join('\n'))}
                            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" /> העתק הכל
                          </button>
                        </div>
                        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
                          {customEntries(d).map(([k, v]) => (
                            <div key={k} className="flex flex-col gap-0.5">
                              <dt className="text-[11px] font-semibold text-gray-400">{k}</dt>
                              <dd className="text-sm text-gray-800 whitespace-pre-line flex items-start gap-1.5 group">
                                <span className="flex-1 break-words">{v}</span>
                                <button
                                  onClick={() => copyText(v)} title="העתק"
                                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-blue-500 transition-opacity shrink-0 mt-0.5"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
