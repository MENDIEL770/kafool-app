import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function base(req: NextRequest): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin).replace(/\/$/, '')
}

// Public short-link redirect: kafool.com/s/<code> → the stored target (302),
// counting a click. Unknown codes fall back to the homepage.
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  try {
    const admin = await createServiceClient()
    const { data } = await admin.from('short_links').select('id, target_url, clicks').eq('code', code).maybeSingle()
    if (!data?.target_url) return NextResponse.redirect(base(req), 302)
    // best-effort click count — never block the redirect
    admin.from('short_links').update({ clicks: (data.clicks || 0) + 1 }).eq('id', data.id).then(() => {}, () => {})
    const target = /^https?:\/\//i.test(data.target_url) ? data.target_url : `https://${data.target_url}`
    return NextResponse.redirect(target, 302)
  } catch {
    return NextResponse.redirect(base(req), 302)
  }
}
