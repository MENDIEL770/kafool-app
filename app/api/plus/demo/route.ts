import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyDemo, DEMO_COOKIE } from '@/lib/plus/demo'

export const dynamic = 'force-dynamic'

// Open a no-login demo link: …/api/plus/demo?t=<token> → set the demo cookie and
// redirect straight into that member's screen (caller / coordinator / manager).
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('t')
  const memberId = verifyDemo(token)
  const login = new URL('/kafool-plus-login', req.nextUrl.origin)
  if (!memberId) return NextResponse.redirect(login)

  const admin = await createServiceClient()
  const { data } = await admin.from('kp_members').select('role').eq('id', memberId).eq('is_active', true).limit(1)
  const role = (data ?? [])[0]?.role as string | undefined
  if (!role) return NextResponse.redirect(login)

  const dest = role === 'coordinator' ? '/coordinator' : role === 'caller' ? '/caller' : '/manager'
  const res = NextResponse.redirect(new URL(dest, req.nextUrl.origin))
  res.cookies.set(DEMO_COOKIE, token!, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
