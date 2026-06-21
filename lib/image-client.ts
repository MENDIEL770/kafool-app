/**
 * Client-side image helpers for uploads.
 *
 * Files upload DIRECTLY to Supabase Storage via a signed upload URL, so they
 * bypass the ~4.5MB request-body limit on Vercel functions (the old route
 * returned a plain "Request Entity Too Large" that broke JSON parsing). This
 * lets us accept large images up to MAX_UPLOAD_BYTES; anything bigger is
 * downscaled in the browser, and if it's still too big we surface a clear error.
 */
import { createClient } from '@/lib/supabase/client'

const BUCKET = 'campaign-media'
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10MB per image

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

/**
 * Upload a single image straight to Supabase Storage (via a signed URL).
 * Files up to MAX_UPLOAD_BYTES are uploaded as-is to preserve quality; anything
 * larger is downscaled first, and rejected only if it's still over the limit.
 * Returns the public URL. Throws on error.
 */
export async function uploadImage(file: File, path: string): Promise<string> {
  let toSend = file
  if (toSend.size > MAX_UPLOAD_BYTES) {
    toSend = await compressImage(file, 2560, 0.85)
    if (toSend.size > MAX_UPLOAD_BYTES) {
      throw new Error('הקובץ גדול מ-10MB גם אחרי כיווץ. נסו קובץ קטן יותר.')
    }
  }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const signRes = await fetch('/api/upload/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, ext }),
  })
  if (!signRes.ok) {
    const d = await signRes.json().catch(() => ({}))
    throw new Error(d.error || 'יצירת הרשאת ההעלאה נכשלה')
  }
  const { path: fullPath, token } = await signRes.json()

  const supabase = createClient()
  const { error } = await supabase.storage
    .from(BUCKET)
    .uploadToSignedUrl(fullPath, token, toSend, { contentType: toSend.type || 'image/jpeg' })
  if (error) throw new Error(error.message || 'העלאת הקובץ נכשלה')

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(fullPath)
  return `${publicUrl}?t=${Date.now()}`
}
