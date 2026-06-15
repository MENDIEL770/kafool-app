import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organizations(*)')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'super_admin') redirect('/dashboard')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar profile={profile} />
      <main className="flex-1 min-w-0 overflow-x-hidden pt-14 lg:pt-0">{children}</main>
    </div>
  )
}
