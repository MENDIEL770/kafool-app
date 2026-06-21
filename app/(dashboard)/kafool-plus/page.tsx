import { createClient } from '@/lib/supabase/server'
import { getKafoolPlusContext } from '@/lib/kafoolplus'
import ManagerHome from './ManagerHome'

export const dynamic = 'force-dynamic'

function Notice({ children }: { children: React.ReactNode }) {
  return <div dir="rtl" className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-500">{children}</div>
}

export default async function KafoolPlusPage() {
  const supabase = await createClient()
  const kp = await getKafoolPlusContext(supabase)

  if (!kp.role) return <Notice>אין לך גישה למוקד Kafool+.</Notice>
  if (kp.role === 'coordinator') return <Notice>ממשק הרכז בבנייה — בקרוב.</Notice>
  if (kp.role === 'caller') return <Notice>מסך הטלפן בבנייה — בקרוב.</Notice>
  if (!kp.orgId) return <Notice>היכנס לארגון (ניהול ארגונים → כניסה) כדי לנהל מוקד Kafool+.</Notice>

  const [campaignsRes, branchesRes, membersRes] = await Promise.all([
    supabase.from('kafoolplus_master_campaigns').select('*').eq('org_id', kp.orgId).order('created_at', { ascending: false }),
    supabase.from('kafoolplus_branches').select('*').eq('org_id', kp.orgId).order('created_at', { ascending: false }),
    supabase.from('kafoolplus_members').select('id, email, role, branch_id, user_id, is_active').eq('org_id', kp.orgId),
  ])

  return (
    <ManagerHome
      campaigns={campaignsRes.data ?? []}
      branches={branchesRes.data ?? []}
      members={membersRes.data ?? []}
    />
  )
}
