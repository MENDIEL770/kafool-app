'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Heart, ArrowRight, Share2 } from 'lucide-react'
import type { Campaign, Group } from '@/types'

interface Org { id: string; name: string; slug: string; logo_url: string | null }
interface Donation { id: string; donor_name: string | null; amount: number; dedication: string | null; created_at: string }

function useAnimPct(pct: number) {
  const [anim, setAnim] = useState(0)
  useEffect(() => { const t = setTimeout(() => setAnim(pct), 300); return () => clearTimeout(t) }, [pct])
  return anim
}

export default function GroupPageClient({ org, campaign, group, donations: initialDonations }: {
  org: Org; campaign: Campaign; group: Group; donations: Donation[]
}) {
  const [donations, setDonations] = useState(initialDonations)
  const [raisedAmount, setRaisedAmount] = useState(group.raised_amount)
  const [liked, setLiked] = useState<Set<string>>(new Set())

  const settings = campaign.settings as { primary_color?: string }
  const primaryColor = settings?.primary_color || '#2563eb'
  const pct = group.goal_amount > 0 ? Math.min(100, Math.round((raisedAmount / group.goal_amount) * 100)) : 0
  const animPct = useAnimPct(pct)

  useEffect(() => {
    const supabase = createClient()
    const ch = supabase
      .channel(`group-${group.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'donations', filter: `group_id=eq.${group.id}` }, (payload) => {
        const d = payload.new as Donation
        if (d.amount) setRaisedAmount(p => p + d.amount)
        setDonations(p => [d, ...p].slice(0, 200))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [group.id])

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href={`/${campaign.slug}`} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowRight className="w-4 h-4" />
            חזרה לקמפיין
          </a>
          <button
            onClick={() => navigator.share?.({ title: group.name, url: window.location.href }) ?? navigator.clipboard.writeText(window.location.href)}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            שתף
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Group hero */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 text-center space-y-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-black mx-auto shadow-md"
            style={{ backgroundColor: primaryColor }}
          >
            {group.name[0]}
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">{group.name}</h1>
            {group.manager_name && (
              <p className="text-sm text-gray-400 mt-1">מגייס: {group.manager_name}</p>
            )}
            {group.description && (
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">{group.description}</p>
            )}
          </div>

          {/* Amount */}
          <div>
            <div className="text-4xl font-black tabular-nums" style={{ color: primaryColor }}>
              ₪{raisedAmount.toLocaleString('he-IL')}
            </div>
            <div className="text-sm text-gray-400 mt-0.5">
              מתוך יעד ₪{group.goal_amount.toLocaleString('he-IL')}
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full rounded-full relative overflow-hidden"
                style={{
                  width: `${animPct}%`,
                  backgroundColor: primaryColor,
                  transition: 'width 1.6s cubic-bezier(0.4,0,0.2,1)',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{pct}% הושלם</span>
              {group.goal_amount > raisedAmount
                ? <span>נותר ₪{(group.goal_amount - raisedAmount).toLocaleString('he-IL')}</span>
                : <span className="font-bold" style={{ color: primaryColor }}>היעד הושג! 🎉</span>
              }
            </div>
          </div>

          {/* Stats pill */}
          <div className="flex justify-center">
            <div className="flex items-center gap-1.5 bg-gray-50 rounded-2xl px-4 py-2 border border-gray-100">
              <span className="text-base font-black text-gray-800">{donations.length}</span>
              <span className="text-sm text-gray-400">תורמים</span>
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse mr-2" />
            </div>
          </div>
        </div>

        {/* Donate button */}
        <a
          href={`/${campaign.slug}/donate?group=${group.id}`}
          className="block w-full py-4 rounded-2xl text-white font-black text-base text-center shadow-lg hover:opacity-90 active:scale-95 transition-all"
          style={{ backgroundColor: primaryColor }}
        >
          תרום לקבוצה זו →
        </a>

        {/* Donors */}
        {donations.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-black text-gray-900">תורמי הקבוצה</h2>
            {donations.map(d => (
              <article
                key={d.id}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex gap-3"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: primaryColor }}
                >
                  {(d.donor_name || 'א')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-sm text-gray-800">{d.donor_name || 'אנונימי'}</span>
                    <span className="font-black text-sm shrink-0" style={{ color: primaryColor }}>₪{d.amount.toLocaleString()}</span>
                  </div>
                  {d.dedication && (
                    <p className="text-xs text-gray-600 mt-1 bg-gray-50 rounded-lg px-2 py-1 border-r-2 leading-relaxed" style={{ borderColor: primaryColor }}>
                      {d.dedication}
                    </p>
                  )}
                  <time className="text-[11px] text-gray-300 mt-1 block" dateTime={d.created_at}>
                    {new Date(d.created_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </time>
                </div>
                <button
                  onClick={() => setLiked(s => { const n = new Set(s); n.has(d.id) ? n.delete(d.id) : n.add(d.id); return n })}
                  className="self-start pt-0.5 transition-colors"
                  style={{ color: liked.has(d.id) ? '#ef4444' : '#d1d5db' }}
                >
                  <Heart className={`w-4 h-4 ${liked.has(d.id) ? 'fill-red-500' : ''}`} />
                </button>
              </article>
            ))}
          </div>
        )}

        {donations.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Heart className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">היה הראשון לתרום לקבוצה זו!</p>
          </div>
        )}
      </div>
    </div>
  )
}
