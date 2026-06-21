import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getKafoolPlusContext } from '@/lib/kafoolplus'
import ManagerHome from './ManagerHome'
import CoordinatorHome from './CoordinatorHome'
import CallerScreen from './CallerScreen'

export const dynamic = 'force-dynamic'

function Notice({ children }: { children: React.ReactNode }) {
  return <div dir="rtl" className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-500">{children}</div>
}

export default async function KafoolPlusPage() {
  const supabase = await createClient()
  const kp = await getKafoolPlusContext(supabase)
  if (!kp.role) return <Notice>אין לך גישה למוקד Kafool+.</Notice>
  const admin = await createServiceClient()

  // ─── Caller ───
  if (kp.role === 'caller') {
    const groupId = kp.member?.caller_group_id
    if (!groupId) return <Notice>לא נמצא דף קבוצה עבורך.</Notice>
    const [groupRes, leadsRes, callsRes, remindersRes, branchRes] = await Promise.all([
      admin.from('kafoolplus_caller_groups').select('*').eq('id', groupId).maybeSingle(),
      admin.from('kafoolplus_leads').select('*').eq('assigned_caller_group_id', groupId).order('created_at', { ascending: true }),
      admin.from('kafoolplus_calls').select('id, lead_id, outcome, notes, called_at').eq('caller_group_id', groupId).order('called_at', { ascending: false }),
      admin.from('kafoolplus_reminders').select('id, lead_id, due_at, note, status').eq('caller_group_id', groupId).eq('status', 'pending').order('due_at', { ascending: true }),
      kp.member?.branch_id ? admin.from('kafoolplus_branches').select('id, name, master_campaign_id').eq('id', kp.member.branch_id).maybeSingle() : Promise.resolve({ data: null }),
    ])
    let script = null
    const mc = (branchRes.data as { master_campaign_id?: string } | null)?.master_campaign_id
    if (mc) {
      const { data: camp } = await admin.from('kafoolplus_master_campaigns').select('call_script').eq('id', mc).maybeSingle()
      script = camp?.call_script ?? null
    }
    return (
      <CallerScreen
        group={groupRes.data}
        leads={leadsRes.data ?? []}
        calls={callsRes.data ?? []}
        reminders={remindersRes.data ?? []}
        callScript={script}
      />
    )
  }

  // ─── Coordinator ───
  if (kp.role === 'coordinator') {
    const branchId = kp.member?.branch_id
    if (!branchId) return <Notice>לא נמצא סניף עבורך.</Notice>
    const [branchRes, groupsRes, leadsRes, membersRes] = await Promise.all([
      admin.from('kafoolplus_branches').select('*').eq('id', branchId).maybeSingle(),
      admin.from('kafoolplus_caller_groups').select('*').eq('branch_id', branchId).order('created_at', { ascending: false }),
      admin.from('kafoolplus_leads').select('id, full_name, phone, status, assigned_caller_group_id').eq('branch_id', branchId).order('created_at', { ascending: false }),
      admin.from('kafoolplus_members').select('id, email, role, caller_group_id, user_id').eq('branch_id', branchId).eq('role', 'caller'),
    ])
    return (
      <CoordinatorHome
        branch={branchRes.data}
        callerGroups={groupsRes.data ?? []}
        leads={leadsRes.data ?? []}
        members={membersRes.data ?? []}
      />
    )
  }

  // ─── Manager ───
  if (!kp.orgId) return <Notice>היכנס לארגון (ניהול ארגונים → כניסה) כדי לנהל מוקד Kafool+.</Notice>
  const [campaignsRes, branchesRes, membersRes, groupsRes, promisesRes, leadsRes, callsCount] = await Promise.all([
    admin.from('kafoolplus_master_campaigns').select('*').eq('org_id', kp.orgId).order('created_at', { ascending: false }),
    admin.from('kafoolplus_branches').select('*').eq('org_id', kp.orgId).order('created_at', { ascending: false }),
    admin.from('kafoolplus_members').select('id, email, role, branch_id, user_id, is_active').eq('org_id', kp.orgId),
    admin.from('kafoolplus_caller_groups').select('id, display_name, branch_id').eq('org_id', kp.orgId),
    admin.from('kafoolplus_promises').select('amount, status, caller_group_id').eq('org_id', kp.orgId),
    admin.from('kafoolplus_leads').select('status').eq('org_id', kp.orgId),
    admin.from('kafoolplus_calls').select('id', { count: 'exact', head: true }).eq('org_id', kp.orgId),
  ])

  return (
    <ManagerHome
      campaigns={campaignsRes.data ?? []}
      branches={branchesRes.data ?? []}
      members={membersRes.data ?? []}
      groups={groupsRes.data ?? []}
      promises={promisesRes.data ?? []}
      leadStatuses={(leadsRes.data ?? []).map(l => l.status)}
      callsCount={callsCount.count ?? 0}
    />
  )
}
