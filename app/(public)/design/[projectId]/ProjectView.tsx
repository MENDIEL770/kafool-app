'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Play } from 'lucide-react'
import { getVideoEmbed } from '@/lib/media'

export interface Project {
  id: string
  image_url: string
  label?: string | null
  title?: string | null
  slug?: string | null
  description?: string | null
  video_url?: string | null
  project_images?: string[] | null
}

export default function ProjectView({ project }: { project: Project }) {
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [playVideo, setPlayVideo] = useState(false)

  const videoEmbed = useMemo(
    () => (project.video_url ? getVideoEmbed(project.video_url) : null),
    [project.video_url]
  )

  // Cover first, then the rest of the project images (deduped).
  const images = useMemo(() => {
    const extra = (project.project_images ?? []).filter(Boolean)
    return [project.image_url, ...extra.filter(u => u !== project.image_url)]
  }, [project.image_url, project.project_images])

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  return (
    <article className="max-w-5xl mx-auto px-4 py-8" dir="rtl">
      {/* Title + label */}
      <header className="mb-6">
        {project.label && (
          <span className="inline-block text-xs font-bold bg-blue-50 text-blue-600 rounded-full px-3 py-1 mb-3">
            {project.label}
          </span>
        )}
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900">
          {project.title || project.label || 'פרויקט'}
        </h1>
      </header>

      {/* Description */}
      {project.description && (
        <p className="text-lg text-gray-600 leading-relaxed whitespace-pre-line mb-8">
          {project.description}
        </p>
      )}

      {/* Video */}
      {videoEmbed && (
        <div className="mb-10">
          {playVideo ? (
            <div className="aspect-video rounded-2xl overflow-hidden shadow-lg bg-black">
              <iframe
                src={`${videoEmbed}${videoEmbed.includes('?') ? '&' : '?'}autoplay=1`}
                className="w-full h-full"
                allowFullScreen
                allow="autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope"
                title="וידאו הפרויקט"
              />
            </div>
          ) : (
            <button
              onClick={() => setPlayVideo(true)}
              className="group relative w-full aspect-video rounded-2xl overflow-hidden shadow-lg bg-gray-900"
              aria-label="נגן וידאו"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={project.image_url} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity" />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                  <Play className="w-7 h-7 text-blue-600 mr-0.5" fill="currentColor" />
                </span>
              </span>
            </button>
          )}
        </div>
      )}

      {/* Image gallery */}
      <div className="columns-1 sm:columns-2 gap-4">
        {images.map((url, i) => (
          <button
            key={`${url}-${i}`}
            onClick={() => setLightbox(url)}
            className="mb-4 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-shadow"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={project.title || 'תמונת פרויקט'}
              loading={i === 0 ? 'eager' : 'lazy'}
              className="w-full object-cover hover:scale-[1.02] transition-transform duration-500"
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
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
            src={lightbox}
            alt=""
            className="max-w-full max-h-[88vh] rounded-xl object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </article>
  )
}
