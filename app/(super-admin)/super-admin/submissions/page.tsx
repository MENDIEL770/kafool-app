import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SubmissionsClient, { type Submission } from './SubmissionsClient'

export const dynamic = 'force-dynamic'

export default async function SuperAdminSubmissionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') redirect('/dashboard')

  const { data } = await supabase
    .from('contact_submissions')
    .select('id, full_name, phone, email, subject, message, source, is_read, created_at')
    .order('created_at', { ascending: false })
    .limit(300)

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <SubmissionsClient initial={(data ?? []) as Submission[]} />
      </div>
    </div>
  )
}
