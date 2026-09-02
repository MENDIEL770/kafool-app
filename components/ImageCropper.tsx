'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Check } from 'lucide-react'

// ─── Image Cropper ──────────────────────────────────────────────────────────────
// Square crop with pan (drag) + zoom (slider). Exports a 600×600 JPEG blob.
// Shared by the dashboard groups editor and the public "create group" modal.
const FRAME = 260
const OUT = 600

export default function ImageCropper({ file, onCancel, onCropped, lang = 'he' }: {
  file: File
  onCancel: () => void
  onCropped: (blob: Blob) => void
  lang?: 'he' | 'en'
}) {
  const en = lang === 'en'
  const [url, setUrl] = useState<string>('')
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const imgRef = useRef<HTMLImageElement | null>(null)
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null)

  useEffect(() => {
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])

  // Displayed image size: shorter side = FRAME * zoom (so it always covers the frame)
  function dispSize() {
    if (!nat) return { w: FRAME, h: FRAME }
    const ratio = nat.w / nat.h
    return ratio <= 1
      ? { w: FRAME * zoom, h: (FRAME * zoom) / ratio }
      : { w: FRAME * zoom * ratio, h: FRAME * zoom }
  }
  const { w: dw, h: dh } = dispSize()

  function clamp(x: number, y: number) {
    return { x: Math.min(0, Math.max(FRAME - dw, x)), y: Math.min(0, Math.max(FRAME - dh, y)) }
  }

  // Re-clamp position when the image loads or zoom changes
  useEffect(() => {
    setPos(p => ({
      x: Math.min(0, Math.max(FRAME - dw, p.x)),
      y: Math.min(0, Math.max(FRAME - dh, p.y)),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dw, dh])

  function onPointerDown(e: React.PointerEvent) {
    drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return
    const nx = drag.current.px + (e.clientX - drag.current.x)
    const ny = drag.current.py + (e.clientY - drag.current.y)
    setPos(clamp(nx, ny))
  }
  function onPointerUp() { drag.current = null }

  function exportBlob() {
    const img = imgRef.current
    if (!img || !nat) return
    const canvas = document.createElement('canvas')
    canvas.width = OUT; canvas.height = OUT
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const scale = nat.w / dw // natural px per displayed px
    const sx = (-pos.x) * scale
    const sy = (-pos.y) * scale
    const sSize = FRAME * scale
    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUT, OUT)
    canvas.toBlob(b => { if (b) onCropped(b) }, 'image/jpeg', 0.9)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()} dir={en ? 'ltr' : 'rtl'}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">{en ? 'Crop image' : 'חיתוך תמונה'}</h2>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div
          className="relative mx-auto rounded-full overflow-hidden bg-gray-100 touch-none cursor-grab active:cursor-grabbing"
          style={{ width: FRAME, height: FRAME }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {url && (
            <img
              ref={imgRef}
              src={url}
              alt=""
              draggable={false}
              onLoad={e => {
                const im = e.currentTarget
                setNat({ w: im.naturalWidth, h: im.naturalHeight })
              }}
              style={{ position: 'absolute', left: pos.x, top: pos.y, width: dw, height: dh, maxWidth: 'none' }}
            />
          )}
          <div className="absolute inset-0 ring-2 ring-white/60 rounded-full pointer-events-none" />
        </div>

        <div className="flex items-center gap-3 mt-5">
          <span className="text-xs text-gray-400">{en ? 'Zoom' : 'זום'}</span>
          <input type="range" min={1} max={3} step={0.01} value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className="flex-1 accent-blue-600" />
        </div>
        <p className="text-[11px] text-gray-400 mt-1 text-center">{en ? 'Drag to move, slide to zoom' : 'גרור להזזה, החלק לזום'}</p>

        <div className="flex gap-2 pt-4">
          <button type="button" onClick={exportBlob}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm">
            <Check className="w-4 h-4" /> {en ? 'Apply' : 'אישור'}
          </button>
          <button type="button" onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-medium">
            {en ? 'Cancel' : 'ביטול'}
          </button>
        </div>
      </div>
    </div>
  )
}
