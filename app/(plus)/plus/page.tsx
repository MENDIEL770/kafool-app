import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPlusContext } from '@/lib/plus/context'

export const dynamic = 'force-dynamic'

// Route each role to its home screen. Super-admins resolve to role 'manager'
// (god mode) and land on the manager view of the org they've entered.
export default async function PlusIndex() {
  const supabase = await createClient()
  const ctx = await getPlusContext(supabase)
  const home: Record<string, string> = {
    manager: '/manager',
    coordinator: '/coordinator',
    caller: '/caller',
  }
  redirect(home[ctx.role ?? 'caller'] ?? '/manager')
}
