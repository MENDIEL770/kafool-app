'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Target,
  Phone,
  Users,
  Tv2,
  BarChart3,
  MessageSquare,
  CreditCard,
  Settings,
  Building2,
  Bot,
  LogOut,
  ChevronRight,
  ChevronDown,
  Zap,
  UserCog,
  Sparkles,
} from 'lucide-react'

interface Profile {
  role: string
  full_name: string
  organizations?: { name: string; logo_url?: string | null } | null
}

interface Props {
  profile: Profile
}

const DEFAULT_CAMPAIGN_KEY = 'kafool_default_campaign'

const navItems = [
  { href: '/dashboard', label: 'לוח בקרה', icon: LayoutDashboard },
  { href: '/campaigns', label: 'קמפיינים', icon: Target, defaultKey: DEFAULT_CAMPAIGN_KEY },
  { href: '/reports', label: 'דוחות', icon: BarChart3 },
  { href: '/sms', label: 'SMS ואוטומציות', icon: MessageSquare },
]

const kafoolPlusItems = [
  { href: '/callers', label: 'טלפנים / KafoolPulse', icon: Phone },
  { href: '/leads', label: 'לידים', icon: Users },
  { href: '/war-room', label: 'חמ"ל גיוס', icon: Tv2 },
]

const settingsItems = [
  { href: '/team', label: 'צוות', icon: UserCog },
  { href: '/settings/kesher', label: 'חיבור קשר', icon: CreditCard },
  { href: '/settings', label: 'הגדרות', icon: Settings },
]

const superAdminItems = [
  { href: '/super-admin/agent', label: 'סוכן AI', icon: Bot },
  { href: '/super-admin/orgs', label: 'ניהול ארגונים', icon: Building2 },
]

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
  accent = 'blue',
  defaultKey,
  indent = false,
}: {
  href: string
  label: string
  icon: React.ElementType
  pathname: string
  accent?: 'blue' | 'purple'
  defaultKey?: string
  indent?: boolean
}) {
  const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/')) || (href === '/campaigns' && pathname.startsWith('/campaigns'))

  const resolvedHref = defaultKey
    ? (() => {
        if (typeof window === 'undefined') return href
        const id = localStorage.getItem(defaultKey)
        return id ? `${href}/${id}` : href
      })()
    : href

  return (
    <Link
      href={resolvedHref}
      className={cn(
        'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
        indent && 'pr-7',
        isActive
          ? accent === 'purple'
            ? 'bg-purple-500/15 text-purple-300'
            : 'bg-blue-500/15 text-blue-300'
          : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
      )}
    >
      <Icon
        className={cn(
          'w-4 h-4 shrink-0 transition-colors',
          isActive
            ? accent === 'purple' ? 'text-purple-400' : 'text-blue-400'
            : 'text-slate-500 group-hover:text-slate-300'
        )}
      />
      <span className="truncate">{label}</span>
      {isActive && (
        <ChevronRight className="w-3 h-3 mr-auto shrink-0 text-slate-500" />
      )}
    </Link>
  )
}

export default function Sidebar({ profile }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const isPlusActive = kafoolPlusItems.some(item => pathname.startsWith(item.href))
  const [plusOpen, setPlusOpen] = useState(isPlusActive)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const org = profile.organizations
  const initials = profile.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)
    : '?'

  return (
    <aside className="w-64 bg-slate-900 flex flex-col min-h-screen shrink-0 border-l border-slate-800">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">Kafool</span>
        </div>
        {org && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800/60">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-xs text-slate-400 truncate">{org.name}</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            pathname={pathname}
            defaultKey={'defaultKey' in item ? item.defaultKey : undefined}
          />
        ))}

        {/* Kafool+ section */}
        <div className="pt-1">
          <button
            onClick={() => setPlusOpen(v => !v)}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150',
              isPlusActive
                ? 'bg-violet-500/15 text-violet-300'
                : 'text-slate-300 hover:bg-white/5 hover:text-slate-100'
            )}
          >
            <div className={cn(
              'w-5 h-5 rounded-md flex items-center justify-center shrink-0',
              isPlusActive ? 'bg-violet-500' : 'bg-violet-500/30'
            )}>
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="flex-1 text-right">Kafool+</span>
            <span className="text-[9px] font-medium text-violet-400/70 bg-violet-500/10 border border-violet-500/20 rounded-full px-1.5 py-0.5 leading-none">
              בפיתוח
            </span>
            <ChevronDown className={cn('w-3.5 h-3.5 text-slate-500 transition-transform shrink-0', plusOpen && 'rotate-180')} />
          </button>

          {plusOpen && (
            <div className="mt-0.5 space-y-0.5">
              {kafoolPlusItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  pathname={pathname}
                  accent="blue"
                  indent
                />
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 pb-1.5 px-3">
          <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
            הגדרות
          </div>
        </div>
        {settingsItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            pathname={pathname}
          />
        ))}

        {profile.role === 'super_admin' && (
          <>
            <div className="pt-4 pb-1.5 px-3">
              <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
                סופר מנהל
              </div>
            </div>
            {superAdminItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                pathname={pathname}
                accent="purple"
              />
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-800/50 transition-colors group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-200 truncate">{profile.full_name}</div>
            <div className="text-[11px] text-slate-500 capitalize">
              {profile.role === 'super_admin' ? 'Super Admin' : profile.role}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            title="התנתקות"
            className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400 p-1 rounded"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
