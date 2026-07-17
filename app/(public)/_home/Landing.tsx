'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  motion, useInView, useMotionValue, useSpring, useTransform, useScroll,
  useMotionTemplate, animate,
} from 'framer-motion'
import {
  ArrowLeft, Play, LayoutDashboard, Users, CreditCard, BarChart3,
  Palette, ShieldCheck, Zap, HeadphonesIcon, Wallet, Sparkles,
  Phone, ListOrdered, Link2, Handshake, Clock, Trophy, Star,
} from 'lucide-react'

const BLUE = '#4E7BEF'
const CORAL = '#F46B5F'
const NAVY = '#102A56'
const AMBER = '#F59E0B'   // Kafool+ (ambassadors)
const GREEN = '#16A34A'   // positive actions

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

const EASE = [0.22, 1, 0.36, 1] as const

function Reveal({ children, delay = 0, y = 26 }: { children: React.ReactNode; delay?: number; y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.75, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

// Apple/Framer signature: each line rises out from behind a mask.
function MaskLine({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <span className="block overflow-hidden pb-[0.12em]">
      <motion.span
        className="block"
        initial={{ y: '110%' }}
        animate={{ y: '0%' }}
        transition={{ duration: 1.05, delay, ease: EASE }}
      >
        {children}
      </motion.span>
    </span>
  )
}

function MaskLineInView({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <span className="block overflow-hidden pb-[0.12em]">
      <motion.span
        className="block"
        initial={{ y: '110%' }}
        whileInView={{ y: '0%' }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 1, delay, ease: EASE }}
      >
        {children}
      </motion.span>
    </span>
  )
}

// Button that leans toward the cursor, then springs back.
function Magnetic({ children, strength = 0.35 }: { children: React.ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const x = useSpring(mx, { stiffness: 220, damping: 18, mass: 0.4 })
  const y = useSpring(my, { stiffness: 220, damping: 18, mass: 0.4 })
  return (
    <motion.span
      ref={ref}
      className="inline-block"
      style={{ x, y }}
      onMouseMove={e => {
        const r = ref.current?.getBoundingClientRect()
        if (!r) return
        mx.set((e.clientX - (r.left + r.width / 2)) * strength)
        my.set((e.clientY - (r.top + r.height / 2)) * strength)
      }}
      onMouseLeave={() => { mx.set(0); my.set(0) }}
    >
      {children}
    </motion.span>
  )
}

// Stripe-style: a soft light follows the cursor across the card surface.
function SpotlightCard({
  children, className = '', tint = BLUE,
}: { children: React.ReactNode; className?: string; tint?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(-200)
  const my = useMotionValue(-200)
  const bg = useMotionTemplate`radial-gradient(320px circle at ${mx}px ${my}px, ${tint}1f, transparent 72%)`
  return (
    <div
      ref={ref}
      onMouseMove={e => {
        const r = ref.current?.getBoundingClientRect()
        if (!r) return
        mx.set(e.clientX - r.left)
        my.set(e.clientY - r.top)
      }}
      onMouseLeave={() => { mx.set(-200); my.set(-200) }}
      className={`group relative overflow-hidden ${className}`}
    >
      <motion.div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: bg }} />
      <div className="relative">{children}</div>
    </div>
  )
}

// Thin reading-progress line at the very top.
function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 })
  return (
    <motion.div
      className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-right"
      style={{ scaleX, background: `linear-gradient(90deg, ${BLUE}, ${CORAL})` }}
    />
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
            {/* the real campaign page, captured live */}
            <Image
              src="/mockups/einav-desktop.jpg"
              alt="דף גיוס לדוגמה במערכת כפול"
              width={1280}
              height={800}
              priority
              sizes="(max-width: 1024px) 90vw, 640px"
              className="h-auto w-full"
            />
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
            {/* the real campaign page on mobile, captured live */}
            <Image
              src="/mockups/einav-mobile.jpg"
              alt="דף גיוס לדוגמה בנייד"
              width={390}
              height={844}
              priority
              sizes="180px"
              className="h-auto w-full"
            />
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

/* ───────────────────── Kafool+ ambassador console ───────────────────── */

// The lead card the ambassador sees before dialling — the heart of Kafool+.
function AmbassadorConsole() {
  return (
    <div className="relative mx-auto w-[290px] sm:w-[320px]" style={{ perspective: 1200 }}>
      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="relative rounded-[38px] p-[6px] shadow-[0_50px_100px_-22px_rgba(16,42,86,0.5)]"
        style={{ background: 'linear-gradient(160deg,#3a4354,#0e1420)' }}
      >
        <div className="relative overflow-hidden rounded-[32px] bg-[#f7f9fc]" dir="rtl">
          <div className="absolute left-1/2 top-2 z-20 h-[18px] w-[64px] -translate-x-1/2 rounded-full bg-black" />

          {/* header */}
          <div className="px-4 pb-3 pt-8 text-white" style={{ background: `linear-gradient(140deg, ${AMBER}, #EA8C0B)` }}>
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-white/25 px-2 py-0.5 text-[9px] font-black">שגריר</span>
              <span className="text-[11px] font-black">צבאות השם תשפ״ו</span>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-[9px] font-bold text-white/90">
                <span>25%</span><span>היעד האישי שלי</span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-white/25">
                <motion.div
                  className="h-1.5 rounded-full bg-white"
                  initial={{ width: 0 }} whileInView={{ width: '25%' }} viewport={{ once: true }}
                  transition={{ duration: 1.4, delay: 0.4, ease: EASE }}
                />
              </div>
              <div className="mt-1 text-left text-[10px] font-black">₪12,400 <span className="font-medium text-white/70">מתוך ₪50,000</span></div>
            </div>
          </div>

          {/* lead card */}
          <div className="p-3">
            <div className="rounded-2xl bg-white p-3.5 shadow-sm">
              <div className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-[17px] font-black" style={{ color: NAVY }}>אברהם כהן</span>
              </div>
              <div className="mt-0.5 text-[11px] text-slate-400" dir="ltr">052-1234567</div>

              <div className="mt-2.5 flex flex-wrap gap-1">
                {[['פ״ה', '6,000'], ['פ״ד', '4,200'], ['פ״ג', '4,000']].map(([y, a]) => (
                  <span key={y} className="rounded-lg px-2 py-1 text-[9px] font-black" style={{ background: `${GREEN}14`, color: GREEN }}>
                    {y}: ₪{a}
                  </span>
                ))}
              </div>
              <div className="mt-1.5 inline-block rounded-lg bg-slate-100 px-2 py-1 text-[9px] font-medium text-slate-500">
                📁 סעודת שבת פרשת לך לך
              </div>
            </div>

            {/* call button */}
            <motion.div
              className="mt-3 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-black text-white shadow-lg"
              style={{ background: GREEN }}
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Phone className="h-4 w-4" strokeWidth={2.4} />
              התקשר
            </motion.div>

            {/* actions */}
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {[
                { t: 'רישום הבטחה', c: GREEN }, { t: 'שליחת קישור', c: BLUE },
                { t: 'חיוב אשראי', c: NAVY }, { t: 'קביעת חזרה', c: AMBER },
              ].map(a => (
                <div key={a.t} className="rounded-xl border border-slate-100 bg-white py-2 text-center text-[10px] font-bold" style={{ color: a.c }}>
                  {a.t}
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex justify-center gap-1 text-[8px] text-slate-400">
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5">לא ענה</span>
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5">תפוס</span>
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5">לא מעוניין</span>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-[6px] rounded-[32px]" style={{ background: 'linear-gradient(130deg,rgba(255,255,255,.22),transparent 42%)' }} />
      </motion.div>

      {/* floating proof card */}
      <GlassCard className="-bottom-5 -left-4" delay={0.9} dur={6}>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: `${GREEN}1a` }}>
            <Handshake className="h-3.5 w-3.5" style={{ color: GREEN }} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400">הבטחה נרשמה</div>
            <div className="text-sm font-black" style={{ color: NAVY }}>₪1,800</div>
          </div>
        </div>
      </GlassCard>
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

// Kafool+ — what the ambassador actually gets on the call.
const PLUS_FLOW = [
  { Icon: ListOrdered, tint: AMBER, title: 'תור חכם לפי גובה התרומה', text: 'המערכת מסדרת את התורמים — הגדולים ראשונים. בלי לחפש למי להתקשר.' },
  { Icon: Star, tint: AMBER, title: 'הוא יודע למי הוא מדבר', text: 'לפני החיוג רואים כמה תרם בכל שנה, מאיזו רשימה הגיע והאם הוא VIP. שיחה ממוקדת, לא עיוורת.' },
  { Icon: Phone, tint: GREEN, title: 'חיוג בלחיצה — ומענה לכל תרחיש', text: 'לא ענה? הליד חוזר לתור אוטומטית. תפוס, מספר שגוי, לא מעוניין — הכל בקליק.' },
  { Icon: Link2, tint: BLUE, title: 'קישור תרומה אישי ב-SMS / וואטסאפ', text: 'לכל שגריר קישור משלו — כל תרומה נזקפת לזכותו ונספרת בזמן אמת.' },
  { Icon: Handshake, tint: GREEN, title: 'הבטחה או חיוב אשראי בשיחה', text: 'רישום סכום ותאריך גבייה, או סליקה מאובטחת תוך כדי השיחה — התרומה נסגרת עכשיו.' },
  { Icon: Clock, tint: BLUE, title: 'קביעת חזרה ותזכורות', text: 'בוחרים תאריך ושעה — המערכת מזכירה. שום ליד לא נופל בין הכיסאות.' },
  { Icon: Trophy, tint: AMBER, title: 'יעד אישי, דירוג ותסריט שיחה', text: 'הוא רואה את ההתקדמות שלו מול שאר השגרירים, ומקבל תסריט מוכן מהמנהל.' },
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

  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress: heroP } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  // layered depth: copy, devices and atmosphere drift at different speeds
  const copyY = useTransform(heroP, [0, 1], [0, 110])
  const devY = useTransform(heroP, [0, 1], [0, -50])
  const devScale = useTransform(heroP, [0, 1], [1, 0.9])
  const heroFade = useTransform(heroP, [0, 0.8], [1, 0])

  return (
    <div dir="rtl" className="relative">
      <ScrollProgress />
      <PremiumBackground />

      {/* ── HERO ── */}
      <section ref={heroRef} className="relative px-5 pt-16 pb-28 sm:pt-24">
        <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
          {/* copy */}
          <motion.div style={{ y: copyY, opacity: heroFade }}>
            <motion.p
              className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/70 px-3.5 py-1.5 text-[11px] font-bold backdrop-blur-xl"
              style={{ color: BLUE }}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Sparkles className="h-3 w-3" strokeWidth={2} />
              {c.hero_sub}
            </motion.p>

            <h1 className="text-[2.6rem] font-black leading-[1.08] tracking-tight sm:text-6xl" style={{ color: NAVY }}>
              <MaskLine delay={0.15}>{c.hero_line1}</MaskLine>
              <MaskLine delay={0.28}><span style={{ color: BLUE }}>{c.hero_line2}</span></MaskLine>
              <MaskLine delay={0.41}><span style={{ color: CORAL }}>{c.hero_line3}</span></MaskLine>
            </h1>

            <motion.p
              className="mt-5 max-w-md text-[15px] leading-relaxed text-slate-500"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.65, ease: EASE }}
            >
              {c.hero_text}
            </motion.p>

            <motion.div
              className="mt-9 flex flex-col gap-3 sm:flex-row"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8, ease: EASE }}
            >
              <Magnetic>
                <Link
                  href="/contact"
                  className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl px-7 py-4 text-[15px] font-black text-white shadow-[0_16px_36px_-10px_rgba(78,123,239,0.65)] transition-shadow hover:shadow-[0_22px_50px_-10px_rgba(78,123,239,0.8)]"
                  style={{ background: BLUE }}
                >
                  {/* sheen sweep */}
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-l from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  <span className="relative">התחל עכשיו</span>
                  <ArrowLeft className="relative h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
                </Link>
              </Magnetic>
              <Magnetic strength={0.22}>
                <Link
                  href="/design"
                  className="group inline-flex items-center justify-center gap-2 rounded-2xl border border-white/60 bg-white/70 px-7 py-4 text-[15px] font-bold text-slate-700 shadow-sm backdrop-blur-xl transition-colors hover:bg-white"
                >
                  צפה בדמו
                  <span className="flex h-5 w-5 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110" style={{ background: `${BLUE}18` }}>
                    <Play className="h-2.5 w-2.5" style={{ color: BLUE }} />
                  </span>
                </Link>
              </Magnetic>
            </motion.div>
          </motion.div>

          {/* devices + live cards */}
          <motion.div
            className="relative"
            style={{ y: devY, scale: devScale }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 1.1, delay: 0.15, ease: EASE }}
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
                initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.7, delay: i * 0.09, ease: EASE }}
              >
                <SpotlightCard className="h-full bg-white/70 transition-colors duration-500 hover:bg-white/90" tint={s.color}>
                  <div className="p-8 text-center">
                    <motion.div whileHover={{ scale: 1.18, rotate: -6 }} transition={{ type: 'spring', stiffness: 320, damping: 14 }}>
                      <s.Icon className="mx-auto mb-3 h-5 w-5" style={{ color: s.color }} strokeWidth={1.6} />
                    </motion.div>
                    <div className="text-3xl font-black tracking-tight" style={{ color: s.color }}>
                      <MaskLineInView delay={i * 0.09 + 0.1}>{s.value}</MaskLineInView>
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-400">{s.label}</div>
                  </div>
                </SpotlightCard>
              </motion.div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── FEATURES — the dashboard stays with you while the story scrolls ── */}
      <section className="px-5 py-32">
        <div className="mx-auto grid max-w-6xl items-start gap-16 lg:grid-cols-2">
          <div className="lg:sticky lg:top-28">
            <motion.div
              initial={{ opacity: 0, y: 40, rotateY: 10 }}
              whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1.1, ease: EASE }}
              style={{ perspective: 1200 }}
            >
              <div
                className="relative overflow-hidden rounded-[28px] border bg-white/60 p-4 shadow-[0_50px_110px_-35px_rgba(16,42,86,0.45)] backdrop-blur-xl"
                style={{ borderColor: 'rgba(255,255,255,.45)' }}
              >
                <div
                  className="pointer-events-none absolute -inset-px rounded-[28px]"
                  style={{ background: 'linear-gradient(140deg,rgba(255,255,255,.6),transparent 40%)' }}
                />
                <div className="relative overflow-hidden rounded-2xl border border-slate-100">
                  <MiniDashboard />
                </div>
              </div>
            </motion.div>
          </div>

          <div className="lg:pt-6">
            <p className="mb-2 overflow-hidden text-sm font-black" style={{ color: BLUE }}>
              <MaskLineInView>כל מה שצריך. במקום אחד.</MaskLineInView>
            </p>
            <h2 className="mb-10 text-3xl font-black leading-[1.15] tracking-tight sm:text-[2.6rem]" style={{ color: NAVY }}>
              <MaskLineInView delay={0.08}>{c.features_title}</MaskLineInView>
            </h2>

            <div className="space-y-3">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.75, delay: i * 0.09, ease: EASE }}
                >
                  <SpotlightCard className="rounded-2xl border bg-white/60 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:bg-white/90 hover:shadow-[0_26px_55px_-18px_rgba(78,123,239,0.42)]">
                    <div className="flex items-start gap-4 p-5" style={{ borderColor: 'rgba(255,255,255,.55)' }}>
                      <motion.div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: `${BLUE}12` }}
                        whileHover={{ scale: 1.12, rotate: -8 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 14 }}
                      >
                        <f.Icon className="h-[18px] w-[18px]" style={{ color: BLUE }} strokeWidth={1.7} />
                      </motion.div>
                      <div>
                        <h3 className="text-[15px] font-black" style={{ color: NAVY }}>{f.title}</h3>
                        <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">{f.text}</p>
                      </div>
                      <ArrowLeft
                        className="mr-auto mt-1 h-4 w-4 shrink-0 -translate-x-2 opacity-0 transition-all duration-400 group-hover:translate-x-0 group-hover:opacity-100"
                        style={{ color: BLUE }}
                      />
                    </div>
                  </SpotlightCard>
                </motion.div>
              ))}
            </div>

            <Reveal delay={0.3}>
              <Magnetic strength={0.2}>
                <Link href="/about" className="group mt-8 inline-flex items-center gap-2 rounded-2xl border border-white/60 bg-white/70 px-6 py-3.5 text-sm font-bold text-slate-700 backdrop-blur-xl transition-colors hover:bg-white">
                  כל התכונות
                  <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" style={{ color: BLUE }} />
                </Link>
              </Magnetic>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── KAFOOL+ — telephony console for ambassadors ── */}
      <section className="relative px-5 py-32">
        {/* warm seam so the section reads as its own world */}
        <div className="pointer-events-none absolute inset-0 -z-10" style={{ background: `radial-gradient(80% 55% at 50% 40%, ${AMBER}0f, transparent 70%)` }} />
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <Reveal>
              <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/70 px-3.5 py-1.5 text-[11px] font-black backdrop-blur-xl" style={{ color: AMBER }}>
                <Phone className="h-3 w-3" strokeWidth={2.2} />
                Kafool+ · טלפניה לשגרירים ומגייסים
              </span>
            </Reveal>
            <h2 className="mx-auto max-w-2xl text-3xl font-black leading-[1.15] tracking-tight sm:text-[2.6rem]" style={{ color: NAVY }}>
              <MaskLineInView>השגריר לא מחפש למי להתקשר.</MaskLineInView>
              <MaskLineInView delay={0.1}><span style={{ color: AMBER }}>המערכת מגישה לו.</span></MaskLineInView>
            </h2>
            <Reveal delay={0.2}>
              <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-slate-500">
                במקום רשימת אקסל מבולגנת — תור חכם שמסדר את התורמים לפי גודל התרומה בעבר. הגדולים ראשונים. השגריר רק לוחץ &quot;התקשר&quot; ומתקדם.
              </p>
            </Reveal>
          </div>

          <div className="grid items-center gap-16 lg:grid-cols-2">
            <Reveal>
              <AmbassadorConsole />
            </Reveal>

            <div className="space-y-3">
              {PLUS_FLOW.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.7, delay: i * 0.07, ease: EASE }}
                >
                  <SpotlightCard
                    tint={AMBER}
                    className="rounded-2xl border bg-white/60 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:bg-white/90 hover:shadow-[0_26px_55px_-18px_rgba(245,158,11,0.35)]"
                  >
                    <div className="flex items-start gap-4 p-5" style={{ borderColor: 'rgba(255,255,255,.55)' }}>
                      <motion.div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: `${f.tint}14` }}
                        whileHover={{ scale: 1.12, rotate: -8 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 14 }}
                      >
                        <f.Icon className="h-[18px] w-[18px]" style={{ color: f.tint }} strokeWidth={1.7} />
                      </motion.div>
                      <div>
                        <h3 className="text-[15px] font-black" style={{ color: NAVY }}>{f.title}</h3>
                        <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">{f.text}</p>
                      </div>
                    </div>
                  </SpotlightCard>
                </motion.div>
              ))}

              <Reveal delay={0.3}>
                <Magnetic strength={0.2}>
                  <a
                    href="https://plus.kafool.com/"
                    className="group mt-6 inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-black text-white shadow-[0_16px_36px_-10px_rgba(245,158,11,0.6)] transition-shadow hover:shadow-[0_22px_50px_-10px_rgba(245,158,11,0.75)]"
                    style={{ background: AMBER }}
                  >
                    למערכת השגרירים Kafool+
                    <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
                  </a>
                </Magnetic>
              </Reveal>
            </div>
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
            {/* slow breathing light */}
            <motion.div
              className="pointer-events-none absolute -top-1/2 left-1/4 h-[140%] w-[60%] rounded-full blur-[90px]"
              style={{ background: 'rgba(255,255,255,.18)' }}
              animate={{ x: ['-10%', '25%', '-10%'], opacity: [0.35, 0.6, 0.35] }}
              transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="relative">
              <h2 className="text-3xl font-black text-white sm:text-[2.7rem]">
                <MaskLineInView>{c.cta_title}</MaskLineInView>
              </h2>
              <motion.p
                className="mx-auto mt-4 max-w-xl text-[15px] text-white/85"
                initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
              >
                {c.cta_text}
              </motion.p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Magnetic>
                  <Link href="/contact" className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-white px-8 py-4 text-[15px] font-black shadow-[0_18px_40px_-12px_rgba(0,0,0,0.35)] transition-shadow hover:shadow-[0_26px_60px_-12px_rgba(0,0,0,0.45)]" style={{ color: BLUE }}>
                    <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-l from-transparent via-black/5 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                    <span className="relative">התחל עכשיו</span>
                    <ArrowLeft className="relative h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
                  </Link>
                </Magnetic>
                <Magnetic strength={0.22}>
                  <Link href="/design" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/40 px-8 py-4 text-[15px] font-bold text-white transition-colors hover:bg-white/10">
                    צפה בדמו
                    <Play className="h-3.5 w-3.5" />
                  </Link>
                </Magnetic>
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
