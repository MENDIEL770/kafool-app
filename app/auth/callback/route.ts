import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'

// OAuth / magic-link callback: exchange the ?code for a session, then redirect to
// ?next (defaults to Kafool+). The session cookies are written DIRECTLY onto the
// redirect response — cookies set via next/headers don't reliably attach to a
// manually-constructed NextResponse, which silently dropped the session and
// bounced the user back to the login page even though sign-in succeeded.
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') || '/'
  const host = request.headers.get('host') || ''
  const errDesc = url.searchParams.get('error_description') || url.searchParams.get('error') || null

  // TEMPORARY diagnostic — records what the callback actually received/did so we
  // can pinpoint why login bounces. Remove once auth is confirmed.
  const debug = async (note: string, extra: Record<string, unknown> = {}) => {
    try {
      const admin = await createServiceClient()
      await admin.from('webhook_logs').insert({ source: 'auth-debug', note, body: { host, next, hasCode: !!code, errDesc, ...extra } })
    } catch { /* ignore */ }
  }

  if (code) {
    const response = NextResponse.redirect(new URL(next, url.origin))
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      await debug('exchange ok', { user: data.user?.email, cookieNames: request.cookies.getAll().map(c => c.name) })
      return response
    }
    await debug('exchange FAILED', { error: error.message, cookieNames: request.cookies.getAll().map(c => c.name) })
    return NextResponse.redirect(new URL('/kafool-plus-login?error=exchange', url.origin))
  }
  await debug('no code', { allParams: Object.fromEntries(url.searchParams) })
  return NextResponse.redirect(new URL('/kafool-plus-login?error=auth', url.origin))
}
