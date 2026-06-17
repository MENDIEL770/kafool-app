import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

// On-demand revalidation of public campaign/group pages after a manager change,
// so updated amounts/goals appear immediately instead of waiting for ISR.
export async function POST(req: NextRequest) {
  let slug = ''
  let groupSlug = ''
  try {
    const body = await req.json()
    slug = String(body?.slug || '').trim()
    groupSlug = String(body?.groupSlug || '').trim()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad request' }, { status: 400 })
  }
  if (!slug) return NextResponse.json({ ok: false, error: 'missing slug' }, { status: 400 })

  revalidatePath(`/${slug}`)
  if (groupSlug) revalidatePath(`/${slug}/g/${groupSlug}`)

  return NextResponse.json({ ok: true })
}
