'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Settings,
  Image,
  Users,
  Group,
  SlidersHorizontal,
  Mail,
  Activity,
  UserX,
  ChevronLeft,
  ExternalLink,
} from 'lucide-react'

interface Campaign {
  id: string
  title: string
  slug: string
  status: string
}

interface Props {
  campaign: Campaign
}

export default function CampaignNav({ campaign }: Props) {
  const pathname = usePathname()
  const base = `/campaigns/${campaign.id}`

  const tabs = [
    { href: base, label: 'ראשי', icon: LayoutDashboard, exact: true },
    { href: `${base}/settings`, label: 'הגדרות', icon: Settings },
    { href: `${base}/media`, label: 'מדיה', icon: Image },
    { href: `${base}/donors`, label: 'תורמים', icon: Users },
    { href: `${base}/abandoned`, label: 'לידים שנטשו', icon: UserX },
    { href: `${base}/insights`, label: 'סקירת תנועה', icon: Activity },
    { href: `${base}/groups`, label: 'קבוצות', icon: Group },
    { href: `${base}/custom-forms`, label: 'טפסים בהתאמה אישית', icon: SlidersHorizontal },
    { href: `${base}/email`, label: 'אימייל', icon: Mail },
  ]

  const statusLabel: Record<string, { label: string; color: string }> = {
    active: { label: 'פעיל', color: 'bg-emerald-500' },
    draft: { label: 'טיוטה', color: 'bg-gray-400' },
    ended: { label: 'הסתיים', color: 'bg-red-400' },
  }
  const s = statusLabel[campaign.status] || { label: campaign.status, color: 'bg-gray-400' }

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-20" dir="rtl">
      {/* Top row */}
      <div className="flex items-center justify-between px-6 pt-4 pb-3 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/campaigns"
            className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900 truncate">{campaign.title}</h1>
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold text-white px-2.5 py-0.5 rounded-full shrink-0 ${s.color}`}>
                {s.label}
              </span>
            </div>
            <div className="text-xs text-gray-400 mt-0.5">kafool.com/{campaign.slug}</div>
          </div>
        </div>

        <a
          href={`/${campaign.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-lg text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          <span className="hidden sm:inline">צפה בדף הגיוס</span>
        </a>
      </div>

      {/* Tab row */}
      <div className="flex items-end px-4 gap-1 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap shrink-0',
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
