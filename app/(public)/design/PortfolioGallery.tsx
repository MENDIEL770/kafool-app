'use client'

import { useState, useMemo, useEffect } from 'react'
import { X } from 'lucide-react'

export interface PortfolioItem {
  id: string
  image_url: string
  label?: string | null
  title?: string | null
}

export default function PortfolioGallery({ items }: { items: PortfolioItem[] }) {
  const labels = useMemo(
    () => Array.from(new Set(items.map(i => i.label).filter(Boolean))) as string[],
    [items]
  )
  const [active, setActive] = useState<string>('all')
  const [lightbox, setLightbox] = useState<PortfolioItem | null>(null)

  const shown = active === 'all' ? items : items.filter(i => i.label === active)

  // close lightbox on Escape
  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  if (items.length === 0) {
    return (
      <section className="max-w-6xl mx-auto px-4 py-24 text-center text-gray-400">
        עוד אין עבודות להצגה — בקרוב!
      </section>
    )
  }

  return (
    <section className="max-w-6xl mx-auto px-4 py-12" dir="rtl">
      {/* filter chips */}
      {labels.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <Chip active={active === 'all'} onClick={() => setActive('all')}>הכל</Chip>
          {labels.map(l => (
            <Chip key={l} active={active === l} onClick={() => setActive(l)}>{l}</Chip>
          ))}
        </div>
      )}

      {/* masonry grid */}
      <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
        {shown.map(it => (
          <button
            key={it.id}
            onClick={() => setLightbox(it)}
            className="mb-4 block w-full break-inside-avoid group relative overflow-hidden rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-shadow"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={it.image_url}
              alt={it.title || it.label || 'עבודת עיצוב'}
              loading="lazy"
              className="w-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            />
            {it.label && (
              <span className="absolute top-2 right-2 text-[11px] font-semibold bg-white/90 backdrop-blur text-gray-700 rounded-full px-2.5 py-1 shadow-sm">
                {it.label}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 left-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            onClick={() => setLightbox(null)}
            aria-label="סגור"
          >
            <X className="w-5 h-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.image_url}
            alt={lightbox.title || lightbox.label || ''}
            className="max-w-full max-h-[88vh] rounded-xl object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
        active ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  )
}
