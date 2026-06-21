import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const BUCKET = 'campaign-media'

// Returns a signed upload URL so the browser can upload large files DIRECTLY to
// Supabase Storage, bypassing the ~4.5MB body limit on Vercel functions.
// The signed URL is created with a TRUE service-role client (no user cookies),
// so the upload it authorizes bypasses storage RLS. The caller must be logged in.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 })

  const { path, ext } = await req.json().catch(() => ({}))
  if (!path) return NextResponse.json({ error: 'חסר נתיב' }, { status: 400 })
  const fullPath = `${path}.${(ext || 'jpg').toLowerCase()}`

  // Real service-role client (no session cookies) — required to bypass RLS.
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(fullPath)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ path: fullPath, token: data.token })
}
