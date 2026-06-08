import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import SlugEditor from './SlugEditor'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organizations(*)')
    .eq('id', user!.id)
    .single()

  const org = (profile as {
    organizations?: {
      name: string
      slug: string
      registration_number?: string
      receipt_name?: string
    }
  }).organizations

  return (
    <div className="max-w-2xl mx-auto space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-900">הגדרות</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">פרטים אישיים</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">שם</span>
            <span className="font-medium">{profile?.full_name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">אימייל</span>
            <span className="font-medium" dir="ltr">{user?.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">תפקיד</span>
            <span className="font-medium">{profile?.role}</span>
          </div>
        </CardContent>
      </Card>

      {org && (
        <Card>
          <CardHeader><CardTitle className="text-base">פרטי הארגון</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">שם הארגון</span>
              <span className="font-medium">{org.name}</span>
            </div>

            <div className="flex justify-between items-start gap-4 text-sm">
              <span className="text-gray-500 shrink-0 pt-1.5">כתובת דף הגיוס</span>
              <SlugEditor currentSlug={org.slug} />
            </div>

            {org.registration_number && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">ח.פ / ע.ר</span>
                <span className="font-medium">{org.registration_number}</span>
              </div>
            )}
            {org.receipt_name && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">שם לקבלה</span>
                <span className="font-medium">{org.receipt_name}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
