'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Plus, Sparkles, Phone, Mail, CreditCard, CheckCircle2,
  MessageSquare, UserPlus, Banknote, GripVertical, TrendingUp, Pencil,
} from 'lucide-react'
import NewLeadModal from './NewLeadModal'
import LeadPaymentModal from './LeadPaymentModal'

export interface Lead {
  id: string
  org_name: string
  contact_name?: string | null
  email?: string | null
  phone?: string | null
  source: string
  stage: 'new' | 'contacted' | 'proposal' | 'awaiting_payment' | 'won' | 'lost'
  setup_fee: number
  notes?: string | null
  payment_status: 'unpaid' | 'paid'
  converted_org_id?: string | null
  created_at: string
}

type StageKey = Lead['stage']

export const STAGES: Record<StageKey, { label: string; dot: string; bar: string; soft: string; text: string }> = {
  new:              { label: 'חדש',          dot: 'bg-slate-400',   bar: 'bg-slate-400',   soft: 'bg-slate-50',   text: 'text-slate-600' },
  contacted:        { label: 'יצרתי קשר',    dot: 'bg-blue-400',    bar: 'bg-blue-400',    soft: 'bg-blue-50',    text: 'text-blue-600' },
  proposal:         { label: 'נשלחה הצעה',   dot: 'bg-indigo-400',  bar: 'bg-indigo-400',  soft: 'bg-indigo-50',  text: 'text-indigo-600' },
  awaiting_payment: { label: 'ממתין לתשלום', dot: 'bg-amber-400',   bar: 'bg-amber-400',   soft: 'bg-amber-50',   text: 'text-amber-600' },
  won:              { label: 'שולם / הומר',  dot: 'bg-emerald-500', bar: 'bg-emerald-500', soft: 'bg-emerald-50', text: 'text-emerald-600' },
  lost:             { label: 'אבוד',         dot: 'bg-rose-400',    bar: 'bg-rose-400',    soft: 'bg-rose-50',    text: 'text-rose-500' },
}

const COLUMN_ORDER: StageKey[] = ['new', 'contacted', 'proposal', 'awaiting_payment', 'won', 'lost']

export default function LeadsTabClient({ leads }: { leads: Lead[] }) {
  const router = useRouter()
  const [showNew, setShowNew] = useState(false)
  const [editLead, setEditLead] = useState<Lead | null>(null)
  const [payLead, setPayLead] = useState<Lead | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<StageKey | null>(null)

  // optimistic local copy so cards move instantly on drop
  const [items, setItems] = useState<Lead[]>(leads)
  // re-sync with server truth after refresh
  useEffect(() => { setItems(leads) }, [leads])

  const pipelineValue = items
    .filter(l => !['won', 'lost'].includes(l.stage))
    .reduce((sum, l) => sum + Number(l.setup_fee || 0), 0)
  const wonValue = items
    .filter(l => l.stage === 'won')
    .reduce((sum, l) => sum + Number(l.setup_fee || 0), 0)
  const openCount = items.filter(l => !['won', 'lost'].includes(l.stage)).length

  async function moveTo(leadId: string, stage: StageKey) {
    const current = items.find(l => l.id === leadId)
    if (!current || current.stage === stage) return
    setItems(prev => prev.map(l => (l.id === leadId ? { ...l, stage } : l)))
    const supabase = createClient()
    await supabase.from('sales_leads').update({ stage }).eq('id', leadId)
    router.refresh()
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* ─── Header ─── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">צינור לידים</h1>
          <p className="text-sm text-gray-400 mt-0.5">גרור כרטיס בין העמודות כדי לעדכן שלב</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm hover:opacity-90 active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
        >
          <Plus className="w-4 h-4" />
          ליד חדש
        </button>
      </div>

      {/* ─── Summary chips ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryChip icon={Sparkles}   label="לידים פתוחים" value={String(openCount)}                          tint="text-blue-600 bg-blue-50" />
        <SummaryChip icon={TrendingUp} label="שווי צינור"   value={`₪${pipelineValue.toLocaleString()}`}        tint="text-indigo-600 bg-indigo-50" />
        <SummaryChip icon={CheckCircle2} label="הומרו"       value={String(items.filter(l => l.stage === 'won').length)} tint="text-emerald-600 bg-emerald-50" />
        <SummaryChip icon={Banknote}   label="הכנסה שגויסה" value={`₪${wonValue.toLocaleString()}`}             tint="text-emerald-600 bg-emerald-50" />
      </div>

      {/* ─── Kanban board ─── */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
        {COLUMN_ORDER.map(stage => {
          const st = STAGES[stage]
          const colLeads = items.filter(l => l.stage === stage)
          const colSum = colLeads.reduce((s, l) => s + Number(l.setup_fee || 0), 0)
          const isOver = overCol === stage
          return (
            <div
              key={stage}
              onDragOver={e => { e.preventDefault(); setOverCol(stage) }}
              onDragLeave={() => setOverCol(c => (c === stage ? null : c))}
              onDrop={e => {
                e.preventDefault()
                const id = e.dataTransfer.getData('text/plain') || dragId
                if (id) moveTo(id, stage)
                setOverCol(null)
                setDragId(null)
              }}
              className={`shrink-0 w-[290px] rounded-2xl border transition-colors ${
                isOver ? 'border-blue-300 bg-blue-50/40' : 'border-gray-100 bg-gray-50/60'
              }`}
            >
              {/* column header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                  <span className="text-sm font-bold text-gray-700">{st.label}</span>
                  <span className="text-xs font-semibold text-gray-400 bg-white border border-gray-100 rounded-full px-1.5 py-0.5">
                    {colLeads.length}
                  </span>
                </div>
                {colSum > 0 && <span className="text-[11px] font-semibold text-gray-400">₪{colSum.toLocaleString()}</span>}
              </div>
              <div className={`h-0.5 mx-4 rounded-full ${st.bar} opacity-60`} />

              {/* cards */}
              <div className="p-2.5 space-y-2.5 min-h-[120px]">
                {colLeads.length === 0 ? (
                  <div className="text-center text-xs text-gray-300 py-8 border-2 border-dashed border-gray-200 rounded-xl">
                    גרור לכאן
                  </div>
                ) : (
                  colLeads.map(lead => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      dragging={dragId === lead.id}
                      onDragStart={e => { e.dataTransfer.setData('text/plain', lead.id); setDragId(lead.id) }}
                      onDragEnd={() => { setDragId(null); setOverCol(null) }}
                      onPay={() => setPayLead(lead)}
                      onEdit={() => setEditLead(lead)}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showNew && <NewLeadModal onClose={() => setShowNew(false)} />}
      {editLead && <NewLeadModal lead={editLead} onClose={() => setEditLead(null)} />}
      {payLead && <LeadPaymentModal lead={payLead} onClose={() => setPayLead(null)} />}
    </div>
  )
}

// ─── Summary chip ─────────────────────────────────────────────────────────
function SummaryChip({ icon: Icon, label, value, tint }: {
  icon: React.ComponentType<{ className?: string }>
  label: string; value: string; tint: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tint}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-lg font-black text-gray-900 leading-tight truncate">{value}</div>
        <div className="text-xs font-semibold text-gray-400">{label}</div>
      </div>
    </div>
  )
}

// ─── Lead card ────────────────────────────────────────────────────────────
function LeadCard({ lead, dragging, onDragStart, onDragEnd, onPay, onEdit }: {
  lead: Lead
  dragging: boolean
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  onPay: () => void
  onEdit: () => void
}) {
  const converted = !!lead.converted_org_id
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`group bg-white rounded-xl border border-gray-100 shadow-sm p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:border-gray-200 ${
        dragging ? 'opacity-40 rotate-1' : ''
      }`}
    >
      {/* title row */}
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-gray-300 mt-0.5 shrink-0 group-hover:text-gray-400 transition-colors" />
        <div className="min-w-0 flex-1">
          <div className="font-bold text-gray-800 text-sm leading-tight truncate">{lead.org_name}</div>
          {lead.contact_name && <div className="text-xs text-gray-400 mt-0.5 truncate">{lead.contact_name}</div>}
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          <button
            onClick={e => { e.stopPropagation(); onEdit() }}
            aria-label="ערוך ליד"
            title="ערוך פרטי ליד"
            className="text-gray-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-400"
            title={lead.source === 'contact_form' ? 'הגיע מטופס צור קשר' : 'הוזן ידנית'}
          >
            {lead.source === 'contact_form' ? <MessageSquare className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
          </span>
        </div>
      </div>

      {/* contact */}
      {(lead.phone || lead.email) && (
        <div className="mt-2 space-y-1 pr-6">
          {lead.phone && (
            <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 w-fit" dir="ltr">
              <Phone className="w-3 h-3" /> {lead.phone}
            </a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 w-fit truncate max-w-full" dir="ltr">
              <Mail className="w-3 h-3 shrink-0" /> <span className="truncate">{lead.email}</span>
            </a>
          )}
        </div>
      )}

      {/* footer: fee + action */}
      <div className="mt-3 pt-2.5 border-t border-gray-50 flex items-center justify-between gap-2 pr-6">
        {lead.setup_fee > 0 ? (
          <span className={`inline-flex items-center gap-1 text-xs font-bold ${lead.payment_status === 'paid' ? 'text-emerald-600' : 'text-gray-700'}`}>
            {lead.payment_status === 'paid' && <CheckCircle2 className="w-3.5 h-3.5" />}
            ₪{Number(lead.setup_fee).toLocaleString()}
          </span>
        ) : (
          <span className="text-[11px] text-gray-300">ללא סכום</span>
        )}

        {converted ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1">
            <CheckCircle2 className="w-3 h-3" /> ארגון
          </span>
        ) : (
          <button
            onClick={e => { e.stopPropagation(); onPay() }}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1 hover:bg-blue-100 transition-colors"
          >
            <CreditCard className="w-3 h-3" /> תשלום
          </button>
        )}
      </div>
    </div>
  )
}
