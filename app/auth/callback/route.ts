import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// OAuth / magic-link callback: exchange the ?code for a session, then redirect to
// ?next (defaults to Kafool+). The session cookies are written DIRECTLY onto the
// redirect response — cookies set via next/headers don't reliably attach to a
// manually-constructed NextResponse, which silently dropped the session and
// bounced the user back to the login page even though sign-in succeeded.
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') || '/'

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
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return response
  }
  return NextResponse.redirect(new URL('/kafool-plus-login?error=auth', url.origin))
}
