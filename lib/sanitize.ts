// Light HTML sanitizer for manager-authored rich text (about text).
// The author is an authenticated manager editing their own campaign page, so
// this is defense-in-depth: strip scripts/embeds, inline event handlers, and
// javascript: URLs before rendering with dangerouslySetInnerHTML.
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return ''
  return html
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)\b[^>]*\/?>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript:/gi, '')
    // links open in a new tab (drop any existing target/rel first, then add safe ones)
    .replace(/<a\b([^>]*)>/gi, (_m, attrs) => {
      const cleaned = String(attrs).replace(/\s(?:target|rel)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      return `<a${cleaned} target="_blank" rel="noopener noreferrer">`
    })
}
