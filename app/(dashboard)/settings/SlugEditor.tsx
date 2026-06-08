'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, X, Loader2, Pencil } from 'lucide-react'

type Status = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'saved' | 'error'

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/

export default function SlugEditor({ currentSlug }: { currentSlug: string }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(currentSlug)
  const [status, setStatus] = useState<Status>('idle')
  const [saved, setSaved] = useState(currentSlug)
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function handleChange(raw: string) {
    const v = raw.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setValue(v)

    if (v === saved) { setStatus('idle'); return }
    if (!SLUG_RE.test(v)) { setStatus(v.length < 3 ? 'idle' : 'invalid'); return }

    setStatus('checking')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/org/slug?slug=${encodeURIComponent(v)}`)
      const data = await res.json()
      setStatus(data.available ? 'available' : 'taken')
    }, 500)
  }

  async function handleSave() {
    if (status !== 'available') return
    setSaving(true)
    const res = await fetch('/api/org/slug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: value }),
    })
    const data = await res.json()
    if (res.ok) {
      setSaved(data.slug)
      setStatus('saved')
      setEditing(false)
      setTimeout(() => setStatus('idle'), 3000)
    } else {
      setStatus('error')
    }
    setSaving(false)
  }

  function handleCancel() {
    setValue(saved)
    setStatus('idle')
    setEditing(false)
  }

  const statusIcon = {
    checking: <Loader2 className="w-4 h-4 animate-spin text-gray-400" />,
    available: <Check className="w-4 h-4 text-emerald-500" />,
    taken: <X className="w-4 h-4 text-red-500" />,
    invalid: <X className="w-4 h-4 text-red-400" />,
    saved: <Check className="w-4 h-4 text-emerald-500" />,
    error: <X className="w-4 h-4 text-red-500" />,
    idle: null,
  }[status]

  const statusText = {
    checking: 'בודק זמינות...',
    available: 'הכתובת פנויה',
    taken: 'הכתובת כבר תפוסה',
    invalid: 'אותיות קטנות באנגלית, מספרים ומקפים בלבד (לפחות 3 תווים)',
    saved: 'נשמר בהצלחה',
    error: 'שגיאה בשמירה',
    idle: null,
  }[status]

  const statusColor = {
    checking: 'text-gray-400',
    available: 'text-emerald-600',
    taken: 'text-red-500',
    invalid: 'text-orange-500',
    saved: 'text-emerald-600',
    error: 'text-red-500',
    idle: '',
  }[status]

  return (
    <div className="space-y-2" dir="ltr">
      {!editing ? (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800">kafool.com/<strong>{saved}</strong></span>
          {status === 'saved' && (
            <span className="flex items-center gap-1 text-xs text-emerald-600">
              <Check className="w-3 h-3" /> נשמר
            </span>
          )}
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Pencil className="w-3 h-3" />
            עריכה
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className={`flex items-center border-2 rounded-xl overflow-hidden transition-colors ${
            status === 'available' ? 'border-emerald-400' :
            status === 'taken' || status === 'invalid' || status === 'error' ? 'border-red-300' :
            'border-blue-400'
          }`}>
            <span className="px-3 py-2 bg-gray-50 text-sm text-gray-500 border-l border-gray-200 shrink-0 select-none">
              kafool.com/
            </span>
            <input
              ref={inputRef}
              value={value}
              onChange={e => handleChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
              className="flex-1 px-3 py-2 text-sm font-mono outline-none bg-white min-w-0"
              placeholder="your-org"
              maxLength={50}
              spellCheck={false}
              dir="ltr"
            />
            <div className="px-3 shrink-0">{statusIcon}</div>
          </div>

          {statusText && (
            <p className={`text-xs ${statusColor}`}>{statusText}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={status !== 'available' || saving}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              שמור
            </button>
            <button
              onClick={handleCancel}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              ביטול
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
