/**
 * Shared-secret gate for the payment webhooks (Kesher / Nedarim).
 *
 * The providers POST donation results to public URLs with no signature of their
 * own, so without this anyone who guesses the URL could forge a "completed"
 * donation (inflating the public total, triggering thank-you emails). We require
 * a secret the provider echoes back to us.
 *
 * OPT-IN so it can't break live donations before it's configured:
 *   - If WEBHOOK_SECRET is NOT set, every request is allowed (current behavior).
 *   - Once set, the request MUST carry the same secret via `?key=` in the URL
 *     or the `x-webhook-secret` header, otherwise it's rejected.
 *
 * To turn it on (BOTH steps together, or real donations stop recording):
 *   1. Set WEBHOOK_SECRET=<a long random string> in the Vercel env.
 *   2. In the Kesher AND Nedarim dashboards, change the callback URL to end with
 *      `?key=<the same string>` (e.g. https://www.kafool.com/api/webhooks/kesher?key=xxxx).
 */
export function webhookAuthorized(req: Request): boolean {
  const secret = process.env.WEBHOOK_SECRET
  if (!secret) return true // not configured yet — don't block live donations
  const url = new URL(req.url)
  const provided = url.searchParams.get('key') || req.headers.get('x-webhook-secret') || ''
  return provided === secret
}
