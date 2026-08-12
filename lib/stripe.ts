import 'server-only'
import Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'

// Build a Stripe client for a specific secret key (per-organization). Falls back
// to the platform env key when an org hasn't set its own. Returns null when
// neither is configured, so the app keeps working with Stripe simply off.
export function stripeFromKey(key?: string | null): Stripe | null {
  const k = (key || '').trim() || process.env.STRIPE_SECRET_KEY || ''
  if (!k) return null
  return new Stripe(k)
}

// Env-only client (kept for backward compatibility).
export function getStripe(): Stripe | null {
  return stripeFromKey(null)
}

/** An org's Stripe credentials, stored on the organizations row (server-only). */
export async function getOrgStripe(
  supabase: SupabaseClient,
  orgId: string,
): Promise<{ secretKey: string | null; webhookSecret: string | null }> {
  const { data } = await supabase
    .from('organizations')
    .select('stripe_secret_key, stripe_webhook_secret')
    .eq('id', orgId)
    .maybeSingle()
  return {
    secretKey: ((data?.stripe_secret_key as string) || '').trim() || null,
    webhookSecret: ((data?.stripe_webhook_secret as string) || '').trim() || null,
  }
}
