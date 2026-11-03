import type { Metadata } from 'next'
import { Rubik } from 'next/font/google'
import { notFound } from 'next/navigation'
import { createClient as createAdmin } from '@supabase/supabase-js'
import '../../services/services.css'
import { Mark } from '../../services/_svg'
import Report from '../../services/Report'
import type { ReportSnapshot } from '@/lib/services/report'

const rubik = Rubik({ subsets: ['hebrew', 'latin'], weight: ['400', '500'], display: 'swap', variable: '--font-services-rubik' })

// Personal report — never indexed, never listed. Each page loads ONLY the row
// for its token, server-side with the service role (the leads table has RLS on
// and no public policy), so there is no way to browse between reports.
export const metadata: Metadata = {
  title: 'דוח מוכנות לקמפיין — כפול',
  robots: { index: false, follow: false, nocache: true },
}
export const dynamic = 'force-dynamic'

async function loadReport(token: string): Promise<{ report: ReportSnapshot; org: string } | null> {
  if (!token || !/^[a-f0-9]{16,64}$/.test(token)) return null
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  const supabase = createAdmin(url, key)
  const { data } = await supabase.from('campaign_leads').select('report, org').eq('token', token).maybeSingle()
  if (!data?.report) return null
  return { report: data.report as ReportSnapshot, org: data.org as string }
}

export default async function ReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const loaded = await loadReport(token)
  if (!loaded) notFound()

  return (
    <div className={'kp ' + rubik.variable} dir="rtl" style={{ minHeight: '100vh' }}>
      <header style={{ maxWidth: 860, margin: '0 auto', boxSizing: 'border-box', padding: 'clamp(40px,8vw,72px) 24px clamp(20px,4vw,32px)', textAlign: 'center' }}>
        <Mark center />
        <p style={{ margin: 0, color: '#FF7A63', fontSize: 'clamp(15px,1.6vw,18px)' }}>דוח מוכנות אישי</p>
        <h1 style={{ margin: '6px 0 0', fontSize: 'clamp(30px,5vw,48px)', lineHeight: 1.12, fontWeight: 500 }}>כמה הקמפיין שלכם מוכן?</h1>
      </header>
      <main style={{ maxWidth: 860, margin: '0 auto', boxSizing: 'border-box', padding: '0 24px clamp(64px,10vw,120px)' }}>
        <div className="qcard" style={{ marginTop: 0, textAlign: 'right' }}>
          <Report report={loaded.report} />
        </div>
      </main>
    </div>
  )
}
