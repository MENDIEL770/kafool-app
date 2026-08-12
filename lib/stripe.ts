import 'server-only'
import Stripe from 'stripe'

// Lazily-built Stripe client. Returns null until STRIPE_SECRET_KEY is set, so the
// app keeps working (Stripe just stays off) until it's configured.
let client: Stripe | null = null

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  if (!client) client = new Stripe(key)
  return client
}
