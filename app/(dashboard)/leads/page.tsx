'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import type { Lead, Caller } from '@/types'

type LeadStatus = Lead['status']

interface CallerWithProfile extends Caller {
  profiles: { full_name: string } | null
}

interface LeadWithCaller extends Lead {
  caller?: CallerWithProfile | null
}

const STATUS_LABELS: Record<string, string> = {
  new: 'חדש',
  assigned: 'שויך',
  called: 'נענה',
  donated: 'תרם',
  callback: 'לחזור',
  dnc: 'ביטול',
  skip: 'דילוג',
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  assigned: 'bg-purple-100 text-purple-700',
  called: 'bg-yellow-100 text-yellow-700',
  donated: 'bg-green-100 text-green-700',
  callback: 'bg-orange-100 text-orange-700',
  dnc: 'bg-red-100 text-red-700',
  skip: 'bg-gray-100 text-gray-500',
}

const FILTER_TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'הכל' },
  { key: 'new', label: 'חדש' },
  { key: 'assigned', label: 'שויך' },
  { key: 'called', label: 'נענה' },
  { key: 'donated', label: 'תרם' },
  { key: 'dnc', label: 'ביטול' },
]

function LeadsImport({ campaignId, orgId, onImported }: { campaignId: string; orgId: string; onImported: () => void }) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus('מעבד...')
    const text = await file.text()
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const rows = lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => { obj[h] = vals[i] || '' })
      return obj
    })
    const leads = rows
      .filter(r => r.name || r['שם'] || r.phone || r['טלפון'])
      .map(r => ({
        org_id: orgId,
        campaign_id: campaignId,
        name: r.name || r['שם'] || '',
        phone: r.phone || r['טלפון'] || '',
        email: r.email || r['אימייל'] || null,
        previous_donations: r.previous_donations ? Number(r.previous_donations) : null,
        status: 'new' as LeadStatus,
        priority: 0,
      }))
    if (leads.length === 0) { setStatus('לא נמצאו שורות תקינות'); return }
    const { error } = await supabase.from('leads').insert(leads)
    setStatus(error ? `שגיאה: ${error.message}` : `יובאו ${leads.length} לידים`)
    if (!error) onImported()
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="flex items-center gap-2">
      <input ref={fileRef} type="file" accept=".csv" className="hidden" id="leads-import-csv" onChange={handleFile} />
      <label htmlFor="leads-import-csv" className={cn(buttonVariants({ variant: 'outline' }), 'cursor-pointer')}>
        📂 ייבא CSV
      </label>
      {status && <span className="text-xs text-gray-500">{status}</span>}
    </div>
  )
}

function AssignCallerDropdown({ lead, callers, onAssigned }: { lead: LeadWithCaller; callers: CallerWithProfile[]; onAssigned: () => void }) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)

  async function assign(callerId: string) {
    await supabase.from('leads').update({ caller_id: callerId, status: 'assigned' }).eq('id', lead.id)
    setOpen(false)
    onAssigned()
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-xs')}>
        {lead.caller?.profiles?.full_name || 'שייך'}
      </button>
      {open && (
        <div className="absolute top-8 left-0 bg-white shadow-xl rounded-xl border z-20 min-w-40" dir="rtl">
          {callers.map(c => (
            <button
              key={c.id}
              onClick={() => assign(c.id)}
              className="w-full text-right px-4 py-2 text-sm hover:bg-gray-50"
            >
              {c.profiles?.full_name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function LeadsPage() {
  const supabase = createClient()
  const [leads, setLeads] = useState<LeadWithCaller[]>([])
  const [callers, setCallers] = useState<CallerWithProfile[]>([])
  const [filter, setFilter] = useState('all')
  const [campaignId, setCampaignId] = useState('')
  const [orgId, setOrgId] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({})

  const fetchLeads = useCallback(async (oId: string, cId: string) => {
    const query = supabase
      .from('leads')
      .select('*')
      .eq('campaign_id', cId)
      .order('created_at', { ascending: false })

    const { data } = filter === 'all' ? await query : await query.eq('status', filter)
    setLeads((data as LeadWithCaller[]) ?? [])
  }, [filter])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
      if (!profile?.org_id) return
      setOrgId(profile.org_id)

      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id')
        .eq('org_id', profile.org_id)
        .eq('status', 'active')
        .limit(1)

      const cId = campaigns?.[0]?.id
      if (!cId) { setLoading(false); return }
      setCampaignId(cId)

      const [, { data: callersData }] = await Promise.all([
        fetchLeads(profile.org_id, cId),
        supabase.from('callers').select('*, profiles(full_name)').eq('org_id', profile.org_id),
      ])
      setCallers((callersData as CallerWithProfile[]) ?? [])
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (orgId && campaignId) fetchLeads(orgId, campaignId)
  }, [filter, orgId, campaignId, fetchLeads])

  async function saveNotes(leadId: string) {
    if (editingNotes[leadId] === undefined) return
    await supabase.from('leads').update({ notes: editingNotes[leadId] }).eq('id', leadId)
    setEditingNotes(prev => { const n = { ...prev }; delete n[leadId]; return n })
    fetchLeads(orgId, campaignId)
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900">📋 ניהול לידים</h1>
        {campaignId && <LeadsImport campaignId={campaignId} orgId={orgId} onImported={() => fetchLeads(orgId, campaignId)} />}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-t-lg transition-colors',
              filter === tab.key
                ? 'bg-white border border-b-white border-gray-200 text-blue-600 -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">טוען...</div>
      ) : !campaignId ? (
        <div className="text-center py-12 text-gray-400">אין קמפיין פעיל. הפעל קמפיין כדי לנהל לידים.</div>
      ) : leads.length === 0 ? (
        <div className="text-center py-12 text-gray-400">אין לידים. ייבא CSV כדי להתחיל.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-right">שם</th>
                <th className="px-4 py-3 text-right">טלפון</th>
                <th className="px-4 py-3 text-right">סטטוס</th>
                <th className="px-4 py-3 text-right">טלפן</th>
                <th className="px-4 py-3 text-right">הובטח</th>
                <th className="px-4 py-3 text-right">חזרה</th>
                <th className="px-4 py-3 text-right">הערות</th>
                <th className="px-4 py-3 text-right">נוצר</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads.map(lead => (
                <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium">{lead.name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    <a href={`tel:${lead.phone}`} className="hover:text-blue-600">{lead.phone}</a>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[lead.status] || 'bg-gray-100 text-gray-500')}>
                      {STATUS_LABELS[lead.status] || lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <AssignCallerDropdown lead={lead} callers={callers} onAssigned={() => fetchLeads(orgId, campaignId)} />
                  </td>
                  <td className="px-4 py-3">
                    {lead.amount_pledged ? <span className="text-yellow-600 font-medium">₪{lead.amount_pledged.toLocaleString()}</span> : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {lead.callback_at ? new Date(lead.callback_at).toLocaleString('he-IL') : '—'}
                  </td>
                  <td className="px-4 py-3 min-w-[160px]">
                    {editingNotes[lead.id] !== undefined ? (
                      <div className="flex gap-1">
                        <input
                          value={editingNotes[lead.id]}
                          onChange={e => setEditingNotes(prev => ({ ...prev, [lead.id]: e.target.value }))}
                          className="border rounded px-2 py-1 text-xs flex-1"
                          autoFocus
                          onBlur={() => saveNotes(lead.id)}
                          onKeyDown={e => e.key === 'Enter' && saveNotes(lead.id)}
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingNotes(prev => ({ ...prev, [lead.id]: lead.notes || '' }))}
                        className="text-xs text-gray-500 hover:text-gray-800 text-right w-full truncate max-w-[140px] block"
                      >
                        {lead.notes || <span className="text-gray-300">לחץ להוסיף הערה</span>}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(lead.created_at).toLocaleDateString('he-IL')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
