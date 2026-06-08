import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OrgActions from './OrgActions'

export default async function SuperAdminOrgsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()

  if (profile?.role !== 'super_admin') redirect('/dashboard')

  const { data: orgs } = await supabase
    .from('organizations')
    .select('*, profiles!organizations_owner_id_fkey(full_name, phone)')
    .order('created_at', { ascending: false })

  const total = orgs?.length || 0
  const active = orgs?.filter(o => o.status === 'active').length || 0
  const pending = orgs?.filter(o => o.status === 'pending').length || 0
  const suspended = orgs?.filter(o => o.status === 'suspended').length || 0

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ניהול ארגונים</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total} ארגונים רשומים במערכת</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'סה"כ', value: total, color: 'text-gray-800', bg: 'bg-gray-50', border: 'border-gray-200' },
          { label: 'פעילים', value: active, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-100' },
          { label: 'ממתינים', value: pending, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100' },
          { label: 'מושהים', value: suspended, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-100' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.bg} ${s.border}`}>
            <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Orgs table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-5 py-3 text-right font-semibold text-gray-500 text-xs uppercase tracking-wide">ארגון</th>
              <th className="px-5 py-3 text-right font-semibold text-gray-500 text-xs uppercase tracking-wide">בעלים</th>
              <th className="px-5 py-3 text-right font-semibold text-gray-500 text-xs uppercase tracking-wide">נרשם</th>
              <th className="px-5 py-3 text-right font-semibold text-gray-500 text-xs uppercase tracking-wide">סטטוס</th>
              <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {orgs?.map((org) => {
              const owner = org.profiles as { full_name: string; phone: string } | null
              return (
                <tr key={org.id} className="hover:bg-gray-50/50 transition-colors">
                  {/* Org */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {org.logo_url ? (
                        <img src={org.logo_url} alt={org.name} className="w-9 h-9 rounded-xl object-contain border border-gray-100 shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-black text-sm shrink-0">
                          {org.name[0]}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-gray-800">{org.name}</div>
                        <a href={`https://kafool.com/${org.slug}`} target="_blank" className="text-xs text-blue-500 hover:underline" dir="ltr">
                          kafool.com/{org.slug}
                        </a>
                        {org.registration_number && (
                          <div className="text-xs text-gray-400">ח.פ {org.registration_number}</div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Owner */}
                  <td className="px-5 py-4">
                    {owner ? (
                      <div>
                        <div className="font-medium text-gray-700">{owner.full_name}</div>
                        {owner.phone && <div className="text-xs text-gray-400" dir="ltr">{owner.phone}</div>}
                      </div>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>

                  {/* Date */}
                  <td className="px-5 py-4 text-gray-500 text-xs">
                    {new Date(org.created_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      org.status === 'active' ? 'bg-green-50 text-green-700' :
                      org.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        org.status === 'active' ? 'bg-green-500' :
                        org.status === 'pending' ? 'bg-amber-500' : 'bg-red-500'
                      }`} />
                      {org.status === 'active' ? 'פעיל' : org.status === 'pending' ? 'ממתין לאישור' : 'מושהה'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4">
                    <OrgActions orgId={org.id} status={org.status} slug={org.slug} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {(!orgs || orgs.length === 0) && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">אין ארגונים רשומים</p>
          </div>
        )}
      </div>
    </div>
  )
}
