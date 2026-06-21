'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, ImageIcon, ExternalLink, Loader2,
  Pencil, Layers, Tags, Plus, X, Check,
} from 'lucide-react'
import ProjectEditorModal from './ProjectEditorModal'
import { uploadImage } from '@/lib/image-client'

export interface PortfolioItem {
  id: string
  image_url: string
  label?: string | null
  title?: string | null
  slug?: string | null
  description?: string | null
  video_url?: string | null
  project_images?: string[] | null
  sort_order: number
  is_published: boolean
}

export interface PortfolioLabel {
  id: string
  name: string
  sort_order: number
}

function isProject(it: PortfolioItem): boolean {
  return (it.project_images?.length ?? 0) > 0 || !!it.description || !!it.video_url
}

export default function PortfolioAdminClient({ items, labels }: { items: PortfolioItem[]; labels: PortfolioLabel[] }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editing, setEditing] = useState<PortfolioItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [managingLabels, setManagingLabels] = useState(false)
  const labelNames = labels.map(l => l.name)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busyBulk, setBusyBulk] = useState(false)
  const toggleSelect = (id: string) => setSelected(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n
  })
  const clearSelection = () => setSelected(new Set())

  // All writes go through /api/portfolio (service role + super-admin check) so
  // they don't silently fail on RLS, and real errors surface to the user.
  async function patchItem(id: string, fields: Record<string, unknown>): Promise<boolean> {
    const res = await fetch('/api/portfolio', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...fields }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'העדכון נכשל')
      return false
    }
    return true
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    setError(null)
    let order = items.length
    for (const file of Array.from(files)) {
      try {
        const url = await uploadImage(file, `portfolio/${crypto.randomUUID()}`)
        const res = await fetch('/api/portfolio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_url: url, sort_order: order++ }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'שמירת העבודה נכשלה')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'שגיאה בהעלאה')
      }
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
    router.refresh()
  }

  async function saveLabel(id: string, value: string) {
    await patchItem(id, { label: value.trim() || null })
    router.refresh()
  }

  // ─── Manage the label list ───
  async function labelApi(method: 'POST' | 'PATCH' | 'DELETE', body: Record<string, unknown>): Promise<boolean> {
    const res = await fetch('/api/portfolio/labels', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'הפעולה נכשלה')
      return false
    }
    return true
  }
  async function addLabel(name: string) {
    if (!name.trim()) return
    if (await labelApi('POST', { name: name.trim(), sort_order: labels.length })) router.refresh()
  }
  async function renameLabel(id: string, name: string) {
    if (await labelApi('PATCH', { id, name })) router.refresh()
  }
  async function deleteLabel(id: string) {
    if (!confirm('למחוק את התווית מהרשימה? (עבודות שכבר תויגו בה לא ישתנו)')) return
    if (await labelApi('DELETE', { id })) router.refresh()
  }

  // ─── Bulk actions on selected works ───
  async function bulkApplyLabel(value: string) {
    if (selected.size === 0) return
    setBusyBulk(true)
    const label = value === '__none' ? null : value
    await Promise.all([...selected].map(id => patchItem(id, { label })))
    setBusyBulk(false)
    clearSelection()
    router.refresh()
  }
  async function bulkDelete() {
    if (selected.size === 0) return
    if (!confirm(`למחוק ${selected.size} עבודות מהתיק?`)) return
    setBusyBulk(true)
    await Promise.all([...selected].map(id =>
      fetch('/api/portfolio', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    ))
    setBusyBulk(false)
    clearSelection()
    router.refresh()
  }

  async function togglePublish(item: PortfolioItem) {
    setBusyId(item.id)
    await patchItem(item.id, { is_published: !item.is_published })
    setBusyId(null)
    router.refresh()
  }

  async function remove(item: PortfolioItem) {
    if (!confirm('למחוק את העבודה מהתיק?')) return
    setBusyId(item.id)
    const res = await fetch('/api/portfolio', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'המחיקה נכשלה')
    }
    setBusyId(null)
    router.refresh()
  }

  async function move(item: PortfolioItem, dir: -1 | 1) {
    const idx = items.findIndex(i => i.id === item.id)
    const swapWith = items[idx + dir]
    if (!swapWith) return
    setBusyId(item.id)
    await Promise.all([
      patchItem(item.id, { sort_order: swapWith.sort_order }),
      patchItem(swapWith.id, { sort_order: item.sort_order }),
    ])
    setBusyId(null)
    router.refresh()
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-gray-900">תיק עבודות</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {items.length} עבודות · מוצג בכתובת{' '}
              <a href="/design" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-0.5">
                kafool.com/design <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setManagingLabels(v => !v)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 active:scale-95 transition-all"
            >
              <Tags className="w-4 h-4" />
              ניהול תוויות
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => onFiles(e.target.files)} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'מעלה...' : 'העלה עבודות'}
            </button>
          </div>
        </div>

        {/* Label manager */}
        {managingLabels && (
          <LabelManager
            labels={labels}
            onAdd={addLabel}
            onRename={renameLabel}
            onDelete={deleteLabel}
            onClose={() => setManagingLabels(false)}
          />
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-xs font-bold shrink-0">סגור</button>
          </div>
        )}

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="sticky top-2 z-20 flex items-center gap-3 flex-wrap bg-blue-600 text-white rounded-2xl px-4 py-2.5 shadow-lg">
            <span className="text-sm font-bold">{selected.size} נבחרו</span>
            <select
              defaultValue=""
              disabled={busyBulk}
              onChange={e => { const v = e.target.value; e.currentTarget.value = ''; if (v) bulkApplyLabel(v) }}
              className="text-sm text-gray-800 rounded-lg px-2 py-1.5 bg-white outline-none"
            >
              <option value="" disabled>החל תווית…</option>
              <option value="__none">— הסר תווית —</option>
              {labels.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
            </select>
            <button
              onClick={bulkDelete}
              disabled={busyBulk}
              className="inline-flex items-center gap-1.5 text-sm font-bold bg-white/15 hover:bg-white/25 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" /> מחק נבחרים
            </button>
            <button onClick={clearSelection} className="text-sm text-blue-100 hover:text-white mr-auto">בטל בחירה</button>
          </div>
        )}

        {/* Grid */}
        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center space-y-2">
            <ImageIcon className="w-10 h-10 text-gray-200 mx-auto" />
            <p className="text-sm text-gray-400">עוד לא הועלו עבודות. לחץ "העלה עבודות".</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item, idx) => {
              const isSel = selected.has(item.id)
              return (
              <div key={item.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-shadow ${isSel ? 'border-blue-500 ring-2 ring-blue-500/40' : item.is_published ? 'border-gray-100' : 'border-amber-200'}`}>
                {/* image */}
                <div className="relative bg-gray-50 aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image_url} alt={item.label || ''} className="w-full h-full object-cover" />
                  {/* selection checkbox */}
                  <button
                    onClick={() => toggleSelect(item.id)}
                    title="בחר"
                    className={`absolute top-2 left-2 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isSel ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white/80 border-white/90 text-transparent hover:border-blue-400'}`}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  {!item.is_published && (
                    <span className="absolute top-2 right-2 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">מוסתר</span>
                  )}
                  {isProject(item) && (
                    <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 text-[10px] font-bold bg-blue-600 text-white rounded-full px-2 py-0.5 shadow-sm">
                      <Layers className="w-3 h-3" />
                      פרויקט
                    </span>
                  )}
                </div>

                {/* label */}
                <div className="p-3 space-y-2">
                  <select
                    value={item.label ?? ''}
                    onChange={e => saveLabel(item.id, e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition bg-white"
                  >
                    <option value="">— ללא תווית —</option>
                    {/* keep a legacy free-text label visible even if it's not in the list */}
                    {item.label && !labelNames.includes(item.label) && (
                      <option value={item.label}>{item.label}</option>
                    )}
                    {labels.map(l => (
                      <option key={l.id} value={l.name}>{l.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setEditing(item)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    ערוך פרויקט
                  </button>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <IconBtn title="הזז קדימה" disabled={idx === 0 || busyId === item.id} onClick={() => move(item, -1)}><ArrowUp className="w-3.5 h-3.5" /></IconBtn>
                      <IconBtn title="הזז אחורה" disabled={idx === items.length - 1 || busyId === item.id} onClick={() => move(item, 1)}><ArrowDown className="w-3.5 h-3.5" /></IconBtn>
                    </div>
                    <div className="flex items-center gap-1">
                      <IconBtn title={item.is_published ? 'הסתר' : 'פרסם'} disabled={busyId === item.id} onClick={() => togglePublish(item)}>
                        {item.is_published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-amber-500" />}
                      </IconBtn>
                      <IconBtn title="מחק" disabled={busyId === item.id} onClick={() => remove(item)}>
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </IconBtn>
                    </div>
                  </div>
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>

      {editing && (
        <ProjectEditorModal
          item={editing}
          labels={labels}
          onClose={() => setEditing(null)}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  )
}

function LabelManager({ labels, onAdd, onRename, onDelete, onClose }: {
  labels: PortfolioLabel[]
  onAdd: (name: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  const [newName, setNewName] = useState('')
  const [edits, setEdits] = useState<Record<string, string>>({})

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2"><Tags className="w-4 h-4" /> ניהול תוויות</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="סגור"><X className="w-4 h-4" /></button>
      </div>

      {/* Add new */}
      <div className="flex items-center gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { onAdd(newName); setNewName('') } }}
          placeholder="תווית חדשה (למשל: מיתוג)"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
        <button
          onClick={() => { onAdd(newName); setNewName('') }}
          disabled={!newName.trim()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-40"
          style={{ background: '#2563eb' }}
        >
          <Plus className="w-4 h-4" /> הוסף
        </button>
      </div>

      {/* Existing */}
      {labels.length === 0 ? (
        <p className="text-xs text-gray-400">אין עדיין תוויות. הוסיפו אחת למעלה.</p>
      ) : (
        <div className="space-y-1.5">
          {labels.map(l => {
            const draft = edits[l.id] ?? l.name
            const dirty = draft.trim() !== l.name
            return (
              <div key={l.id} className="flex items-center gap-2">
                <input
                  value={draft}
                  onChange={e => setEdits(s => ({ ...s, [l.id]: e.target.value }))}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
                {dirty && (
                  <button onClick={() => onRename(l.id, draft)} title="שמור שם" className="w-8 h-8 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center">
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => onDelete(l.id)} title="מחק" className="w-8 h-8 rounded-lg border border-gray-200 text-red-500 hover:bg-red-50 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function IconBtn({ children, onClick, disabled, title }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; title: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-7 h-7 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center justify-center transition-colors disabled:opacity-30"
    >
      {children}
    </button>
  )
}
