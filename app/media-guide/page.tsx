import type { Metadata } from 'next'
import MediaGuide from '@/components/MediaGuide'

export const metadata: Metadata = {
  title: 'מדריך מדיה — דף גיוס Kafool',
  description: 'דרישות קבצי המדיה לדף גיוס ב-Kafool: מידות, יחסים, פורמטים ומשקלים מומלצים.',
}

export default function MediaGuidePage() {
  return (
    <main className="min-h-screen bg-white">
      <MediaGuide />
    </main>
  )
}
