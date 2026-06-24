'use client'

import { useStore, type SessionUser } from './store'
import type { Role } from './types'

/**
 * Returns the telephony session if the user's role is allowed, else null.
 * Access is already enforced server-side in the /plus layout; this is the
 * in-component guard the ported screens use (same API as the old useAuth).
 */
export function useRequireRole(allowed: Role[]): SessionUser | null {
  const session = useStore((s) => s.session)
  if (!session || !allowed.includes(session.role)) return null
  return session
}
