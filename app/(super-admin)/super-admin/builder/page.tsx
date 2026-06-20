import type { Metadata } from 'next'
import PageBuilder from '@/components/PageBuilder'

export const metadata: Metadata = {
  title: 'עורך תבנית (פיתוח) — Kafool',
}

// Access is already restricted to super_admin by the (super-admin) layout.
// This is the development sandbox for the page builder until it's wired to
// persistence and released to all managers.
export default function SuperAdminBuilderPage() {
  return <PageBuilder />
}
