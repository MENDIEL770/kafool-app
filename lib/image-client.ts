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
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024 // 100MB per campaign video

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
  // Always downscale to a web-friendly size (compressImage is a no-op for small /
  // vector / animated files) — previously images up to 10MB were uploaded as-is,
  // so donors downloaded full-resolution photos. 1920px @ 0.82 is plenty for web.
  let toSend = await compressImage(file, 1920, 0.82)
  if (toSend.size > MAX_UPLOAD_BYTES) {
    toSend = await compressImage(file, 1600, 0.78)
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

// Request a fresh signed upload URL/token for a path.
async function signUpload(path: string, ext: string): Promise<{ fullPath: string; token: string }> {
  const res = await fetch('/api/upload/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, ext }),
  })
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    throw new Error(d.error || 'יצירת הרשאת ההעלאה נכשלה')
  }
  const { path: fullPath, token } = await res.json()
  return { fullPath, token }
}

/**
 * Upload a campaign video straight to Supabase Storage (via a signed URL, like
 * images — so it bypasses Vercel's ~4.5MB function-body limit). No compression:
 * videos are stored as-is, capped at MAX_VIDEO_BYTES (100MB). Reports upload
 * progress (0–100) via onProgress; uses a raw XHR PUT for real progress and
 * falls back to the SDK (no progress) if that fails. Returns the public URL.
 */
export async function uploadVideo(file: File, path: string, onProgress?: (pct: number) => void): Promise<string> {
  if (file.type && !file.type.startsWith('video/')) {
    throw new Error('הקובץ אינו סרטון תקין.')
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error('הסרטון גדול מ-100MB. נסו קובץ קטן יותר, או הדביקו קישור YouTube / Drive.')
  }
  const ext = (file.name.split('.').pop() || 'mp4').toLowerCase()
  const supabase = createClient()

  // 1) real progress via XHR PUT to the signed-upload endpoint.
  try {
    const { fullPath, token } = await signUpload(path, ext)
    const uploadUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/upload/sign/${BUCKET}/${fullPath}?token=${token}`
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', uploadUrl)
      xhr.setRequestHeader('content-type', file.type || 'video/mp4')
      xhr.setRequestHeader('x-upsert', 'true')
      xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100)) }
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`HTTP ${xhr.status}`))
      xhr.onerror = () => reject(new Error('network'))
      xhr.send(file)
    })
    onProgress?.(100)
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(fullPath)
    return `${publicUrl}?t=${Date.now()}`
  } catch {
    // 2) fallback: SDK upload (no progress) with a FRESH token (the XHR may have spent the first).
    const { fullPath, token } = await signUpload(path, ext)
    const { error } = await supabase.storage
      .from(BUCKET)
      .uploadToSignedUrl(fullPath, token, file, { contentType: file.type || 'video/mp4' })
    if (error) throw new Error(error.message || 'העלאת הסרטון נכשלה')
    onProgress?.(100)
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(fullPath)
    return `${publicUrl}?t=${Date.now()}`
  }
}
