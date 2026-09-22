import type { SupabaseClient } from '@supabase/supabase-js'

// WhatsApp is in pilot: only organizations listed in WHATSAPP_PILOT_ORGS (comma-
// separated org IDs and/or slugs) can see or use the connection feature. Empty =
// OFF for everyone. Set to "*" to open it to all (launch).
export function whatsappPilotList(): string[] {
  return (process.env.WHATSAPP_PILOT_ORGS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
}

export function isWhatsappPilot(orgId?: string | null, orgSlug?: string | null): boolean {
  const list = whatsappPilotList()
  if (!list.length) return false
  if (list.includes('*')) return true
  const id = (orgId || '').toLowerCase()
  const slug = (orgSlug || '').toLowerCase()
  return (!!id && list.includes(id)) || (!!slug && list.includes(slug))
}

/** Resolve the signed-in caller's org and whether WhatsApp is enabled for it. */
export async function callerWhatsappPilot(supabase: SupabaseClient): Promise<{ orgId: string | null; pilot: boolean }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { orgId: null, pilot: false }
  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
  const orgId = profile?.org_id || null
  if (!orgId) return { orgId: null, pilot: false }
  let slug: string | null = null
  try {
    const { data: org } = await supabase.from('organizations').select('slug').eq('id', orgId).maybeSingle()
    slug = (org as { slug?: string } | null)?.slug || null
  } catch { /* ignore */ }
  return { orgId, pilot: isWhatsappPilot(orgId, slug) }
}
