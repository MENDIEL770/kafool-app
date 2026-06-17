'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pencil, Trash2, X, Check, Plus, Search, FileSpreadsheet, Upload } from 'lucide-react'

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

export default function DonorsClient({ campaign, donations: initial, groups, plans }: { campaign: Campaign; donations: Donation[]; groups: GroupOption[]; plans: PlanOption[] }) {
  const router = useRouter()
  const [donations, setDonations] = useState(initial)
  const [search, setSearch] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Donation>>({})
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ amount: '', donor_name: '', donor_phone: '', donor_email: '', dedication: '', group_id: '' })
  const [saving, setSaving] = useState(false)
  const [addError, setAddError] = useState('')

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

  const filtered = donations.filter(d =>
    !search ||
    d.donor_name?.includes(search) ||
    d.donor_phone?.includes(search) ||
    d.donor_email?.includes(search) ||
    String(d.amount).includes(search)
  )

  const total = donations.reduce((s, d) => s + (d.amount || 0), 0)
  // Online = paid through the site (has a Kesher transaction); manual = entered by hand
  const onlineTotal = donations.reduce((s, d) => s + (d.kesher_transaction_id ? (d.amount || 0) : 0), 0)
  const manualTotal = total - onlineTotal

  // ── עריכה ──
  function startEdit(d: Donation) {
    setEditId(d.id)
    setEditForm({ donor_name: d.donor_name || '', donor_phone: d.donor_phone || '', donor_email: d.donor_email || '', dedication: d.dedication || '', amount: d.amount })
  }

  async function saveEdit() {
    if (!editId) return
    setSaving(true)
    const { error } = await supabase.from('donations').update({
      donor_name: editForm.donor_name || null,
      donor_phone: editForm.donor_phone || null,
      donor_email: editForm.donor_email || null,
      dedication: editForm.dedication || null,
      amount: Number(editForm.amount) || 0,
    }).eq('id', editId)
    if (!error) {
      setDonations(ds => ds.map(d => d.id === editId ? { ...d, ...editForm, amount: Number(editForm.amount) || 0 } : d))
      setEditId(null)
    }
    setSaving(false)
  }

  // ── עדכון סכום קבוצה (read-modify-write, ללא מיגרציה) ──
  async function adjustGroupRaised(groupId: string, delta: number) {
    const { data: g } = await supabase.from('groups').select('raised_amount').eq('id', groupId).single()
    if (g) {
      await supabase.from('groups')
        .update({ raised_amount: Math.max(0, (g.raised_amount || 0) + delta) })
        .eq('id', groupId)
    }
  }

  // ── מחיקה ──
  async function deleteDonation(id: string, amount: number, groupId: string | null) {
    if (!confirm('למחוק תרומה זו?')) return
    // .select() מחזיר את השורות שנמחקו בפועל — כדי לזהות חסימת RLS (0 שורות)
    const { data, error } = await supabase.from('donations').delete().eq('id', id).select('id')
    if (error) { alert('מחיקה נכשלה: ' + error.message); return }
    if (!data || data.length === 0) {
      alert('המחיקה לא בוצעה (הרשאה חסרה). יש להריץ את add_donations_delete_policy.sql ב-Supabase.')
      return
    }
    setDonations(ds => ds.filter(d => d.id !== id))
    // עדכן raised_amount
    await supabase.rpc('increment_campaign_amount', {
      campaign_id: campaign.id,
      amount_agorot: -Math.round(amount * 100),
    })
    if (groupId) await adjustGroupRaised(groupId, -amount)
  }

  // ── הוספה ידנית ──
  async function addDonation() {
    const amount = Number(addForm.amount)
    if (!amount) { setAddError('יש להזין סכום'); return }
    setSaving(true)
    setAddError('')
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
    }).select().single()
    if (error || !data) {
      setAddError(error?.message || 'הוספת התרומה נכשלה')
      setSaving(false)
      return
    }
    setDonations(ds => [data, ...ds])
    await supabase.rpc('increment_campaign_amount', {
      campaign_id: campaign.id,
      amount_agorot: Math.round(amount * 100),
    })
    if (addForm.group_id) await adjustGroupRaised(addForm.group_id, amount)
    setAddForm({ amount: '', donor_name: '', donor_phone: '', donor_email: '', dedication: '', group_id: '' })
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
    const sum = valid.reduce((s, r) => s + r.amount, 0)
    await supabase.rpc('increment_campaign_amount', {
      campaign_id: campaign.id,
      amount_agorot: Math.round(sum * 100),
    })
    if (groupId) await adjustGroupRaised(groupId, sum)
    setDonations(ds => [...data, ...ds])
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">תורמים</h1>
          <p className="text-sm text-gray-500 mt-0.5">{campaign.title}</p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'סה"כ גויס', val: `₪${total.toLocaleString()}`, accent: 'text-gray-900' },
          { label: '💻 נכנס באתר', val: `₪${onlineTotal.toLocaleString()}`, accent: 'text-green-600' },
          { label: '✍️ נכנס ידני', val: `₪${manualTotal.toLocaleString()}`, accent: 'text-blue-600' },
          { label: 'סה"כ תורמים', val: donations.length, accent: 'text-gray-900' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
            <div className={`text-2xl font-black ${s.accent}`}>{s.val}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="חיפוש לפי שם, טלפון, אימייל..."
          className="pr-9"
        />
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">סכום (₪) *</Label>
              <Input type="number" value={addForm.amount} onChange={e => setAddForm(f => ({ ...f, amount: e.target.value }))} placeholder="180" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">שם תורם</Label>
              <Input value={addForm.donor_name} onChange={e => setAddForm(f => ({ ...f, donor_name: e.target.value }))} />
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

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">אין תרומות להצגה</div>
        ) : (
          <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['תאריך', 'שם', 'טלפון', 'סכום', 'הקדשה', 'מקור', 'סטטוס', ''].map(h => (
                  <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  {editId === d.id ? (
                    // ── שורת עריכה ──
                    <>
                      <td className="px-4 py-2 text-xs text-gray-400">
                        {new Date(d.created_at).toLocaleDateString('he-IL')}
                      </td>
                      <td className="px-4 py-2">
                        <Input value={editForm.donor_name || ''} onChange={e => setEditForm(f => ({ ...f, donor_name: e.target.value }))} className="h-7 text-xs" />
                      </td>
                      <td className="px-4 py-2">
                        <Input value={editForm.donor_phone || ''} onChange={e => setEditForm(f => ({ ...f, donor_phone: e.target.value }))} className="h-7 text-xs" dir="ltr" />
                      </td>
                      <td className="px-4 py-2">
                        <Input type="number" value={editForm.amount || ''} onChange={e => setEditForm(f => ({ ...f, amount: Number(e.target.value) }))} className="h-7 text-xs w-20" dir="ltr" />
                      </td>
                      <td className="px-4 py-2">
                        <Input value={editForm.dedication || ''} onChange={e => setEditForm(f => ({ ...f, dedication: e.target.value }))} className="h-7 text-xs" />
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
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(d.created_at).toLocaleDateString('he-IL')}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {d.donor_name || <span className="text-gray-300">אנונימי</span>}
                        {groupName(d.group_id) && (
                          <span className="block text-[11px] text-gray-400 font-normal mt-0.5">👥 {groupName(d.group_id)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs" dir="ltr">{d.donor_phone || '—'}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">₪{(d.amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-[120px] truncate">{d.dedication || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${d.kesher_transaction_id ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                          {d.kesher_transaction_id ? '💻 אתר' : '✍️ ידני'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${d.payment_status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {d.payment_status === 'completed' ? 'הושלם' : d.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(d)} className="p-1.5 rounded hover:bg-blue-50 text-blue-400 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteDonation(d.id, d.amount, d.group_id)} className="p-1.5 rounded hover:bg-red-50 text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
