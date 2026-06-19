// Client-side counterpart of lib/tenancy.ts (no next/headers import, so it's
// safe in 'use client' components). Reads the kf_org cookie in the browser.
export const ORG_COOKIE = 'kf_org'

export function getClientOrgId(profile: { role?: string | null; org_id?: string | null } | null): string | null {
  if (!profile) return null
  if (profile.role !== 'super_admin') return profile.org_id ?? null
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(/(?:^|;\s*)kf_org=([^;]+)/)
  return m ? decodeURIComponent(m[1]) : null
}
