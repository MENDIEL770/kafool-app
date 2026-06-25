import 'server-only'
import crypto from 'crypto'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import type { PlusContext, PlusRole } from './context'

// ── No-login DEMO links ──────────────────────────────────────────────────────
// A signed link (…/api/plus/demo?t=<token>) drops the visitor straight into a
// specific Kafool+ member's screen with NO login — for live demos to an audience.
// The token encodes a kp_members id; the route sets a signed httpOnly cookie that
// getPlusContext reads. HMAC secret is the service-role key (same on prod+local),
// so links generated offline verify on the server.

const SECRET = process.env.KP_DEMO_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'kafool-demo'
export const DEMO_COOKIE = 'kp_demo'

const sig = (data: string) => crypto.createHmac('sha256', SECRET).update(data).digest('base64url').slice(0, 32)

/** Sign a member id into a `<data>.<sig>` demo token. */
export function signDemo(memberId: string): string {
  const data = Buffer.from(JSON.stringify({ m: memberId })).toString('base64url')
  return `${data}.${sig(data)}`
}

/** Verify a demo token → the member id, or null if tampered. */
export function verifyDemo(token?: string | null): string | null {
  if (!token || !token.includes('.')) return null
  const [data, s] = token.split('.')
  if (!data || !s || sig(data) !== s) return null
  try { return JSON.parse(Buffer.from(data, 'base64url').toString()).m as string } catch { return null }
}

/** Resolve the Kafool+ context from the demo cookie, or null. */
export async function getDemoIdentity(): Promise<PlusContext | null> {
  const memberId = verifyDemo((await cookies()).get(DEMO_COOKIE)?.value)
  if (!memberId) return null
  const admin = await createServiceClient()
  const { data } = await admin.from('kp_members')
    .select('id, role, organization_id, campaign_id, caller_group_id, email')
    .eq('id', memberId).eq('is_active', true).limit(1)
  const m = (data ?? [])[0]
  if (!m) return null
  return {
    role: m.role as PlusRole, orgId: m.organization_id, isSuperAdmin: false,
    userId: `demo-${m.id}`, email: m.email ?? 'דמו',
    member: { id: m.id, role: m.role as PlusRole, campaign_id: m.campaign_id, caller_group_id: m.caller_group_id },
  }
}
