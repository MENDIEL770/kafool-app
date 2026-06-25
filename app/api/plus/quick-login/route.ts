import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  QUICK_PASSWORD, QUICK_COOKIE, QUICK_GATE_COOKIE,
  signToken, verifyToken, kafoolPlusOrgId,
} from '@/lib/plus/quick'

export const dynamic = 'force-dynamic'

/** Clear the quick-login identity (logout / switch user). */
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(QUICK_COOKIE, '', { ...COOKIE_OPTS, maxAge: 0 })
  res.cookies.set(QUICK_GATE_COOKIE, '', { ...COOKIE_OPTS, maxAge: 0 })
  return res
}

const COOKIE_OPTS = {
  httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/',
}

/**
 * Kafool+ quick login (shared password → pick yourself from a list).
 *
 *  A) { role, password }
 *       manager  → sets identity cookie, returns { redirect: '/manager' }
 *       coord/caller → verifies password, sets a short gate cookie, returns
 *                      { members: [...] } for the picker
 *  B) { memberId }  (requires the gate cookie from step A)
 *       → sets identity cookie, returns { redirect: '/coordinator' | '/caller' }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const admin = await createServiceClient()

  // ── Step B: a person was picked from the list ──
  if (body.memberId) {
    const gate = verifyToken<{ g: 'coordinator' | 'caller' }>(req.cookies.get(QUICK_GATE_COOKIE)?.value)
    if (!gate) return NextResponse.json({ error: 'פג תוקף — הזן/י סיסמה מחדש' }, { status: 401 })
    const { data: rows } = await admin
      .from('kp_members').select('id, role, is_active')
      .eq('id', body.memberId).eq('role', gate.g).eq('is_active', true).limit(1)
    if (!(rows ?? [])[0]) return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 })
    const redirect = gate.g === 'coordinator' ? '/coordinator' : '/caller'
    const res = NextResponse.json({ ok: true, redirect })
    res.cookies.set(QUICK_COOKIE, signToken({ r: 'member', id: body.memberId }), { ...COOKIE_OPTS, maxAge: 60 * 60 * 24 * 30 })
    res.cookies.set(QUICK_GATE_COOKIE, '', { ...COOKIE_OPTS, maxAge: 0 })
    return res
  }

  // ── Step A: role + password ──
  const role = body.role as 'manager' | 'coordinator' | 'caller'
  if (!['manager', 'coordinator', 'caller'].includes(role)) {
    return NextResponse.json({ error: 'תפקיד לא תקין' }, { status: 400 })
  }
  if (String(body.password || '') !== QUICK_PASSWORD) {
    return NextResponse.json({ error: 'סיסמה שגויה' }, { status: 401 })
  }

  const orgId = await kafoolPlusOrgId(admin)
  if (!orgId) return NextResponse.json({ error: 'לא נמצא ארגון Kafool+ פעיל' }, { status: 404 })

  // Manager → straight in (sees the whole org).
  if (role === 'manager') {
    const res = NextResponse.json({ ok: true, redirect: '/manager' })
    res.cookies.set(QUICK_COOKIE, signToken({ r: 'manager', id: orgId }), { ...COOKIE_OPTS, maxAge: 60 * 60 * 24 * 30 })
    return res
  }

  // Coordinator / caller → return the list to pick from + open the gate.
  const { data: members } = await admin
    .from('kp_members')
    .select('id, email, campaign_id, caller_group_id')
    .eq('organization_id', orgId).eq('role', role).eq('is_active', true)

  // Resolve human labels (branch name for coordinators, group name for callers).
  const campIds = [...new Set((members ?? []).map(m => m.campaign_id).filter(Boolean))]
  const cgIds = [...new Set((members ?? []).map(m => m.caller_group_id).filter(Boolean))]
  const [{ data: camps }, { data: groups }] = await Promise.all([
    campIds.length ? admin.from('kp_campaigns').select('id, name').in('id', campIds) : Promise.resolve({ data: [] }),
    cgIds.length ? admin.from('kp_caller_groups').select('id, display_name').in('id', cgIds) : Promise.resolve({ data: [] }),
  ])
  const campName = new Map((camps ?? []).map((c: { id: string; name: string }) => [c.id, c.name]))
  const cgName = new Map((groups ?? []).map((g: { id: string; display_name: string }) => [g.id, g.display_name]))

  const list = (members ?? []).map(m => {
    const label = role === 'coordinator'
      ? (campName.get(m.campaign_id) || m.email || 'רכז')
      : (cgName.get(m.caller_group_id) || m.email || 'טלפן')
    return { id: m.id, label, sub: m.email || '' }
  }).sort((a, b) => a.label.localeCompare(b.label, 'he'))

  const res = NextResponse.json({ ok: true, members: list })
  res.cookies.set(QUICK_GATE_COOKIE, signToken({ g: role }), { ...COOKIE_OPTS, maxAge: 60 * 15 })
  return res
}
