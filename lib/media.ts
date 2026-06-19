// Shared media + slug helpers used by the portfolio / project pages.

/** Turn a YouTube/Vimeo watch URL into an embeddable player URL (or null). */
export function getVideoEmbed(url: string): string | null {
  if (!url) return null
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s/]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1&playsinline=1`
  const vi = url.match(/vimeo\.com\/(\d+)/)
  if (vi) return `https://player.vimeo.com/video/${vi[1]}`
  // Google Drive share link → embeddable preview player
  const gd = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=|.*[?&]id=)([\w-]+)/)
  if (gd) return `https://drive.google.com/file/d/${gd[1]}/preview`
  return null
}

/** Best-effort thumbnail for a YouTube URL (or null). */
export function getYoutubeThumbnail(url: string): string | null {
  if (!url) return null
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s/]+)/)
  if (yt) return `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`
  return null
}

/**
 * Make a URL-safe slug from a title. Hebrew is stripped (URLs stay clean), so a
 * Hebrew-only title yields '' — callers should fall back to a random/id slug.
 */
export function toSlug(str: string): string {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/[֐-׿]/g, '') // strip Hebrew
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** True when the string is a UUID — used to resolve /design/<id> vs /design/<slug>. */
export function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}
