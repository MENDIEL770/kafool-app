// Light HTML sanitizer for manager-authored rich text (about text).
// The author is an authenticated manager editing their own campaign page, so
// this is defense-in-depth — but the result renders on the PUBLIC donation page,
// so we strip the common stored-XSS vectors before dangerouslySetInnerHTML.
// (For a hardened guarantee, move this server-side onto a vetted library such
//  as `sanitize-html`/DOMPurify; the regex below raises the bar without a dep.)
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return ''
  return html
    // dangerous elements (paired form: strip tag + content)
    .replace(/<\s*(script|style|iframe|object|embed|link|meta|svg|math|base|form|frame|frameset|template|noscript)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    // dangerous elements (self-closing / unmatched)
    .replace(/<\s*(script|style|iframe|object|embed|link|meta|svg|math|base|form|frame|frameset|template|noscript)\b[^>]*\/?>/gi, '')
    // inline event handlers (quoted and unquoted)
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    // attributes that can execute or embed hostile content (keep `style` — it
    // carries legitimate rich-text formatting)
    .replace(/\s(?:srcdoc|formaction|xlink:href)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // executable URL schemes (allow data:image so pasted inline images survive;
    // only neutralize the html-bearing data: form)
    .replace(/(?:javascript|vbscript)\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, 'data:')
    // links open in a new tab (drop any existing target/rel first, then add safe ones)
    .replace(/<a\b([^>]*)>/gi, (_m, attrs) => {
      const cleaned = String(attrs).replace(/\s(?:target|rel)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      return `<a${cleaned} target="_blank" rel="noopener noreferrer">`
    })
}
