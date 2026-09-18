import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { whatsappProvider } from '@/lib/whatsapp'
import WhatsAppClient from './WhatsAppClient'

export const dynamic = 'force-dynamic'

export default async function SuperAdminWhatsAppPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <WhatsAppClient provider={whatsappProvider()} />
      </div>
    </div>
  )
}
