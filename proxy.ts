import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // Expose the current path to server components (the dashboard layout uses it
  // to lock kafoolplus_only coordinators/callers to the Kafool+ module).
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)
  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // ── Kafool+ subdomain (plus.kafool.com) → serve the /plus module at the root ──
  const host = (request.headers.get('host') || '').toLowerCase()
  if (/(^|\.)plus\.kafool\.com$/.test(host)) {
    const passthrough =
      path.startsWith('/plus') || path.startsWith('/api') || path.startsWith('/auth') ||
      path.startsWith('/kafool-plus-login') || path.startsWith('/_next') || path.startsWith('/login')
    if (!passthrough) {
      const url = request.nextUrl.clone()
      url.pathname = `/plus${path === '/' ? '' : path}`
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
    }
  }

  // ── Serve the Kafool+ module on the MAIN domain too (so plus.kafool.com is no
  // longer required). These paths exist only in the (plus) group — no collision. ──
  if (/^\/(caller|manager|coordinator)(\/|$)/.test(path)) {
    const url = request.nextUrl.clone()
    url.pathname = `/plus${path}`
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
  }

  // Protect dashboard routes
  if (path.startsWith('/dashboard') || path.startsWith('/campaigns') ||
      path.startsWith('/callers') || path.startsWith('/war-room') ||
      path.startsWith('/reports') || path.startsWith('/sms') ||
      path.startsWith('/settings') || path.startsWith('/super-admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Redirect logged-in users away from auth pages
  if ((path === '/login' || path === '/register') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/sms|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|html)$).*)',
  ],
}
