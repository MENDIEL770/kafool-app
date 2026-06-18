'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toSlug } from '@/lib/media'
import { X, Upload, Trash2, Loader2, GripVertical } from 'lucide-react'
import type { PortfolioItem } from './PortfolioAdminClient'

async function uploadFile(file: File, path: string): Promise<string | null> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('path', path)
  const res = await fetch('/api/upload', { method: 'POST', body: fd })
  const data = await res.json()
  return data.url ?? null
}

export default function ProjectEditorModal({
  item, onClose, onSaved,
}: {
  item: PortfolioItem
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const coverRef = useRef<HTMLInputElement>(null)
  const imagesRef = useRef<HTMLInputElement>(null)

  const [cover, setCover] = useState(item.image_url)
  const [title, setTitle] = useState(item.title ?? '')
  const [label, setLabel] = useState(item.label ?? '')
  const [slug, setSlug] = useState(item.slug ?? '')
  const [description, setDescription] = useState(item.description ?? '')
  const [videoUrl, setVideoUrl] = useState(item.video_url ?? '')
  const [images, setImages] = useState<string[]>(item.project_images ?? [])

  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingImgs, setUploadingImgs] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onCover(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setUploadingCover(true)
    const url = await uploadFile(file, `portfolio/${crypto.randomUUID()}`)
    if (url) setCover(url)
    setUploadingCover(false)
    if (coverRef.current) coverRef.current.value = ''
  }

  async function onAddImages(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploadingImgs(true)
    const added: string[] = []
    for (const file of Array.from(files)) {
      const url = await uploadFile(file, `portfolio/${item.id}/${crypto.randomUUID()}`)
      if (url) added.push(url)
    }
    setImages(prev => [...prev, ...added])
    setUploadingImgs(false)
    if (imagesRef.current) imagesRef.current.value = ''
  }

  function removeImage(url: string) {
    setImages(prev => prev.filter(u => u !== url))
  }

  function moveImage(i: number, dir: -1 | 1) {
    setImages(prev => {
      const next = [...prev]
      const j = i + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  async function save() {
    setSaving(true)
    setError(null)
    // Build a slug only when the item is becoming a real project (has extra
    // content). Fall back to a random slug for Hebrew-only titles.
    const isProject = images.length > 0 || !!description.trim() || !!videoUrl.trim()
    let finalSlug = slug.trim()
    if (isProject && !finalSlug) {
      finalSlug = toSlug(title) || `proj-${Math.random().toString(36).slice(2, 8)}`
    }
    const { error } = await supabase
      .from('portfolio_items')
      .update({
        image_url: cover,
        title: title.trim() || null,
        label: label.trim() || null,
        slug: finalSlug || null,
        description: description.trim() || null,
        video_url: videoUrl.trim() || null,
        project_images: images,
      })
      .eq('id', item.id)
    setSaving(false)
    if (error) {
      // Most likely a duplicate slug.
      setError(error.message.includes('duplicate') || error.message.includes('unique')
        ? 'הכתובת (slug) כבר תפוסה — בחר כתובת אחרת.'
        : error.message)
      return
    }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-start justify-center p-4 overflow-y-auto" dir="rtl" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8" onClick={e => e.stopPropagation()}>
        {/* head */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-lg font-black text-gray-900">עריכת פרויקט</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500" aria-label="סגור">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Cover */}
          <div>
            <Label>תמונת מודעה (כריכה)</Label>
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover} alt="" className="w-24 h-24 rounded-xl object-cover border border-gray-200" />
              <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={e => onCover(e.target.files)} />
              <button onClick={() => coverRef.current?.click()} disabled={uploadingCover}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                החלף תמונה
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="כותרת">
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="שם הפרויקט"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </Field>
            <Field label="תווית / סגנון">
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="למשל: מודעה, לוגו, באנר"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </Field>
          </div>

          <Field label="כתובת לשיתוף (אנגלית, אופציונלי)" hint="ריק = ייווצר אוטומטית">
            <div className="flex items-center gap-1.5">
              <span dir="ltr" className="text-xs text-gray-400 shrink-0">kafool.com/design/</span>
              <input value={slug} onChange={e => setSlug(toSlug(e.target.value))} placeholder="my-project" dir="ltr"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
          </Field>

          <Field label="תיאור הפרויקט">
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="ספר על הפרויקט — מה עיצבנו, עבור מי, מה היה האתגר…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-y" />
          </Field>

          <Field label="וידאו (YouTube / Vimeo, אופציונלי)">
            <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…" dir="ltr"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
          </Field>

          {/* Project images */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>תמונות הפרויקט המלא ({images.length})</Label>
              <input ref={imagesRef} type="file" accept="image/*" multiple className="hidden" onChange={e => onAddImages(e.target.files)} />
              <button onClick={() => imagesRef.current?.click()} disabled={uploadingImgs}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                {uploadingImgs ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                הוסף תמונות
              </button>
            </div>
            {images.length === 0 ? (
              <p className="text-xs text-gray-400 bg-gray-50 rounded-lg py-6 text-center">
                אין תמונות נוספות. בלי תמונות/תיאור/וידאו — המודעה תוצג כתמונה בודדת (ללא עמוד פרויקט).
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {images.map((url, i) => (
                  <div key={`${url}-${i}`} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <button onClick={() => moveImage(i, -1)} disabled={i === 0} title="הזז שמאלה"
                        className="w-7 h-7 rounded-md bg-white/90 text-gray-700 flex items-center justify-center disabled:opacity-30">
                        <GripVertical className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => removeImage(url)} title="הסר"
                        className="w-7 h-7 rounded-md bg-white/90 text-red-500 flex items-center justify-center">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {i === 0 && <span className="absolute top-1 right-1 text-[9px] font-bold bg-blue-600 text-white rounded px-1.5 py-0.5">1</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </div>

        {/* foot */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100">ביטול</button>
          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            שמירה
          </button>
        </div>
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold text-gray-700 mb-1.5">{children}</p>
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold text-gray-700 mb-1.5">
        {label}{hint && <span className="font-normal text-gray-400"> · {hint}</span>}
      </p>
      {children}
    </div>
  )
}
