'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'

// Remove a single abandoned lead (donation_intent). Confirms first, then refreshes.
export default function DeleteLeadButton({ campaignId, intentId }: { campaignId: string; intentId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function del() {
    if (!confirm('למחוק את הליד הזה מרשימת הנטישות? הפעולה בלתי הפיכה.')) return
    setBusy(true)
    try {
      const res = await fetch('/api/abandoned/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, intentId }),
      })
      if (!res.ok) { alert('המחיקה נכשלה'); setBusy(false); return }
      router.refresh()
    } catch { alert('המחיקה נכשלה'); setBusy(false) }
  }

  return (
    <button onClick={del} disabled={busy} className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 disabled:opacity-50" title="מחק ליד">
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
    </button>
  )
}
