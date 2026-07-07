/**
 * Tiny in-memory rate limiter (fixed window) for public API routes.
 *
 * Keyed by an identifier (IP or user id). Returns true if the call is allowed.
 * This is best-effort: on serverless each instance keeps its own map, but with
 * Fluid Compute instances are reused, so it still throttles naive floods and
 * brute-force without any external service. For hard guarantees across all
 * instances, back this with Vercel KV / Upstash later.
 */
const buckets = new Map<string, { count: number; reset: number }>()

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()

  // opportunistic cleanup so the map can't grow unbounded
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k)
  }

  const b = buckets.get(key)
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs })
    return true
  }
  if (b.count >= limit) return false
  b.count++
  return true
}

/** Best-effort client IP from the request headers. */
export function clientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}
