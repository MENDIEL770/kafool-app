'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pencil, Trash2, X, Check, Plus, Search } from 'lucide-react'

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
}

interface Campaign {
  id: string
  title: string
  slug: string
  raised_amount: number
  goal_amount: number
}

export default function DonorsClient({ campaign, donations: initial }: { campaign: Campaign; donations: Donation[] }) {
  const router = useRouter()
  const [donations, setDonations] = useState(initial)
  const [search, setSearch] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Donation>>({})
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ amount: '', donor_name: '', donor_phone: '', donor_email: '', dedication: '' })
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  const filtered = donations.filter(d =>
    !search ||
    d.donor_name?.includes(search) ||
    d.donor_phone?.includes(search) ||
    d.donor_email?.includes(search) ||
    String(d.amount).includes(search)
  )

  const total = donations.reduce((s, d) => s + (d.amount || 0), 0)

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

  // ── מחיקה ──
  async function deleteDonation(id: string, amount: number) {
    if (!confirm('למחוק תרומה זו?')) return
    const { error } = await supabase.from('donations').delete().eq('id', id)
    if (!error) {
      setDonations(ds => ds.filter(d => d.id !== id))
      // עדכן raised_amount
      await supabase.rpc('increment_campaign_amount', {
        campaign_id: campaign.id,
        amount_agorot: -Math.round(amount * 100),
      })
    }
  }

  // ── הוספה ידנית ──
  async function addDonation() {
    const amount = Number(addForm.amount)
    if (!amount) return
    setSaving(true)
    const { data, error } = await supabase.from('donations').insert({
      campaign_id: campaign.id,
      org_id: undefined, // יתמלא מ-RLS
      amount,
      donor_name: addForm.donor_name || null,
      donor_phone: addForm.donor_phone || null,
      donor_email: addForm.donor_email || null,
      dedication: addForm.dedication || null,
      payment_status: 'completed',
    }).select().single()
    if (!error && data) {
      setDonations(ds => [data, ...ds])
      await supabase.rpc('increment_campaign_amount', {
        campaign_id: campaign.id,
        amount_agorot: Math.round(amount * 100),
      })
      setAddForm({ amount: '', donor_name: '', donor_phone: '', donor_email: '', dedication: '' })
      setShowAdd(false)
    }
    setSaving(false)
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
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          הוסף תרומה ידנית
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'סה"כ תורמים', val: donations.length },
          { label: 'סה"כ גויס', val: `₪${total.toLocaleString()}` },
          { label: 'תרומה ממוצעת', val: donations.length ? `₪${Math.round(total / donations.length).toLocaleString()}` : '₪0' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
            <div className="text-2xl font-black text-gray-900">{s.val}</div>
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
          <div className="space-y-1">
            <Label className="text-xs">הקדשה</Label>
            <Input value={addForm.dedication} onChange={e => setAddForm(f => ({ ...f, dedication: e.target.value }))} />
          </div>
          <Button onClick={addDonation} disabled={saving || !addForm.amount} className="w-full">
            {saving ? 'שומר...' : 'הוסף תרומה'}
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">אין תרומות להצגה</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['תאריך', 'שם', 'טלפון', 'סכום', 'הקדשה', 'סטטוס', ''].map(h => (
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
                      <td className="px-4 py-3 font-medium text-gray-800">{d.donor_name || <span className="text-gray-300">אנונימי</span>}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs" dir="ltr">{d.donor_phone || '—'}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">₪{(d.amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-[120px] truncate">{d.dedication || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${d.payment_status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {d.payment_status === 'completed' ? 'הושלם' : d.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(d)} className="p-1.5 rounded hover:bg-blue-50 text-blue-400 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteDonation(d.id, d.amount)} className="p-1.5 rounded hover:bg-red-50 text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
