'use client'

import { useEffect, useState } from 'react'
import { useStore, type SessionUser } from '@/lib/plus/store'
import type { PlusData } from '@/lib/plus/data'

/**
 * Hydrates the client telephony store from server-loaded data. The lazy
 * useState initializer hydrates synchronously for the first paint; the effect
 * re-hydrates whenever the server data/session changes (navigation/refresh).
 */
export default function PlusProvider({
  data, session, children,
}: { data: PlusData; session: SessionUser; children: React.ReactNode }) {
  useState(() => { useStore.getState().hydrate(data, session); return null })
  useEffect(() => { useStore.getState().hydrate(data, session) }, [data, session])
  return <>{children}</>
}
