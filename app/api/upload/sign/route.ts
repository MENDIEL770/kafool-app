import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const BUCKET = 'campaign-media'

// Returns a signed upload URL so the browser can upload large files DIRECTLY to
// Supabase Storage, bypassing the ~4.5MB body limit on Vercel functions.
// The server (service role) authorizes the upload; the caller must be logged in.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 })

  const { path, ext } = await req.json().catch(() => ({}))
  if (!path) return NextResponse.json({ error: 'חסר נתיב' }, { status: 400 })
  const fullPath = `${path}.${(ext || 'jpg').toLowerCase()}`

  const admin = await createServiceClient()
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(fullPath)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ path: fullPath, token: data.token })
}
