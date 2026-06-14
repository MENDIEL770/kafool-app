import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organizations(*)')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // If no org yet → send to onboarding
  if (profile.role !== 'super_admin' && !profile.org_id) {
    const { redirect } = await import('next/navigation')
    redirect('/onboarding')
  }

  // Org must be active (or user is super_admin)
  const org = (profile as { organizations?: { status: string } }).organizations
  if (profile.role !== 'super_admin' && org?.status !== 'active') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 text-center">
        <div className="space-y-3">
          <div className="text-4xl">⏳</div>
          <h2 className="text-xl font-bold">הארגון שלך ממתין לאישור</h2>
          <p className="text-gray-500">נחזור אליך בקרוב.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar profile={profile} />
      <main className="flex-1 min-w-0 p-4 lg:p-6 pt-[4.5rem] lg:pt-6 overflow-x-hidden">{children}</main>
    </div>
  )
}
