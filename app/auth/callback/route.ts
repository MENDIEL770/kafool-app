import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// OAuth / magic-link callback: exchange the ?code for a session cookie, then
// redirect to ?next (defaults to Kafool+). Without this route the auth redirect
// lands without a session and bounces back to the login page.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') || '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(next, url.origin))
  }
  return NextResponse.redirect(new URL('/kafool-plus-login?error=auth', url.origin))
}
