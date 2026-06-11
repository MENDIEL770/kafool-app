import type { SupabaseClient } from '@supabase/supabase-js'

/** Build a URL-safe slug from a (possibly Hebrew) org name, falling back to a random suffix. */
function baseSlug(name: string): string {
  const latin = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30)
  return latin || `org-${Math.random().toString(36).slice(2, 8)}`
}

async function uniqueSlug(admin: SupabaseClient, name: string): Promise<string> {
  const root = baseSlug(name)
  let slug = root
  for (let i = 0; i < 20; i++) {
    const { data } = await admin.from('organizations').select('id').eq('slug', slug).maybeSingle()
    if (!data) return slug
    slug = `${root}-${i + 2}`
  }
  return `${root}-${Math.random().toString(36).slice(2, 6)}`
}

export interface ConvertResult {
  ok: boolean
  orgId?: string
  slug?: string
  error?: string
  alreadyConverted?: boolean
}

/**
 * Convert a lead into an active organization.
 * Idempotent: if the lead is already linked to an org, returns it unchanged.
 *
 * @param admin   a Supabase client with the service role (bypasses RLS)
 * @param leadId  the lead to convert
 * @param baseUrl base URL for invite redirect (e.g. https://kafool.com)
 */
export async function convertLeadToOrg(
  admin: SupabaseClient,
  leadId: string,
  baseUrl: string
): Promise<ConvertResult> {
  const { data: lead, error: leadErr } = await admin
    .from('sales_leads')
    .select('*')
    .eq('id', leadId)
    .single()

  if (leadErr || !lead) return { ok: false, error: 'הליד לא נמצא' }
  if (lead.converted_org_id) {
    const { data: org } = await admin
      .from('organizations')
      .select('slug')
      .eq('id', lead.converted_org_id)
      .single()
    return { ok: true, orgId: lead.converted_org_id, slug: org?.slug, alreadyConverted: true }
  }

  const slug = await uniqueSlug(admin, lead.org_name)

  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .insert({ name: lead.org_name, slug, status: 'active' })
    .select()
    .single()

  if (orgErr || !org) return { ok: false, error: orgErr?.message || 'יצירת הארגון נכשלה' }

  // Invite / link the owner if we have an email
  if (lead.email) {
    try {
      const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(lead.email, {
        data: { org_id: org.id, role: 'admin', full_name: lead.contact_name || '', phone: lead.phone || '' },
        redirectTo: `${baseUrl}/dashboard`,
      })
      if (inviteError?.message?.includes('already been registered')) {
        const { data: { users } } = await admin.auth.admin.listUsers()
        const target = users.find(u => u.email === lead.email)
        if (target) {
          await admin.from('profiles').update({ org_id: org.id, role: 'admin' }).eq('id', target.id)
          await admin.from('organizations').update({ owner_id: target.id }).eq('id', org.id)
        }
      }
    } catch (e) {
      console.error('convertLeadToOrg invite error', e)
    }
  }

  await admin
    .from('sales_leads')
    .update({ converted_org_id: org.id, stage: 'won' })
    .eq('id', lead.id)

  return { ok: true, orgId: org.id, slug: org.slug }
}
