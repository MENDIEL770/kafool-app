'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Campaign, Group } from '@/types'
import { Search, Share2, Heart, Menu, X, ChevronDown, Globe } from 'lucide-react'

/* ─── Types ─── */
interface Org { id: string; name: string; slug: string; logo_url: string | null }
interface Donation { id: string; donor_name: string | null; amount: number; dedication: string | null; created_at: string }
interface GalleryItem { id: string; image_url: string; caption: string | null }
interface Props { org: Org; campaign: Campaign; donations: Donation[]; groups: Group[]; gallery: GalleryItem[] }

/* ─── Helpers ─── */
function getVideoEmbed(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&autoplay=1`
  const vi = url.match(/vimeo\.com\/(\d+)/)
  if (vi) return `https://player.vimeo.com/video/${vi[1]}?autoplay=1`
  // Google Drive: /file/d/FILE_ID/view → embed
  const gd = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([^/?&]+)/)
  if (gd) return `https://drive.google.com/file/d/${gd[1]}/preview`
  return null
}

function useCountdown(endAt: string | null) {
  const calc = useCallback(() => {
    if (!endAt) return null
    const diff = new Date(endAt).getTime() - Date.now()
    if (diff <= 0) return null
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff % 86400000) / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
    }
  }, [endAt])

  const [time, setTime] = useState(calc)
  useEffect(() => {
    if (!endAt) return
    const t = setInterval(() => setTime(calc()), 1000)
    return () => clearInterval(t)
  }, [endAt, calc])
  return time
}

/* ─── Sub-components ─── */

const NAV_LINKS = [
  { label: 'אודות', href: '#about' },
  { label: 'שאלות ותשובות', href: '#faq' },
  { label: 'עדויות', href: '#testimonials' },
  { label: 'תורמים', href: '#donors' },
  { label: 'צור קשר', href: '#contact' },
]

function StickyHeader({ org, campaign, primaryColor }: { org: Org; campaign: Campaign; primaryColor: string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const settings = campaign.settings as { tagline?: string | null; about_text?: string | null }
  const tagline = settings?.tagline || settings?.about_text?.split('\n')[0] || null

  return (
    <header className="sticky top-0 inset-x-0 z-50 bg-white border-b border-gray-100 shadow-sm" role="banner">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* Logo + tagline */}
        <div className="flex items-center gap-2.5 shrink-0">
          {org.logo_url
            ? <img src={org.logo_url} alt={org.name} className="h-10 object-contain" />
            : <div className="h-10 px-3 rounded-xl flex items-center justify-center text-white font-black text-sm" style={{ backgroundColor: primaryColor }}>{org.name}</div>
          }
          {tagline && (
            <div className="hidden lg:block border-r border-gray-200 pr-3 mr-1">
              <p className="text-[11px] text-gray-400 leading-tight max-w-[180px]">{tagline}</p>
            </div>
          )}
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-5" aria-label="ניווט ראשי">
          {NAV_LINKS.map(l => (
            <a key={l.href} href={l.href}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              {l.label}
            </a>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigator.share?.({ title: campaign.title, url: window.location.href }) ?? navigator.clipboard.writeText(window.location.href)}
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            שיתוף
          </button>
          <a href={`/${campaign.slug}/donate`}
            className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-full text-white shadow-md hover:opacity-90 transition-all"
            style={{ backgroundColor: primaryColor }}>
            <Heart className="w-3.5 h-3.5" />
            לתרומה עכשיו
          </a>
          <button
            className="md:hidden p-1.5"
            aria-label={menuOpen ? 'סגור תפריט' : 'פתח תפריט'}
            onClick={() => setMenuOpen(v => !v)}
          >
            {menuOpen ? <X className="w-5 h-5 text-gray-700" /> : <Menu className="w-5 h-5 text-gray-700" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="md:hidden bg-white border-t shadow-lg px-4 py-4 space-y-3" aria-label="תפריט נייד">
          {NAV_LINKS.map(l => (
            <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
              className="block text-sm font-medium text-gray-700 py-1.5">{l.label}</a>
          ))}
        </nav>
      )}
    </header>
  )
}

function VideoModal({ embedUrl, onClose }: { embedUrl: string; onClose: () => void }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl bg-black"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 left-3 z-10 w-9 h-9 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
          aria-label="סגור וידאו"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="aspect-video">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allowFullScreen
            allow="autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title="וידאו"
          />
        </div>
      </div>
    </div>
  )
}

function HeroSection({ campaign, countdown }: {
  campaign: Campaign
  countdown: { d: number; h: number; m: number; s: number } | null
}) {
  const settings = campaign.settings as { banners?: { url: string; sort_order: number }[] }
  const banners = settings?.banners?.length
    ? [...settings.banners].sort((a, b) => a.sort_order - b.sort_order).map(b => b.url)
    : campaign.cover_image_url ? [campaign.cover_image_url] : []

  const [idx, setIdx] = useState(0)
  const [videoOpen, setVideoOpen] = useState(false)
  const videoEmbed = campaign.video_url ? getVideoEmbed(campaign.video_url) : null

  useEffect(() => {
    if (banners.length <= 1) return
    const t = setInterval(() => setIdx(i => (i + 1) % banners.length), 4000)
    return () => clearInterval(t)
  }, [banners.length])

  return (
    <>
      <section className="w-full" aria-label="באנר קמפיין">
        {banners.length > 0 ? (
          <div className="relative overflow-hidden">
            {banners.map((url, i) => (
              <img
                key={url}
                src={url}
                alt=""
                aria-hidden
                className="w-full object-cover max-h-[500px] absolute top-0 left-0 transition-opacity duration-700"
                style={{ opacity: i === idx ? 1 : 0, position: i === 0 ? 'relative' : 'absolute' }}
                loading={i === 0 ? 'eager' : 'lazy'}
              />
            ))}

            {/* כפתור פלאי צף */}
            {videoEmbed && (
              <button
                onClick={() => setVideoOpen(true)}
                className="absolute inset-0 flex items-center justify-center z-10 group"
                aria-label="הפעל וידאו"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-2xl transition-all duration-200 group-hover:scale-110 group-hover:bg-white group-active:scale-95">
                  <svg className="w-7 h-7 md:w-9 md:h-9 text-gray-900 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </button>
            )}

            {/* נקודות ניווט */}
            {banners.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {banners.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIdx(i)}
                    className={`transition-all rounded-full ${i === idx ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/50'}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full relative flex flex-col items-center justify-center gap-3 py-20 border-2 border-dashed border-gray-200 bg-gray-50" style={{ minHeight: 260 }}>
            <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
              <path strokeLinecap="round" d="M21 15l-5-5L5 21"/>
            </svg>
            <p className="text-gray-400 font-medium text-sm">אזור הבאנר של הקמפיין</p>
            <p className="text-gray-300 text-xs">העלה באנרים בהגדרות הקמפיין</p>
            {videoEmbed && (
              <button
                onClick={() => setVideoOpen(true)}
                className="mt-2 flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800 text-white text-sm font-bold hover:bg-gray-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                צפה בוידאו
              </button>
            )}
          </div>
        )}

        {countdown && (
          <div className="bg-white border-b border-gray-100 py-3 px-4">
            <div className="max-w-md mx-auto flex items-center justify-center gap-4">
              <span className="text-sm text-gray-500 font-medium">נותר:</span>
              <div className="flex items-center gap-3">
                {[{ val: countdown.d, label: 'ימים' }, { val: countdown.h, label: 'שעות' }, { val: countdown.m, label: 'דקות' }, { val: countdown.s, label: 'שניות' }].map((item, i) => (
                  <div key={item.label} className="flex items-center gap-3">
                    {i > 0 && <span className="text-gray-300 font-bold">:</span>}
                    <div className="text-center">
                      <div className="text-xl font-black tabular-nums text-gray-800">{String(item.val).padStart(2, '0')}</div>
                      <div className="text-[9px] text-gray-400 uppercase tracking-wider">{item.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {videoOpen && videoEmbed && (
        <VideoModal embedUrl={videoEmbed} onClose={() => setVideoOpen(false)} />
      )}
    </>
  )
}

function DonationPlans({ plans, primaryColor, campaignSlug, groups, buttonRadius }: {
  plans: { amount: number; label?: string; image_url?: string | null }[]
  primaryColor: string
  campaignSlug: string
  groups: Group[]
  buttonRadius: string
}) {
  const [selected, setSelected] = useState<number | null>(null)
  const [custom, setCustom] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string>('')

  const finalAmount = selected ?? (custom ? Number(custom) : null)

  const donateHref = `/${campaignSlug}/donate${
    finalAmount || selectedGroup
      ? '?' + new URLSearchParams({
          ...(finalAmount ? { amount: String(finalAmount) } : {}),
          ...(selectedGroup ? { group: selectedGroup } : {}),
        }).toString()
      : ''
  }`

  return (
    <section className="bg-white border-b border-gray-100 py-8 px-4" aria-label="מסלולי תרומה">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-lg font-bold text-gray-700 mb-6 text-center">בחר סכום תרומה</h2>

        {/* Grid: 3 columns on mobile, scrollable row on md+ */}
        <div className="grid grid-cols-3 gap-4 pb-2 px-1 md:flex md:gap-5 md:overflow-x-auto md:pb-6 md:pt-4 md:px-4 md:scrollbar-hide md:snap-x md:justify-center md:flex-nowrap" style={{ overflowY: 'visible' }}>
          {plans.map(({ amount, label, image_url }) => {
            const isActive = selected === amount
            return (
              <button
                key={amount}
                onClick={() => { setSelected(isActive ? null : amount); setCustom('') }}
                aria-pressed={isActive}
                className="flex-none snap-start flex flex-col items-center gap-2 cursor-pointer focus:outline-none"
              >
                {/* עיגול */}
                <div
                  className="w-[90px] h-[90px] md:w-[110px] md:h-[110px] rounded-full overflow-hidden transition-all duration-200 relative"
                  style={{
                    boxShadow: isActive
                      ? `0 0 0 4px white, 0 0 0 7px ${primaryColor}, 0 6px 20px ${primaryColor}44`
                      : '0 2px 10px rgba(0,0,0,0.08)',
                    transform: isActive ? 'scale(1.08)' : 'scale(1)',
                  }}
                >
                  {image_url ? (
                    <img src={image_url} alt={label || `₪${amount}`} className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${primaryColor}dd, ${primaryColor}88)` }}
                    >
                      <span className="text-white font-black text-lg md:text-xl">₪{amount.toLocaleString()}</span>
                    </div>
                  )}
                  {isActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-full">
                      <svg className="w-7 h-7 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                {/* טקסט מתחת */}
                <div className="text-center">
                  <div className="text-xs md:text-sm font-bold text-gray-800">₪{amount.toLocaleString()}</div>
                  {label && <div className="text-[10px] md:text-[11px] text-gray-400 mt-0.5">{label}</div>}
                </div>
              </button>
            )
          })}

          {/* סכום אחר */}
          <div className="flex-none snap-start flex flex-col items-center gap-2">
            <div className="w-[90px] h-[90px] md:w-[110px] md:h-[110px] rounded-full border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-gray-50">
              <span className="text-[10px] md:text-xs text-gray-400 mb-1">סכום אחר</span>
              <div className="flex items-center gap-0.5">
                <span className="text-sm font-bold text-gray-500">₪</span>
                <input
                  type="number"
                  value={custom}
                  onChange={(e) => { setCustom(e.target.value); setSelected(null) }}
                  placeholder="0"
                  min="1"
                  className="w-12 md:w-14 text-center text-sm font-bold outline-none bg-transparent"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs md:text-sm font-bold text-gray-400">אחר</div>
            </div>
          </div>
        </div>

        {/* בחירת קבוצה */}
        {groups.length > 0 && (
          <div className="mt-5 max-w-md mx-auto">
            <label className="block text-xs font-semibold text-gray-500 mb-2 text-center">תרום בשם קבוצה (אופציונלי)</label>
            <div className="flex flex-wrap gap-2 justify-center">
              {groups.map(g => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroup(selectedGroup === g.id ? '' : g.id)}
                  aria-pressed={selectedGroup === g.id}
                  className="px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all duration-150"
                  style={selectedGroup === g.id
                    ? { backgroundColor: primaryColor, borderColor: primaryColor, color: 'white' }
                    : { backgroundColor: 'white', borderColor: '#e5e7eb', color: '#374151' }
                  }
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Payment actions */}
        <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6 max-w-md mx-auto">
          <a
            href={donateHref}
            className={`flex-1 py-3.5 text-white font-black text-base text-center shadow-lg hover:opacity-90 active:scale-95 transition-all ${buttonRadius}`}
            style={{ backgroundColor: primaryColor }}
          >
            {finalAmount ? `תרום ₪${finalAmount.toLocaleString()}` : 'לתרומה'}
          </a>
          <button
            onClick={() => navigator.share?.({ title: 'שתף את הקמפיין', url: window.location.href }) ?? navigator.clipboard.writeText(window.location.href)}
            className={`flex-none px-6 py-3.5 border-2 font-bold text-sm transition-colors hover:bg-gray-50 ${buttonRadius}`}
            style={{ borderColor: primaryColor, color: primaryColor }}
          >
            שתף
          </button>
        </div>
      </div>
    </section>
  )
}

function ProgressSection({ raised, goal, donorsCount, primaryColor }: { raised: number; goal: number; donorsCount: number; primaryColor: string }) {
  const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0
  const [animPct, setAnimPct] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setAnimPct(pct), 300)
    return () => clearTimeout(t)
  }, [pct])

  return (
    <section className="bg-gray-50 py-10 px-4" aria-label="התקדמות הקמפיין">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* סכום גדול */}
        <div className="text-center">
          <div className="text-5xl md:text-6xl font-black tabular-nums" style={{ color: primaryColor }}>
            ₪{raised.toLocaleString('he-IL')}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            גויסו מתוך יעד ₪{goal.toLocaleString('he-IL')}
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative">
          <div className="h-5 bg-gray-200 rounded-full overflow-hidden shadow-inner" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${pct}% הושלם`}>
            <div
              className="h-full rounded-full relative overflow-hidden"
              style={{
                width: `${animPct}%`,
                backgroundColor: primaryColor,
                transition: 'width 1.6s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1.5">
            <span>{pct}% הושלם</span>
            {goal > raised && <span>נותר ₪{(goal - raised).toLocaleString('he-IL')}</span>}
            {goal <= raised && goal > 0 && <span className="font-bold" style={{ color: primaryColor }}>היעד הושג! 🎉</span>}
          </div>
        </div>

        {/* Stats — תורמים בלבד, קטן */}
        <div className="flex justify-center pt-1">
          <div className="flex items-center gap-1.5 bg-white rounded-2xl px-5 py-2.5 shadow-sm border border-gray-100">
            <span className="text-lg font-black text-gray-800">{donorsCount.toLocaleString()}</span>
            <span className="text-sm text-gray-400">תורמים</span>
          </div>
        </div>

      </div>
    </section>
  )
}

type SortBy = 'recent' | 'amount_desc' | 'amount_asc'
type CommunityTab = 'donors' | 'groups' | 'communities'

function CommunitySection({ donations, groups, primaryColor, campaignSlug }: { donations: Donation[]; groups: Group[]; primaryColor: string; campaignSlug: string }) {
  const [tab, setTab] = useState<CommunityTab>('donors')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('recent')
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [visible, setVisible] = useState(12)

  const filtered = donations
    .filter(d => !search || (d.donor_name ?? '').includes(search) || (d.dedication ?? '').includes(search))
    .sort((a, b) => {
      if (sortBy === 'amount_desc') return b.amount - a.amount
      if (sortBy === 'amount_asc') return a.amount - b.amount
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const allTabs: { key: CommunityTab; label: string; count?: number; show: boolean }[] = [
    { key: 'donors' as CommunityTab, label: 'תורמים', count: donations.length, show: true },
    { key: 'groups' as CommunityTab, label: 'קבוצות', count: groups.length, show: groups.length > 0 },
    { key: 'communities' as CommunityTab, label: 'קהילות', show: false },
  ]
  const tabs = allTabs.filter(t => t.show)

  return (
    <section id="donors" className="py-10 px-4 bg-white" aria-label="קהילת התורמים">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-black text-gray-900 mb-6 text-center">קהילת התורמים</h2>

        {/* Tabs */}
        <div className="flex justify-center gap-1 mb-8">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold transition-all"
              style={tab === t.key
                ? { backgroundColor: primaryColor, color: 'white' }
                : { backgroundColor: '#f3f4f6', color: '#6b7280' }
              }
            >
              {t.label}
              {t.count !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-black ${
                  tab === t.key ? 'bg-white/25 text-white' : 'bg-white text-gray-500'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Live indicator */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs text-emerald-700 font-medium">עדכון בזמן אמת</span>
          </div>
        </div>

        {/* ── Donors Tab ── */}
        {tab === 'donors' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden />
                <input
                  type="search"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="חיפוש תורם..."
                  aria-label="חיפוש תורמים"
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl pr-9 pl-4 py-2.5 text-sm outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                />
              </div>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortBy)}
                aria-label="מיון תורמים"
                className="bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-sm outline-none cursor-pointer"
              >
                <option value="recent">אחרונים</option>
                <option value="amount_desc">גבוה → נמוך</option>
                <option value="amount_asc">נמוך → גבוה</option>
              </select>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Heart className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">היה הראשון לתרום!</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filtered.slice(0, visible).map(d => (
                    <article
                      key={d.id}
                      className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex gap-3"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm"
                        style={{ backgroundColor: primaryColor }}
                        aria-hidden
                      >
                        {(d.donor_name || 'א')[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-sm text-gray-800 truncate">{d.donor_name || 'אנונימי'}</span>
                          <span className="font-black text-sm shrink-0" style={{ color: primaryColor }}>
                            ₪{d.amount.toLocaleString()}
                          </span>
                        </div>
                        {d.dedication && (
                          <p className="text-xs text-gray-600 mt-1 leading-relaxed bg-gray-50 rounded-lg px-2 py-1 border-r-2" style={{ borderColor: primaryColor }}>
                            {d.dedication}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-1.5">
                          <time className="text-[11px] text-gray-300" dateTime={d.created_at}>
                            {new Date(d.created_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </time>
                          <button
                            onClick={() => setLiked(s => { const n = new Set(s); n.has(d.id) ? n.delete(d.id) : n.add(d.id); return n })}
                            aria-label={liked.has(d.id) ? 'הסר לייק' : 'תן לייק'}
                            aria-pressed={liked.has(d.id)}
                            className="flex items-center gap-1 text-[11px] transition-colors"
                            style={{ color: liked.has(d.id) ? '#ef4444' : '#9ca3af' }}
                          >
                            <Heart className={`w-3.5 h-3.5 ${liked.has(d.id) ? 'fill-red-500' : ''}`} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
                {visible < filtered.length && (
                  <div className="text-center pt-2">
                    <button
                      onClick={() => setVisible(v => v + 12)}
                      className="px-8 py-3 rounded-full border-2 text-sm font-bold transition-all hover:opacity-80"
                      style={{ borderColor: primaryColor, color: primaryColor }}
                    >
                      טען עוד ({filtered.length - visible} נותרו)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Groups Tab ── */}
        {tab === 'groups' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map(g => {
              const pct = g.goal_amount > 0 ? Math.min(100, Math.round((g.raised_amount / g.goal_amount) * 100)) : 0
              return (
                <a
                  key={g.id}
                  href={`/${campaignSlug}/g/${g.slug}`}
                  className="block bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-gray-800">{g.name}</h3>
                      {g.manager_name && <p className="text-xs text-gray-400 mt-0.5">{g.manager_name}</p>}
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-full text-white" style={{ backgroundColor: primaryColor }}>{pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: primaryColor }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>₪{(g.raised_amount || 0).toLocaleString()} גויס</span>
                    <span>יעד ₪{(g.goal_amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="mt-3 text-xs font-semibold text-center py-1.5 rounded-xl" style={{ color: primaryColor, backgroundColor: `${primaryColor}15` }}>
                    פתח עמוד קבוצה ←
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

function AboutSection({ campaign, gallery }: { campaign: Campaign; gallery: GalleryItem[] }) {
  const settings = campaign.settings as { about_text?: string | null }
  const aboutText = settings?.about_text
  const videoEmbed = campaign.video_url ? getVideoEmbed(campaign.video_url) : null
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (gallery.length <= 1) return
    const t = setInterval(() => setIdx(i => (i + 1) % gallery.length), 4000)
    return () => clearInterval(t)
  }, [gallery.length])

  if (!aboutText && !videoEmbed && gallery.length === 0) return null

  return (
    <section id="about" className="py-10 px-4 bg-white border-t border-gray-100" aria-label="אודות הקמפיין">
      <div className="max-w-3xl mx-auto space-y-6">
        <h2 className="text-2xl font-black text-gray-900 text-center">אודות הקמפיין</h2>

        {gallery.length > 0 && (
          <div className="relative rounded-3xl overflow-hidden aspect-video shadow-md cursor-pointer" onClick={() => {}}>
            <img src={gallery[idx].image_url} alt={gallery[idx].caption || ''} className="w-full h-full object-cover" loading="lazy" />
            {gallery[idx].caption && (
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 px-5 py-4">
                <p className="text-white text-sm">{gallery[idx].caption}</p>
              </div>
            )}
            {gallery.length > 1 && (
              <div className="absolute bottom-3 right-3 flex gap-1">
                {gallery.map((_, i) => (
                  <button key={i} onClick={e => { e.stopPropagation(); setIdx(i) }}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? 'bg-white scale-125' : 'bg-white/50'}`} />
                ))}
              </div>
            )}
          </div>
        )}

        {aboutText && (
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap text-base">{aboutText}</p>
          </div>
        )}

        {videoEmbed && (
          <div className="rounded-3xl overflow-hidden aspect-video shadow-md">
            <iframe src={videoEmbed} className="w-full h-full" allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              title={`וידאו — ${campaign.title}`} />
          </div>
        )}
      </div>
    </section>
  )
}

function FloatingBar({ campaign, primaryColor, buttonRadius }: { campaign: Campaign; primaryColor: string; buttonRadius: string }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const fn = () => setVisible(window.scrollY > 400)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 shadow-2xl safe-area-inset-bottom"
      role="complementary"
      aria-label="פס תרומה"
    >
      <div className="max-w-lg mx-auto flex gap-2 px-4 py-3">
        <a
          href={`/${campaign.slug}/donate`}
          className={`flex-[2] py-3 text-white font-black text-sm text-center shadow-md hover:opacity-90 active:scale-95 transition-all ${buttonRadius}`}
          style={{ backgroundColor: primaryColor }}
        >
          לתרומה
        </a>
        <button
          onClick={() => navigator.share?.({ title: campaign.title, url: window.location.href }) ?? navigator.clipboard.writeText(window.location.href)}
          className={`flex-1 py-3 border-2 font-bold text-sm transition-colors hover:bg-gray-50 ${buttonRadius}`}
          style={{ borderColor: primaryColor, color: primaryColor }}
          aria-label="שתף קמפיין"
        >
          שתף
        </button>
      </div>
    </div>
  )
}

/* ─── Main Page ─── */
export default function DonationPageClient({ org, campaign, donations: initialDonations, groups, gallery }: Props) {
  const [donations, setDonations] = useState<Donation[]>(initialDonations)
  const [raisedAmount, setRaisedAmount] = useState(campaign.raised_amount)
  const countdown = useCountdown(campaign.end_at)

  const settings = campaign.settings as {
    donation_amounts?: number[]
    donation_plans?: { amount: number; label?: string; image_url?: string | null }[]
    primary_color?: string
    button_radius?: string
  }
  const primaryColor = settings?.primary_color || '#2563eb'
  const donationPlans = settings?.donation_plans ||
    (settings?.donation_amounts || [180, 360, 720, 1800, 3600]).map(amount => ({ amount }))
  const buttonRadiusMap: Record<string, string> = { pill: 'rounded-full', rounded: 'rounded-xl', square: 'rounded-md' }
  const buttonRadius = buttonRadiusMap[settings?.button_radius || 'pill'] || 'rounded-full'

  // Realtime
  useEffect(() => {
    const supabase = createClient()
    const ch = supabase
      .channel(`campaign-${campaign.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'donations', filter: `campaign_id=eq.${campaign.id}` }, (payload) => {
        const d = payload.new as Donation
        if (d.amount) setRaisedAmount(p => p + d.amount)
        setDonations(p => [d, ...p].slice(0, 200))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [campaign.id])

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* 1. Sticky Header */}
      <StickyHeader org={org} campaign={campaign} primaryColor={primaryColor} />

      {/* 2. Hero */}
      <HeroSection campaign={campaign} countdown={countdown} />

      {/* 3. Donation Plans */}
      <DonationPlans plans={donationPlans} primaryColor={primaryColor} campaignSlug={campaign.slug} groups={groups} buttonRadius={buttonRadius} />

      {/* 4. Progress */}
      <ProgressSection raised={raisedAmount} goal={campaign.goal_amount} donorsCount={donations.length} primaryColor={primaryColor} />

      {/* 5. Community (donors + groups tabs) */}
      <CommunitySection donations={donations} groups={groups} primaryColor={primaryColor} campaignSlug={campaign.slug} />

      {/* 7. About */}
      <AboutSection campaign={campaign} gallery={gallery} />

      {/* 8. Floating bar */}
      <FloatingBar campaign={campaign} primaryColor={primaryColor} buttonRadius={buttonRadius} />

      {/* Bottom padding for floating bar */}
      <div className="h-20" />
    </div>
  )
}
