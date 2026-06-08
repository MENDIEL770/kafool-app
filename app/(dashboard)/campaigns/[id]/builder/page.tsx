'use client'

import { useState, useCallback } from 'react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical, Image, Target, Heart, Sparkles, Play, Users,
  BarChart2, Quote, HelpCircle, MapPin, Megaphone, Images,
  Monitor, Smartphone, X, Plus, Trash2, ChevronDown,
} from 'lucide-react'

/* ─── Types ─── */
type BlockColor = 'blue' | 'amber' | 'green' | 'purple' | 'teal' | 'coral' | 'gray'
type BlockId = 'hero' | 'goal' | 'amounts' | 'impact' | 'video' | 'donors' | 'stats' | 'testimonials' | 'faq' | 'map' | 'cta' | 'gallery'

interface Block { id: BlockId; label: string; iconName: string; color: BlockColor; active: boolean }
interface DesignSettings { primary: string; secondary: string; cta: string; bg: string; titleFont: string; bodyFont: string; radius: 'none' | 'md' | 'full'; fontSize: number }
type BlockData = Record<string, unknown>

/* ─── Constants ─── */
const INITIAL_BLOCKS: Block[] = [
  { id: 'hero',         label: 'Hero',              iconName: 'Image',      color: 'blue',   active: true  },
  { id: 'goal',         label: 'יעד הקמפיין',       iconName: 'Target',     color: 'amber',  active: true  },
  { id: 'amounts',      label: 'כפתורי תרומה',      iconName: 'Heart',      color: 'green',  active: true  },
  { id: 'impact',       label: 'השפעה שלכם',        iconName: 'Sparkles',   color: 'purple', active: true  },
  { id: 'video',        label: 'וידאו',             iconName: 'Play',       color: 'teal',   active: false },
  { id: 'donors',       label: 'תורמים אחרונים',    iconName: 'Users',      color: 'coral',  active: true  },
  { id: 'stats',        label: 'סטטיסטיקות',        iconName: 'BarChart2',  color: 'gray',   active: false },
  { id: 'testimonials', label: 'עדויות',            iconName: 'Quote',      color: 'amber',  active: true  },
  { id: 'faq',          label: 'שאלות ותשובות',     iconName: 'HelpCircle', color: 'blue',   active: true  },
  { id: 'map',          label: 'מפה',               iconName: 'MapPin',     color: 'gray',   active: false },
  { id: 'cta',          label: 'קריאה לפעולה',      iconName: 'Megaphone',  color: 'coral',  active: true  },
  { id: 'gallery',      label: 'גלריה',             iconName: 'Images',     color: 'teal',   active: false },
]

const COLOR_MAP: Record<BlockColor, string> = {
  blue:   'bg-blue-50 text-blue-700',
  amber:  'bg-amber-50 text-amber-700',
  green:  'bg-green-50 text-green-700',
  purple: 'bg-purple-50 text-purple-700',
  teal:   'bg-teal-50 text-teal-700',
  coral:  'bg-orange-50 text-orange-700',
  gray:   'bg-gray-100 text-gray-500',
}

const BORDER_COLOR_MAP: Record<BlockColor, string> = {
  blue:   'border-blue-400',
  amber:  'border-amber-400',
  green:  'border-green-400',
  purple: 'border-purple-400',
  teal:   'border-teal-400',
  coral:  'border-orange-400',
  gray:   'border-gray-300',
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Image:      <Image className="w-3.5 h-3.5" />,
  Target:     <Target className="w-3.5 h-3.5" />,
  Heart:      <Heart className="w-3.5 h-3.5" />,
  Sparkles:   <Sparkles className="w-3.5 h-3.5" />,
  Play:       <Play className="w-3.5 h-3.5" />,
  Users:      <Users className="w-3.5 h-3.5" />,
  BarChart2:  <BarChart2 className="w-3.5 h-3.5" />,
  Quote:      <Quote className="w-3.5 h-3.5" />,
  HelpCircle: <HelpCircle className="w-3.5 h-3.5" />,
  MapPin:     <MapPin className="w-3.5 h-3.5" />,
  Megaphone:  <Megaphone className="w-3.5 h-3.5" />,
  Images:     <Images className="w-3.5 h-3.5" />,
}

/* ─── Toggle ─── */
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`relative w-8 h-4.5 rounded-full transition-colors duration-150 focus:outline-none shrink-0 ${on ? 'bg-blue-500' : 'bg-gray-200'}`}
      style={{ width: 32, height: 18 }}
      aria-checked={on}
      role="switch"
    >
      <span
        className="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform duration-150"
        style={{ transform: on ? 'translateX(15px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

/* ─── Sortable Block Row ─── */
function SortableBlockRow({ block, selected, onSelect, onToggle }: {
  block: Block
  selected: boolean
  onSelect: () => void
  onToggle: (v: boolean) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all duration-100 ${
        selected ? 'bg-blue-50 border-blue-300' : 'border-transparent hover:bg-gray-50'
      } ${!block.active ? 'opacity-40' : ''}`}
      onClick={onSelect}
    >
      <span {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500" onClick={e => e.stopPropagation()}>
        <GripVertical className="w-3.5 h-3.5" />
      </span>
      <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${COLOR_MAP[block.color]}`}>
        {ICON_MAP[block.iconName]}
      </span>
      <span className="flex-1 text-sm text-gray-700 select-none truncate">{block.label}</span>
      <span onClick={e => e.stopPropagation()}>
        <Toggle on={block.active} onChange={onToggle} />
      </span>
    </div>
  )
}

/* ─── Preview Strip ─── */
function PreviewStrip({ block, onEdit }: { block: Block; onEdit: () => void }) {
  return (
    <div className={`relative flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 shadow-sm group border-r-4 ${BORDER_COLOR_MAP[block.color]}`}>
      <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${COLOR_MAP[block.color]}`}>
        {ICON_MAP[block.iconName]}
      </span>
      <span className="flex-1 text-sm font-medium text-gray-700">{block.label}</span>
      <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">גלוי</span>
      <button
        onClick={onEdit}
        className="opacity-0 group-hover:opacity-100 absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all"
      >
        ערוך
      </button>
    </div>
  )
}

/* ─── Block Edit Fields ─── */
function BlockEditFields({ blockId, data, onChange }: { blockId: BlockId; data: BlockData; onChange: (d: BlockData) => void }) {
  const set = (k: string, v: unknown) => onChange({ ...data, [k]: v })

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
  const labelCls = "block text-xs font-semibold text-gray-500 mb-1"

  if (blockId === 'hero') return (
    <div className="space-y-4">
      <div><label className={labelCls}>תמונת רקע</label>
        <div className="border-2 border-dashed border-gray-200 rounded-xl py-6 text-center text-gray-400 text-sm cursor-pointer hover:border-gray-300 transition-colors">
          <Image className="w-6 h-6 mx-auto mb-1 opacity-40" /><span>לחץ להעלאת תמונה</span>
        </div>
      </div>
      <div><label className={labelCls}>כותרת</label><input className={inputCls} value={(data.title as string) || ''} onChange={e => set('title', e.target.value)} /></div>
      <div><label className={labelCls}>כותרת משנה</label><textarea className={inputCls} rows={2} value={(data.subtitle as string) || ''} onChange={e => set('subtitle', e.target.value)} /></div>
      <div><label className={labelCls}>טקסט כפתור</label><input className={inputCls} value={(data.btnText as string) || ''} onChange={e => set('btnText', e.target.value)} /></div>
    </div>
  )

  if (blockId === 'goal') return (
    <div className="space-y-4">
      <div><label className={labelCls}>יעד כולל (₪)</label><input type="number" className={inputCls} value={(data.goal as number) || ''} onChange={e => set('goal', Number(e.target.value))} dir="ltr" /></div>
      <div><label className={labelCls}>תאריך סיום</label><input type="date" className={inputCls} value={(data.endDate as string) || ''} onChange={e => set('endDate', e.target.value)} dir="ltr" /></div>
      <div className="flex items-center justify-between"><span className={labelCls + ' mb-0'}>הצג % השגה</span><Toggle on={!!data.showPct} onChange={v => set('showPct', v)} /></div>
    </div>
  )

  if (blockId === 'amounts') {
    const rows = (data.rows as { amount: number; desc: string; recommended: boolean }[]) || [{ amount: 180, desc: '', recommended: false }]
    return (
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="flex gap-2 items-start bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div className="flex-1 space-y-2">
              <input type="number" placeholder="₪ סכום" className={inputCls} value={r.amount} onChange={e => { const next = [...rows]; next[i] = { ...r, amount: Number(e.target.value) }; set('rows', next) }} dir="ltr" />
              <input placeholder="תיאור" className={inputCls} value={r.desc} onChange={e => { const next = [...rows]; next[i] = { ...r, desc: e.target.value }; set('rows', next) }} />
              <div className="flex items-center gap-2"><Toggle on={r.recommended} onChange={v => { const next = [...rows]; next[i] = { ...r, recommended: v }; set('rows', next) }} /><span className="text-xs text-gray-500">מומלץ</span></div>
            </div>
            <button onClick={() => set('rows', rows.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 mt-1"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        {rows.length < 5 && (
          <button onClick={() => set('rows', [...rows, { amount: 0, desc: '', recommended: false }])}
            className="w-full flex items-center justify-center gap-1 py-2 border border-dashed border-gray-300 rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors">
            <Plus className="w-4 h-4" /> הוסף סכום
          </button>
        )}
      </div>
    )
  }

  if (blockId === 'impact') {
    const cells = (data.cells as { amount: string; icon: string; desc: string }[]) || Array(4).fill({ amount: '', icon: '❤️', desc: '' })
    return (
      <div className="space-y-3">
        {cells.map((c, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2">
            <input placeholder="סכום / כמות" className={inputCls} value={c.amount} onChange={e => { const next = [...cells]; next[i] = { ...c, amount: e.target.value }; set('cells', next) }} />
            <input placeholder="תיאור" className={inputCls} value={c.desc} onChange={e => { const next = [...cells]; next[i] = { ...c, desc: e.target.value }; set('cells', next) }} />
          </div>
        ))}
      </div>
    )
  }

  if (blockId === 'video') return (
    <div className="space-y-4">
      <div><label className={labelCls}>קישור YouTube / Vimeo</label><input type="url" className={inputCls} value={(data.url as string) || ''} onChange={e => set('url', e.target.value)} dir="ltr" placeholder="https://..." /></div>
      <div><label className={labelCls}>כותרת (אופציונלי)</label><input className={inputCls} value={(data.title as string) || ''} onChange={e => set('title', e.target.value)} /></div>
    </div>
  )

  if (blockId === 'donors') return (
    <div className="space-y-4">
      <div><label className={labelCls}>מספר לתצוגה</label>
        <select className={inputCls} value={(data.count as number) || 8} onChange={e => set('count', Number(e.target.value))}>
          {[4, 8, 12].map(n => <option key={n} value={n}>{n} תורמים</option>)}
        </select>
      </div>
      <div className="flex items-center justify-between"><span className={labelCls + ' mb-0'}>הצג שמות מלאים</span><Toggle on={!!data.showNames} onChange={v => set('showNames', v)} /></div>
      <div className="flex items-center justify-between"><span className={labelCls + ' mb-0'}>הצג סכומים</span><Toggle on={!!data.showAmounts} onChange={v => set('showAmounts', v)} /></div>
    </div>
  )

  if (blockId === 'stats') {
    const stats = (data.stats as { num: string; label: string }[]) || Array(4).fill({ num: '', label: '' })
    return (
      <div className="space-y-3">
        {stats.map((s, i) => (
          <div key={i} className="flex gap-2">
            <input placeholder="מספר" className={inputCls} value={s.num} onChange={e => { const next = [...stats]; next[i] = { ...s, num: e.target.value }; set('stats', next) }} dir="ltr" />
            <input placeholder="תווית" className={inputCls} value={s.label} onChange={e => { const next = [...stats]; next[i] = { ...s, label: e.target.value }; set('stats', next) }} />
          </div>
        ))}
      </div>
    )
  }

  if (blockId === 'testimonials') {
    const items = (data.items as { name: string; role: string; quote: string }[]) || [{ name: '', role: '', quote: '' }]
    return (
      <div className="space-y-3">
        {items.map((t, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2">
            <div className="flex gap-2">
              <input placeholder="שם" className={inputCls} value={t.name} onChange={e => { const next = [...items]; next[i] = { ...t, name: e.target.value }; set('items', next) }} />
              <input placeholder="תפקיד" className={inputCls} value={t.role} onChange={e => { const next = [...items]; next[i] = { ...t, role: e.target.value }; set('items', next) }} />
            </div>
            <textarea placeholder="ציטוט" rows={2} className={inputCls} value={t.quote} onChange={e => { const next = [...items]; next[i] = { ...t, quote: e.target.value }; set('items', next) }} />
            <button onClick={() => set('items', items.filter((_, j) => j !== i))} className="text-xs text-red-400 hover:text-red-600">הסר</button>
          </div>
        ))}
        <button onClick={() => set('items', [...items, { name: '', role: '', quote: '' }])}
          className="w-full flex items-center justify-center gap-1 py-2 border border-dashed border-gray-300 rounded-xl text-sm text-gray-400 hover:text-gray-600 transition-colors">
          <Plus className="w-4 h-4" /> הוסף עדות
        </button>
      </div>
    )
  }

  if (blockId === 'faq') {
    const items = (data.items as { q: string; a: string }[]) || [{ q: '', a: '' }]
    return (
      <div className="space-y-3">
        {items.map((f, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2">
            <input placeholder="שאלה" className={inputCls} value={f.q} onChange={e => { const next = [...items]; next[i] = { ...f, q: e.target.value }; set('items', next) }} />
            <textarea placeholder="תשובה" rows={2} className={inputCls} value={f.a} onChange={e => { const next = [...items]; next[i] = { ...f, a: e.target.value }; set('items', next) }} />
            <button onClick={() => set('items', items.filter((_, j) => j !== i))} className="text-xs text-red-400 hover:text-red-600">הסר</button>
          </div>
        ))}
        <button onClick={() => set('items', [...items, { q: '', a: '' }])}
          className="w-full flex items-center justify-center gap-1 py-2 border border-dashed border-gray-300 rounded-xl text-sm text-gray-400 hover:text-gray-600 transition-colors">
          <Plus className="w-4 h-4" /> הוסף שאלה
        </button>
      </div>
    )
  }

  if (blockId === 'map') return (
    <div className="space-y-4">
      <div><label className={labelCls}>כתובת</label><input className={inputCls} value={(data.address as string) || ''} onChange={e => set('address', e.target.value)} /></div>
      <div><label className={labelCls}>רמת זום ({(data.zoom as number) || 14})</label>
        <input type="range" min={8} max={18} value={(data.zoom as number) || 14} onChange={e => set('zoom', Number(e.target.value))} className="w-full" />
      </div>
      <div className="flex items-center justify-between"><span className={labelCls + ' mb-0'}>הצג מרקר</span><Toggle on={data.showMarker !== false} onChange={v => set('showMarker', v)} /></div>
    </div>
  )

  if (blockId === 'cta') return (
    <div className="space-y-4">
      <div><label className={labelCls}>כותרת גדולה</label><input className={inputCls} value={(data.title as string) || ''} onChange={e => set('title', e.target.value)} /></div>
      <div><label className={labelCls}>טקסט משנה</label><input className={inputCls} value={(data.subtitle as string) || ''} onChange={e => set('subtitle', e.target.value)} /></div>
      <div><label className={labelCls}>טקסט כפתור</label><input className={inputCls} value={(data.btnText as string) || ''} onChange={e => set('btnText', e.target.value)} /></div>
      <div><label className={labelCls}>צבע רקע</label>
        <div className="flex items-center gap-2">
          <input type="color" value={(data.bgColor as string) || '#1a56db'} onChange={e => set('bgColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-gray-200" />
          <span className="text-xs text-gray-500 font-mono">{(data.bgColor as string) || '#1a56db'}</span>
        </div>
      </div>
    </div>
  )

  if (blockId === 'gallery') return (
    <div>
      <label className={labelCls}>מדיה</label>
      <div className="grid grid-cols-3 gap-2">
        {Array(6).fill(null).map((_, i) => (
          <div key={i} className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center cursor-pointer hover:border-gray-300 transition-colors text-gray-300 hover:text-gray-400">
            <Plus className="w-5 h-5" />
          </div>
        ))}
      </div>
    </div>
  )

  return <p className="text-sm text-gray-400 text-center py-8">אין הגדרות נוספות לבלוק זה</p>
}

/* ─── Edit Drawer ─── */
function EditDrawer({ block, data, onChange, onClose }: {
  block: Block; data: BlockData; onChange: (d: BlockData) => void; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-start" dir="rtl">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-80 bg-white border-l border-gray-200 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-150">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3.5 border-b border-gray-100">
          <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${COLOR_MAP[block.color]}`}>
            {ICON_MAP[block.iconName]}
          </span>
          <span className="flex-1 font-bold text-gray-800 text-sm">{block.label}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <BlockEditFields blockId={block.id} data={data} onChange={onChange} />
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3">
          <button onClick={onClose} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">
            שמור בלוק
          </button>
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">ביטול</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Component ─── */
export default function CampaignPageBuilder() {
  const [blocks, setBlocks] = useState<Block[]>(INITIAL_BLOCKS)
  const [selectedBlock, setSelectedBlock] = useState<BlockId | null>(null)
  const [blockData, setBlockData] = useState<Record<BlockId, BlockData>>({} as Record<BlockId, BlockData>)
  const [design, setDesign] = useState<DesignSettings>({
    primary: '#1a56db', secondary: '#16a34a', cta: '#f59e0b', bg: '#ffffff',
    titleFont: 'Heebo', bodyFont: 'Rubik', radius: 'md', fontSize: 16,
  })
  const [hasUnsaved, setHasUnsaved] = useState(false)
  const [saved, setSaved] = useState(false)
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')
  const [rightTab, setRightTab] = useState<'blocks' | 'design'>('blocks')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setBlocks(prev => {
        const oldIdx = prev.findIndex(b => b.id === active.id)
        const newIdx = prev.findIndex(b => b.id === over.id)
        return arrayMove(prev, oldIdx, newIdx)
      })
      setHasUnsaved(true)
    }
  }, [])

  const toggleBlock = useCallback((id: BlockId, val: boolean) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, active: val } : b))
    setHasUnsaved(true)
  }, [])

  const setD = (k: keyof DesignSettings, v: unknown) => {
    setDesign(prev => ({ ...prev, [k]: v }))
    setHasUnsaved(true)
  }

  const handleSave = () => {
    setHasUnsaved(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const activeBlocks = blocks.filter(b => b.active)
  const editingBlock = selectedBlock ? blocks.find(b => b.id === selectedBlock) : null

  const inputCls = "w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300"

  return (
    <div className="flex h-screen overflow-hidden bg-white" dir="rtl" style={{ fontFamily: 'Heebo, sans-serif' }}>

      {/* ── RIGHT: Block Manager ── */}
      <div className="w-[220px] shrink-0 border-l border-gray-200 flex flex-col bg-white">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800">עורך התבנית</h2>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {(['blocks', 'design'] as const).map(t => (
            <button key={t} onClick={() => setRightTab(t)}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${rightTab === t ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
              {t === 'blocks' ? 'בלוקים' : 'עיצוב'}
            </button>
          ))}
        </div>

        {/* Blocks tab */}
        {rightTab === 'blocks' && (
          <>
            <div className="flex-1 overflow-y-auto px-2 py-2">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  {blocks.map(block => (
                    <SortableBlockRow
                      key={block.id}
                      block={block}
                      selected={selectedBlock === block.id}
                      onSelect={() => { setSelectedBlock(block.id); setHasUnsaved(true) }}
                      onToggle={v => toggleBlock(block.id, v)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>

            <div className="px-3 py-3 border-t border-gray-100 space-y-2">
              {hasUnsaved && (
                <div className="flex items-center gap-1.5 text-[11px] text-orange-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  שינויים לא שמורים
                </div>
              )}
              <button
                onClick={handleSave}
                className="w-full py-2 text-sm font-semibold border-2 border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all"
              >
                {saved ? '✓ נשמר' : 'שמור תבנית'}
              </button>
            </div>
          </>
        )}

        {/* Design tab */}
        {rightTab === 'design' && (
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5 text-sm">
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">צבעים</p>
              {([
                { key: 'primary', label: 'צבע ראשי' },
                { key: 'secondary', label: 'צבע משני' },
                { key: 'cta', label: 'צבע הגשה' },
                { key: 'bg', label: 'צבע רקע' },
              ] as { key: keyof DesignSettings; label: string }[]).map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-xs text-gray-600">{label}</span>
                  <input type="color" value={design[key] as string}
                    onChange={e => setD(key, e.target.value)}
                    className="w-6 h-6 rounded-full cursor-pointer border border-gray-200" style={{ borderRadius: '50%' }} />
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">פונט</p>
              <div className="space-y-2">
                <select className={inputCls} value={design.titleFont} onChange={e => setD('titleFont', e.target.value)}>
                  {['Heebo', 'Rubik', 'Frank Ruhl Libre', 'Assistant'].map(f => <option key={f}>{f}</option>)}
                </select>
                <select className={inputCls} value={design.bodyFont} onChange={e => setD('bodyFont', e.target.value)}>
                  {['Rubik', 'Heebo', 'Open Sans', 'Noto Sans Hebrew'].map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">פינות עגולות</p>
              <div className="flex gap-1">
                {([['none', 'ללא'], ['md', 'בינוני'], ['full', 'עגול']] as [DesignSettings['radius'], string][]).map(([v, label]) => (
                  <button key={v} onClick={() => setD('radius', v)}
                    className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${design.radius === v ? 'bg-blue-50 border-blue-400 text-blue-700 font-semibold' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">גודל בסיס</p>
              <div className="flex items-center gap-2">
                <input type="range" min={14} max={20} value={design.fontSize} onChange={e => setD('fontSize', Number(e.target.value))} className="flex-1" />
                <span className="text-xs font-mono text-gray-600 w-10 text-left">{design.fontSize}px</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── CENTER: Preview ── */}
      <div className="flex-1 flex flex-col border-l border-gray-200 bg-gray-50 min-w-0">
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shrink-0">
          <span className="text-sm font-bold text-gray-800">תצוגה מקדימה</span>
          <div className="flex gap-1">
            {([['desktop', <Monitor key="d" className="w-4 h-4" />], ['mobile', <Smartphone key="m" className="w-4 h-4" />]] as [typeof viewMode, React.ReactNode][]).map(([mode, icon]) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`p-2 rounded-lg transition-colors ${viewMode === mode ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}>
                {icon}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className={`mx-auto space-y-2 ${viewMode === 'mobile' ? 'max-w-[375px]' : 'max-w-2xl'}`}>
            {activeBlocks.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <p className="text-sm">אין בלוקים פעילים — הפעל בלוקים מהרשימה</p>
              </div>
            ) : (
              activeBlocks.map(block => (
                <PreviewStrip key={block.id} block={block} onEdit={() => setSelectedBlock(block.id)} />
              ))
            )}
            {activeBlocks.length > 0 && (
              <p className="text-center text-xs text-gray-400 pt-4">
                גרור בלוקים לשינוי סדר · לחץ לעריכה
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── LEFT: Design Settings (collapsed into right design tab) ── */}
      {/* Shown as separate column on lg screens */}
      <div className="hidden xl:flex w-[200px] shrink-0 border-r border-gray-200 flex-col bg-white">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800">עיצוב ותמה</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5 text-sm">
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">צבעים</p>
            {([
              { key: 'primary', label: 'צבע ראשי' },
              { key: 'secondary', label: 'צבע משני' },
              { key: 'cta', label: 'צבע הגשה' },
              { key: 'bg', label: 'צבע רקע' },
            ] as { key: keyof DesignSettings; label: string }[]).map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                <span className="text-xs text-gray-600">{label}</span>
                <input type="color" value={design[key] as string}
                  onChange={e => setD(key, e.target.value)}
                  className="w-6 h-6 rounded-full cursor-pointer border border-gray-200" style={{ borderRadius: '50%' }} />
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">פונט</p>
            <div className="space-y-2">
              <select className={inputCls} value={design.titleFont} onChange={e => setD('titleFont', e.target.value)}>
                {['Heebo', 'Rubik', 'Frank Ruhl Libre', 'Assistant'].map(f => <option key={f}>{f}</option>)}
              </select>
              <select className={inputCls} value={design.bodyFont} onChange={e => setD('bodyFont', e.target.value)}>
                {['Rubik', 'Heebo', 'Open Sans', 'Noto Sans Hebrew'].map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">פינות</p>
            <div className="flex gap-1">
              {([['none', 'ללא'], ['md', 'בינוני'], ['full', 'עגול']] as [DesignSettings['radius'], string][]).map(([v, label]) => (
                <button key={v} onClick={() => setD('radius', v)}
                  className={`flex-1 py-1.5 text-[11px] rounded-lg border transition-all ${design.radius === v ? 'bg-blue-50 border-blue-400 text-blue-700 font-semibold' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">גודל בסיס</p>
            <div className="flex items-center gap-2">
              <input type="range" min={14} max={20} value={design.fontSize} onChange={e => setD('fontSize', Number(e.target.value))} className="flex-1" />
              <span className="text-xs font-mono text-gray-600 w-10 text-left">{design.fontSize}px</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">תצוגת נייד</p>
            <button onClick={() => setViewMode(v => v === 'mobile' ? 'desktop' : 'mobile')}
              className="w-full flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-200 rounded-xl py-4 hover:border-gray-300 transition-colors text-gray-400 hover:text-gray-500">
              <Smartphone className="w-7 h-7" />
              <span className="text-[11px]">לחץ לתצוגת נייד</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── EDIT DRAWER ── */}
      {editingBlock && (
        <EditDrawer
          block={editingBlock}
          data={blockData[editingBlock.id] || {}}
          onChange={d => { setBlockData(prev => ({ ...prev, [editingBlock.id]: d })); setHasUnsaved(true) }}
          onClose={() => setSelectedBlock(null)}
        />
      )}
    </div>
  )
}
