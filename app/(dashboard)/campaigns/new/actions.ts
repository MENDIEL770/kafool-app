'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getContext } from '@/lib/tenancy'
import { redirect } from 'next/navigation'

export async function createCampaign(formData: {
  title: string
  slug: string
  description: string
  goal_amount: number
  bonus_goal_amount: number | null
  start_at: string | null
  end_at: string | null
  primary_color: string
  page_type?: 'donation' | 'products'
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'לא מחובר' }

  // Scope to the org currently in context — for a super admin that's the org
  // they've "entered" (kf_org cookie), NOT their own profile.org_id. Using the
  // latter created campaigns under the wrong org (invisible in the entered org).
  const ctx = await getContext(supabase)

  // Only the platform manager (super admin) may open new campaign pages; a
  // regular account can only manage the pages that were opened for it.
  if (!ctx.isSuperAdmin) {
    return { error: 'רק מנהל המערכת יכול לפתוח דף חדש. פנה למנהל.' }
  }
  if (!ctx.orgId) {
    return { error: 'לא נבחר ארגון — היכנס לארגון תחילה' }
  }

  // A super admin creates campaigns in an org that isn't their own, which the
  // user-session client's RLS forbids. Once getContext has confirmed the
  // super_admin role, use the service-role client for the insert. A regular
  // admin stays on the RLS-enforced client (ctx.orgId is their own org).
  const db = ctx.isSuperAdmin ? await createServiceClient() : supabase

  const { data, error } = await db
    .from('campaigns')
    .insert({
      org_id: ctx.orgId,
      title: formData.title,
      slug: formData.slug,
      description: formData.description || null,
      goal_amount: formData.goal_amount,
      bonus_goal_amount: formData.bonus_goal_amount,
      start_at: formData.start_at,
      end_at: formData.end_at,
      status: 'draft',
      settings: {
        page_type: formData.page_type === 'products' ? 'products' : 'donation',
        donation_amounts: [180, 360, 720, 1800, 3600],
        primary_color: formData.primary_color,
        secondary_color: '#1e40af',
        about_text: null,
      },
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { id: data.id }
}
