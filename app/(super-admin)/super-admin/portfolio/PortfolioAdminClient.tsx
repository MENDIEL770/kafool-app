'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Upload, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, ImageIcon, ExternalLink, Loader2,
  Pencil, Layers,
} from 'lucide-react'
import ProjectEditorModal from './ProjectEditorModal'

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

function isProject(it: PortfolioItem): boolean {
  return (it.project_images?.length ?? 0) > 0 || !!it.description || !!it.video_url
}

export default function PortfolioAdminClient({ items }: { items: PortfolioItem[] }) {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editing, setEditing] = useState<PortfolioItem | null>(null)
  const [labels, setLabels] = useState<Record<string, string>>(
    Object.fromEntries(items.map(i => [i.id, i.label ?? '']))
  )

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    let order = items.length
    for (const file of Array.from(files)) {
      try {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('path', `portfolio/${crypto.randomUUID()}`)
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const data = await res.json()
        if (data.url) {
          await supabase.from('portfolio_items').insert({ image_url: data.url, sort_order: order++ })
        }
      } catch (e) {
        console.error('portfolio upload error', e)
      }
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
    router.refresh()
  }

  async function saveLabel(id: string) {
    await supabase.from('portfolio_items').update({ label: labels[id]?.trim() || null }).eq('id', id)
    router.refresh()
  }

  async function togglePublish(item: PortfolioItem) {
    setBusyId(item.id)
    await supabase.from('portfolio_items').update({ is_published: !item.is_published }).eq('id', item.id)
    setBusyId(null)
    router.refresh()
  }

  async function remove(item: PortfolioItem) {
    if (!confirm('למחוק את העבודה מהתיק?')) return
    setBusyId(item.id)
    await supabase.from('portfolio_items').delete().eq('id', item.id)
    setBusyId(null)
    router.refresh()
  }

  async function move(item: PortfolioItem, dir: -1 | 1) {
    const idx = items.findIndex(i => i.id === item.id)
    const swapWith = items[idx + dir]
    if (!swapWith) return
    setBusyId(item.id)
    await Promise.all([
      supabase.from('portfolio_items').update({ sort_order: swapWith.sort_order }).eq('id', item.id),
      supabase.from('portfolio_items').update({ sort_order: item.sort_order }).eq('id', swapWith.id),
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

        {/* Grid */}
        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center space-y-2">
            <ImageIcon className="w-10 h-10 text-gray-200 mx-auto" />
            <p className="text-sm text-gray-400">עוד לא הועלו עבודות. לחץ "העלה עבודות".</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item, idx) => (
              <div key={item.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${item.is_published ? 'border-gray-100' : 'border-amber-200'}`}>
                {/* image */}
                <div className="relative bg-gray-50 aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image_url} alt={item.label || ''} className="w-full h-full object-cover" />
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
                  <input
                    value={labels[item.id] ?? ''}
                    onChange={e => setLabels(s => ({ ...s, [item.id]: e.target.value }))}
                    onBlur={() => saveLabel(item.id)}
                    placeholder="תווית / סגנון"
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
                  />
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
            ))}
          </div>
        )}
      </div>

      {editing && (
        <ProjectEditorModal
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={() => router.refresh()}
        />
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
