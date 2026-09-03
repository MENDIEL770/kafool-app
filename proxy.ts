import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// First path segments that are app areas, not public campaign slugs — never treat
// a trailing /en|/he on these as a language link.
const RESERVED_FIRST_SEG = new Set([
  'dashboard', 'campaigns', 'callers', 'war-room', 'reports', 'sms', 'donor-pool',
  'settings', 'super-admin', 'login', 'register', 'api', 'onboarding', 'leads',
  'about', 'contact', 'faq', 'privacy', 'terms', 'accessibility', 'join', 'design',
])

export async function proxy(request: NextRequest) {
  // Pretty language links: /{slug}/en · /{slug}/he · /{slug}/g/{group}/en|he
  // → internally serve the same page with ?lang= (URL stays short in the browser).
  const langMatch = request.nextUrl.pathname.match(/^\/([^/]+)(?:\/g\/([^/]+))?\/(en|he)$/)
  if (langMatch && !RESERVED_FIRST_SEG.has(langMatch[1])) {
    const [, slug, groupSlug, lang] = langMatch
    const url = request.nextUrl.clone()
    url.pathname = groupSlug ? `/${slug}/g/${groupSlug}` : `/${slug}`
    url.searchParams.set('lang', lang)
    return NextResponse.rewrite(url)
  }

  // Expose the current path to server components that need it.
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

  // Protect dashboard routes
  if (path.startsWith('/dashboard') || path.startsWith('/campaigns') ||
      path.startsWith('/callers') || path.startsWith('/war-room') ||
      path.startsWith('/reports') || path.startsWith('/sms') ||
      path.startsWith('/donor-pool') ||
      path.startsWith('/settings') || path.startsWith('/super-admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Super-admin area requires the super_admin role, not merely being logged in.
  // (Defense-in-depth alongside the per-route role checks.)
  if (path.startsWith('/super-admin') && user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
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
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/sms|api/track|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|html)$).*)',
  ],
}
