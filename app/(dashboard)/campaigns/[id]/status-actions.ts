'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getContext } from '@/lib/tenancy'

/**
 * Activate / stop a campaign. A super admin operating inside an entered org is
 * blocked by the user-session client's RLS (the campaign isn't in their own
 * org), so — once getContext confirms the super_admin role — we persist via the
 * service-role client. Regular admins stay on the RLS-enforced client.
 */
export async function setCampaignStatus(campaignId: string, status: 'active' | 'ended' | 'draft') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'לא מחובר' }

  const ctx = await getContext(supabase)
  const db = ctx.isSuperAdmin ? await createServiceClient() : supabase

  const { error } = await db.from('campaigns').update({ status }).eq('id', campaignId)
  if (error) return { error: error.message }
  return { ok: true }
}
