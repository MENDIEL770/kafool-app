import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import OrgApproveButton from './OrgApproveButton'

export default async function SuperAdminOrgsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()

  if (profile?.role !== 'super_admin') redirect('/dashboard')

  const { data: orgs } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">ניהול ארגונים</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">כל הארגונים</CardTitle></CardHeader>
        <CardContent>
          <div className="divide-y divide-gray-50">
            {orgs?.map((org) => (
              <div key={org.id} className="py-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{org.name}</div>
                  <div className="text-sm text-gray-400" dir="ltr">kafool.com/{org.slug}</div>
                  {org.registration_number && (
                    <div className="text-xs text-gray-400">ח.פ: {org.registration_number}</div>
                  )}
                  <div className="text-xs text-gray-400">{new Date(org.created_at).toLocaleDateString('he-IL')}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={org.status === 'active' ? 'default' : org.status === 'pending' ? 'secondary' : 'destructive'}>
                    {org.status === 'active' ? 'פעיל' : org.status === 'pending' ? 'ממתין' : 'מושהה'}
                  </Badge>
                  {org.status === 'pending' && <OrgApproveButton orgId={org.id} />}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
