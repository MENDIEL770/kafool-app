'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Campaign, Group } from '@/types'
import { Search, Share2, Heart, Menu, X, ChevronDown, Globe } from 'lucide-react'
import DonationModal from './DonationModal'
import CreateGroupModal from './CreateGroupModal'
import AccessibilityWidget from '../_components/AccessibilityWidget'
import Footer from '../_components/Footer'

/* ─── Types ─── */
interface Org { id: string; name: string; slug: string; logo_url: string | null }
interface Donation { id: string; donor_name: string | null; amount: number; dedication: string | null; created_at: string; group_id?: string | null }
interface GalleryItem { id: string; image_url: string; caption: string | null }
interface ActiveGroup { id: string; name: string; slug: string; goal_amount: number; raised_amount: number; manager_name: string | null; donorCount?: number }
interface PaymentUrls { one_time: string; hok: string; bit: string; bank: string }
interface Props { org: Org; campaign: Campaign; donations: Donation[]; groups: Group[]; gallery: GalleryItem[]; activeGroup?: ActiveGroup; donationUrl?: string; paymentUrls?: PaymentUrls }

/* ─── Helpers ─── */
function getVideoEmbed(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&autoplay=1&modestbranding=1&playsinline=1&disablekb=0`
  const vi = url.match(/vimeo\.com\/(\d+)/)
  if (vi) return `https://player.vimeo.com/video/${vi[1]}?autoplay=1`
  return null
}

function getYoutubeThumbnail(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  if (yt) return `https://img.youtube.com/vi/${yt[1]}/maxresdefault.jpg`
  return null
}

function donorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'א'
  if (parts.length === 1) return parts[0].slice(0, 2)
  return parts[0][0] + parts[parts.length - 1][0]
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'הרגע'
  if (m < 60) return `לפני ${m} דקות`
  const h = Math.floor(m / 60)
  if (h < 24) return `לפני ${h} שעות`
  const days = Math.floor(h / 24)
  if (days < 30) return `לפני ${days} ימים`
  return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })
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

/* ─── Kafool Animated Logo (header) ─── */
function KafoolAnimatedLogo() {
  const sp = "M 408.691406 276.410156 L 407.988281 276.015625 C 404.148438 268.371094 394.164062 267.949219 387.035156 270.828125 L 385.925781 270.785156 L 381.527344 273.050781 C 379.183594 274.257812 377.238281 275.847656 375.332031 277.609375 L 372.460938 280.261719 L 369.589844 282.902344 L 366.714844 285.539062 L 363.839844 288.167969 L 361.203125 290.570312 L 358.332031 293.203125 L 355.457031 295.847656 L 350.417969 300.648438 L 339.402344 311.355469 L 334.269531 316.316406 C 330.460938 319.605469 326.019531 321.660156 321.371094 323.546875 C 316.644531 325.464844 311.964844 326.996094 306.824219 327.179688 C 297.019531 327.53125 288.484375 324.621094 282.824219 316.433594 C 279.945312 312.269531 278.578125 307.484375 278.15625 302.425781 C 277.78125 297.957031 278.609375 293.601562 279.898438 289.332031 C 280.878906 286.089844 281.890625 283.179688 283.519531 280.199219 C 289.175781 269.828125 297.972656 261.578125 308.921875 257.019531 C 314.152344 254.839844 319.535156 253.585938 325.136719 254.035156 C 335.78125 254.894531 344.753906 261.265625 349.300781 270.863281 L 351.304688 275.085938 C 351.527344 275.554688 351.761719 275.894531 351.539062 276.453125 C 351.390625 276.828125 351.058594 277.046875 350.625 277.382812 L 339.414062 286.039062 L 335.6875 277.488281 C 334.457031 274.664062 331.847656 272.632812 329.289062 271.023438 C 318.238281 264.574219 304.328125 272.964844 297.910156 282.664062 C 294.351562 288.042969 292.261719 294.066406 293.023438 300.546875 C 293.445312 304.183594 295.101562 307.433594 297.921875 309.753906 C 300.878906 312.183594 304.664062 312.984375 308.496094 312.835938 C 316.441406 312.519531 324.90625 308.066406 330.554688 302.558594 L 339.164062 294.160156 L 347.546875 286.015625 L 356.175781 277.640625 L 364.308594 269.761719 L 366.953125 267.332031 C 375.574219 259.417969 387.828125 253.152344 399.652344 254.046875 C 405.488281 254.492188 410.957031 256.375 415.375 260.128906 L 418.492188 263.253906 C 422.609375 267.992188 424.339844 274.039062 424.550781 280.246094 C 424.589844 281.460938 424.632812 282.382812 424.53125 283.640625 L 424.261719 287.027344 C 422.96875 295.96875 419.050781 304.226562 413.078125 311.027344 L 407.804688 316.285156 C 404.136719 319.488281 400.117188 322.042969 395.6875 324.027344 C 392.113281 325.625 388.574219 326.480469 384.675781 326.96875 C 374.777344 328.214844 364.984375 324.796875 358.320312 317.390625 C 356.1875 315.019531 354.523438 312.515625 353.027344 309.734375 C 352.386719 308.546875 351.664062 307.484375 351.324219 306.066406 L 363.601562 296.164062 L 367.023438 303.65625 C 370.476562 309.863281 377.0625 313.484375 384.242188 312.777344 C 389.910156 312.21875 394.976562 309.535156 399.296875 305.875 C 403.035156 302.710938 405.847656 298.808594 407.886719 294.375 C 409.121094 291.679688 409.789062 288.941406 410.15625 286.023438 C 410.574219 282.703125 409.933594 279.390625 408.691406 276.410156"
  const si = (d: number) => `kafoolHdrIn 0.5s cubic-bezier(0.16,1,0.3,1) ${d}s forwards`
  return (
    <svg width="100" height="30" viewBox="55 242 490 106"
      xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" aria-label="Kafool">
      <defs>
        <path id="hg0" d="M 68.578125 -71.953125 L 49.890625 -71.953125 L 24.34375 -40.453125 L 29.421875 -71.953125 L 13.8125 -71.953125 L 2.28125 0 L 17.890625 0 L 22.65625 -29.921875 L 40.453125 0 L 58.84375 0 L 37.875 -35.390625 Z"/>
        <path id="hg1" d="M 49.890625 0 L 66.59375 0 L 51.78125 -71.953125 L 34.1875 -71.953125 L -3.671875 0 L 12.828125 0 L 20.171875 -14.515625 L 47.203125 -14.515625 Z M 26.828125 -27.828125 L 39.859375 -53.578125 L 44.625 -27.828125 Z"/>
        <path id="hg2" d="M 2.28125 0 L 17.796875 0 L 22.265625 -28.03125 L 43.03125 -28.03125 L 45.21875 -42.046875 L 24.453125 -42.046875 L 26.9375 -57.546875 L 49.59375 -57.546875 L 51.875 -71.953125 L 13.609375 -71.953125 Z"/>
        <path id="hg3" d="M 2.28125 0 L 40.15625 0 L 42.4375 -14.40625 L 20.171875 -14.40625 L 29.421875 -71.953125 L 13.8125 -71.953125 Z"/>
        <style>{`
          @keyframes kafoolHdrLoop { 0% { stroke-dashoffset:0 } 100% { stroke-dashoffset:-1400 } }
          @keyframes kafoolHdrIn { 0% { opacity:0; transform:translateY(6px) } 100% { opacity:1; transform:translateY(0) } }
        `}</style>
      </defs>
      <path fill="rgb(94.5%,36.9%,30.2%)" d={sp} />
      <path fill="none" stroke="rgb(94.5%,36.9%,30.2%)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray="90 1310" strokeDashoffset="0"
        style={{ animation: 'kafoolHdrLoop 2s linear infinite' }} d={sp} />
      <g fill="rgb(25.1%,42%,70.6%)" style={{ opacity:0, animation: si(0.1) }}><use xlinkHref="#hg3" x="421.282518" y="326.941531"/></g>
      <g fill="rgb(25.1%,42%,70.6%)" style={{ opacity:0, animation: si(0.26) }}><use xlinkHref="#hg2" x="226.182145" y="326.941531"/></g>
      <g fill="rgb(25.1%,42%,70.6%)" style={{ opacity:0, animation: si(0.42) }}><use xlinkHref="#hg1" x="154.914132" y="326.941531"/></g>
      <g fill="rgb(25.1%,42%,70.6%)" style={{ opacity:0, animation: si(0.58) }}><use xlinkHref="#hg0" x="93.088881"  y="326.941531"/></g>
    </svg>
  )
}

const NAV_LINKS = [
  { label: 'אודות', href: '/about' },
  { label: 'שאלות ותשובות', href: '/faq' },
  { label: 'צור קשר', href: '/contact' },
]

function StickyHeader({ org, campaign, primaryColor, onDonate }: { org: Org; campaign: Campaign; primaryColor: string; onDonate: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const settings = campaign.settings as { tagline?: string | null }
  // the campaign's own logo (uploaded by the manager in the media tab),
  // falling back to the org logo, then the Kafool logo
  const logoUrl = campaign.logo_url || org.logo_url || null
  // only an explicit short tagline — never the campaign "about" text
  const tagline = settings?.tagline?.trim() || null

  return (
    <header className="sticky top-0 inset-x-0 z-50 bg-white border-b border-gray-100 shadow-sm" role="banner">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* Logo + tagline */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Kafool logo · divider · the campaign's own logo */}
          <KafoolAnimatedLogo />
          {logoUrl && (
            <>
              <div className="h-8 w-px bg-gray-200 shrink-0" />
              <img
                src={logoUrl}
                alt={campaign.title}
                className="h-9 w-auto object-contain max-w-[120px] shrink-0"
                loading="eager"
                fetchPriority="high"
                decoding="sync"
              />
            </>
          )}
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
          <button
            onClick={() => onDonate()}
            className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-full text-white shadow-md hover:opacity-90 transition-all"
            style={{ backgroundColor: primaryColor }}>
            <Heart className="w-3.5 h-3.5" />
            לתרומה עכשיו
          </button>
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
        className="relative w-full max-w-3xl"
        onClick={e => e.stopPropagation()}
      >
        {/* כפתור סגירה מעל הנגן — לא חופף לפקדי היוטיוב */}
        <button
          onClick={onClose}
          className="absolute -top-11 right-0 z-10 inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white text-sm font-medium transition-colors"
          aria-label="סגור וידאו"
        >
          <X className="w-4 h-4" />
          סגור
        </button>
        <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allowFullScreen
            allow="autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope"
            title="וידאו"
          />
        </div>
      </div>
    </div>
  )
}

// Single rotating banner carousel (used separately for desktop / mobile image sets)
function BannerCarousel({ banners, videoEmbed, onPlayVideo }: {
  banners: string[]
  videoEmbed: string | null
  onPlayVideo: () => void
}) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (banners.length <= 1) return
    const t = setInterval(() => setIdx(i => (i + 1) % banners.length), 4000)
    return () => clearInterval(t)
  }, [banners.length])

  if (banners.length === 0) {
    return (
      <div className="w-full relative flex flex-col items-center justify-center gap-3 py-20 border-2 border-dashed border-gray-200 bg-gray-50" style={{ minHeight: 260 }}>
        <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
          <path strokeLinecap="round" d="M21 15l-5-5L5 21"/>
        </svg>
        <p className="text-gray-400 font-medium text-sm">אזור הבאנר של הקמפיין</p>
        <p className="text-gray-300 text-xs">העלה באנרים בהגדרות הקמפיין</p>
        {videoEmbed && (
          <button
            onClick={onPlayVideo}
            className="mt-2 flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800 text-white text-sm font-bold hover:bg-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            צפה בוידאו
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden">
      {banners.map((url, i) => (
        <img
          key={url}
          src={url}
          alt=""
          aria-hidden
          fetchPriority={i === 0 ? 'high' : 'low'}
          decoding={i === 0 ? 'sync' : 'async'}
          className="w-full h-auto object-contain absolute top-0 left-0 transition-opacity duration-700"
          style={{ opacity: i === idx ? 1 : 0, position: i === 0 ? 'relative' : 'absolute' }}
          loading={i === 0 ? 'eager' : 'lazy'}
        />
      ))}

      {/* כפתור פלאי — inline style למניעת RTL flip */}
      {videoEmbed && (
        <button
          onClick={e => { e.stopPropagation(); onPlayVideo() }}
          aria-label="הפעל וידאו"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 20,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          <div style={{
            width: 72, height: 72,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            transition: 'transform 0.2s, background 0.2s',
          }}>
            <svg style={{ width: 32, height: 32, color: '#111', marginLeft: 4 }} fill="currentColor" viewBox="0 0 24 24">
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
  )
}

function HeroSection({ campaign, countdown }: {
  campaign: Campaign
  countdown: { d: number; h: number; m: number; s: number } | null
}) {
  const settings = campaign.settings as {
    banners?: { url: string; sort_order: number }[]
    mobile_banners?: { url: string; sort_order: number }[]
  }
  const banners = settings?.banners?.length
    ? [...settings.banners].sort((a, b) => a.sort_order - b.sort_order).map(b => b.url)
    : campaign.cover_image_url ? [campaign.cover_image_url] : []

  // Dedicated mobile banner set; falls back to the desktop banners when none uploaded.
  const mobileBanners = settings?.mobile_banners?.length
    ? [...settings.mobile_banners].sort((a, b) => a.sort_order - b.sort_order).map(b => b.url)
    : banners

  const [videoOpen, setVideoOpen] = useState(false)
  const videoEmbed = campaign.video_url ? getVideoEmbed(campaign.video_url) : null

  return (
    <>
      <section className="w-full" aria-label="באנר קמפיין">
        {/* Mobile banner set */}
        <div className="md:hidden">
          <BannerCarousel banners={mobileBanners} videoEmbed={videoEmbed} onPlayVideo={() => setVideoOpen(true)} />
        </div>
        {/* Desktop banner set */}
        <div className="hidden md:block">
          <BannerCarousel banners={banners} videoEmbed={videoEmbed} onPlayVideo={() => setVideoOpen(true)} />
        </div>

        {countdown && (
          <div className="bg-white border-b border-gray-100 py-3 px-4">
            <div className="max-w-md mx-auto flex items-center justify-center gap-4" dir="rtl">
              <span className="text-sm text-gray-500 font-medium">נותר:</span>
              <div className="flex items-center gap-3" dir="ltr">
                {[{ val: countdown.d, label: 'ימים' }, { val: countdown.h, label: 'שעות' }, { val: countdown.m, label: 'דקות' }, { val: countdown.s, label: 'שניות' }].map((item, i) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="text-xl font-black tabular-nums text-gray-800">{String(item.val).padStart(2, '0')}</div>
                      <div className="text-[9px] text-gray-400 uppercase tracking-wider">{item.label}</div>
                    </div>
                    {i < 3 && <span className="text-gray-300 font-bold">:</span>}
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

function DonationPlans({ plans, primaryColor, campaignSlug, groups, buttonRadius, onDonate }: {
  plans: { amount: number; label?: string; image_url?: string | null; payment_type?: 'one_time' | 'hok'; months?: number | null }[]
  primaryColor: string
  campaignSlug: string
  groups: Group[]
  buttonRadius: string
  onDonate: (amount?: number, groupSlug?: string, method?: 'one_time' | 'hok', months?: number) => void
}) {
  const [selected, setSelected] = useState<number | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<'one_time' | 'hok'>('one_time')
  const [selectedMonths, setSelectedMonths] = useState<number | undefined>()
  const [custom, setCustom] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string>('')

  const finalAmount = selected ?? (custom ? Number(custom) : null)

  return (
    <section className="bg-white border-b border-gray-100 py-8 px-4" aria-label="מסלולי תרומה">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-lg font-bold text-gray-700 mb-6 text-center">בחר סכום תרומה</h2>

        {/* Grid: 3 columns on mobile, scrollable row on md+ */}
        <div className="grid grid-cols-3 gap-4 pb-2 px-1 md:flex md:gap-5 md:overflow-x-auto md:pb-6 md:pt-4 md:px-4 md:scrollbar-hide md:snap-x md:justify-center md:flex-nowrap" style={{ overflowY: 'visible' }}>
          {plans.map(({ amount, label, image_url, payment_type, months }) => {
            const isActive = selected === amount
            return (
              <button
                key={amount}
                onClick={() => {
                  setSelected(isActive ? null : amount)
                  // a button's payment type/months drive the modal (one_time by default, hok if configured)
                  setSelectedMethod(payment_type ?? 'one_time')
                  setSelectedMonths(payment_type === 'hok' ? (months ?? undefined) : undefined)
                  setCustom('')
                }}
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
                  onChange={(e) => { setCustom(e.target.value); setSelected(null); setSelectedMethod('one_time'); setSelectedMonths(undefined) }}
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
          <button
            onClick={() => onDonate(finalAmount ?? undefined, selectedGroup || undefined, selectedMethod, selectedMethod === 'hok' ? selectedMonths : undefined)}
            className={`flex-1 py-3.5 text-white font-black text-base text-center shadow-lg hover:opacity-90 active:scale-95 transition-all ${buttonRadius}`}
            style={{ backgroundColor: primaryColor }}
          >
            {finalAmount ? `תרום ₪${finalAmount.toLocaleString()}` : 'לתרומה'}
          </button>
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

      </div>
    </section>
  )
}

type SortBy = 'recent' | 'amount_desc' | 'amount_asc'
type CommunityTab = 'donors' | 'groups' | 'communities'

function CommunitySection({ donations, groups, primaryColor, campaignSlug, onCreateGroup }: { donations: Donation[]; groups: Group[]; primaryColor: string; campaignSlug: string; onCreateGroup: () => void }) {
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
    <div id="donors">
      <div>
        <h2 className="text-2xl font-black text-gray-900 mb-6">קהילת התורמים</h2>

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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 auto-rows-fr">
                  {filtered.slice(0, visible).map(d => {
                    const donorGroup = d.group_id ? groups.find(g => g.id === d.group_id) : null
                    return (
                    <article
                      key={d.id}
                      className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col justify-center"
                    >
                      <div className="flex items-center gap-4">
                        {/* avatar (rightmost in RTL) */}
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-base font-black shrink-0"
                          style={{ backgroundColor: `${primaryColor}1A`, color: primaryColor }}
                          aria-hidden
                        >
                          {donorInitials(d.donor_name || 'אנונימי')}
                        </div>

                        {/* name + meta */}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-base text-gray-900 leading-tight break-words">
                            {d.donor_name || 'אנונימי'}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            <span suppressHydrationWarning>{relativeTime(d.created_at)}</span>
                          </div>
                          {donorGroup && (
                            <a
                              href={`/${campaignSlug}/g/${donorGroup.slug}`}
                              className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold hover:opacity-80 transition-opacity"
                              style={{ backgroundColor: `${primaryColor}1A`, color: primaryColor }}
                            >
                              👥 {donorGroup.name}
                            </a>
                          )}
                        </div>

                        {/* amount + like (leftmost in RTL) */}
                        <div className="shrink-0 flex flex-col items-center gap-1.5">
                          <div className="text-xl font-black leading-none" style={{ color: primaryColor }}>
                            ₪{d.amount.toLocaleString()}
                          </div>
                          <button
                            onClick={() => setLiked(s => { const n = new Set(s); n.has(d.id) ? n.delete(d.id) : n.add(d.id); return n })}
                            aria-label={liked.has(d.id) ? 'הסר לייק' : 'תן לייק'}
                            aria-pressed={liked.has(d.id)}
                            className="transition-colors"
                            style={{ color: liked.has(d.id) ? '#ef4444' : '#d1d5db' }}
                          >
                            <Heart className={`w-3.5 h-3.5 ${liked.has(d.id) ? 'fill-red-500' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {d.dedication && (
                        <p className="text-sm text-gray-600 mt-3 leading-relaxed bg-gray-50 rounded-xl px-3 py-2 border-r-2" style={{ borderColor: primaryColor }}>
                          {d.dedication}
                        </p>
                      )}
                    </article>
                    )
                  })}
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
          <div className="space-y-5">
            {/* CTA banner */}
            <button
              onClick={onCreateGroup}
              className="w-full py-4 rounded-2xl font-bold text-sm transition-all hover:opacity-90 active:scale-[0.99] flex items-center justify-center gap-2"
              style={{ background: `linear-gradient(135deg, ${primaryColor}18 0%, ${primaryColor}08 100%)`, border: `1.5px dashed ${primaryColor}60`, color: primaryColor }}
            >
              <span className="text-lg leading-none">+</span>
              <span>פתח קבוצת גיוס משלך</span>
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map(g => {
                const pct = g.goal_amount > 0 ? Math.min(100, Math.round((g.raised_amount / g.goal_amount) * 100)) : 0
                const initials = (g.manager_name || g.name || 'א')[0]
                return (
                  <a
                    key={g.id}
                    href={`/${campaignSlug}/g/${g.slug}`}
                    className="group block bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                  >
                    {/* Image / avatar header */}
                    <div className="relative h-32 overflow-hidden" style={{ background: `linear-gradient(135deg, ${primaryColor}22, ${primaryColor}0a)` }}>
                      {g.image_url ? (
                        <img src={g.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-black shadow-md" style={{ backgroundColor: primaryColor }}>
                            {initials}
                          </div>
                        </div>
                      )}
                      {/* % badge */}
                      <div className="absolute top-3 left-3 text-xs font-black px-2.5 py-1 rounded-full text-white shadow-sm" style={{ backgroundColor: primaryColor }}>
                        {pct}%
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="font-black text-gray-800 text-sm leading-snug">{g.name}</h3>
                      {g.manager_name && <p className="text-xs text-gray-400 mt-0.5">{g.manager_name}</p>}

                      {/* Progress */}
                      <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: primaryColor }} />
                      </div>
                      <div className="flex justify-between text-[11px] text-gray-400 mt-1.5">
                        <span>₪{(g.raised_amount || 0).toLocaleString()} גויס</span>
                        <span>יעד ₪{(g.goal_amount || 0).toLocaleString()}</span>
                      </div>

                      <div className="mt-3 flex items-center justify-center gap-1 text-xs font-bold py-2 rounded-xl transition-all group-hover:opacity-90" style={{ color: primaryColor, backgroundColor: `${primaryColor}12` }}>
                        <span>כנס לקבוצה</span>
                        <span className="text-base leading-none">←</span>
                      </div>
                    </div>
                  </a>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AboutSection({ campaign, gallery }: { campaign: Campaign; gallery: GalleryItem[] }) {
  const settings = campaign.settings as { about_text?: string | null }
  const aboutText = settings?.about_text
  const videoEmbed = campaign.video_url ? getVideoEmbed(campaign.video_url) : null
  const videoThumb = campaign.video_url ? getYoutubeThumbnail(campaign.video_url) : null
  const [videoOpen, setVideoOpen] = useState(false)
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (gallery.length <= 1) return
    const t = setInterval(() => setIdx(i => (i + 1) % gallery.length), 4000)
    return () => clearInterval(t)
  }, [gallery.length])

  if (!aboutText && !videoEmbed && gallery.length === 0) return null

  return (
    <div className="space-y-6">
        {videoEmbed && (
          <button
            onClick={() => setVideoOpen(true)}
            className="w-full rounded-3xl overflow-hidden aspect-video shadow-md relative group block cursor-pointer"
            aria-label="הפעל וידאו"
          >
            {videoThumb
              ? <img src={videoThumb} alt="תמונה מקדימה לוידאו" className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-gray-900" />
            }
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-gray-900 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </div>
          </button>
        )}

      <h2 className="text-2xl font-black text-gray-900">אודות הקמפיין</h2>

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

        {videoOpen && videoEmbed && (
          <VideoModal embedUrl={videoEmbed} onClose={() => setVideoOpen(false)} />
        )}
    </div>
  )
}

function FloatingBar({ primaryColor, buttonRadius, onDonate }: { campaign: Campaign; primaryColor: string; buttonRadius: string; donateHref?: string; onDonate: () => void }) {
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
        <button
          onClick={() => onDonate()}
          className={`flex-[2] py-3 text-white font-black text-sm text-center shadow-md hover:opacity-90 active:scale-95 transition-all ${buttonRadius}`}
          style={{ backgroundColor: primaryColor }}
        >
          לתרומה
        </button>
        <button
          onClick={() => navigator.share?.({ title: 'שתף', url: window.location.href }) ?? navigator.clipboard.writeText(window.location.href)}
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

// Mobile-only "back to top" arrow, shown after scrolling down. Sits above the floating donate bar.
function ScrollTopButton() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const fn = () => setVisible(window.scrollY > 600)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])
  if (!visible) return null
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="חזרה לראש הדף"
      className="md:hidden fixed right-4 z-40 w-11 h-11 rounded-full bg-white border border-gray-200 shadow-lg flex items-center justify-center text-gray-600 active:scale-95 transition-transform"
      style={{ bottom: '6rem' }}
    >
      <ChevronDown className="w-5 h-5 rotate-180" />
    </button>
  )
}

/* ─── Main Page ─── */
export default function DonationPageClient({ org, campaign, donations: initialDonations, groups, gallery, activeGroup, donationUrl = '', paymentUrls }: Props) {
  const [donations, setDonations] = useState<Donation[]>(initialDonations)
  const [raisedAmount, setRaisedAmount] = useState(campaign.raised_amount)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalAmount, setModalAmount] = useState<number | undefined>()
  const [modalGroupSlug, setModalGroupSlug] = useState<string | undefined>()
  const [modalMethod, setModalMethod] = useState<'one_time' | 'hok' | undefined>()
  const [modalMonths, setModalMonths] = useState<number | undefined>()
  const [createGroupOpen, setCreateGroupOpen] = useState(false)
  const countdownEnd = (campaign.settings as { countdown_end?: string })?.countdown_end || campaign.end_at
  const countdown = useCountdown(countdownEnd)

  const settings = campaign.settings as {
    donation_amounts?: number[]
    donation_plans?: { amount: number; label?: string; image_url?: string | null; payment_type?: 'one_time' | 'hok'; months?: number | null }[]
    primary_color?: string
    button_radius?: string
    whatsapp_phone?: string
    whatsapp_message?: string
  }
  const primaryColor = settings?.primary_color || '#2563eb'
  const whatsappPhone = settings?.whatsapp_phone?.replace(/\D/g, '')
  const whatsappUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone}${settings?.whatsapp_message ? `?text=${encodeURIComponent(settings.whatsapp_message)}` : ''}`
    : null
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

  const donateBase = activeGroup
    ? `/${campaign.slug}/donate?group=${activeGroup.id}`
    : `/${campaign.slug}/donate`

  function openDonate(amount?: number, groupSlug?: string, method?: 'one_time' | 'hok', months?: number) {
    setModalAmount(amount)
    setModalGroupSlug(groupSlug || (activeGroup ? activeGroup.slug : undefined))
    setModalMethod(method)
    setModalMonths(months)
    setModalOpen(true)
  }

  // For group view: track group raised amount + donor count in realtime
  const [groupRaised, setGroupRaised] = useState(activeGroup?.raised_amount ?? 0)
  const [groupDonors, setGroupDonors] = useState(activeGroup?.donorCount ?? 0)
  useEffect(() => {
    if (!activeGroup) return
    const supabase = createClient()
    const ch = supabase
      .channel(`group-raised-${activeGroup.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'donations', filter: `group_id=eq.${activeGroup.id}` }, (payload) => {
        const d = payload.new as { amount?: number }
        if (d.amount) setGroupRaised(p => p + d.amount!)
        setGroupDonors(p => p + 1)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [activeGroup?.id])

  const groupPct = activeGroup && activeGroup.goal_amount > 0
    ? Math.min(100, Math.round((groupRaised / activeGroup.goal_amount) * 100))
    : 0

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* 1. Sticky Header */}
      <StickyHeader org={org} campaign={campaign} primaryColor={primaryColor} onDonate={openDonate} />

      {/* Group stats strip */}
      {activeGroup && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-4 py-4 space-y-3">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${groupPct}%`, backgroundColor: primaryColor }}
              />
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-gray-400 mb-0.5">דף התרומה של</p>
                    <h2 className="text-xl font-black text-gray-900 break-words leading-tight">{activeGroup.name}</h2>
                    {activeGroup.manager_name && (
                      <p className="text-xs text-gray-400 mt-0.5">מגייס: {activeGroup.manager_name}</p>
                    )}
                  </div>
                  {/* חזרה לדף הקמפיין הראשי */}
                  <a
                    href={`/${campaign.slug}`}
                    aria-label="חזרה לדף הקמפיין"
                    title="חזרה לדף הקמפיין הראשי"
                    className="shrink-0 -mt-1 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </a>
                </div>
              </div>
              <div className="text-center shrink-0">
                <div className="text-2xl font-black tabular-nums" style={{ color: primaryColor }}>
                  ₪{groupRaised.toLocaleString('he-IL')}
                </div>
                <div className="text-[11px] text-gray-400">מתוך ₪{activeGroup.goal_amount.toLocaleString('he-IL')} יעד</div>
              </div>
              <div className="text-center shrink-0">
                <div className="text-2xl font-black text-gray-700 tabular-nums">{groupDonors}</div>
                <div className="text-[11px] text-gray-400">תורמים</div>
              </div>
              <button
                onClick={() => openDonate(undefined, activeGroup?.slug)}
                className="shrink-0 px-6 py-2.5 rounded-full text-white font-black text-sm shadow hover:opacity-90 active:scale-95 transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                תרום
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Hero */}
      <HeroSection campaign={campaign} countdown={countdown} />

      {/* 3. Donation Plans */}
      <DonationPlans plans={donationPlans} primaryColor={primaryColor} campaignSlug={campaign.slug} groups={groups} buttonRadius={buttonRadius} onDonate={openDonate} />

      {/* 4. Progress */}
      <ProgressSection raised={raisedAmount} goal={campaign.goal_amount} donorsCount={donations.length} primaryColor={primaryColor} />

      {/* 5+7. About (right) + Community (left) — two columns */}
      <section className="py-10 px-4 bg-white border-t border-gray-100" id="about">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-10">
            {/* ימין — אודות */}
            <div className="lg:w-[45%] shrink-0">
              <AboutSection campaign={campaign} gallery={gallery} />
            </div>
            {/* שמאל — תורמים */}
            <div className="flex-1 min-w-0">
              <CommunitySection donations={donations} groups={groups} primaryColor={primaryColor} campaignSlug={campaign.slug} onCreateGroup={() => setCreateGroupOpen(true)} />
            </div>
          </div>
        </div>
      </section>

      {/* 8. Floating bar */}
      {/* WhatsApp floating button */}
      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-opacity hover:opacity-90"
          style={{
            backgroundColor: '#25D366',
            left: '1rem',
            bottom: '5rem',
            transform: 'translateZ(0)',
            willChange: 'opacity',
          }}
          dir="ltr"
          aria-label="שלח הודעה בWhatsApp"
        >
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
      )}

      <FloatingBar campaign={campaign} primaryColor={primaryColor} buttonRadius={buttonRadius} onDonate={() => openDonate()} />

      <ScrollTopButton />
      {/* מורם מעל פס התרומה הצף בתחתית */}
      <AccessibilityWidget offsetBottom="6rem" />

      <CreateGroupModal
        isOpen={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
        campaignId={campaign.id}
        primaryColor={primaryColor}
      />

      <DonationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        presetAmount={modalAmount}
        presetGroupSlug={modalGroupSlug}
        presetMethod={modalMethod}
        presetMonths={modalMonths}
        donationUrl={donationUrl}
        paymentUrls={paymentUrls}
        campaign={campaign}
        primaryColor={primaryColor}
        buttonRadius={buttonRadius}
        groups={groups.map(g => ({ id: g.id, name: g.name, slug: g.slug }))}
      />

      {/* Bottom padding for floating bar */}
      <div className="h-20" />

      <Footer />
    </div>
  )
}
