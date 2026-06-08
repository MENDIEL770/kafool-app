import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'campaign-media'

export async function POST(req: NextRequest) {
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const formData = await req.formData()
  const file = formData.get('file') as File
  const path = formData.get('path') as string

  if (!file || !path) {
    return NextResponse.json({ error: 'חסר קובץ או נתיב' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() || 'jpg'
  const fullPath = `${path}.${ext}`
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { error } = await adminClient.storage
    .from(BUCKET)
    .upload(fullPath, buffer, {
      contentType: file.type || 'image/jpeg',
      upsert: true,
    })

  if (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: { publicUrl } } = adminClient.storage
    .from(BUCKET)
    .getPublicUrl(fullPath)

  return NextResponse.json({ url: `${publicUrl}?t=${Date.now()}` })
}
