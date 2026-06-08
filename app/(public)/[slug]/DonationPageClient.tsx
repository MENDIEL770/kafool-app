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
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0`
  const vi = url.match(/vimeo\.com\/(\d+)/)
  if (vi) return `https://player.vimeo.com/video/${vi[1]}`
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

function StickyHeader({ org, campaign, primaryColor }: { org: Org; campaign: Campaign; primaryColor: string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur shadow-md' : 'bg-transparent'
      }`}
      role="banner"
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          {org.logo_url
            ? <img src={org.logo_url} alt={org.name} className="h-9 w-9 object-contain rounded-lg" />
            : <div className="h-9 w-9 rounded-lg flex items-center justify-center text-white font-black text-sm" style={{ backgroundColor: primaryColor }}>{org.name[0]}</div>
          }
          <span className={`font-bold text-sm hidden sm:block transition-colors ${scrolled ? 'text-gray-800' : 'text-white'}`}>{org.name}</span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6" aria-label="ניווט ראשי">
          {[{ label: 'אודות', href: '#about' }, { label: 'תורמים', href: '#donors' }, { label: 'קבוצות', href: '#groups' }].map(l => (
            <a key={l.href} href={l.href}
              className={`text-sm font-medium transition-colors hover:opacity-80 ${scrolled ? 'text-gray-700' : 'text-white/90'}`}>
              {l.label}
            </a>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button
            aria-label="שתף"
            onClick={() => navigator.share?.({ title: campaign.title, url: window.location.href }) ?? navigator.clipboard.writeText(window.location.href)}
            className={`hidden sm:flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border transition-all ${
              scrolled ? 'border-gray-200 text-gray-600 hover:bg-gray-50' : 'border-white/40 text-white hover:bg-white/10'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            שתף
          </button>
          <a href={`/${campaign.slug}/donate`}
            className="text-sm font-bold px-4 py-2 rounded-full text-white shadow-md hover:opacity-90 transition-all"
            style={{ backgroundColor: primaryColor }}>
            לתרומה
          </a>
          {/* Mobile hamburger */}
          <button
            className="md:hidden p-1.5"
            aria-label={menuOpen ? 'סגור תפריט' : 'פתח תפריט'}
            onClick={() => setMenuOpen(v => !v)}
          >
            {menuOpen
              ? <X className={`w-5 h-5 ${scrolled ? 'text-gray-700' : 'text-white'}`} />
              : <Menu className={`w-5 h-5 ${scrolled ? 'text-gray-700' : 'text-white'}`} />
            }
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="md:hidden bg-white border-t shadow-lg px-4 py-4 space-y-3" aria-label="תפריט נייד">
          {[{ label: 'אודות', href: '#about' }, { label: 'תורמים', href: '#donors' }, { label: 'קבוצות', href: '#groups' }].map(l => (
            <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
              className="block text-sm font-medium text-gray-700 py-1.5">{l.label}</a>
          ))}
        </nav>
      )}
    </header>
  )
}

function HeroSection({ campaign, org, primaryColor, countdown }: {
  campaign: Campaign; org: Org; primaryColor: string
  countdown: { d: number; h: number; m: number; s: number } | null
}) {
  const logoSrc = campaign.logo_url || org.logo_url
  const settings = campaign.settings as { about_text?: string | null }
  const tagline = settings?.about_text?.split('\n')[0] ?? ''

  return (
    <section
      className="relative h-[42vh] min-h-[280px] max-h-[480px] flex flex-col justify-end overflow-hidden"
      aria-label="Hero"
    >
      {/* Background */}
      {campaign.cover_image_url
        ? <img src={campaign.cover_image_url} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" loading="eager" />
        : <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}cc 100%)` }} />
      }
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/70" />

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 pt-16 pb-8 md:pb-12 text-white text-center">
        {logoSrc && (
          <img src={logoSrc} alt={org.name}
            className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-white/30 object-cover mx-auto mb-3 shadow-2xl" />
        )}
        <h1 className="text-3xl md:text-4xl font-black leading-tight mb-2 drop-shadow-lg">
          {campaign.title}
        </h1>
        <p className="text-base text-white/80 max-w-xl mx-auto mb-1">{org.name}</p>
        {tagline && (
          <p className="text-sm text-white/70 max-w-lg mx-auto mb-4 italic">"{tagline}"</p>
        )}

        {/* Countdown */}
        {countdown && (
          <div className="inline-flex items-center gap-3 bg-white/15 backdrop-blur rounded-xl px-4 py-2.5 mb-4 border border-white/20">
            {[{ val: countdown.d, label: 'ימים' }, { val: countdown.h, label: 'שעות' }, { val: countdown.m, label: 'דקות' }, { val: countdown.s, label: 'שניות' }].map((item, i) => (
              <div key={item.label} className="flex items-center gap-3">
                {i > 0 && <span className="text-white/40 text-base font-bold">:</span>}
                <div className="text-center">
                  <div className="text-xl md:text-2xl font-black tabular-nums">{String(item.val).padStart(2, '0')}</div>
                  <div className="text-[9px] text-white/60 uppercase tracking-wider">{item.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <a href={`/${campaign.slug}/donate`}
          className="inline-block px-7 py-3 rounded-full text-white font-black text-base shadow-xl hover:scale-105 active:scale-95 transition-transform"
          style={{ backgroundColor: primaryColor }}>
          לתרומה עכשיו →
        </a>

      </div>
    </section>
  )
}

function DonationPlans({ plans, primaryColor, campaignSlug }: {
  plans: { amount: number; label?: string; image_url?: string | null }[]
  primaryColor: string
  campaignSlug: string
}) {
  const [selected, setSelected] = useState<number | null>(null)
  const [custom, setCustom] = useState('')

  const finalAmount = selected ?? (custom ? Number(custom) : null)

  return (
    <section className="bg-white border-b border-gray-100 py-8 px-4" aria-label="מסלולי תרומה">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-lg font-bold text-gray-700 mb-6 text-center">בחר סכום תרומה</h2>
        <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-hide snap-x justify-start md:justify-center flex-nowrap">
          {plans.map(({ amount, label, image_url }) => {
            const isActive = selected === amount
            return (
              <button
                key={amount}
                onClick={() => { setSelected(isActive ? null : amount); setCustom('') }}
                aria-pressed={isActive}
                className="flex-none snap-start flex flex-col items-center gap-2 cursor-pointer focus:outline-none group"
              >
                {/* עיגול */}
                <div
                  className="w-[110px] h-[110px] rounded-full overflow-hidden transition-all duration-200 relative"
                  style={{
                    boxShadow: isActive ? `0 0 0 4px ${primaryColor}, 0 6px 24px ${primaryColor}44` : '0 2px 12px rgba(0,0,0,0.10)',
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
                      <span className="text-white font-black text-xl">₪{amount.toLocaleString()}</span>
                    </div>
                  )}
                </div>
                {/* טקסט מתחת */}
                <div className="text-center">
                  <div className="text-sm font-bold text-gray-800">₪{amount.toLocaleString()}</div>
                  {label && <div className="text-[11px] text-gray-400 mt-0.5">{label}</div>}
                </div>
              </button>
            )
          })}

          {/* סכום אחר */}
          <div className="flex-none snap-start flex flex-col items-center gap-2">
            <div className="w-[110px] h-[110px] rounded-full border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-gray-50">
              <span className="text-xs text-gray-400 mb-1">סכום אחר</span>
              <div className="flex items-center gap-0.5">
                <span className="text-sm font-bold text-gray-500">₪</span>
                <input
                  type="number"
                  value={custom}
                  onChange={(e) => { setCustom(e.target.value); setSelected(null) }}
                  placeholder="0"
                  min="1"
                  className="w-14 text-center text-sm font-bold outline-none bg-transparent"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-gray-400">אחר</div>
            </div>
          </div>
        </div>

        {/* Payment actions */}
        <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6 max-w-md mx-auto">
          <a
            href={`/${campaignSlug}/donate${finalAmount ? `?amount=${finalAmount}` : ''}`}
            className="flex-1 py-3.5 rounded-2xl text-white font-black text-base text-center shadow-lg hover:opacity-90 active:scale-95 transition-all"
            style={{ backgroundColor: primaryColor }}
          >
            {finalAmount ? `תרום ₪${finalAmount.toLocaleString()}` : 'לתרומה'}
          </a>
          <button
            onClick={() => navigator.share?.({ title: 'שתף את הקמפיין', url: window.location.href }) ?? navigator.clipboard.writeText(window.location.href)}
            className="flex-none px-6 py-3.5 rounded-2xl border-2 font-bold text-sm transition-colors hover:bg-gray-50"
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
  const avg = donorsCount > 0 ? Math.round(raised / donorsCount) : 0

  return (
    <section className="bg-gray-50 py-10 px-4" aria-label="התקדמות הקמפיין">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex justify-between items-end">
          <div>
            <div className="text-3xl md:text-4xl font-black" style={{ color: primaryColor }}>
              ₪{raised.toLocaleString('he-IL')}
            </div>
            <div className="text-sm text-gray-400 mt-0.5">גויסו מתוך יעד ₪{goal.toLocaleString('he-IL')}</div>
          </div>
          <div className="text-left">
            <div className="text-3xl font-black text-gray-700">{pct}%</div>
            <div className="text-xs text-gray-400">הושלם</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-5 bg-gray-200 rounded-full overflow-hidden shadow-inner" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="h-full rounded-full transition-all duration-1000 relative overflow-hidden"
            style={{ width: `${pct}%`, backgroundColor: primaryColor }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20 animate-pulse" />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { val: donorsCount.toLocaleString(), label: 'תורמים' },
            { val: `₪${avg.toLocaleString()}`, label: 'תרומה ממוצעת' },
            { val: `${goal > 0 ? (goal - raised > 0 ? `₪${(goal - raised).toLocaleString()}` : 'הושג!') : '—'}`, label: 'נותר ליעד' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
              <div className="text-xl font-black text-gray-800">{s.val}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

type SortBy = 'recent' | 'amount_desc' | 'amount_asc'

function DonorsSection({ donations, primaryColor }: { donations: Donation[]; primaryColor: string }) {
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

  const avg = donations.length ? Math.round(donations.reduce((s, d) => s + d.amount, 0) / donations.length) : 0
  const total = donations.reduce((s, d) => s + d.amount, 0)

  return (
    <section id="donors" className="py-10 px-4 bg-white" aria-label="תורמים">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-black text-gray-900 mb-6 text-center">קהילת התורמים</h2>

        <div className="flex flex-col lg:flex-row gap-8">

          {/* Right — Stats */}
          <aside className="lg:w-72 space-y-4 shrink-0" aria-label="סטטיסטיקות תורמים">
            <div className="bg-gray-50 rounded-3xl p-6 space-y-4 border border-gray-100">
              <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider">נתונים</h3>
              {[
                { label: 'תורמים', val: donations.length.toLocaleString() },
                { label: 'סה"כ גויס', val: `₪${total.toLocaleString('he-IL')}` },
                { label: 'ממוצע תרומה', val: `₪${avg.toLocaleString()}` },
              ].map(s => (
                <div key={s.label} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                  <span className="text-sm text-gray-500">{s.label}</span>
                  <span className="font-black text-gray-800">{s.val}</span>
                </div>
              ))}
            </div>

            {/* Live indicator */}
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xs text-emerald-700 font-medium">עדכון בזמן אמת</span>
            </div>
          </aside>

          {/* Left — Donors grid */}
          <div className="flex-1 space-y-4">
            {/* Search + sort */}
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
                      {/* Avatar */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm"
                        style={{ backgroundColor: primaryColor }}
                        aria-hidden
                      >
                        {(d.donor_name || 'א')[0]}
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-sm text-gray-800 truncate">{d.donor_name || 'אנונימי'}</span>
                          <span className="font-black text-sm shrink-0" style={{ color: primaryColor }}>
                            ₪{d.amount.toLocaleString()}
                          </span>
                        </div>
                        {d.dedication && (
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{d.dedication}</p>
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
        </div>
      </div>
    </section>
  )
}

function GroupsSection({ groups, primaryColor }: { groups: Group[]; primaryColor: string }) {
  if (groups.length === 0) return null
  return (
    <section id="groups" className="py-10 px-4 bg-gray-50 border-t border-gray-100" aria-label="קבוצות גיוס">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-black text-gray-900 mb-6 text-center">קבוצות גיוס</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map(g => {
            const pct = g.goal_amount > 0 ? Math.min(100, Math.round((g.raised_amount / g.goal_amount) * 100)) : 0
            return (
              <div key={g.id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
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
              </div>
            )
          })}
        </div>
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

function FloatingBar({ campaign, primaryColor }: { campaign: Campaign; primaryColor: string }) {
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
          className="flex-[2] py-3 rounded-2xl text-white font-black text-sm text-center shadow-md hover:opacity-90 active:scale-95 transition-all"
          style={{ backgroundColor: primaryColor }}
        >
          לתרומה
        </a>
        <button
          onClick={() => navigator.share?.({ title: campaign.title, url: window.location.href }) ?? navigator.clipboard.writeText(window.location.href)}
          className="flex-1 py-3 rounded-2xl border-2 font-bold text-sm transition-colors hover:bg-gray-50"
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
  }
  const primaryColor = settings?.primary_color || '#2563eb'
  const donationPlans = settings?.donation_plans ||
    (settings?.donation_amounts || [180, 360, 720, 1800, 3600]).map(amount => ({ amount }))

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
      <HeroSection campaign={campaign} org={org} primaryColor={primaryColor} countdown={countdown} />

      {/* 3. Donation Plans */}
      <DonationPlans plans={donationPlans} primaryColor={primaryColor} campaignSlug={campaign.slug} />

      {/* 4. Progress */}
      <ProgressSection raised={raisedAmount} goal={campaign.goal_amount} donorsCount={donations.length} primaryColor={primaryColor} />

      {/* 5. Donors */}
      <DonorsSection donations={donations} primaryColor={primaryColor} />

      {/* 6. Groups */}
      <GroupsSection groups={groups} primaryColor={primaryColor} />

      {/* 7. About */}
      <AboutSection campaign={campaign} gallery={gallery} />

      {/* 8. Floating bar */}
      <FloatingBar campaign={campaign} primaryColor={primaryColor} />

      {/* Bottom padding for floating bar */}
      <div className="h-20" />
    </div>
  )
}
