'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import DonationModal from './DonationModal'
import WhatsAppFab from '@/components/WhatsAppFab'
import { Banknote, RotateCw, HeartHandshake, Lock, ShieldCheck, ArrowLeft, ArrowRight, Check, Calendar, Coins, Users } from 'lucide-react'

// ── Design tokens — modern & clean: white ground, one confident blue accent,
//    generous whitespace, flat surfaces. A guided step-by-step flow.
const C = {
  bg: '#ffffff', soft: '#f4f6fb', ink: '#0f172a', text: '#334155', muted: '#64748b',
  line: '#e6e9f1', card: '#ffffff', accentSoft: '#eef4ff',
}

interface KaparotCfg {
  price_per_soul?: number; max_souls?: number; intro_html?: string
  chabad_logo_url?: string; about_text?: string; hero_image_url?: string; hero_declaration?: string; blessing?: string
}
interface Campaign {
  id: string; title: string; slug: string; cover_image_url?: string | null
  settings: Record<string, unknown> & { kaparot?: KaparotCfg; primary_color?: string; button_radius?: string; stripe_enabled?: boolean; allowed_currencies?: string[]; stripe_ils_rate?: number }
}
interface Org { id: string; name: string; logo_url?: string | null }

interface Props {
  org: Org; campaign: Campaign; initialLang?: 'he' | 'en'; donationUrl: string
  paymentUrls: { one_time: string; hok: string; bit: string; bank: string; one_time_en?: string; hok_en?: string }
  paymentProvider: string; nedarim: { mosad: string; apiValid: string; active: boolean } | null
}

const ils = (n: number) => '₪' + Math.round(n).toLocaleString('he-IL')
const DEFAULT_YECHI = 'יחי אדוננו מורנו ורבינו מלך המשיח לעולם ועד'
const NUSACH = 'בְּנֵי אָדָם יוֹשְׁבֵי חשֶׁךְ וְצַלְמָוֶת אֲסִירֵי עֳנִי וּבַרְזֶל: יוֹצִיאֵם מֵחשֶׁךְ וְצַלְמָוֶת וּמוֹסְרוֹתֵיהֶם יְנַתֵּק: אֱוִילִים מִדֶּרֶךְ פִּשְׁעָם וּמֵעֲוֹנֹתֵיהֶם יִתְעַנּוּ: כָּל אֹכֶל תְּתַעֵב נַפְשָׁם וַיַּגִּיעוּ עַד שַׁעֲרֵי מָוֶת: וַיִּזְעֲקוּ אֶל אַ-דֹנָי בַּצַּר לָהֶם מִמְּצוּקוֹתֵיהֶם יוֹשִׁיעֵם: יִשְׁלַח דְּבָרוֹ וְיִרְפָּאֵם וִימַלֵּט מִשְּׁחִיתוֹתָם: יוֹדוּ לַ־דֹנָי חַסְדּוֹ וְנִפְלְאוֹתָיו לִבְנֵי אָדָם: אִם יֵשׁ עָלָיו מַלְאָךְ מֵלִיץ אֶחָד מִנִּי אָלֶף. לְהַגִּיד לְאָדָם יָשְׁרוֹ: יְחֻנֶּנּוּ וַיֹּאמֶר פְּדָעֵהוּ מֵרֶדֶת שַׁחַת מָצָאתִי כֹפֶר:'
const DECLARATION = 'זֶה חֲלִיפָתִי. זֶה תְּמוּרָתִי. זֶה כַּפָּרָתִי. זֶה הַכֶּסֶף יֵלֵךְ לִצְדָקָה, וַאֲנִי אֵלֵךְ לְחַיִּים טוֹבִים אֲרוּכִים וּלְשָׁלוֹם'
const HOWTO = [
  { icon: Banknote, asset: 'cash.png', title: 'קחו כסף מזומן', text: 'הכינו סכום כסף מזומן בבית — כערך תרנגול לכל אחד מבני הבית.' },
  { icon: RotateCw, asset: 'rotate.png', title: 'עשו עליו את הכפרות', text: 'מסובבים את הכסף שלוש פעמים מעל הראש ואומרים את הנוסח (נלמד בשלב 3).' },
  { icon: HeartHandshake, asset: 'charity.png', title: 'תורמים כנגדו כאן', text: 'מזינים באתר את הסכום כנגד המזומן — והוא נתרם לצדקה, במקום התרנגול.' },
]

// Decorative assets live in /public/kaparot. Each renders only once its file
// exists (onError → fallback), so the page auto-upgrades as assets are added.
function Asset({ src, alt = '', className, style, fallback = null, onOk }: { src: string; alt?: string; className?: string; style?: React.CSSProperties; fallback?: React.ReactNode; onOk?: () => void }) {
  const [err, setErr] = useState(false)
  const ref = useRef<HTMLImageElement>(null)
  // Catch a 404 that already happened before React hydrated (SSR-rendered img).
  useEffect(() => { const el = ref.current; if (el && el.complete && el.naturalWidth === 0) setErr(true) }, [])
  if (err) return <>{fallback}</>
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} src={src} alt={alt} className={className} style={style} onError={() => setErr(true)} onLoad={onOk} />
}

const FAQ = [
  { icon: Calendar, q: 'מתי עורכים כפרות?', a: 'בעשרת ימי תשובה, ורבים עורכים בערב יום הכיפורים.' },
  { icon: Coins, q: 'כמה תורמים לנפש?', a: 'כערך תרנגול. הסכום נקבע ע״י בית חב״ד, וכל המוסיף — מוסיפים לו.' },
  { icon: Users, q: 'עורכים עבור כל המשפחה?', a: 'כן. הורה מסובב עבור ילדיו ונעדרים, בלשון המתאימה.' },
]
const STEP_LABELS = ['הסבר', 'שמות וסכום', 'נוסח הכפרות', 'תשלום']
const NUM_STEPS = STEP_LABELS.length

export default function KaparotPageClient({ org, campaign, initialLang, donationUrl, paymentUrls, paymentProvider, nedarim }: Props) {
  const s = campaign.settings || {}
  const cfg: KaparotCfg = s.kaparot || {}
  const accent = s.primary_color || '#2563eb'
  const pricePerSoul = Number(cfg.price_per_soul) > 0 ? Number(cfg.price_per_soul) : 50
  const maxSouls = Number(cfg.max_souls) > 0 ? Number(cfg.max_souls) : 20
  const logo = cfg.chabad_logo_url || org.logo_url || ''
  const yechi = cfg.hero_declaration === '' ? '' : (cfg.hero_declaration || DEFAULT_YECHI)

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [souls, setSouls] = useState(1)
  const [names, setNames] = useState<string[]>([''])
  const [extra, setExtra] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const goStep = (n: 1 | 2 | 3 | 4) => { setStep(n); if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const setCount = (n: number) => {
    const c = Math.max(1, Math.min(maxSouls, n))
    setSouls(c)
    setNames(prev => { const next = prev.slice(0, c); while (next.length < c) next.push(''); return next })
  }
  const extraAmount = Math.max(0, Number(extra) || 0)
  const total = souls * pricePerSoul + extraAmount
  const allNamesFilled = names.every(n => n.trim().length > 0)   // must name every soul before continuing

  // Focus the newly added name field when the count grows.
  const nameRefs = useRef<(HTMLInputElement | null)[]>([])
  const prevSouls = useRef(1)
  useEffect(() => {
    if (souls > prevSouls.current) nameRefs.current[souls - 1]?.focus()
    prevSouls.current = souls
  }, [souls])

  const presetCustomData = useMemo(() => {
    const cd: Record<string, string> = {
      'מספר נפשות': String(souls),
      'שמות הנפשות': names.map((nm, i) => nm.trim() || `נפש ${i + 1}`).join(' · '),
    }
    if (extraAmount > 0) cd['תוספת לצדקה'] = ils(extraAmount)
    return cd
  }, [souls, names, extraAmount])

  const stripeEnabled = s.stripe_enabled === true
  const allowedCurrencies = Array.isArray(s.allowed_currencies) ? s.allowed_currencies : ['ils']

  const btn = 'w-full inline-flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-base transition-transform hover:scale-[1.01]'
  const primaryBtn = `${btn} text-white`
  const primaryBtnStyle = { background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 80%, #fff), ${accent})`, boxShadow: `0 14px 30px -10px ${accent}99, inset 0 1px 0 rgba(255,255,255,.28)` }
  // premium, layered card surface reused across the steps
  const cardStyle = { background: '#ffffff', border: '1px solid rgba(15,23,42,.06)', boxShadow: `0 1px 2px rgba(15,23,42,.04), 0 26px 64px -32px ${accent}4d, 0 10px 30px -24px rgba(15,23,42,.35)` }

  return (
    <div dir={initialLang === 'en' ? 'ltr' : 'rtl'} style={{ color: C.text, minHeight: '100vh', fontFamily: "'Assistant', system-ui, sans-serif", background: `radial-gradient(1100px 520px at 50% -8%, ${accent}14, transparent 60%), linear-gradient(180deg, #fbfcff, ${C.bg} 40%)` }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@500;600;700;800&family=Assistant:wght@400;500;600;700&family=Frank+Ruhl+Libre:wght@500;700&display=swap');
        .kap-h{font-family:'Rubik','Assistant',sans-serif;font-weight:700;letter-spacing:-.02em;line-height:1.1}
        .kap-serif{font-family:'Frank Ruhl Libre',Georgia,serif}
        .kap-eyebrow{font-family:'Rubik',sans-serif;font-weight:700;letter-spacing:.14em}
        .kap-input:focus{border-color:${accent};box-shadow:0 0 0 3px ${accent}22}
        @keyframes kapIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .kap-step{animation:kapIn .35s ease both}
        @media (prefers-reduced-motion:reduce){.kap-step{animation:none}}`}</style>

      {/* ── full-bleed hero: sky banner (rooster + Jerusalem skyline slot in when present) ── */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(180deg,#dbeafe 0%,#e9f2ff 45%,rgba(255,255,255,0) 100%)' }}>
        <Asset src="/kaparot/pattern.png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none" />
        <Asset src="/kaparot/jerusalem.png" alt="" className="absolute bottom-0 inset-x-0 w-full object-contain opacity-70 pointer-events-none" style={{ maxHeight: '55%' }} />
        <div className="relative max-w-3xl mx-auto px-5 pt-4 pb-8">
          {/* logo + yechi */}
          <div className="flex items-start justify-between gap-4 mb-3">
            {logo ? <img src={logo} alt={org.name} className="h-10 md:h-12 w-auto object-contain" /> : <span className="kap-h text-lg" style={{ color: C.ink }}>{org.name}</span>}
            {yechi && <p className="text-[11px] md:text-xs font-semibold text-left leading-tight max-w-[190px]" style={{ color: C.muted }}>{yechi}</p>}
          </div>
          {/* rooster + title */}
          <div className="text-center">
            <Asset src="/kaparot/rooster.png" alt="" className="mx-auto mb-1 h-36 md:h-48 object-contain" style={{ filter: 'drop-shadow(0 14px 22px rgba(15,23,42,.22))' }} />
            <p className="kap-eyebrow text-xs mb-2" style={{ color: accent }}>פדיון כפרות · תשפ״ז</p>
            <h1 className="kap-serif text-5xl md:text-6xl" style={{ color: C.ink, fontWeight: 700, letterSpacing: '-.01em' }}>פדיון כפרות אונליין</h1>
            <Asset src="/kaparot/ornament.png" alt="" className="mx-auto mt-4 h-4 md:h-5 object-contain"
              fallback={<div className="mx-auto mt-4 h-1 w-16 rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />} />
          </div>
        </div>
      </section>

      <main className="max-w-2xl mx-auto px-5 pt-6 pb-14">
        {/* ── progress ── */}
        <div className="mb-8">
          <p className="text-center text-xs font-bold mb-3 kap-eyebrow" style={{ color: accent }}>
            שלב {step} מתוך {NUM_STEPS} · {STEP_LABELS[step - 1]}
          </p>
          <div className="flex items-center justify-center gap-1.5">
            {STEP_LABELS.map((label, i) => {
              const n = (i + 1) as 1 | 2 | 3 | 4
              const done = step > n, active = step === n
              const reached = n <= step   // clickable to jump back to steps already reached
              return (
                <div key={n} className="flex items-center gap-1.5">
                  <button type="button" onClick={() => reached && goStep(n)} disabled={!reached}
                    aria-label={`שלב ${n}: ${label}`}
                    className={`flex items-center gap-2 ${reached ? 'cursor-pointer' : 'cursor-default'}`}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                      style={done || active ? { background: accent, color: '#fff' } : { background: C.soft, color: C.muted }}>
                      {done ? <Check className="w-3.5 h-3.5" /> : n}
                    </div>
                    <span className="text-xs font-semibold hidden sm:inline" style={{ color: active ? C.ink : C.muted }}>{label}</span>
                  </button>
                  {n < NUM_STEPS && <div className="w-5 sm:w-7 h-0.5 rounded-full transition-colors" style={{ background: step > n ? accent : C.line }} />}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── STEP 1 — explanation ── */}
        {step === 1 && (
          <div className="kap-step">
            <div className="rounded-3xl p-6 md:p-8" style={cardStyle}>
              <h2 className="kap-h text-2xl text-center mb-1" style={{ color: C.ink }}>איך זה עובד?</h2>
              <p className="text-center text-sm mb-6" style={{ color: C.muted }}>שלושה צעדים פשוטים לפדיון הכפרות</p>
              <div className="space-y-3">
                {HOWTO.map((h, i) => {
                  const Icon = h.icon
                  return (
                    <div key={i} className="flex items-start gap-4 rounded-2xl p-4" style={{ background: C.soft }}>
                      <div className="flex-none w-12 h-12 rounded-2xl flex items-center justify-center relative" style={{ background: '#fff', color: accent, border: `1px solid ${C.line}` }}>
                        <Asset src={`/kaparot/${h.asset}`} alt="" className="w-8 h-8 object-contain" fallback={<Icon className="w-5 h-5" strokeWidth={2} />} />
                        <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center text-white" style={{ background: accent }}>{i + 1}</span>
                      </div>
                      <div>
                        <h3 className="kap-h text-base mb-0.5" style={{ color: C.ink }}>{h.title}</h3>
                        <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{h.text}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
              {cfg.intro_html && <div className="text-sm leading-relaxed mt-5 pt-5 border-t" style={{ color: C.muted, borderColor: C.line }} dangerouslySetInnerHTML={{ __html: cfg.intro_html }} />}
              <button type="button" onClick={() => goStep(2)} className={`${primaryBtn} mt-6`} style={primaryBtnStyle}>
                מתחילים בפדיון <ArrowLeft className="w-4 h-4" />
              </button>
              <p className="text-[11px] text-center mt-2.5 inline-flex items-center gap-1.5 w-full justify-center" style={{ color: C.muted }}>
                <ShieldCheck className="w-3.5 h-3.5" /> תשלום מאובטח · קבלה מוכרת למס (סעיף 46)
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 2 — souls, names, amount ── */}
        {step === 2 && (
          <div className="kap-step">
            <div className="rounded-3xl p-5 md:p-7" style={cardStyle}>
              <h2 className="kap-h text-2xl mb-1" style={{ color: C.ink }}>עבור מי עורכים את הפדיון?</h2>
              <p className="text-sm mb-5" style={{ color: C.muted }}>הזינו את מספר הנפשות והשמות — הסכום יחושב אוטומטית.</p>

              <label className="text-xs font-semibold block mb-1.5" style={{ color: C.muted }}>כמה נפשות?</label>
              <div className="flex items-center gap-3 mb-1">
                <button type="button" aria-label="הפחת" onClick={() => setCount(souls - 1)} className="w-11 h-11 rounded-xl text-2xl leading-none border disabled:opacity-30" style={{ borderColor: C.line, color: C.ink }} disabled={souls <= 1}>−</button>
                <div className="flex-1 text-center text-2xl font-bold tabular-nums rounded-xl py-2" style={{ background: C.soft, color: C.ink }}>{souls}</div>
                <button type="button" aria-label="הוסף" onClick={() => setCount(souls + 1)} disabled={souls >= maxSouls} className="w-11 h-11 rounded-xl text-2xl leading-none text-white transition-transform hover:scale-105 disabled:opacity-30" style={{ background: accent }}>+</button>
              </div>
              <p className="text-[11px] mb-5" style={{ color: C.muted }}>מינימום 1 · מקסימום {maxSouls}</p>

              <div className="space-y-2.5 mb-5">
                {names.map((nm, i) => (
                  <div key={i}>
                    <label className="text-xs font-semibold block mb-1" style={{ color: C.text }}>נפש {i + 1} — שם ושם האם</label>
                    <input ref={el => { nameRefs.current[i] = el }} value={nm} onChange={e => setNames(prev => prev.map((x, idx) => idx === i ? e.target.value : x))}
                      placeholder={i === 0 ? 'למשל: חנה בת רבקה' : 'שם ושם האם'}
                      className="kap-input w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none" style={{ borderColor: C.line }} />
                  </div>
                ))}
              </div>

              <div className="mb-5">
                <label className="block text-xs font-semibold mb-1" style={{ color: C.text }}>רוצים להוסיף עוד לצדקה? (אופציונלי)</label>
                <div className="relative">
                  <input type="number" inputMode="numeric" min={0} value={extra} onChange={e => setExtra(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="0" className="kap-input w-full rounded-xl border px-3.5 py-2.5 pl-8 text-sm outline-none" style={{ borderColor: C.line }} dir="ltr" />
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: C.muted }}>₪</span>
                </div>
              </div>

              <div className="flex items-end justify-between rounded-2xl px-4 py-3.5 mb-5" style={{ background: C.accentSoft }}>
                <div>
                  <div className="text-xs font-semibold" style={{ color: C.muted }}>סה״כ לפדיון</div>
                  <div className="text-[11px]" style={{ color: C.muted }}>{souls} × {ils(pricePerSoul)}{extraAmount > 0 ? ` + ${ils(extraAmount)} לצדקה` : ''}</div>
                </div>
                <span className="kap-h text-3xl" style={{ color: accent }}>{ils(total)}</span>
              </div>

              <button type="button" onClick={() => allNamesFilled && goStep(3)} disabled={!allNamesFilled}
                className={`${primaryBtn} disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed`} style={primaryBtnStyle}>
                המשך לנוסח הכפרות <ArrowLeft className="w-4 h-4" />
              </button>
              {!allNamesFilled && <p className="text-[11px] text-center mt-2" style={{ color: C.muted }}>יש למלא את שם כל הנפשות כדי להמשיך</p>}
              <button type="button" onClick={() => goStep(1)} className="mt-3 mx-auto flex items-center gap-1.5 text-sm font-semibold" style={{ color: C.muted }}>
                <ArrowRight className="w-4 h-4" /> חזרה
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3 — nusach + pay ── */}
        {step === 3 && (
          <div className="kap-step space-y-4">
            {/* summary */}
            <div className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: C.accentSoft }}>
              <span className="text-sm font-semibold" style={{ color: C.ink }}>{souls} נפשות · פדיון</span>
              <span className="kap-h text-2xl" style={{ color: accent }}>{ils(total)}</span>
            </div>

            <div className="rounded-3xl p-6 md:p-8" style={{ background: C.card, border: `1px solid ${C.line}`, borderTop: `3px solid ${accent}` }}>
              <h2 className="kap-h text-2xl text-center mb-1" style={{ color: C.ink }}>נוסח הכפרות</h2>
              <p className="text-center text-sm mb-5" style={{ color: C.muted }}>אוחזים את הכסף, ואומרים את הנוסח:</p>
              <p className="kap-serif text-xl md:text-2xl text-center" style={{ lineHeight: 1.95, color: C.ink }}>{NUSACH}</p>

              <div className="mt-6 rounded-2xl p-4" style={{ background: C.soft }}>
                <p className="text-sm font-semibold text-center mb-3" style={{ color: C.text }}>מסובבים את הכסף שלוש פעמים מעל הראש, ובכל סיבוב אומרים:</p>
                <p className="kap-serif text-2xl md:text-3xl text-center" style={{ color: C.ink, fontWeight: 700, lineHeight: 1.7 }}>&quot;{DECLARATION}&quot;</p>
                <p className="text-[11px] text-center mt-2" style={{ color: C.muted }}>כך שלוש פעמים לכל אחד מבני הבית</p>
              </div>
            </div>

            <button type="button" onClick={() => goStep(4)} className={primaryBtn} style={primaryBtnStyle}>
              אמרתי את הנוסח — להשלמת הפדיון <ArrowLeft className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => goStep(2)} className="mx-auto flex items-center gap-1.5 text-sm font-semibold" style={{ color: C.muted }}>
              <ArrowRight className="w-4 h-4" /> חזרה לשמות
            </button>
          </div>
        )}

        {/* ── STEP 4 — payment ── */}
        {step === 4 && (
          <div className="kap-step">
            <div className="rounded-3xl p-6 md:p-8 text-center" style={cardStyle}>
              <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: C.accentSoft, color: accent }}><Lock className="w-6 h-6" /></div>
              <h2 className="kap-h text-2xl mb-1" style={{ color: C.ink }}>כמעט סיימתם 🕊️</h2>
              <p className="text-sm mb-5" style={{ color: C.muted }}>נותר רק להעביר את הפדיון לצדקה בתשלום מאובטח.</p>

              <div className="rounded-2xl p-4 mb-5 text-right" style={{ background: C.soft }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm" style={{ color: C.muted }}>{souls} נפשות × {ils(pricePerSoul)}</span>
                  <span className="text-sm font-semibold" style={{ color: C.ink }}>{ils(souls * pricePerSoul)}</span>
                </div>
                {extraAmount > 0 && (
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm" style={{ color: C.muted }}>תוספת לצדקה</span>
                    <span className="text-sm font-semibold" style={{ color: C.ink }}>{ils(extraAmount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 mt-2 border-t" style={{ borderColor: C.line }}>
                  <span className="font-bold" style={{ color: C.ink }}>סה״כ לתשלום</span>
                  <span className="kap-h text-2xl" style={{ color: accent }}>{ils(total)}</span>
                </div>
              </div>

              <button type="button" onClick={() => setModalOpen(true)} className={primaryBtn} style={primaryBtnStyle}>
                <Lock className="w-4 h-4" /> לתשלום מאובטח
              </button>
              <p className="text-[11px] mt-2.5 inline-flex items-center gap-1.5 justify-center" style={{ color: C.muted }}>
                <ShieldCheck className="w-3.5 h-3.5" /> תשלום מאובטח · קבלה למס תישלח למייל
              </p>
              <button type="button" onClick={() => goStep(3)} className="mt-3 mx-auto flex items-center gap-1.5 text-sm font-semibold" style={{ color: C.muted }}>
                <ArrowRight className="w-4 h-4" /> חזרה לנוסח
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── FAQ (reference, always available) ── */}
      <section className="px-5 py-12" style={{ background: C.soft, borderTop: `1px solid ${C.line}` }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="kap-h text-xl md:text-2xl text-center mb-6" style={{ color: C.ink }}>שאלות נפוצות</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {FAQ.map((f, i) => {
              const Icon = f.icon
              return (
                <div key={i} className="rounded-2xl p-5" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                  <Icon className="w-6 h-6 mb-3" style={{ color: accent }} strokeWidth={2} />
                  <h3 className="kap-h text-base mb-1" style={{ color: C.ink }}>{f.q}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{f.a}</p>
                </div>
              )
            })}
          </div>
          {cfg.about_text && (
            <div className="max-w-2xl mx-auto text-center mt-10">
              <h2 className="kap-h text-xl mb-2" style={{ color: C.ink }}>אודות {org.name}</h2>
              <div className="text-sm leading-relaxed" style={{ color: C.muted }} dangerouslySetInnerHTML={{ __html: cfg.about_text }} />
            </div>
          )}
        </div>
      </section>
      <Asset src="/kaparot/jerusalem.png" alt="" className="w-full max-w-5xl mx-auto object-contain opacity-60 -mb-2" />
      <footer className="px-5 py-8 text-center text-xs" style={{ color: C.muted }}>מופעל באמצעות Kafool</footer>

      <DonationModal
        isOpen={modalOpen} onClose={() => setModalOpen(false)}
        presetAmount={total} presetCustomData={presetCustomData}
        donationUrl={donationUrl} paymentUrls={paymentUrls} paymentProvider={paymentProvider} nedarim={nedarim}
        campaign={{ id: campaign.id, title: campaign.title, slug: campaign.slug }}
        primaryColor={accent} buttonRadius={(s.button_radius as string) || 'rounded-2xl'} groups={[]} lang={initialLang}
        stripeEnabled={stripeEnabled} currencies={allowedCurrencies} defaultCurrency="ils" ilsRate={Number(s.stripe_ils_rate) || 3.7}
      />

      <WhatsAppFab phone={(s as { whatsapp_phone?: string }).whatsapp_phone} message={(s as { whatsapp_message?: string }).whatsapp_message} />
    </div>
  )
}
