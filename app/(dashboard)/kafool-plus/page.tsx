import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getKafoolPlusContext } from '@/lib/kafoolplus'
import ManagerHome from './ManagerHome'
import CoordinatorHome from './CoordinatorHome'
import CallerScreen from './CallerScreen'

export const dynamic = 'force-dynamic'

function Notice({ children }: { children: React.ReactNode }) {
  return <div dir="rtl" className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-500">{children}</div>
}

const SAMPLE_GROUP = { id: 'demo', display_name: 'דוד כהן (תצוגה)', public_slug: 'demo', donation_link: 'https://www.kafool.com/demo', personal_goal: 50000 }
const SAMPLE_LEADS = [
  { id: 'd1', full_name: 'משה לוי', phone: '0501234567', email: 'moshe@example.com', address: 'רחוב הרצל 5, תל אביב', birthday: null, notes: 'מעדיף שיחות בערב', status: 'new', is_vip: true, donation_history: [{ year: 2024, amount: 5000 }, { year: 2023, amount: 3600 }] },
  { id: 'd2', full_name: 'שרה כהן', phone: '0529876543', email: null, address: null, birthday: null, notes: null, status: 'new', is_vip: false, donation_history: [{ year: 2024, amount: 360 }] },
  { id: 'd3', full_name: 'יעקב פרידמן', phone: '0541112222', email: 'yaakov@example.com', address: 'ירושלים', birthday: null, notes: null, status: 'no_answer', is_vip: false, donation_history: [] },
]

export default async function KafoolPlusPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const supabase = await createClient()
  const kp = await getKafoolPlusContext(supabase)
  if (!kp.role) return (
    <Notice>
      <div className="space-y-2">
        <p className="font-bold text-gray-700">חשבון Google זה אינו רשום במוקד Kafool+</p>
        <p>פנה למנהל כדי שירשום את כתובת המייל שלך, ואז התחבר שוב.</p>
        <a href="/kafool-plus-login" className="text-indigo-600 hover:underline text-sm">חזרה להתחברות</a>
      </div>
    </Notice>
  )

  // Manager/super-admin can preview the caller screen with sample data.
  const sp = await searchParams
  if (kp.role === 'manager' && sp?.preview === 'caller') {
    return <CallerScreen group={SAMPLE_GROUP} leads={SAMPLE_LEADS} calls={[]} reminders={[]} callScript={'פתיחה: שלום, מדבר/ת ___ ממוקד הגיוס...\nסיפור: ...\nהתנגדויות: ...\nסגירה: אשמח אם תוכל/י לתרום היום.'} />
  }

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
