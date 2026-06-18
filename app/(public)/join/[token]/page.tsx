import { createServiceClient } from '@/lib/supabase/server'
import IntakeForm from './IntakeForm'

export const dynamic = 'force-dynamic'

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createServiceClient()
  const { data: lead } = await supabase
    .from('sales_leads')
    .select('id, org_name, contact_name, contact_last_name, email, phone, address, company_id, auth_user_id')
    .eq('intake_token', token)
    .maybeSingle()

  const invalid = !lead
  const alreadyDone = !!lead?.auth_user_id

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl p-6 sm:p-8">
        <h1 className="text-2xl font-black text-gray-900 mb-1">פתיחת חשבון ב-Kafool</h1>

        {invalid ? (
          <p className="text-gray-500 mt-4">הקישור אינו תקין או שפג תוקפו. אנא פנה אלינו לקבלת קישור חדש.</p>
        ) : alreadyDone ? (
          <p className="text-gray-500 mt-4">הטופס כבר מולא 🎉 נחזור אליך להשלמת התהליך.</p>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-6">מלא את הפרטים ובחר סיסמה — לאחר השלמת התשלום החשבון יופעל.</p>
            <IntakeForm
              token={token}
              initial={{
                firstName: lead!.contact_name || '',
                lastName: lead!.contact_last_name || '',
                email: lead!.email || '',
                phone: lead!.phone || '',
                address: lead!.address || '',
                companyId: lead!.company_id || '',
                orgName: lead!.org_name || '',
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}
