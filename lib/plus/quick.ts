import 'server-only'
import crypto from 'crypto'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import type { PlusContext, PlusRole } from './context'

// ── Kafool+ "quick login" — shared-password role entry (no per-account auth).
// The login page offers 3 buttons (manager / coordinator / caller); a single
// shared password gates entry, then the user picks themselves from a list.
// Identity is carried in a signed, httpOnly cookie (kp_quick) that getPlusContext
// reads. This is an internal, low-stakes tool — the model is deliberately simple.

export const QUICK_PASSWORD = process.env.KP_QUICK_PASSWORD || '0508080770'
export const QUICK_COOKIE = 'kp_quick'
export const QUICK_GATE_COOKIE = 'kp_quick_gate'

const SECRET = process.env.KP_QUICK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'kafool-quick-dev'

function b64url(s: string) { return Buffer.from(s).toString('base64url') }
function sign(payload: string) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url').slice(0, 32)
}

/** Sign an arbitrary small payload into a `<data>.<sig>` token. */
export function signToken(obj: Record<string, unknown>): string {
  const data = b64url(JSON.stringify(obj))
  return `${data}.${sign(data)}`
}

/** Verify+decode a token produced by signToken; null if tampered/garbage. */
export function verifyToken<T = Record<string, unknown>>(token: string | undefined | null): T | null {
  if (!token || !token.includes('.')) return null
  const [data, sig] = token.split('.')
  if (!data || !sig || sign(data) !== sig) return null
  try { return JSON.parse(Buffer.from(data, 'base64url').toString()) as T } catch { return null }
}

/** The single org that is subscribed to Kafool+ (the "מנהל ראשי" scope). */
export async function kafoolPlusOrgId(admin?: Awaited<ReturnType<typeof createServiceClient>>): Promise<string | null> {
  const a = admin ?? await createServiceClient()
  const { data } = await a.from('organizations').select('id').eq('has_kafool_plus', true).limit(1)
  return (data ?? [])[0]?.id ?? null
}

/**
 * Resolve the Kafool+ context from the quick-login cookie, or null if absent/
 * invalid. Mirrors getPlusContext's shapes so the rest of the module is unaware
 * that no real Supabase session exists.
 */
export async function getQuickIdentity(): Promise<PlusContext | null> {
  const token = (await cookies()).get(QUICK_COOKIE)?.value
  const claim = verifyToken<{ r: 'manager' | 'member'; id: string }>(token)
  if (!claim) return null
  const admin = await createServiceClient()

  if (claim.r === 'manager') {
    // id is the org id; re-validate it still has Kafool+.
    const { data: org } = await admin.from('organizations').select('id, has_kafool_plus').eq('id', claim.id).limit(1)
    const o = (org ?? [])[0]
    if (!o || o.has_kafool_plus === false) return null
    return { role: 'manager', orgId: o.id, isSuperAdmin: false, userId: `quick-mgr-${o.id}`, email: 'מנהל ראשי', member: null }
  }

  // member (coordinator / caller): id is the kp_members row id.
  const { data: rows } = await admin
    .from('kp_members')
    .select('id, role, organization_id, campaign_id, caller_group_id, email')
    .eq('id', claim.id).eq('is_active', true).limit(1)
  const m = (rows ?? [])[0]
  if (!m) return null
  return {
    role: m.role as PlusRole,
    orgId: m.organization_id,
    isSuperAdmin: false,
    userId: `quick-${m.id}`,
    email: m.email ?? null,
    member: { id: m.id, role: m.role as PlusRole, campaign_id: m.campaign_id, caller_group_id: m.caller_group_id },
  }
}
