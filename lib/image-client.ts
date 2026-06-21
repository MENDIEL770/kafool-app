/**
 * Client-side image helpers for uploads.
 *
 * Vercel serverless functions reject request bodies over ~4.5MB with a plain
 * "Request Entity Too Large" response (not JSON) — which used to surface as the
 * cryptic `Unexpected token 'R'... is not valid JSON`. We avoid that by
 * downscaling large images in the browser before upload, and by handling
 * non-JSON / 413 responses with a clear Hebrew message.
 */

/** Downscale an image to fit within maxDim and re-encode as JPEG. */
export async function compressImage(file: File, maxDim = 1920, quality = 0.85): Promise<File> {
  // Skip non-raster / vector / animated formats and already-small files.
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file
  try {
    const bitmap = await createImageBitmap(file)
    let { width, height } = bitmap
    if (width <= maxDim && height <= maxDim && file.size < 1_500_000) {
      bitmap.close?.()
      return file
    }
    const scale = Math.min(1, maxDim / Math.max(width, height))
    width = Math.round(width * scale)
    height = Math.round(height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) { bitmap.close?.(); return file }
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close?.()
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', quality))
    if (!blob) return file
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}

/** Compress + upload a single image, returning its public URL. Throws on error. */
export async function uploadImage(file: File, path: string): Promise<string> {
  const toSend = await compressImage(file)
  const fd = new FormData()
  fd.append('file', toSend)
  fd.append('path', path)
  const res = await fetch('/api/upload', { method: 'POST', body: fd })
  if (!res.ok) {
    if (res.status === 413) throw new Error('הקובץ גדול מדי (מעל ~4.5MB). נסו תמונה קטנה יותר.')
    let msg = 'העלאת הקובץ נכשלה'
    const txt = await res.text().catch(() => '')
    try { msg = JSON.parse(txt).error || msg } catch { /* non-JSON error body */ }
    throw new Error(msg)
  }
  const data = await res.json().catch(() => ({}))
  if (!data.url) throw new Error('העלאת הקובץ נכשלה')
  return data.url as string
}
