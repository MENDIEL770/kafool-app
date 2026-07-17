'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  motion, useInView, useMotionValue, useSpring, useTransform, animate, type MotionValue,
} from 'framer-motion'
import {
  ArrowLeft, Play, LayoutDashboard, Users, CreditCard, BarChart3,
  Palette, ShieldCheck, Zap, HeadphonesIcon, Wallet, Sparkles,
} from 'lucide-react'

const BLUE = '#4E7BEF'
const CORAL = '#F46B5F'
const NAVY = '#102A56'

/* ───────────────────────── Atmosphere ───────────────────────── */

// Pure-CSS/SVG premium background: soft blue + coral light, a huge blurred
// infinity mark woven diagonally through the page, thin flowing curves and a
// few slow particles. No WebGL — keeps the page light and instant.
function PremiumBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#F8FAFC]" />

      {/* ambient lights */}
      <div
        className="absolute -top-[20%] -right-[10%] h-[70vh] w-[70vh] rounded-full blur-[130px]"
        style={{ background: `radial-gradient(circle, ${BLUE}38, transparent 70%)` }}
      />
      <div
        className="absolute top-[35%] -left-[15%] h-[60vh] w-[60vh] rounded-full blur-[140px]"
        style={{ background: `radial-gradient(circle, ${CORAL}30, transparent 70%)` }}
      />
      <div
        className="absolute bottom-[-15%] right-[20%] h-[50vh] w-[50vh] rounded-full blur-[130px]"
        style={{ background: `radial-gradient(circle, ${BLUE}22, transparent 70%)` }}
      />

      {/* huge blurred infinity — heavily diffused so it reads as ambient light,
          never as a logo */}
      <svg
        className="absolute left-1/2 top-[42%] h-[85vh] w-[115vw] -translate-x-1/2 -translate-y-1/2 -rotate-[14deg] blur-[60px]"
        viewBox="0 0 800 300"
        fill="none"
        style={{ opacity: 0.055 }}
      >
        <path
          d="M250 150c0-55 45-100 100-100s100 45 100 100-45 100-100 100-100-45-100-100Zm200 0c0-55 45-100 100-100s100 45 100 100-45 100-100 100-100-45-100-100Z"
          stroke={NAVY}
          strokeWidth="34"
          strokeLinecap="round"
        />
      </svg>

      {/* thin flowing curves */}
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 1440 900" fill="none">
        <path d="M-100 620C220 520 380 760 720 640s520-240 860-140" stroke={BLUE} strokeOpacity="0.13" strokeWidth="1.5" />
        <path d="M-100 700C260 600 420 840 760 720s520-240 860-140" stroke={CORAL} strokeOpacity="0.10" strokeWidth="1.5" />
        <path d="M-100 540C260 460 380 660 760 560s520-200 860-120" stroke={BLUE} strokeOpacity="0.08" strokeWidth="1" />
      </svg>

      {/* slow particles */}
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s,
            background: i % 3 === 0 ? CORAL : BLUE, opacity: 0.18,
          }}
          animate={{ y: [0, -22, 0], opacity: [0.1, 0.28, 0.1] }}
          transition={{ duration: p.d, repeat: Infinity, ease: 'easeInOut', delay: p.delay }}
        />
      ))}
    </div>
  )
}

const PARTICLES = [
  { x: 12, y: 22, s: 5, d: 11, delay: 0 }, { x: 84, y: 18, s: 4, d: 13, delay: 1.5 },
  { x: 68, y: 42, s: 6, d: 12, delay: 0.8 }, { x: 26, y: 62, s: 4, d: 14, delay: 2.2 },
  { x: 92, y: 66, s: 5, d: 10, delay: 1.1 }, { x: 45, y: 12, s: 3, d: 15, delay: 3 },
  { x: 8, y: 78, s: 5, d: 12, delay: 0.4 }, { x: 74, y: 84, s: 4, d: 13, delay: 2.6 },
  { x: 55, y: 72, s: 3, d: 16, delay: 1.9 }, { x: 34, y: 36, s: 4, d: 11, delay: 3.4 },
]

/* ───────────────────────── Primitives ───────────────────────── */

function Reveal({ children, delay = 0, y = 26 }: { children: React.ReactNode; delay?: number; y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

// Counts up once the value scrolls into view.
function Counter({ to, prefix = '', suffix = '' }: { to: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const mv = useMotionValue(0)
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    const unsub = mv.on('change', v => setDisplay(Math.round(v).toLocaleString('en-US')))
    return unsub
  }, [mv])

  useEffect(() => {
    if (!inView) return
    const controls = animate(mv, to, { duration: 1.8, ease: [0.22, 1, 0.36, 1] })
    return controls.stop
  }, [inView, to, mv])

  return <span ref={ref}>{prefix}{display}{suffix}</span>
}

/* ───────────────────────── Devices ───────────────────────── */

// A MacBook + iPhone built in CSS/SVG (no image assets), with the real product
// surfaces rendered as live markup inside the screens.
function Devices() {
  const ref = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 60, damping: 20 })
  const sy = useSpring(my, { stiffness: 60, damping: 20 })
  const rotY = useTransform(sx, [-0.5, 0.5], [8, -8])
  const rotX = useTransform(sy, [-0.5, 0.5], [-6, 6])

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      mx.set((e.clientX - r.left) / r.width - 0.5)
      my.set((e.clientY - r.top) / r.height - 0.5)
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [mx, my])

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-[640px]" style={{ perspective: 1400 }}>
      {/* MacBook */}
      <motion.div
        className="relative"
        style={{ rotateY: rotY, rotateX: rotX, transformStyle: 'preserve-3d' }}
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* screen */}
        <div
          className="relative rounded-[18px] p-[10px] shadow-[0_50px_100px_-20px_rgba(16,42,86,0.45)]"
          style={{ background: 'linear-gradient(160deg,#2b3444,#0e1420)' }}
        >
          <div className="overflow-hidden rounded-[10px] bg-white">
            <MiniDashboard />
          </div>
          {/* glass reflection */}
          <div
            className="pointer-events-none absolute inset-[10px] rounded-[10px]"
            style={{ background: 'linear-gradient(120deg,rgba(255,255,255,.22),transparent 45%)' }}
          />
        </div>
        {/* base */}
        <div className="relative mx-auto h-[12px] w-[112%] -translate-x-[5%] rounded-b-[14px]"
          style={{ background: 'linear-gradient(180deg,#c9ced8,#8e96a6)' }}>
          <div className="absolute left-1/2 top-0 h-[4px] w-[86px] -translate-x-1/2 rounded-b-lg bg-black/15" />
        </div>
        <div className="mx-auto h-[10px] w-[70%] rounded-b-[40px] bg-black/10 blur-[6px]" />
      </motion.div>

      {/* iPhone — sits front-left so the dashboard stays readable */}
      <motion.div
        className="absolute -bottom-12 left-1 w-[136px] sm:w-[156px]"
        style={{ rotateY: rotY, rotateX: rotX, transformStyle: 'preserve-3d' }}
        animate={{ y: [0, -16, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
      >
        <div
          className="relative rounded-[26px] p-[5px] shadow-[0_36px_70px_-14px_rgba(16,42,86,0.5)]"
          style={{ background: 'linear-gradient(160deg,#3a4354,#0e1420)' }}
        >
          <div className="relative overflow-hidden rounded-[21px] bg-white">
            {/* dynamic island */}
            <div className="absolute left-1/2 top-1.5 z-10 h-[14px] w-[46px] -translate-x-1/2 rounded-full bg-black" />
            <MiniDonationPage />
          </div>
          <div
            className="pointer-events-none absolute inset-[5px] rounded-[21px]"
            style={{ background: 'linear-gradient(130deg,rgba(255,255,255,.28),transparent 40%)' }}
          />
        </div>
      </motion.div>
    </div>
  )
}

function MiniDashboard() {
  return (
    <div className="flex h-[300px] text-[7px]" dir="rtl">
      {/* sidebar */}
      <div className="w-[64px] shrink-0 bg-[#0f1b33] p-2.5 text-white/70">
        <div className="mb-3 flex items-center gap-1">
          <div className="h-3.5 w-3.5 rounded-full" style={{ background: BLUE }} />
          <span className="text-[6px] font-black text-white">KAFOOL</span>
        </div>
        {['סקירה', 'קמפיינים', 'תרומות', 'תורמים', 'דוחות', 'הגדרות'].map((t, i) => (
          <div key={t} className={`mb-1 rounded px-1.5 py-1 ${i === 0 ? 'bg-white/12 text-white' : ''}`}>{t}</div>
        ))}
      </div>
      {/* content */}
      <div className="flex-1 space-y-2 bg-[#f7f9fc] p-3">
        <div className="rounded-lg bg-white p-2.5 shadow-sm">
          <div className="mb-1 text-[6px] text-gray-400">סה״כ גויס</div>
          <div className="text-[15px] font-black" style={{ color: NAVY }}>₪413,122</div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-100">
            <motion.div
              className="h-1.5 rounded-full"
              style={{ background: `linear-gradient(90deg,${BLUE},#22c55e)` }}
              initial={{ width: 0 }} animate={{ width: '92%' }}
              transition={{ duration: 1.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[5.5px] text-gray-400"><span>92%</span><span>יעד ₪450,000</span></div>
        </div>
        <div className="rounded-lg bg-white p-2.5 shadow-sm">
          <svg viewBox="0 0 200 56" className="h-[52px] w-full">
            <motion.path
              d="M4 48 L34 42 L64 44 L94 30 L124 33 L154 16 L196 8"
              fill="none" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 2, delay: 0.7, ease: 'easeInOut' }}
            />
            <motion.path
              d="M4 48 L34 42 L64 44 L94 30 L124 33 L154 16 L196 8 L196 56 L4 56 Z"
              fill={BLUE} initial={{ opacity: 0 }} animate={{ opacity: 0.08 }}
              transition={{ duration: 1, delay: 1.6 }}
            />
          </svg>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-white p-2 shadow-sm">
            <div className="mb-1 text-[5.5px] text-gray-400">לפי מקור</div>
            <div className="flex items-center gap-1.5">
              <svg viewBox="0 0 36 36" className="h-7 w-7 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#eef2f7" strokeWidth="6" />
                <motion.circle
                  cx="18" cy="18" r="15" fill="none" stroke={BLUE} strokeWidth="6" strokeLinecap="round"
                  strokeDasharray="94" initial={{ strokeDashoffset: 94 }} animate={{ strokeDashoffset: 33 }}
                  transition={{ duration: 1.6, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
                />
              </svg>
              <div className="space-y-0.5 text-[5px] text-gray-500">
                <div>אשראי 65%</div><div>ביט 25%</div><div>העברה 10%</div>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-white p-2 shadow-sm">
            <div className="mb-1 text-[5.5px] text-gray-400">תרומות אחרונות</div>
            {[['משפחת לוי', '₪1,800'], ['יעקב כהן', '₪360'], ['משפחת אברהם', '₪1,000']].map(([n, a]) => (
              <div key={n} className="flex justify-between py-[1px] text-[5px]">
                <span className="text-gray-600">{n}</span><span className="font-bold" style={{ color: NAVY }}>{a}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniDonationPage() {
  return (
    <div className="h-[280px] text-[7px]" dir="rtl">
      <div className="flex h-[34px] items-center justify-center border-b border-gray-100 bg-white">
        <span className="text-[7px] font-black" style={{ color: NAVY }}>KAFOOL</span>
      </div>
      <div className="p-2">
        <div className="mb-2 h-[92px] rounded-lg" style={{ background: `linear-gradient(140deg,${CORAL}33,${BLUE}33)` }}>
          <div className="flex h-full items-center justify-center text-[7px] font-black" style={{ color: NAVY }}>
            לבנה שבונה בית
          </div>
        </div>
        <div className="text-center text-[13px] font-black" style={{ color: NAVY }}>₪413,122</div>
        <div className="mb-1 text-center text-[5.5px] text-gray-400">מתוך ₪450,000</div>
        <div className="h-1.5 w-full rounded-full bg-gray-100">
          <motion.div
            className="h-1.5 rounded-full" style={{ background: `linear-gradient(90deg,${BLUE},#22c55e)` }}
            initial={{ width: 0 }} animate={{ width: '92%' }}
            transition={{ duration: 1.8, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1">
          {['₪180', '₪360', '₪720'].map(a => (
            <div key={a} className="rounded-md border border-gray-200 py-1 text-center text-[6px] font-bold text-gray-600">{a}</div>
          ))}
        </div>
        <div className="mt-1.5 rounded-md py-1.5 text-center text-[7px] font-black text-white" style={{ background: BLUE }}>
          לתרומה
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── Floating live cards ───────────────────────── */

function GlassCard({
  className = '', delay = 0, dur = 6, children,
}: { className?: string; delay?: number; dur?: number; children: React.ReactNode }) {
  return (
    <motion.div
      className={`absolute rounded-3xl border px-3.5 py-2.5 shadow-[0_18px_45px_-12px_rgba(16,42,86,0.28)] backdrop-blur-xl ${className}`}
      style={{ background: 'rgba(255,255,255,.75)', borderColor: 'rgba(255,255,255,.45)' }}
      initial={{ opacity: 0, scale: 0.9, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: [0, -10, 0] }}
      transition={{
        opacity: { duration: 0.6, delay }, scale: { duration: 0.6, delay },
        y: { duration: dur, repeat: Infinity, ease: 'easeInOut', delay },
      }}
    >
      {children}
    </motion.div>
  )
}

/* ───────────────────────── Sections ───────────────────────── */

const FEATURES = [
  { Icon: Palette, title: 'דפי תרומה עוצמתיים ומותאמים אישית', text: 'דפים מעוצבים שממירים יותר תורמים.' },
  { Icon: LayoutDashboard, title: 'ניהול חכם של הקמפיין', text: 'כל הנתונים, התורמים והפעילות במקום אחד.' },
  { Icon: BarChart3, title: 'מעקב ונתונים בזמן אמת', text: 'דוחות מתקדמים לקבלת החלטות מדויקות.' },
  { Icon: ShieldCheck, title: 'שקיפות וביטחון לתורמים', text: 'סליקה מאובטחת עם חוויית תרומה חלקה.' },
]

const TRUST_ITEMS = [
  { Icon: Zap, title: 'הקמה מהירה', text: 'תוך דקות ספורות' },
  { Icon: Wallet, title: 'ללא עלות הקמה', text: 'משלמים רק על הצלחה' },
  { Icon: HeadphonesIcon, title: 'תמיכה אישית', text: 'צוות מקצועי זמין לכם' },
  { Icon: ShieldCheck, title: 'אבטחה ברמה גבוהה', text: 'הנתונים שלכם מוגנים' },
]

export interface LandingContent {
  hero_kicker: string
  hero_line1: string
  hero_line2: string
  hero_line3: string
  hero_sub: string
  hero_text: string
  stats_raised: string
  stats_campaigns: string
  stats_success: string
  stats_donors: string
  trust_title: string
  features_title: string
  cta_title: string
  cta_text: string
}

export default function Landing({ c, logos }: { c: LandingContent; logos: string[] }) {
  const stats = [
    { Icon: Sparkles, value: c.stats_raised, label: 'גויסו עד היום', color: BLUE },
    { Icon: CreditCard, value: c.stats_campaigns, label: 'קמפיינים מצליחים', color: NAVY },
    { Icon: Users, value: c.stats_success, label: 'אחוז הצלחה', color: BLUE },
    { Icon: Sparkles, value: c.stats_donors, label: 'תורמים פעילים', color: CORAL },
  ]

  return (
    <div dir="rtl" className="relative">
      <PremiumBackground />

      {/* ── HERO ── */}
      <section className="relative px-5 pt-16 pb-24 sm:pt-24">
        <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
          {/* copy */}
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="text-[2.6rem] font-black leading-[1.08] tracking-tight sm:text-6xl" style={{ color: NAVY }}>
              {c.hero_line1}
              <br />
              <span style={{ color: BLUE }}>{c.hero_line2}</span>
              <br />
              <span style={{ color: CORAL }}>{c.hero_line3}</span>
            </h1>
            <p className="mt-5 text-xl font-black" style={{ color: BLUE }}>{c.hero_sub}</p>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-500">{c.hero_text}</p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/contact"
                className="group inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-4 text-[15px] font-black text-white shadow-[0_16px_36px_-10px_rgba(78,123,239,0.65)] transition-transform hover:-translate-y-0.5"
                style={{ background: BLUE }}
              >
                התחל עכשיו
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              </Link>
              <Link
                href="/design"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/60 bg-white/70 px-7 py-4 text-[15px] font-bold text-slate-700 shadow-sm backdrop-blur-xl transition-transform hover:-translate-y-0.5"
              >
                צפה בדמו
                <Play className="h-3.5 w-3.5" style={{ color: BLUE }} />
              </Link>
            </div>
          </motion.div>

          {/* devices + live cards */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <Devices />

            <GlassCard className="-top-6 right-4 sm:right-10" delay={0.7} dur={6}>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: `${BLUE}1a` }}>
                  <Users className="h-3.5 w-3.5" style={{ color: BLUE }} />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400">תרומה חדשה!</div>
                  <div className="text-sm font-black" style={{ color: NAVY }}>₪1,800</div>
                  <div className="text-[10px] text-slate-400">משפחת כהן</div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="top-16 -left-2 sm:-left-6" delay={1} dur={7}>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: '#22c55e1a' }}>
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-emerald-500">יעד הושלם! 🎉</div>
                  <div className="text-sm font-black" style={{ color: NAVY }}>₪413,122</div>
                  <div className="text-[10px] text-slate-400">תודה לכל התורמים</div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="-bottom-4 -left-1 sm:left-4" delay={1.3} dur={6.5}>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: `${CORAL}1a` }}>
                  <Users className="h-3.5 w-3.5" style={{ color: CORAL }} />
                </div>
                <div>
                  <div className="text-sm font-black" style={{ color: NAVY }}><Counter to={927} /></div>
                  <div className="text-[10px] text-slate-400">תורמים מצטרפים לקמפיין</div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="-bottom-16 right-8" delay={1.6} dur={5.5}>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <div>
                  <div className="text-sm font-black" style={{ color: NAVY }}><Counter to={215} /></div>
                  <div className="text-[10px] text-slate-400">אנשים צופים עכשיו</div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* ── TRUST LOGOS (only when configured) ── */}
      {logos.length > 0 && (
        <section className="px-5 py-16">
          <Reveal>
            <p className="mb-9 text-center text-sm font-bold text-slate-400">{c.trust_title}</p>
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-14 gap-y-8">
              {logos.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i} src={src} alt="" loading="lazy"
                  className="h-9 w-auto opacity-45 grayscale transition-all duration-500 hover:opacity-100 hover:grayscale-0"
                />
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ── STATS ── */}
      <section className="px-5 py-10">
        <Reveal>
          <div
            className="mx-auto grid max-w-5xl grid-cols-2 gap-px overflow-hidden rounded-[28px] border shadow-[0_30px_70px_-30px_rgba(16,42,86,0.3)] backdrop-blur-xl lg:grid-cols-4"
            style={{ background: 'rgba(255,255,255,.55)', borderColor: 'rgba(255,255,255,.45)' }}
          >
            {stats.map((s, i) => (
              <motion.div
                key={i}
                className="bg-white/70 p-8 text-center"
                initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.1 }}
              >
                <s.Icon className="mx-auto mb-3 h-5 w-5" style={{ color: s.color }} strokeWidth={1.6} />
                <div className="text-3xl font-black tracking-tight" style={{ color: s.color }}>{s.value}</div>
                <div className="mt-1 text-xs font-medium text-slate-400">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── FEATURES ── */}
      <section className="px-5 py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <div className="relative overflow-hidden rounded-[28px] border bg-white/60 p-4 shadow-[0_40px_90px_-30px_rgba(16,42,86,0.35)] backdrop-blur-xl"
              style={{ borderColor: 'rgba(255,255,255,.45)' }}>
              <div className="overflow-hidden rounded-2xl border border-slate-100">
                <MiniDashboard />
              </div>
            </div>
          </Reveal>

          <div>
            <Reveal>
              <p className="mb-2 text-sm font-black" style={{ color: BLUE }}>כל מה שצריך. במקום אחד.</p>
              <h2 className="mb-9 text-3xl font-black leading-tight tracking-tight sm:text-4xl" style={{ color: NAVY }}>
                {c.features_title}
              </h2>
            </Reveal>
            <div className="space-y-3">
              {FEATURES.map((f, i) => (
                <Reveal key={i} delay={i * 0.08}>
                  <div
                    className="group flex items-start gap-4 rounded-2xl border bg-white/60 p-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/85 hover:shadow-[0_18px_40px_-14px_rgba(78,123,239,0.35)]"
                    style={{ borderColor: 'rgba(255,255,255,.55)' }}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${BLUE}12` }}>
                      <f.Icon className="h-[18px] w-[18px]" style={{ color: BLUE }} strokeWidth={1.7} />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-black" style={{ color: NAVY }}>{f.title}</h3>
                      <p className="mt-0.5 text-[13px] text-slate-500">{f.text}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={0.35}>
              <Link href="/about" className="mt-7 inline-flex items-center gap-2 rounded-2xl border border-white/60 bg-white/70 px-6 py-3 text-sm font-bold text-slate-700 backdrop-blur-xl transition-transform hover:-translate-y-0.5">
                כל התכונות
                <ArrowLeft className="h-4 w-4" style={{ color: BLUE }} />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-5 py-16">
        <Reveal>
          <div
            className="relative mx-auto max-w-5xl overflow-hidden rounded-[32px] px-8 py-16 text-center shadow-[0_40px_90px_-30px_rgba(78,123,239,0.6)]"
            style={{ background: `linear-gradient(110deg, ${BLUE}, #6b6fe6 45%, ${CORAL})` }}
          >
            <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 15% 0%, rgba(255,255,255,.28), transparent 55%)' }} />
            <div className="relative">
              <h2 className="text-3xl font-black text-white sm:text-4xl">{c.cta_title}</h2>
              <p className="mx-auto mt-3 max-w-xl text-[15px] text-white/85">{c.cta_text}</p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/contact" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-[15px] font-black shadow-lg transition-transform hover:-translate-y-0.5" style={{ color: BLUE }}>
                  התחל עכשיו
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <Link href="/design" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/40 px-8 py-4 text-[15px] font-bold text-white transition-colors hover:bg-white/10">
                  צפה בדמו
                  <Play className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── TRUST STRIP ── */}
      <section className="px-5 pb-24">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 lg:grid-cols-4">
          {TRUST_ITEMS.map((t, i) => (
            <Reveal key={i} delay={i * 0.07}>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/60 bg-white/70 backdrop-blur-xl">
                  <t.Icon className="h-4 w-4" style={{ color: BLUE }} strokeWidth={1.7} />
                </div>
                <div>
                  <div className="text-[13px] font-black" style={{ color: NAVY }}>{t.title}</div>
                  <div className="text-[11px] text-slate-400">{t.text}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  )
}
