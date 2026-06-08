import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function ThanksPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug, logo_url')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!org) notFound()

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, title, settings')
    .eq('org_id', org.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const primaryColor = (campaign?.settings as { primary_color?: string })?.primary_color || '#2563eb'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="text-center space-y-6 max-w-md">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center text-5xl mx-auto"
          style={{ backgroundColor: primaryColor + '20' }}
        >
          🙏
        </div>

        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">תודה רבה!</h1>
          <p className="text-gray-500 text-lg">תרומתך התקבלה בהצלחה</p>
          {org.name && (
            <p className="text-gray-400 text-sm mt-1">{org.name}</p>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-600 text-sm leading-relaxed">
            קבלה תישלח לאימייל שלך בקרוב.
            <br />
            תרומתך תשנה חיים.
          </p>
        </div>

        <Link
          href={`/${slug}`}
          className="inline-block px-8 py-3 rounded-xl font-bold text-white"
          style={{ backgroundColor: primaryColor }}
        >
          חזרה לדף הקמפיין
        </Link>
      </div>
    </div>
  )
}
