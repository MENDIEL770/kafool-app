'use client'

import { useEffect, useState, useRef, useCallback, useMemo, createContext, useContext } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { sanitizeHtml } from '@/lib/sanitize'
import { track, trackOnce } from '@/lib/track'
import type { Campaign, Group } from '@/types'
import { Search, Share2, Heart, Menu, X, ChevronDown, ChevronLeft, ChevronRight, Globe } from 'lucide-react'
import { resolveBuilderConfig, activeBlockMap, radiusToButtonClass } from '@/lib/builder-config'

/* ─── i18n ─── */
export type Lang = 'he' | 'en'
const LangCtx = createContext<Lang>('he')
const useLang = () => useContext(LangCtx)

// [Hebrew, English]
const STR = {
  about: ['אודות', 'About'],
  faq: ['שאלות ותשובות', 'FAQ'],
  wantPage: ['אני רוצה דף גיוס', 'Start a campaign'],
  share: ['שיתוף', 'Share'],
  donateNow: ['לתרומה עכשיו', 'Donate now'],
  chooseAmount: ['בחר סכום תרומה', 'Choose an amount'],
  perMonth: ['לחודש', '/mo'],
  otherAmount: ['סכום אחר', 'Other'],
  donate: ['לתרומה', 'Donate'],
  oneTime: ['חד״פ', 'One-time'],
  standingOrder: ['הוראת קבע', 'Monthly'],
  raisedOfGoal: ['גויסו מתוך יעד', 'raised of'],
  remaining: ['נותר', 'left'],
  goalReached: ['היעד הושג!', 'Goal reached!'],
  beFirst: ['היה הראשון לתרום!', 'Be the first to donate!'],
  loadMore: ['טען עוד', 'Load more'],
  raised: ['גויס', 'raised'],
  goalWord: ['יעד', 'goal'],
  enterGroup: ['כנס לקבוצה', 'View group'],
  aboutCampaign: ['אודות הקמפיין', 'About the campaign'],
  securePayment: ['תשלום מאובטח', 'Secure payment'],
  groups: ['קבוצות', 'Groups'],
  recentDonors: ['תורמים אחרונים', 'Recent donors'],
  donorsCommunity: ['קהילת התורמים', 'Donor community'],
  donorsTab: ['תורמים', 'Donors'],
  searchDonor: ['חיפוש תורם...', 'Search donor...'],
  donorsWord: ['תורמים', 'donors'],
  brickSingular: ['לבנה', 'brick'],
  bricksPlural: ['לבנים', 'bricks'],
  anonymous: ['אנונימי', 'Anonymous'],
  via: ['דרך', 'via'],
  readMore: ['הצג עוד', 'Read more'],
  readLess: ['הצג פחות', 'Show less'],
} as const

// Donor card — fixed uniform height regardless of dedication length (up to 3
// lines fit). Long dedications show a bold "show more" at the end of the last
// line; clicking it expands just that card to reveal the full text.
function DonorCard({ d, donorGroup, primaryColor, campaignSlug, liked, onToggleLike }: {
  d: Donation
  donorGroup: Group | null | undefined
  primaryColor: string
  campaignSlug: string
  liked: boolean
  onToggleLike: () => void
}) {
  const t = useT()
  const lang = useLang()
  const [expanded, setExpanded] = useState(false)
  const ded = d.dedication
  // "Long" = would exceed 3 lines, by character count OR by explicit line breaks.
  const isLong = (ded?.length ?? 0) > 120 || (ded ? ded.split('\n').length > 3 : false)

  return (
    <article
      className={`bg-white rounded-2xl p-3 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col ${expanded ? '' : 'h-[150px] overflow-hidden'}`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-base font-black shrink-0"
          style={{ backgroundColor: `${primaryColor}1A`, color: primaryColor }}
          aria-hidden
        >
          {donorInitials(d.donor_name || t('anonymous'))}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-base text-gray-900 leading-tight line-clamp-1">{d.donor_name || t('anonymous')}</div>
          <div className="flex items-center justify-between gap-2 mt-1">
            <span className="text-xs text-gray-400" suppressHydrationWarning>{relativeTime(d.created_at, lang)}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex flex-col items-end leading-none">
                <span className="text-lg font-black leading-none" style={{ color: primaryColor }}>{donationAmount(d)}</span>
                {d.payment_type === 'hok' && d.monthly_amount && d.installments ? (
                  <span className="text-[10px] font-semibold text-gray-400 mt-0.5" dir="ltr">₪{d.monthly_amount.toLocaleString()}×{d.installments}</span>
                ) : null}
              </div>
              <button
                onClick={onToggleLike}
                aria-label={liked ? 'הסר לייק' : 'תן לייק'}
                aria-pressed={liked}
                className="transition-colors"
                style={{ color: liked ? '#ef4444' : '#d1d5db' }}
              >
                <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-red-500' : ''}`} />
              </button>
            </div>
          </div>
          {donorGroup && (
            <a
              href={`/${campaignSlug}/g/${donorGroup.slug}`}
              className="flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold hover:opacity-80 transition-opacity max-w-full w-fit"
              style={{ backgroundColor: `${primaryColor}1A`, color: primaryColor }}
            >
              <span className="truncate">{t('via')} {donorGroup.name}</span>
            </a>
          )}
        </div>
      </div>

      {ded && (
        <p className={`mt-2 text-xs text-gray-500 leading-snug whitespace-pre-line flex-1 min-h-0 overflow-hidden ${expanded ? '' : 'line-clamp-3'}`}>{ded}</p>
      )}
      {ded && isLong && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-xs font-bold mt-1 self-start shrink-0"
          style={{ color: primaryColor }}
        >
          {expanded ? t('readLess') : t('readMore')}
        </button>
      )}
    </article>
  )
}

function useT() {
  const lang = useLang()
  return (key: keyof typeof STR) => STR[key][lang === 'en' ? 1 : 0]
}
import DonationModal from './DonationModal'
import CreateGroupModal from './CreateGroupModal'
import AccessibilityWidget from '../_components/AccessibilityWidget'
import Footer from '../_components/Footer'

/* ─── Types ─── */
interface Org { id: string; name: string; slug: string; logo_url: string | null }
interface Donation { id: string; donor_name: string | null; amount: number; dedication: string | null; created_at: string; group_id?: string | null; payment_type?: 'one_time' | 'hok' | null; monthly_amount?: number | null; installments?: number | null; currency?: string; orig_amount?: number | null }

// A donation's public amount label — in its ORIGINAL currency when it came in as
// foreign (e.g. $50), otherwise ₪. `amount` is always ₪ (used for campaign totals).
function donationAmount(d: Donation): string {
  const cur = (d.currency || 'ils').toLowerCase()
  if (cur !== 'ils' && d.orig_amount) {
    const s = ({ usd: '$', eur: '€', gbp: '£' } as Record<string, string>)[cur] || cur.toUpperCase() + ' '
    return `${s}${d.orig_amount.toLocaleString()}`
  }
  return `₪${d.amount.toLocaleString()}`
}

// Normalize a phone number for a wa.me link: digits only, international format.
// A malformed number (e.g. a local "05…") makes WhatsApp open an "invalid number"
// page that flashes and closes — so convert a local Israeli 0-prefix to 972, and
// strip a 00 international prefix. Anything already in country-code form is kept.
function normalizeWaPhone(raw?: string): string {
  let d = (raw || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('00')) d = d.slice(2)
  else if (d.startsWith('0')) d = '972' + d.slice(1)
  return d
}
interface GalleryItem { id: string; image_url: string; caption: string | null }
interface ActiveGroup { id: string; name: string; slug: string; goal_amount: number; raised_amount: number; manager_name: string | null; image_url?: string | null; donorCount?: number }
interface PaymentUrls { one_time: string; hok: string; bit: string; bank: string; one_time_en?: string; hok_en?: string }
interface NedarimConfig { mosad: string; apiValid: string; active: boolean }
interface Props { org: Org; campaign: Campaign; donations: Donation[]; groups: Group[]; gallery: GalleryItem[]; activeGroup?: ActiveGroup; donationUrl?: string; paymentUrls?: PaymentUrls; paymentProvider?: string; nedarim?: NedarimConfig | null; initialLang?: Lang }

/* ─── Helpers ─── */
// Matches a YouTube video id across every common URL shape: watch?v=, youtu.be/,
// shorts/, live/, embed/, /v/ (and m.youtube / with extra params).
const YT_ID = /(?:youtube\.com\/(?:watch\?(?:[^&]*&)*v=|shorts\/|live\/|embed\/|v\/)|youtu\.be\/)([\w-]{6,})/
// A directly-uploaded video file (Supabase storage / any URL ending in a video ext).
const VIDEO_FILE = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i

function getVideoEmbed(url: string): string | null {
  const u = (url || '').trim()
  if (!u) return null
  const yt = u.match(YT_ID)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&autoplay=1&modestbranding=1&playsinline=1&disablekb=0`
  const vi = u.match(/vimeo\.com\/(\d+)/)
  if (vi) return `https://player.vimeo.com/video/${vi[1]}?autoplay=1`
  // Google Drive share link → embeddable preview player
  const gd = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=|.*[?&]id=)([\w-]+)/)
  if (gd) return `https://drive.google.com/file/d/${gd[1]}/preview`
  // Direct video file (uploaded) — played in a <video> element by VideoModal
  if (VIDEO_FILE.test(u)) return u
  return null
}

function getYoutubeThumbnail(url: string): string | null {
  const yt = (url || '').match(YT_ID)
  if (yt) return `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`
  return null
}

function donorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'א'
  if (parts.length === 1) return parts[0].slice(0, 2)
  return parts[0][0] + parts[parts.length - 1][0]
}

function relativeTime(iso: string, lang: Lang = 'he'): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const en = lang === 'en'
  if (m < 1) return en ? 'just now' : 'הרגע'
  if (m < 60) return en ? `${m}m ago` : `לפני ${m} דקות`
  const h = Math.floor(m / 60)
  if (h < 24) return en ? `${h}h ago` : `לפני ${h} שעות`
  const days = Math.floor(h / 24)
  if (days < 30) return en ? `${days}d ago` : `לפני ${days} ימים`
  return new Date(iso).toLocaleDateString(en ? 'en-US' : 'he-IL', { day: 'numeric', month: 'short' })
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
  const si = (d: number) => `kafoolHdrIn 0.5s cubic-bezier(0.16,1,0.3,1) ${d}s both`
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
      <g fill="rgb(25.1%,42%,70.6%)" style={{ animation: si(0.1) }}><use xlinkHref="#hg3" x="421.282518" y="326.941531"/></g>
      <g fill="rgb(25.1%,42%,70.6%)" style={{ animation: si(0.26) }}><use xlinkHref="#hg2" x="226.182145" y="326.941531"/></g>
      <g fill="rgb(25.1%,42%,70.6%)" style={{ animation: si(0.42) }}><use xlinkHref="#hg1" x="154.914132" y="326.941531"/></g>
      <g fill="rgb(25.1%,42%,70.6%)" style={{ animation: si(0.58) }}><use xlinkHref="#hg0" x="93.088881"  y="326.941531"/></g>
    </svg>
  )
}

const NAV_LINKS: { key: 'about' | 'faq' | 'wantPage'; href: string }[] = [
  { key: 'about', href: '/about' },
  { key: 'faq', href: '/faq' },
  { key: 'wantPage', href: '/contact' },
]

function StickyHeader({ org, campaign, primaryColor, onDonate, lang, onToggleLang }: { org: Org; campaign: Campaign; primaryColor: string; onDonate: () => void; lang: Lang; onToggleLang: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const t = useT()
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
        <div className="flex items-center gap-2.5 min-w-0 shrink">
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
              {t(l.key)}
            </a>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1 text-sm font-bold px-2.5 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
            aria-label="Switch language"
            title="עברית / English"
          >
            <Globe className="w-3.5 h-3.5" />
            {lang === 'he' ? 'EN' : 'עב'}
          </button>
          <button
            onClick={() => navigator.share?.({ title: campaign.title, url: window.location.href }) ?? navigator.clipboard.writeText(window.location.href)}
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            {t('share')}
          </button>
          <button
            onClick={() => onDonate()}
            className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-full text-white shadow-md hover:opacity-90 transition-all"
            style={{ backgroundColor: primaryColor }}>
            <Heart className="w-3.5 h-3.5" />
            {t('donateNow')}
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
              className="block text-sm font-medium text-gray-700 py-1.5">{t(l.key)}</a>
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
          {VIDEO_FILE.test(embedUrl) ? (
            <video src={embedUrl} className="w-full h-full" controls autoPlay playsInline />
          ) : (
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allowFullScreen
              allow="autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope"
              title="וידאו"
            />
          )}
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
  const lang = useLang()
  const settings = campaign.settings as {
    banners?: { url: string; sort_order: number }[]
    mobile_banners?: { url: string; sort_order: number }[]
    banners_en?: { url: string; sort_order: number }[]
    mobile_banners_en?: { url: string; sort_order: number }[]
    banner_video_button?: boolean
  }
  const urls = (v?: { url: string; sort_order: number }[]) =>
    v?.length ? [...v].sort((a, b) => a.sort_order - b.sort_order).map(b => b.url) : []
  // In English use the EN banner set when uploaded, else fall back to the Hebrew set.
  const heBanners = urls(settings?.banners).length ? urls(settings?.banners) : (campaign.cover_image_url ? [campaign.cover_image_url] : [])
  const banners = (lang === 'en' && urls(settings?.banners_en).length) ? urls(settings?.banners_en) : heBanners

  // Dedicated mobile banner set; falls back to the desktop banners when none uploaded.
  const heMobile = urls(settings?.mobile_banners).length ? urls(settings?.mobile_banners) : banners
  const mobileBanners = (lang === 'en' && urls(settings?.mobile_banners_en).length) ? urls(settings?.mobile_banners_en) : heMobile

  const [videoOpen, setVideoOpen] = useState(false)
  // The play button on the banner can be turned off in the campaign media settings.
  const showBannerVideo = settings?.banner_video_button !== false
  const videoEmbed = (showBannerVideo && campaign.video_url) ? getVideoEmbed(campaign.video_url) : null

  return (
    <>
      <section className="w-full" aria-label="באנר קמפיין">
        {/* Mobile banner set */}
        <div className="md:hidden">
          <BannerCarousel banners={mobileBanners} videoEmbed={videoEmbed} onPlayVideo={() => { setVideoOpen(true); track(campaign.id, 'video_play') }} />
        </div>
        {/* Desktop banner set */}
        <div className="hidden md:block">
          <BannerCarousel banners={banners} videoEmbed={videoEmbed} onPlayVideo={() => { setVideoOpen(true); track(campaign.id, 'video_play') }} />
        </div>

        {countdown && (
          <div className="bg-white border-b border-gray-100 py-4 md:py-5 px-4">
            <div className="max-w-md mx-auto flex items-center justify-center" dir="ltr">
              <div className="flex items-center gap-3 md:gap-5">
                {[{ val: countdown.d, label: lang === 'en' ? 'days' : 'ימים' }, { val: countdown.h, label: lang === 'en' ? 'hours' : 'שעות' }, { val: countdown.m, label: lang === 'en' ? 'min' : 'דקות' }, { val: countdown.s, label: lang === 'en' ? 'sec' : 'שניות' }].map((item, i) => (
                  <div key={item.label} className="flex items-center gap-3 md:gap-5">
                    <div className="text-center">
                      <div className="text-3xl md:text-5xl font-black tabular-nums text-gray-800 leading-none">{String(item.val).padStart(2, '0')}</div>
                      <div className="text-[10px] md:text-xs text-gray-400 tracking-wider mt-1">{item.label}</div>
                    </div>
                    {i < 3 && <span className="text-gray-300 font-bold text-2xl md:text-4xl leading-none">:</span>}
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

function DonationPlans({ plans, primaryColor, campaignSlug, groups, buttonRadius, buttonSize = 'default', otherAmountImage, otherAmountPlacement = 'grid', defaultCta, onDonate, displayCurrency = 'ils', fxRate }: {
  plans: { amount: number; label?: string; image_url?: string | null; image_url_en?: string | null; payment_type?: 'one_time' | 'hok'; months?: number | null; form?: string | null; cta?: string | null }[]
  primaryColor: string
  campaignSlug: string
  groups: Group[]
  buttonRadius: string
  buttonSize?: 'default' | 'large'
  otherAmountImage?: string | null
  otherAmountPlacement?: 'grid' | 'cta'
  defaultCta?: string
  onDonate: (amount?: number, groupSlug?: string, method?: 'one_time' | 'hok', months?: number, formMode?: string) => void
  displayCurrency?: string
  fxRate?: number
}) {
  // When the page is in a foreign currency (e.g. English → $ with Stripe on), the
  // ₪ button amounts are shown converted by the live rate. The amount passed on
  // click stays ₪ — the donation modal re-converts it to the same figure on open.
  const foreignDisplay = displayCurrency !== 'ils' && !!fxRate && fxRate > 0
  const curSym = ({ usd: '$', eur: '€', gbp: '£' } as Record<string, string>)[displayCurrency] || (displayCurrency.toUpperCase() + ' ')
  const fmtAmt = (ils: number) => foreignDisplay
    ? `${curSym}${Math.round(ils / (fxRate as number)).toLocaleString()}`
    : `₪${ils.toLocaleString()}`
  const [selected, setSelected] = useState<number | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<'one_time' | 'hok'>('one_time')
  const [selectedMonths, setSelectedMonths] = useState<number | undefined>()
  const [custom, setCustom] = useState('')
  const [selectedGroup] = useState<string>('')
  const customInputRef = useRef<HTMLInputElement>(null)

  // selected holds the chosen plan INDEX (not the amount) so two plans with the
  // same amount (e.g. 180 monthly vs 180 one-time) don't both highlight.
  const finalAmount = selected != null ? (plans[selected]?.amount ?? null) : (custom ? Number(custom) : null)
  const lang = useLang()
  const t = useT()

  // Large mode: big 1:1 buttons (full-width-ish squares on mobile, large circles
  // side by side on desktop). Buttons WRAP onto multiple rows so none get cut.
  const large = buttonSize === 'large'
  // The plan (amount) buttons follow the configured button shape on EVERY screen
  // — they used to be hard-coded to circles on desktop (md:rounded-full).
  const planShape = buttonRadius.includes('full') ? 'rounded-full'
    : buttonRadius.includes('xl') ? 'rounded-3xl'   // מעוגל
    : 'rounded-lg'                                    // מרובע
  const gridCls = large
    ? 'grid grid-cols-2 gap-4 md:flex md:flex-wrap md:gap-6 md:pt-4 md:px-4 md:justify-center'
    : 'grid grid-cols-3 gap-4 pb-2 px-1 md:flex md:flex-wrap md:gap-5 md:pt-4 md:px-4 md:justify-center'
  const itemCls = large
    ? 'flex flex-col items-center gap-2 cursor-pointer focus:outline-none w-full md:w-auto'
    : 'flex flex-col items-center gap-2 cursor-pointer focus:outline-none'
  const shapeCls = large
    ? `w-full aspect-square md:w-[180px] md:h-[180px] md:aspect-auto ${planShape} overflow-hidden transition-all duration-200 relative`
    : `w-[90px] h-[90px] md:w-[110px] md:h-[110px] ${planShape} overflow-hidden transition-all duration-200 relative`
  const amountTextCls = large ? 'text-white font-black text-3xl md:text-3xl' : 'text-white font-black text-lg md:text-xl'

  return (
    <section id="donation-plans" className="bg-white border-b border-gray-100 py-8 px-4" aria-label="מסלולי תרומה">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-lg font-bold text-gray-700 mb-6 text-center">{t('chooseAmount')}</h2>

        {/* Grid: 3 columns on mobile, scrollable row on md+ (or large 1:1 buttons) */}
        <div className={gridCls} style={{ overflowY: 'visible' }}>
          {plans.map(({ amount, label, image_url, image_url_en, payment_type, months }, i) => {
            const isActive = selected === i
            // English visitors see the EN button design when one was uploaded.
            const img = lang === 'en' ? (image_url_en || image_url) : image_url
            return (
              <button
                key={i}
                onClick={() => {
                  setSelected(isActive ? null : i)
                  // a button's payment type/months drive the modal (one_time by default, hok if configured)
                  setSelectedMethod(payment_type ?? 'one_time')
                  setSelectedMonths(payment_type === 'hok' ? (months ?? undefined) : undefined)
                  setCustom('')
                }}
                aria-pressed={isActive}
                className={itemCls}
              >
                {/* עיגול / כפתור גדול */}
                <div
                  className={shapeCls}
                  style={{
                    boxShadow: isActive
                      ? `0 0 0 4px white, 0 0 0 7px ${primaryColor}, 0 6px 20px ${primaryColor}44`
                      : '0 2px 10px rgba(0,0,0,0.08)',
                    transform: isActive ? 'scale(1.08)' : 'scale(1)',
                  }}
                >
                  {img ? (
                    <img src={img} alt={label || `₪${amount}`} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <div
                      className="w-full h-full flex flex-col items-center justify-center text-center px-2"
                      style={{ background: `linear-gradient(135deg, ${primaryColor}dd, ${primaryColor}88)` }}
                    >
                      <span className={amountTextCls}>{fmtAmt(amount)}</span>
                      {large && label && <span className="text-white/90 text-xs font-medium mt-1">{label}</span>}
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
                  <div className="text-xs md:text-sm font-bold text-gray-800">
                    {fmtAmt(amount)}{payment_type === 'hok' ? ` ${t('perMonth')}` : ''}
                  </div>
                  {label && <div className="text-[10px] md:text-[11px] text-gray-400 mt-0.5">{label}</div>}
                </div>
              </button>
            )
          })}

          {/* סכום אחר — מוצג כאן רק כשהמנהל בחר "ברשימת הכפתורים" (אחרת ליד כפתור התרומה) */}
          {otherAmountPlacement === 'grid' && (() => {
            const customActive = !selected && !!custom && Number(custom) > 0
            return (
              <button
                type="button"
                onClick={() => { customInputRef.current?.focus(); setSelected(null); setSelectedMethod('one_time'); setSelectedMonths(undefined) }}
                className={itemCls}
                aria-pressed={customActive}
              >
                <div
                  className={otherAmountImage
                    ? `${shapeCls} flex items-end justify-center`
                    : `${large ? `w-full aspect-square md:w-[180px] md:h-[180px] md:aspect-auto ${planShape}` : `w-[90px] h-[90px] md:w-[110px] md:h-[110px] ${planShape}`} border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-gray-50 transition-all duration-200`}
                  style={{
                    boxShadow: customActive
                      ? `0 0 0 4px white, 0 0 0 7px ${primaryColor}, 0 6px 20px ${primaryColor}44`
                      : otherAmountImage ? '0 2px 10px rgba(0,0,0,0.08)' : undefined,
                    transform: customActive ? 'scale(1.08)' : 'scale(1)',
                  }}
                >
                  {otherAmountImage && (
                    <img src={otherAmountImage} alt={t('otherAmount')} className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  {!otherAmountImage && (
                    <span className="text-[10px] md:text-xs text-gray-400 mb-1">{t('otherAmount')}</span>
                  )}
                  <div className={`flex items-center gap-0.5 ${otherAmountImage ? 'relative z-10 mb-2 bg-white/90 rounded-full px-2 py-0.5 shadow-sm backdrop-blur-sm' : ''}`}>
                    <span className="text-sm font-bold text-gray-500">₪</span>
                    <input
                      ref={customInputRef}
                      type="number"
                      value={custom}
                      onChange={(e) => { setCustom(e.target.value); setSelected(null); setSelectedMethod('one_time'); setSelectedMonths(undefined) }}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="0"
                      min="1"
                      className="w-12 md:w-14 text-center text-sm font-bold outline-none bg-transparent"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs md:text-sm font-bold text-gray-400">{t('otherAmount')}</div>
                </div>
              </button>
            )
          })()}
        </div>

        {/* Payment actions */}
        <div className="flex flex-row justify-center gap-2 sm:gap-3 mt-6 max-w-md mx-auto">
          {/* 'סכום אחר' next to the donate button (when the manager chose this placement) */}
          {otherAmountPlacement === 'cta' && (
            <button
              type="button"
              onClick={() => onDonate(undefined, selectedGroup || undefined, 'one_time', undefined, undefined)}
              className={`flex-none px-4 sm:px-6 py-2.5 sm:py-3.5 border-2 font-bold text-xs sm:text-sm transition-colors hover:bg-gray-50 ${buttonRadius}`}
              style={{ borderColor: primaryColor, color: primaryColor }}
            >
              {t('otherAmount')}
            </button>
          )}
          <button
            onClick={() => onDonate(finalAmount ?? undefined, selectedGroup || undefined, selectedMethod, selectedMethod === 'hok' ? selectedMonths : undefined, selected != null ? (plans[selected]?.form ?? undefined) : undefined)}
            className={`flex-1 py-2.5 sm:py-3.5 text-white font-black text-sm sm:text-base text-center shadow-lg hover:opacity-90 active:scale-95 transition-all ${buttonRadius}`}
            style={{ backgroundColor: primaryColor }}
          >
            {(() => {
              // Per-button CTA override → campaign default → the amount-based label.
              const override = ((selected != null ? plans[selected]?.cta : null) || defaultCta || '').trim()
              if (override) return override
              return finalAmount
                ? (selectedMethod === 'hok' && selectedMonths
                    ? (lang === 'en'
                        ? `Donate ${fmtAmt(finalAmount)} × ${selectedMonths} months (${fmtAmt(finalAmount * selectedMonths)})`
                        : `תרום ${fmtAmt(finalAmount)} × ${selectedMonths} חודשים (${fmtAmt(finalAmount * selectedMonths)})`)
                    : `${t('donate')} ${fmtAmt(finalAmount)}`)
                : t('donate')
            })()}
          </button>
          <button
            onClick={() => navigator.share?.({ title: lang === 'en' ? 'Share the campaign' : 'שתף את הקמפיין', url: window.location.href }) ?? navigator.clipboard.writeText(window.location.href)}
            className={`flex-none px-4 sm:px-6 py-2.5 sm:py-3.5 border-2 font-bold text-xs sm:text-sm transition-colors hover:bg-gray-50 ${buttonRadius}`}
            style={{ borderColor: primaryColor, color: primaryColor }}
          >
            {t('share')}
          </button>
        </div>
      </div>
    </section>
  )
}

function ProgressSection({ raised, goal, donorsCount, primaryColor, bricks }: { raised: number; goal: number; donorsCount: number; primaryColor: string; bricks?: { total: number; price: number; label?: string } }) {
  const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0
  const [animPct, setAnimPct] = useState(0)
  const lang = useLang()
  const t = useT()
  const completed = lang === 'en' ? 'complete' : 'הושלם'

  const bricksTotal = bricks && bricks.total > 0 ? bricks.total : 0
  // Bricks mirror the money percentage exactly, so the wall + its "% built"
  // always match the progress bar (no drift between raised/goal and raised/price).
  const bricksAchieved = bricksTotal > 0 ? Math.min(bricksTotal, Math.round((pct / 100) * bricksTotal)) : 0
  const bricksLabel = bricks?.label || (lang === 'en' ? 'bricks' : 'לבנים')

  useEffect(() => {
    const t = setTimeout(() => setAnimPct(pct), 300)
    return () => clearTimeout(t)
  }, [pct])

  return (
    <section className="bg-gray-50 py-12 md:py-16 px-4" aria-label="התקדמות הקמפיין">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* סכום גדול */}
        <div className="text-center space-y-2">
          <div className="text-5xl md:text-7xl font-black tabular-nums leading-none" style={{ color: primaryColor }}>
            ₪{Math.ceil(raised).toLocaleString('he-IL')}
          </div>
          <div className="text-base md:text-lg text-gray-500">
            {t('raisedOfGoal')} ₪{goal.toLocaleString('he-IL')}
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
            <span>{pct}% {completed}</span>
            {goal > raised && <span>{t('remaining')} ₪{Math.ceil(goal - raised).toLocaleString('he-IL')}</span>}
            {goal <= raised && goal > 0 && <span className="font-bold" style={{ color: primaryColor }}>{t('goalReached')}</span>}
          </div>
        </div>

        {/* קיר הלבנים — נבנה מהיסוד כלפי מעלה, שורות בהיסט כמו קיר אמיתי */}
        {bricksTotal > 0 && (() => {
          const COLS = 15
          const rows: boolean[][] = []
          for (let i = 0; i < bricksTotal; i += COLS) {
            rows.push(Array.from({ length: Math.min(COLS, bricksTotal - i) }, (_, c) => (i + c) < bricksAchieved))
          }
          // use the money percentage so the wall label matches the progress bar
          return (
            <div className="pt-5 mt-3 border-t border-gray-200 space-y-3">
              <style>{`@keyframes brickGlow{0%,100%{box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 0 0 0 rgba(180,90,40,.5)}50%{box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 0 0 5px rgba(180,90,40,0)}}`}</style>

              <div className="text-center">
                <p className="text-xl md:text-2xl font-black text-gray-800">
                  {lang === 'en' ? (
                    <>
                      <span className="tabular-nums" style={{ color: primaryColor }}>{bricksAchieved.toLocaleString()}</span> {bricksLabel} of {bricksTotal.toLocaleString()} {bricksLabel} raised
                    </>
                  ) : (
                    <>
                      כבר גויסו <span className="tabular-nums" style={{ color: primaryColor }}>{bricksAchieved.toLocaleString('he-IL')}</span> {bricksLabel} מתוך {bricksTotal.toLocaleString('he-IL')} {bricksLabel}
                    </>
                  )}
                </p>
                {bricks?.price ? (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {lang === 'en'
                      ? `Each ${t('brickSingular')} = ₪${bricks.price.toLocaleString()} · ${pct}% of the building built`
                      : `כל לבנה = ₪${bricks.price.toLocaleString('he-IL')} · ${pct}% מהבית נבנה`}
                  </p>
                ) : null}
              </div>

              {/* הקיר */}
              <div className="relative mx-auto max-w-md overflow-hidden rounded-2xl border border-amber-100 px-3 pt-5 pb-3"
                style={{ background: 'linear-gradient(180deg,#eef6ff 0%,#fdfaf5 60%,#f3ead9 100%)' }}
                role="img" aria-label={`${bricksAchieved} מתוך ${bricksTotal} לבנים`}>
                <div className="flex flex-col-reverse gap-[3px]">
                  {rows.map((row, r) => (
                    <div key={r} className="flex justify-center gap-[3px]" style={{ transform: r % 2 ? 'translateX(11px)' : 'none' }}>
                      {row.map((filled, c) => {
                        const idx = r * COLS + c
                        const isLatest = filled && idx === bricksAchieved - 1
                        return (
                          <span
                            key={c}
                            className="w-[18px] h-[11px] sm:w-[26px] sm:h-[14px] rounded-[2px] shrink-0"
                            style={filled
                              ? {
                                  background: 'linear-gradient(180deg,#d07f46 0%,#bd6c34 55%,#a2592b 100%)',
                                  boxShadow: isLatest
                                    ? 'inset 0 1px 0 rgba(255,255,255,.4)'
                                    : 'inset 0 1px 0 rgba(255,255,255,.35), inset 0 -2px 2px rgba(0,0,0,.18), 0 1px 1px rgba(0,0,0,.12)',
                                  animation: isLatest ? 'brickGlow 1.8s ease-in-out infinite' : undefined,
                                }
                              : { background: 'rgba(120,90,60,.08)', boxShadow: 'inset 0 0 0 1px rgba(120,90,60,.07)' }}
                          />
                        )
                      })}
                    </div>
                  ))}
                </div>
                {/* קו קרקע */}
                <div className="mt-1 h-1 rounded-full bg-gradient-to-b from-stone-300 to-stone-400/70" />
              </div>
            </div>
          )
        })()}

      </div>
    </section>
  )
}

type SortBy = 'recent' | 'amount_desc' | 'amount_asc'
type CommunityTab = 'donors' | 'groups' | 'communities'

function CommunitySection({ donations, groups, primaryColor, campaignSlug, onCreateGroup, initialGroupId }: { donations: Donation[]; groups: Group[]; primaryColor: string; campaignSlug: string; onCreateGroup: () => void; initialGroupId?: string | null }) {
  const [tab, setTab] = useState<CommunityTab>('donors')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('recent')
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [visible, setVisible] = useState(12)
  // Group filter is client-side — switching groups just re-renders the donor
  // list (like a category filter), no full page reload. Seeded from the group
  // the visitor arrived through, if any.
  const [groupFilter, setGroupFilter] = useState<string | null>(initialGroupId ?? null)
  const lang = useLang()
  const t = useT()

  // reset the "load more" window whenever the filter or search changes
  useEffect(() => { setVisible(12) }, [groupFilter, search])

  const byGroup = groupFilter ? donations.filter(d => d.group_id === groupFilter) : donations
  const filtered = byGroup
    .filter(d => !search || (d.donor_name ?? '').includes(search) || (d.dedication ?? '').includes(search))
    .sort((a, b) => {
      if (sortBy === 'amount_desc') return b.amount - a.amount
      if (sortBy === 'amount_asc') return a.amount - b.amount
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const allTabs: { key: CommunityTab; label: string; count?: number; show: boolean }[] = [
    { key: 'donors' as CommunityTab, label: t('donorsTab'), count: byGroup.length, show: true },
    { key: 'groups' as CommunityTab, label: t('groups'), count: groups.length, show: true },
    { key: 'communities' as CommunityTab, label: 'קהילות', show: false },
  ]
  const tabs = allTabs.filter(t => t.show)

  return (
    <div id="donors">
      <div>
        <h2 className="text-2xl font-black text-gray-900 mb-4">{t('donorsCommunity')}</h2>

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
            {/* פילטר קבוצות — מסנן את התצוגה בלבד, ללא טעינת דף */}
            {groups.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {[{ id: null as string | null, name: lang === 'en' ? 'All donors' : 'כל התורמים' }, ...groups].map(g => {
                  const active = groupFilter === g.id
                  return (
                    <button
                      key={g.id ?? 'all'}
                      type="button"
                      onClick={() => setGroupFilter(g.id)}
                      className="shrink-0 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all"
                      style={active ? { backgroundColor: primaryColor, color: 'white' } : { backgroundColor: '#f3f4f6', color: '#6b7280' }}
                    >
                      {g.name}
                    </button>
                  )
                })}
              </div>
            )}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden />
                <input
                  type="search"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('searchDonor')}
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
                <p className="text-sm">{t('beFirst')}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  {filtered.slice(0, visible).map(d => (
                    <DonorCard
                      key={d.id}
                      d={d}
                      donorGroup={d.group_id ? groups.find(g => g.id === d.group_id) : null}
                      primaryColor={primaryColor}
                      campaignSlug={campaignSlug}
                      liked={liked.has(d.id)}
                      onToggleLike={() => setLiked(s => { const n = new Set(s); n.has(d.id) ? n.delete(d.id) : n.add(d.id); return n })}
                    />
                  ))}
                </div>
                {visible < filtered.length && (
                  <div className="text-center pt-2">
                    <button
                      onClick={() => setVisible(v => v + 12)}
                      className="px-8 py-3 rounded-full border-2 text-sm font-bold transition-all hover:opacity-80"
                      style={{ borderColor: primaryColor, color: primaryColor }}
                    >
                      {t('loadMore')} ({filtered.length - visible})
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
              <span>{lang === 'en' ? 'Open your own fundraising group' : 'פתח קבוצת גיוס משלך'}</span>
            </button>

            {groups.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm font-medium">
                  {lang === 'en' ? 'No groups yet — be the first to open one!' : 'עדיין אין קבוצות — היו הראשונים לפתוח קבוצת גיוס!'}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
                        <span>₪{Math.ceil(g.raised_amount || 0).toLocaleString()} {t('raised')}</span>
                        <span>{t('goalWord')} ₪{(g.goal_amount || 0).toLocaleString()}</span>
                      </div>

                      <div className="mt-3 flex items-center justify-center gap-1 text-xs font-bold py-2 rounded-xl transition-all group-hover:opacity-90" style={{ color: primaryColor, backgroundColor: `${primaryColor}12` }}>
                        <span>{t('enterGroup')}</span>
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

// Campaign videos (main first) shown as centered thumbnails with an optional title.
function CampaignVideos({ campaign }: { campaign: Campaign }) {
  const [openEmbed, setOpenEmbed] = useState<string | null>(null)
  const settings = campaign.settings as { videos?: (string | { url: string; title?: string; thumb?: string })[]; show_videos?: boolean }
  const raw = settings?.videos?.length ? settings.videos : (campaign.video_url ? [campaign.video_url] : [])
  const all = raw
    .map(v => (typeof v === 'string' ? { url: v, title: '', thumb: '' } : { url: v.url, title: v.title || '', thumb: v.thumb || '' }))
    .map(v => ({ ...v, embed: getVideoEmbed(v.url), thumb: v.thumb || getYoutubeThumbnail(v.url) }))
    .filter(v => v.embed)

  // hidden from the public page (toggle in the media editor), or nothing to show
  if (settings?.show_videos === false || all.length === 0) return null
  return (
    <section className="py-6 px-4 bg-white border-t border-gray-100">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-wrap justify-center gap-4">
          {all.map((v, i) => (
            <div key={i} className="space-y-1.5 w-[200px] max-w-full">
              <button
                onClick={() => { setOpenEmbed(v.embed); track(campaign.id, 'video_play') }}
                className="w-full rounded-xl overflow-hidden aspect-video shadow relative group block cursor-pointer bg-gray-900"
                aria-label={v.title || 'הפעל וידאו'}
              >
                {v.thumb && <img src={v.thumb} alt="" className="w-full h-full object-cover" loading="lazy" />}
                <div className="absolute inset-0 bg-black/25 group-hover:bg-black/35 transition-colors flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <svg className="w-4 h-4 text-gray-900 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                </div>
              </button>
              {v.title && <p className="text-xs font-semibold text-gray-700 text-center truncate">{v.title}</p>}
            </div>
          ))}
        </div>
      </div>
      {openEmbed && <VideoModal embedUrl={openEmbed} onClose={() => setOpenEmbed(null)} />}
    </section>
  )
}

function AboutSection({ campaign, gallery }: { campaign: Campaign; gallery: GalleryItem[] }) {
  const lang = useLang()
  const t = useT()
  const settings = campaign.settings as { about_text?: string | null; about_text_en?: string | null; about_image?: string | null; gallery_mode?: string }
  const galleryStacked = settings?.gallery_mode === 'stacked'
  // English visitors see the English about text when provided; otherwise fall back.
  const aboutText = (lang === 'en' && settings?.about_text_en?.trim()) ? settings.about_text_en : settings?.about_text
  const aboutImage = settings?.about_image || null
  const [idx, setIdx] = useState(0)               // inline carousel position
  // The lightbox shows ONE set at a time — either just the about image, or the
  // gallery — so the two aren't mixed into a single navigation.
  const [lbImages, setLbImages] = useState<{ url: string; caption?: string | null }[]>([])
  const [lbIdx, setLbIdx] = useState<number | null>(null)
  const touchX = useRef<number | null>(null)

  const galleryImages = useMemo(() => gallery.map(g => ({ url: g.image_url, caption: g.caption })), [gallery])
  const openAbout = () => { if (aboutImage) { setLbImages([{ url: aboutImage }]); setLbIdx(0) } }
  const openGallery = (i: number) => { setLbImages(galleryImages); setLbIdx(i) }
  const closeLb = () => setLbIdx(null)
  const lbPrev = () => setLbIdx(i => (i === null ? i : (i - 1 + lbImages.length) % lbImages.length))
  const lbNext = () => setLbIdx(i => (i === null ? i : (i + 1) % lbImages.length))

  useEffect(() => {
    if (gallery.length <= 1 || lbIdx !== null) return
    const t = setInterval(() => setIdx(i => (i + 1) % gallery.length), 4000)
    return () => clearInterval(t)
  }, [gallery.length, lbIdx])

  // arrow-key navigation in the lightbox
  useEffect(() => {
    if (lbIdx === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLb()
      else if (e.key === 'ArrowLeft') lbNext()
      else if (e.key === 'ArrowRight') lbPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lbIdx, lbImages.length])

  if (!aboutText && gallery.length === 0 && !aboutImage) return null

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-gray-900">{t('aboutCampaign')}</h2>

        {/* תמונת אודות עומדת — לחיצה מרחיבה */}
        {aboutImage && (
          <button type="button" onClick={openAbout}
            className="block w-full rounded-3xl overflow-hidden shadow-md bg-gray-50 group relative focus:outline-none cursor-zoom-in">
            {/* full width to match the gallery; natural ratio, capped height */}
            <img src={aboutImage} alt={t('aboutCampaign')} className="w-full h-auto max-h-[70vh] object-contain" loading="lazy" />
            <span className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] rounded-full px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {lang === 'en' ? 'Tap to enlarge' : 'לחץ להגדלה'}
            </span>
          </button>
        )}

        {/* Stacked mode — every image one after another, by their set order */}
        {gallery.length > 0 && galleryStacked && (
          <div className="space-y-4">
            {gallery.map((g, i) => (
              <div key={g.id} className="relative rounded-3xl overflow-hidden shadow-md bg-gray-50 cursor-zoom-in" onClick={() => openGallery(i)}>
                <img src={g.image_url} alt={g.caption || ''} className="w-full h-auto max-h-[80vh] object-contain" loading="lazy" />
                {g.caption && (
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 px-5 py-4 pointer-events-none">
                    <p className="text-white text-sm">{g.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Carousel mode (default) — one rotating image */}
        {gallery.length > 0 && !galleryStacked && (
          <div className="relative rounded-3xl overflow-hidden shadow-md bg-gray-50 cursor-zoom-in" onClick={() => openGallery(idx)}>
            {/* object-contain so the whole image shows — nothing gets cropped */}
            <img src={gallery[idx].image_url} alt={gallery[idx].caption || ''} className="w-full h-auto max-h-[70vh] object-contain" loading="lazy" />
            {gallery[idx].caption && (
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 px-5 py-4 pointer-events-none">
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

        {/* Fullscreen lightbox for the current set (about OR gallery). The backdrop
            is its own layer; image + controls sit above it via z-index, so a click on
            a control can never reach the backdrop's close handler. */}
        {lbIdx !== null && lbImages[lbIdx] && typeof document !== 'undefined' && createPortal(
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-8"
            onTouchStart={e => { touchX.current = e.touches[0]?.clientX ?? null }}
            onTouchEnd={e => {
              const start = touchX.current; touchX.current = null
              if (start === null || lbImages.length <= 1) return
              const dx = (e.changedTouches[0]?.clientX ?? start) - start
              if (Math.abs(dx) > 40) { if (dx < 0) lbNext(); else lbPrev() }
            }}
          >
            {/* backdrop — only this closes */}
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={closeLb} />
            <img src={lbImages[lbIdx].url} alt={lbImages[lbIdx].caption || ''} draggable={false}
              className="relative z-10 max-w-full max-h-full object-contain rounded-lg select-none pointer-events-none shadow-2xl" />
            <button onClick={closeLb} aria-label="סגור"
              className="absolute z-20 top-4 left-4 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-lg flex items-center justify-center transition active:scale-90">
              <X className="w-5 h-5" />
            </button>
            {/* stable bottom control bar — prev · counter · next */}
            {lbImages.length > 1 && (
              <div className="absolute z-20 bottom-5 inset-x-0 flex items-center justify-center gap-3">
                <button type="button" aria-label="הקודם" onClick={lbPrev}
                  className="w-11 h-11 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-lg flex items-center justify-center transition active:scale-90">
                  <ChevronRight className="w-6 h-6" />
                </button>
                <span className="bg-black/50 text-white text-sm font-medium rounded-full px-3 py-1.5 min-w-[3.5rem] text-center">{lbIdx + 1} / {lbImages.length}</span>
                <button type="button" aria-label="הבא" onClick={lbNext}
                  className="w-11 h-11 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-lg flex items-center justify-center transition active:scale-90">
                  <ChevronLeft className="w-6 h-6" />
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}

        {aboutText && (
          <div
            className="kf-about text-gray-600 leading-relaxed text-base whitespace-pre-wrap break-words [&_a]:text-blue-600 [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(aboutText) }}
          />
        )}
    </div>
  )
}

function FloatingBar({ primaryColor, buttonRadius, onDonate }: { campaign: Campaign; primaryColor: string; buttonRadius: string; donateHref?: string; onDonate: () => void }) {
  const [visible, setVisible] = useState(false)
  const t = useT()
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
          {t('donate')}
        </button>
        <button
          onClick={() => navigator.share?.({ title: t('share'), url: window.location.href }) ?? navigator.clipboard.writeText(window.location.href)}
          className={`flex-1 py-3 border-2 font-bold text-sm transition-colors hover:bg-gray-50 ${buttonRadius}`}
          style={{ borderColor: primaryColor, color: primaryColor }}
          aria-label="שתף קמפיין"
        >
          {t('share')}
        </button>
      </div>
    </div>
  )
}

// Social-proof popups (top of page): cycles through the latest donations, 1–2 visible
// at a time, to make a visitor feel others just donated.
function DonationToasts({ donations, groups, primaryColor }: { donations: Donation[]; groups: Group[]; primaryColor: string }) {
  const lang = useLang()
  const t = useT()
  const recent = useMemo(() => donations.slice(0, 5), [donations])
  const [shown, setShown] = useState<{ key: number; d: Donation }[]>([])
  const [dragX, setDragX] = useState(0)
  const idxRef = useRef(0)
  const keyRef = useRef(0)
  const dragStart = useRef<number | null>(null)
  const dismissedRef = useRef(false)
  const groupName = (id?: string | null) => (id ? groups.find(g => g.id === id)?.name : null) || null

  // Swipe the whole stack to the right to dismiss all toasts at once.
  function onPointerDown(e: React.PointerEvent) { dragStart.current = e.clientX }
  function onPointerMove(e: React.PointerEvent) {
    if (dragStart.current == null) return
    setDragX(Math.max(0, e.clientX - dragStart.current))
  }
  function onPointerUp() {
    if (dragX > 60) { dismissedRef.current = true; setShown([]) }
    setDragX(0)
    dragStart.current = null
  }

  useEffect(() => {
    if (recent.length === 0) return
    let active = true
    const timers: ReturnType<typeof setInterval>[] = []
    // Show a batch of up to 3 donors at once, hold ~7s, then hide. Repeat every 3 min.
    const showBatch = () => {
      if (!active || dismissedRef.current) return
      const batch: { key: number; d: Donation }[] = []
      for (let n = 0; n < Math.min(3, recent.length); n++) {
        batch.push({ key: keyRef.current++, d: recent[idxRef.current % recent.length] })
        idxRef.current += 1
      }
      setShown(batch)
      timers.push(setTimeout(() => setShown([]), 7000))
    }
    timers.push(setTimeout(showBatch, 1500))    // first batch on load / refresh
    timers.push(setInterval(showBatch, 180000)) // another batch every 3 minutes
    return () => { active = false; timers.forEach(t => { clearTimeout(t); clearInterval(t) }) }
  }, [recent])

  if (recent.length === 0 || shown.length === 0) return null
  return (
    <div
      className="fixed top-20 right-2 z-[45] flex flex-col gap-2 w-[230px] max-w-[64vw]"
      dir="rtl"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        transform: `translateX(${dragX}px)`,
        opacity: dragX > 0 ? Math.max(0, 1 - dragX / 180) : 1,
        transition: dragStart.current == null ? 'transform .25s ease, opacity .25s ease' : 'none',
        touchAction: 'pan-y',
      }}
    >
      <style>{`@keyframes kfToastIn{from{opacity:0;transform:translateY(-12px) scale(.96)}to{opacity:1;transform:none}}`}</style>
      {shown.map(({ key, d }) => {
        const via = groupName(d.group_id)
        return (
          <div key={key} className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/60 px-4 py-3 flex items-center gap-3 select-none"
            style={{ animation: 'kfToastIn .35s ease-out' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0"
              style={{ backgroundColor: `${primaryColor}1A`, color: primaryColor }}>
              {donorInitials(d.donor_name || t('anonymous'))}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-black leading-tight" style={{ color: primaryColor }}>
                {donationAmount(d)}
                {d.payment_type === 'hok' && d.monthly_amount && d.installments ? (
                  <span className="text-[10px] font-semibold text-gray-400" dir="ltr"> ₪{d.monthly_amount.toLocaleString()}×{d.installments}</span>
                ) : null}
              </p>
              <p className="text-sm font-bold text-gray-900 truncate leading-tight">{d.donor_name || t('anonymous')}</p>
              <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                {via ? <>{t('via')} {via} · </> : null}
                <span suppressHydrationWarning>{relativeTime(d.created_at, lang)}</span>
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Popup ad: appears for 5s once the visitor scrolls past the donation buttons.
// Once per session. Anchored to the donation-plans section (early on the page)
// so it fires for most visitors, with a scroll-distance fallback.
function PopupAd({ ad, campaignId }: { ad?: { image_url?: string; link?: string | null }; campaignId: string }) {
  const [open, setOpen] = useState(false)
  const shownRef = useRef(false)
  useEffect(() => {
    if (!ad?.image_url) return
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(`kafool_popup_${campaignId}`)) return
    const onScroll = () => {
      if (shownRef.current) return
      const plans = document.getElementById('donation-plans')
      // fire once the donation buttons have scrolled fully above the viewport
      const passed = plans ? plans.getBoundingClientRect().bottom < 0 : window.scrollY > 700
      if (passed) {
        shownRef.current = true
        try { sessionStorage.setItem(`kafool_popup_${campaignId}`, '1') } catch {}
        setOpen(true)
        setTimeout(() => setOpen(false), 5000)
        window.removeEventListener('scroll', onScroll)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll() // in case the page is already scrolled past
    return () => window.removeEventListener('scroll', onScroll)
  }, [ad?.image_url, campaignId])

  if (!ad?.image_url || !open) return null
  const img = <img src={ad.image_url} alt="פרסומת" className="block w-auto max-w-full max-h-[88vh] mx-auto rounded-2xl shadow-2xl" />
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="relative max-w-md" onClick={e => e.stopPropagation()}>
        {/* close — always-visible corner button, one click closes */}
        <button onClick={() => setOpen(false)} aria-label="סגור"
          className="absolute z-10 top-2 left-2 w-10 h-10 rounded-full bg-black/55 hover:bg-black/75 text-white flex items-center justify-center shadow-lg transition active:scale-90">
          <X className="w-5 h-5" />
        </button>
        {ad.link
          ? <a href={ad.link} target="_blank" rel="noopener noreferrer">{img}</a>
          : img}
      </div>
    </div>
  )
}

/* ─── Main Page ─── */
export default function DonationPageClient({ org, campaign, donations: initialDonations, groups, gallery, activeGroup, donationUrl = '', paymentUrls, paymentProvider, nedarim, initialLang }: Props) {
  const [donations, setDonations] = useState<Donation[]>(initialDonations)
  const [raisedAmount, setRaisedAmount] = useState(campaign.raised_amount)
  const [lang, setLang] = useState<Lang>(
    initialLang || ((campaign.settings as { default_lang?: string })?.default_lang === 'en' ? 'en' : 'he')
  )
  const [modalOpen, setModalOpen] = useState(false)
  const [modalAmount, setModalAmount] = useState<number | undefined>()
  const [modalGroupSlug, setModalGroupSlug] = useState<string | undefined>()
  const [modalMethod, setModalMethod] = useState<'one_time' | 'hok' | undefined>()
  const [modalMonths, setModalMonths] = useState<number | undefined>()
  const [modalFormMode, setModalFormMode] = useState<string | undefined>()
  const [createGroupOpen, setCreateGroupOpen] = useState(false)
  const countdownEnd = (campaign.settings as { countdown_end?: string })?.countdown_end || campaign.end_at
  const showTimer = (campaign.settings as { show_timer?: boolean })?.show_timer !== false
  const countdown = useCountdown(showTimer ? countdownEnd : null)

  const settings = campaign.settings as {
    donation_amounts?: number[]
    donation_plans?: { amount: number; label?: string; image_url?: string | null; image_url_en?: string | null; payment_type?: 'one_time' | 'hok'; months?: number | null; form?: string | null; cta?: string | null }[]
    primary_color?: string
    button_radius?: string
    donation_button_size?: 'default' | 'large'
    whatsapp_phone?: string
    whatsapp_message?: string
    builder?: unknown
  }
  const buttonSize = settings?.donation_button_size || 'default'
  // Page-builder config (super-admin). When absent the page renders exactly as
  // before; when present it drives theme + block visibility.
  const builderCfg = resolveBuilderConfig(settings?.builder)
  const blockOn = activeBlockMap(builderCfg)
  // A section shows unless the builder explicitly turned it off.
  const isOn = (id: string) => !blockOn || blockOn[id] !== false
  const pageBg = builderCfg?.design.bg
  const primaryColor = builderCfg?.design.primary || settings?.primary_color || '#2563eb'
  const whatsappPhone = normalizeWaPhone(settings?.whatsapp_phone)
  const whatsappUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone}${settings?.whatsapp_message ? `?text=${encodeURIComponent(settings.whatsapp_message)}` : ''}`
    : null
  const donationPlans = settings?.donation_plans ||
    (settings?.donation_amounts || [180, 360, 720, 1800, 3600]).map(amount => ({ amount }))
  const buttonRadiusMap: Record<string, string> = { pill: 'rounded-full', rounded: 'rounded-xl', square: 'rounded-md' }
  const buttonRadius = builderCfg
    ? radiusToButtonClass(builderCfg.design.radius)
    : (buttonRadiusMap[settings?.button_radius || 'pill'] || 'rounded-full')

  // Stripe "donate from abroad" (foreign currency).
  const stripeCfg = settings as unknown as {
    stripe_enabled?: boolean; stripe_currency?: string; stripe_amounts?: number[]
    default_currency?: string; allowed_currencies?: string[]
  }
  const stripeEnabled = stripeCfg?.stripe_enabled === true

  // Currency model: ₪ → Kesher/Nedarim, any foreign currency → Stripe. The manager
  // sets a default + the allowed set; the donor can switch; English defaults to a
  // foreign currency (USD) so overseas donors get the Stripe flow automatically.
  const foreignDefault = stripeCfg?.stripe_currency || 'usd'
  const allowedCurrencies: string[] = (stripeCfg?.allowed_currencies?.length
    ? stripeCfg.allowed_currencies
    : (stripeEnabled ? ['ils', foreignDefault] : ['ils']))
  const defaultCurrency = stripeCfg?.default_currency || 'ils'
  const firstForeign = allowedCurrencies.find(c => c !== 'ils') || foreignDefault
  // Which currency the donor-details modal opens on: English defaults to a foreign
  // currency (so overseas donors get Stripe), Hebrew to the campaign's default. The
  // donor can switch inside the form; there is no separate currency control here.
  const modalDefaultCurrency = (lang === 'en' && stripeEnabled)
    ? firstForeign
    : (allowedCurrencies.includes(defaultCurrency) ? defaultCurrency : 'ils')

  // When the page is in a foreign currency, fetch the live ₪ rate so the donation
  // buttons can be shown in that currency (e.g. $260 instead of ₪780).
  const [pageRate, setPageRate] = useState<number | undefined>()
  const manualRate = Number((stripeCfg as { stripe_ils_rate?: number })?.stripe_ils_rate) || 3.7
  useEffect(() => {
    if (modalDefaultCurrency === 'ils') { setPageRate(undefined); return }
    let cancelled = false
    fetch(`/api/fx?currency=${modalDefaultCurrency}&fallback=${manualRate}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setPageRate(Number(d?.rate) > 0 ? Number(d.rate) : manualRate) })
      .catch(() => { if (!cancelled) setPageRate(manualRate) })
    return () => { cancelled = true }
  }, [modalDefaultCurrency, manualRate])

  // Usage tracking: count this visit once per session.
  useEffect(() => { trackOnce(campaign.id, 'view') }, [campaign.id])

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

  function openDonate(amount?: number, groupSlug?: string, method?: 'one_time' | 'hok', months?: number, formMode?: string) {
    track(campaign.id, 'donate_open')
    setModalAmount(amount)
    setModalGroupSlug(groupSlug || (activeGroup ? activeGroup.slug : undefined))
    setModalMethod(method)
    setModalMonths(months)
    setModalFormMode(formMode)
    setModalOpen(true)
  }

  // Prefill from a payment link the manager sent (e.g. to recover an abandoned
  // donation): ?amt=200 opens the modal with that amount; &m=hok picks a standing
  // order. The donor still chooses the payment method on the page.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const amt = Number(sp.get('amt'))
    if (!amt || amt <= 0) return
    const method = sp.get('m') === 'hok' ? 'hok' : 'one_time'
    // ?months=N sets the standing-order duration (for a custom hok link).
    const months = method === 'hok' ? (Number(sp.get('months')) || undefined) : undefined
    const t = setTimeout(() => openDonate(amt, sp.get('g') || undefined, method, months), 400)
    return () => clearTimeout(t)
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Coordinated anchor for every floating control (WhatsApp, scroll-to-top,
  // accessibility). When the bottom donate bar is showing they all lift above
  // it; otherwise they tuck into the page corners. One source of truth so they
  // never overlap each other or the bar.
  const [barVisible, setBarVisible] = useState(false)
  useEffect(() => {
    const fn = () => setBarVisible(window.scrollY > 400)
    window.addEventListener('scroll', fn, { passive: true })
    fn()
    return () => window.removeEventListener('scroll', fn)
  }, [])
  const floatBottom = barVisible ? '5.75rem' : '1.25rem'

  // Active custom donor-detail form (default applied to all buttons for now).
  const cfSettings = campaign.settings as { custom_forms?: { id: string; name: string; fields: { id: string; label: string; type: string; required: boolean; options?: string[] }[] }[]; default_custom_form_id?: string }
  const preStep = (campaign.settings as { pre_donation_step?: { enabled: boolean; title: string; options: { id: string; label: string; formId?: string }[] } })?.pre_donation_step || null

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
    <LangCtx.Provider value={lang}>
    <div className="min-h-screen bg-gray-50 overflow-x-clip" dir="rtl" style={pageBg ? { backgroundColor: pageBg } : undefined}>
      {/* 1. Sticky Header */}
      <StickyHeader org={org} campaign={campaign} primaryColor={primaryColor} onDonate={openDonate} lang={lang} onToggleLang={() => setLang(l => l === 'he' ? 'en' : 'he')} />

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
            {/* כותרת הקבוצה */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                {/* עיגול תמונת הקבוצה */}
                <div
                  className="w-12 h-12 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-lg font-black"
                  style={{ backgroundColor: `${primaryColor}1A`, color: primaryColor }}
                >
                  {activeGroup.image_url
                    ? <img src={activeGroup.image_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    : (activeGroup.name || 'ק')[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-gray-400 mb-0.5">דף התרומה של</p>
                  <h2 className="text-xl font-black text-gray-900 break-words leading-tight">{activeGroup.name}</h2>
                  {activeGroup.manager_name && (
                    <p className="text-xs text-gray-400 mt-0.5">מגייס: {activeGroup.manager_name}</p>
                  )}
                </div>
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

            {/* סכום (ימין) · תורמים + כפתור תרום (שמאל) */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-2xl font-black tabular-nums leading-none" style={{ color: primaryColor }}>
                  ₪{Math.ceil(groupRaised).toLocaleString('he-IL')}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">{lang === 'en' ? 'of' : 'מתוך'} ₪{activeGroup.goal_amount.toLocaleString('he-IL')} {lang === 'en' ? 'goal' : 'יעד'}</div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-center">
                  <div className="text-xl font-black text-gray-700 tabular-nums leading-none">{groupDonors}</div>
                  <div className="text-[11px] text-gray-400 mt-1">{lang === 'en' ? 'donors' : 'תורמים'}</div>
                </div>
                <button
                  onClick={() => openDonate(undefined, activeGroup?.slug)}
                  className="px-6 py-2.5 rounded-full text-white font-black text-sm shadow hover:opacity-90 active:scale-95 transition-all"
                  style={{ backgroundColor: primaryColor }}
                >
                  {lang === 'en' ? 'Donate' : 'תרום'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Hero */}
      {isOn('hero') && <HeroSection campaign={campaign} countdown={countdown} />}

      {/* סרטוני הקמפיין — מעל כפתור התרומה ומעל "אודות" */}
      {isOn('video') && <CampaignVideos campaign={campaign} />}

      {/* בנייד — כפתור קיצור ל"אודות" לפני כפתורי התרומה */}
      {isOn('gallery') && (
      <div className="md:hidden bg-white px-4 pt-4 -mb-2 text-center">
        <button
          onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full border-2 text-sm font-bold transition-colors"
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          {lang === 'en' ? 'About the campaign' : 'אודות הקמפיין'}
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
      )}

      {/* 3. Donation Plans */}
      {isOn('amounts') && <DonationPlans plans={donationPlans} primaryColor={primaryColor} campaignSlug={campaign.slug} groups={groups} buttonRadius={buttonRadius} buttonSize={buttonSize} otherAmountImage={(settings as { other_amount_design?: string })?.other_amount_design || null} otherAmountPlacement={(settings as { other_amount_placement?: 'grid' | 'cta' })?.other_amount_placement === 'cta' ? 'cta' : 'grid'} defaultCta={(settings as { donate_cta?: string })?.donate_cta || ''} onDonate={openDonate} displayCurrency={modalDefaultCurrency} fxRate={pageRate} />}

      {/* 4. Progress */}
      {isOn('goal') && <ProgressSection raised={raisedAmount} goal={campaign.goal_amount} donorsCount={donations.length} primaryColor={primaryColor} bricks={(campaign.settings as { show_bricks?: boolean })?.show_bricks === false ? undefined : (campaign.settings as { bricks?: { total: number; price: number; label?: string } })?.bricks} />}

      {/* 5+7. About (right) + Community (left) — two columns */}
      {(isOn('gallery') || isOn('donors')) && (
      <section className="py-10 px-4 bg-white border-t border-gray-100 scroll-mt-20" id="about">
        <div className="max-w-6xl mx-auto">
          <div className={`flex flex-col lg:flex-row gap-10 ${lang === 'en' ? 'lg:flex-row-reverse' : ''}`}>
            {/* אודות — ימין בעברית, שמאל באנגלית (טקסט מיושר לשמאל) */}
            {isOn('gallery') && (
            <div className="lg:w-[45%] shrink-0" dir={lang === 'en' ? 'ltr' : undefined}>
              <AboutSection campaign={campaign} gallery={gallery} />
            </div>
            )}
            {/* תורמים — שמאל בעברית, ימין באנגלית */}
            {isOn('donors') && (
            <div className="flex-1 min-w-0">
              <CommunitySection donations={donations} groups={groups} primaryColor={primaryColor} campaignSlug={campaign.slug} onCreateGroup={() => setCreateGroupOpen(true)} initialGroupId={activeGroup?.id ?? null} />
            </div>
            )}
          </div>
        </div>
      </section>
      )}

      {/* 8. Floating bar */}
      {/* WhatsApp floating button */}
      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          // No transform/scale here: an :active transform recomputed the fixed
          // element's position in the RTL page and made it jump left on tap.
          // left + right:auto pin it unambiguously to the left corner.
          className="fixed z-[70] w-14 h-14 rounded-full flex items-center justify-center shadow-xl"
          style={{
            backgroundColor: '#25D366',
            left: '1rem',
            right: 'auto',
            // sits above the accessibility button (48px) in the left column
            bottom: `calc(${floatBottom} + 4rem)`,
            touchAction: 'manipulation',
          }}
          aria-label="שלח הודעה בWhatsApp"
        >
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white pointer-events-none">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
      )}

      <FloatingBar campaign={campaign} primaryColor={primaryColor} buttonRadius={buttonRadius} onDonate={() => openDonate()} />


      <DonationToasts donations={donations} groups={groups} primaryColor={primaryColor} />

      <PopupAd ad={(campaign.settings as { popup_ad?: { image_url?: string; link?: string | null } })?.popup_ad} campaignId={campaign.id} />
      {/* מורם בתיאום עם שאר הכפתורים הצפים */}
      <AccessibilityWidget offsetBottom={floatBottom} />

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
        paymentProvider={paymentProvider}
        nedarim={nedarim}
        campaign={campaign}
        primaryColor={primaryColor}
        buttonRadius={buttonRadius}
        groups={groups.map(g => ({ id: g.id, name: g.name, slug: g.slug }))}
        lang={lang}
        customForms={cfSettings?.custom_forms || []}
        defaultFormId={cfSettings?.default_custom_form_id || ''}
        presetFormMode={modalFormMode}
        defaultPaymentNote={(campaign.settings as { payment_note?: string })?.payment_note || ''}
        formEmails={(campaign.settings as { form_emails?: Record<string, { subject?: string; body?: string; image?: string }> })?.form_emails || {}}
        buttonEmails={(campaign.settings as { button_emails?: Record<string, { subject?: string; body?: string; image?: string }> })?.button_emails || {}}
        preStep={preStep}
        stripeEnabled={stripeEnabled}
        currencies={allowedCurrencies}
        defaultCurrency={modalDefaultCurrency}
        ilsRate={Number((stripeCfg as { stripe_ils_rate?: number })?.stripe_ils_rate) || 3.7}
      />

      {/* Bottom padding for floating bar */}
      <div className="h-20" />

      <Footer />
    </div>
    </LangCtx.Provider>
  )
}
