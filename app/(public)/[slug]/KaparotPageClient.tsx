'use client'

import { useMemo, useState } from 'react'
import DonationModal from './DonationModal'
import { Banknote, BookOpen, HeartHandshake, Calendar, Coins, Users, Lock, ShieldCheck, Check } from 'lucide-react'

// ── Design tokens — modern & clean: white ground, one confident blue accent,
//    generous whitespace, flat surfaces. Feels like a fast, trustworthy
//    donation flow. Prayer passages keep a serif for gravitas.
const C = {
  bg: '#ffffff', soft: '#f4f6fb', ink: '#0f172a', text: '#334155', muted: '#64748b',
  line: '#e6e9f1', card: '#ffffff', accentSoft: '#eef4ff',
}

interface KaparotCfg {
  price_per_soul?: number; max_souls?: number; intro_html?: string
  chabad_logo_url?: string; about_text?: string; hero_image_url?: string; hero_declaration?: string
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
const DEFAULT_INTRO = 'לקראת יום הכיפורים נוהגים לערוך כפרות לכל אחד ואחת מבני הבית. במקום תרנגול, מקובל כיום לקיים את הסדר על מעות המיועדות לצדקה. בעמוד זה עורכים את הפדיון בכמה רגעים, והכסף מוקדש לפעילות בית חב״ד ולסיוע למשפחות הזקוקות לכך לקראת החג.'
const DEFAULT_YECHI = 'יחי אדוננו מורנו ורבינו מלך המשיח לעולם ועד'
const NUSACH = 'בְּנֵי אָדָם יוֹשְׁבֵי חשֶׁךְ וְצַלְמָוֶת אֲסִירֵי עֳנִי וּבַרְזֶל: יוֹצִיאֵם מֵחשֶׁךְ וְצַלְמָוֶת וּמוֹסְרוֹתֵיהֶם יְנַתֵּק: אֱוִילִים מִדֶּרֶךְ פִּשְׁעָם וּמֵעֲוֹנֹתֵיהֶם יִתְעַנּוּ: כָּל אֹכֶל תְּתַעֵב נַפְשָׁם וַיַּגִּיעוּ עַד שַׁעֲרֵי מָוֶת: וַיִּזְעֲקוּ אֶל אַ-דֹנָי בַּצַּר לָהֶם מִמְּצוּקוֹתֵיהֶם יוֹשִׁיעֵם: יִשְׁלַח דְּבָרוֹ וְיִרְפָּאֵם וִימַלֵּט מִשְּׁחִיתוֹתָם: יוֹדוּ לַ־דֹנָי חַסְדּוֹ וְנִפְלְאוֹתָיו לִבְנֵי אָדָם: אִם יֵשׁ עָלָיו מַלְאָךְ מֵלִיץ אֶחָד מִנִּי אָלֶף. לְהַגִּיד לְאָדָם יָשְׁרוֹ: יְחֻנֶּנּוּ וַיֹּאמֶר פְּדָעֵהוּ מֵרֶדֶת שַׁחַת מָצָאתִי כֹפֶר:'
const DECLARATION = 'זֶה חֲלִיפָתִי. זֶה תְּמוּרָתִי. זֶה כַּפָּרָתִי. זֶה הַכֶּסֶף יֵלֵךְ לִצְדָקָה, וַאֲנִי אֵלֵךְ לְחַיִּים טוֹבִים אֲרוּכִים וּלְשָׁלוֹם'
const STEPS = [
  { icon: Banknote, title: 'לוקחים מזומן', text: 'לוקחים כסף מזומן ועושים עליו את פדיון הכפרות, ותורמים את הסכום כנגדו לצדקה בטופס שלמעלה.' },
  { icon: BookOpen, title: 'אומרים את הנוסח', text: 'אומרים את נוסח הכפרות המופיע למטה, ותוך כדי אומרים: "זה חליפתי, זה תמורתי, זה כפרתי…".' },
  { icon: HeartHandshake, title: 'מעבירים לצדקה', text: 'משלימים את הפדיון בתשלום מאובטח — והכסף מגיע ישירות לצדקה.' },
]
const FAQ = [
  { icon: Calendar, q: 'מתי עורכים כפרות?', a: 'בעשרת ימי תשובה, ורבים עורכים בערב יום הכיפורים.' },
  { icon: Coins, q: 'כמה תורמים לנפש?', a: 'כערך תרנגול. הסכום נקבע ע״י בית חב״ד, וכל המוסיף — מוסיפים לו.' },
  { icon: Users, q: 'עורכים עבור כל המשפחה?', a: 'כן. הורה מסובב עבור ילדיו ונעדרים, בלשון המתאימה.' },
]

export default function KaparotPageClient({ org, campaign, initialLang, donationUrl, paymentUrls, paymentProvider, nedarim }: Props) {
  const s = campaign.settings || {}
  const cfg: KaparotCfg = s.kaparot || {}
  const accent = s.primary_color || '#2563eb'
  const pricePerSoul = Number(cfg.price_per_soul) > 0 ? Number(cfg.price_per_soul) : 50
  const maxSouls = Number(cfg.max_souls) > 0 ? Number(cfg.max_souls) : 20
  const logo = cfg.chabad_logo_url || org.logo_url || ''
  const heroImg = cfg.hero_image_url || campaign.cover_image_url || ''
  const yechi = cfg.hero_declaration === '' ? '' : (cfg.hero_declaration || DEFAULT_YECHI)

  const [souls, setSouls] = useState(1)
  const [names, setNames] = useState<string[]>([''])
  const [extra, setExtra] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const setCount = (n: number) => {
    const c = Math.max(1, Math.min(maxSouls, n))
    setSouls(c)
    setNames(prev => { const next = prev.slice(0, c); while (next.length < c) next.push(''); return next })
  }
  const extraAmount = Math.max(0, Number(extra) || 0)
  const total = souls * pricePerSoul + extraAmount

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

  // ── Order card — the centerpiece ───────────────────────────────────────────
  const FormCard = (
    <div className="rounded-3xl p-5 md:p-6" style={{ background: C.card, border: `1px solid ${C.line}`, boxShadow: '0 12px 40px -12px rgba(15,23,42,.18)' }}>
      <h2 className="kap-h text-xl mb-4" style={{ color: C.ink }}>עריכת פדיון הכפרות</h2>

      <label className="text-xs font-semibold block mb-1.5" style={{ color: C.muted }}>כמה נפשות במשפחה?</label>
      <div className="flex items-center gap-3 mb-1">
        <button type="button" aria-label="הפחת" onClick={() => setCount(souls - 1)} className="w-11 h-11 rounded-xl text-2xl leading-none border transition-colors disabled:opacity-30" style={{ borderColor: C.line, color: C.ink }} disabled={souls <= 1}>−</button>
        <div className="flex-1 text-center text-2xl font-bold tabular-nums rounded-xl py-2" style={{ background: C.soft, color: C.ink }}>{souls}</div>
        <button type="button" aria-label="הוסף" onClick={() => setCount(souls + 1)} disabled={souls >= maxSouls} className="w-11 h-11 rounded-xl text-2xl leading-none text-white transition-transform hover:scale-105 disabled:opacity-30" style={{ background: accent }}>+</button>
      </div>
      <p className="text-[11px] mb-4" style={{ color: C.muted }}>מינימום 1 · מקסימום {maxSouls}</p>

      <div className="space-y-2.5 mb-4">
        {names.map((nm, i) => (
          <div key={i}>
            <label className="text-xs font-semibold block mb-1" style={{ color: C.text }}>נפש {i + 1} — שם ושם האם</label>
            <input value={nm} onChange={e => setNames(prev => prev.map((x, idx) => idx === i ? e.target.value : x))}
              placeholder={i === 0 ? 'למשל: חנה בת רבקה' : 'שם ושם האם'}
              className="kap-input w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none" style={{ borderColor: C.line }} />
          </div>
        ))}
      </div>

      <div className="mb-5">
        <label className="block text-xs font-semibold mb-1" style={{ color: C.text }}>הוספת סכום לצדקה (אופציונלי)</label>
        <div className="relative">
          <input type="number" inputMode="numeric" min={0} value={extra} onChange={e => setExtra(e.target.value.replace(/[^\d]/g, ''))}
            placeholder="0" className="kap-input w-full rounded-xl border px-3.5 py-2.5 pl-8 text-sm outline-none" style={{ borderColor: C.line }} dir="ltr" />
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: C.muted }}>₪</span>
        </div>
      </div>

      <div className="flex items-end justify-between rounded-2xl px-4 py-3.5 mb-4" style={{ background: C.accentSoft }}>
        <div>
          <div className="text-xs font-semibold" style={{ color: C.muted }}>סה״כ לתשלום</div>
          <div className="text-[11px]" style={{ color: C.muted }}>{ils(pricePerSoul)} לנפש{extraAmount > 0 ? ` + ${ils(extraAmount)} לצדקה` : ''}</div>
        </div>
        <span className="kap-h text-3xl" style={{ color: accent }}>{ils(total)}</span>
      </div>

      <button type="button" onClick={() => setModalOpen(true)}
        className="w-full inline-flex items-center justify-center gap-2 rounded-2xl py-4 text-white font-bold text-base transition-transform hover:scale-[1.01]"
        style={{ background: accent, boxShadow: `0 10px 24px -8px ${accent}80` }}>
        <Lock className="w-4 h-4" /> לתשלום מאובטח
      </button>
      <p className="text-[11px] text-center mt-2.5 inline-flex items-center gap-1.5 w-full justify-center" style={{ color: C.muted }}>
        <ShieldCheck className="w-3.5 h-3.5" /> תשלום מאובטח · קבלה מוכרת למס (סעיף 46) תישלח למייל
      </p>
    </div>
  )

  return (
    <div dir={initialLang === 'en' ? 'ltr' : 'rtl'} style={{ background: C.bg, color: C.text, minHeight: '100vh', fontFamily: "'Assistant', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@500;600;700;800&family=Assistant:wght@400;500;600;700&family=Frank+Ruhl+Libre:wght@500;700&display=swap');
        .kap-h{font-family:'Rubik','Assistant',sans-serif;font-weight:700;letter-spacing:-.02em;line-height:1.1}
        .kap-serif{font-family:'Frank Ruhl Libre',Georgia,serif}
        .kap-eyebrow{font-family:'Rubik',sans-serif;font-weight:700;letter-spacing:.14em}
        .kap-input:focus{border-color:${accent};box-shadow:0 0 0 3px ${accent}22}`}</style>

      {/* ── HERO ── */}
      <header className="border-b" style={{ borderColor: C.line }}>
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          {logo ? <img src={logo} alt={org.name} className="h-9 md:h-10 w-auto object-contain" /> : <span className="kap-h text-lg" style={{ color: C.ink }}>{org.name}</span>}
          {yechi && <p className="text-[11px] md:text-xs font-semibold text-left leading-tight max-w-[190px]" style={{ color: C.muted }}>{yechi}</p>}
        </div>
      </header>

      <section className="px-5 pt-10 md:pt-14 pb-10">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Info */}
          <div className="order-2 md:order-1 text-center md:text-right">
            <p className="kap-eyebrow text-xs mb-3" style={{ color: accent }}>פדיון כפרות · תשפ״ז</p>
            <h1 className="kap-h text-5xl md:text-6xl mb-4" style={{ color: C.ink }}>פדיון כפרות<br />בכמה רגעים</h1>
            <p className="text-lg leading-relaxed mb-6 max-w-md mx-auto md:mx-0" style={{ color: C.muted }}>
              {cfg.intro_html ? '' : 'עורכים את הסדר על מעות לצדקה — לכל בני הבית, אונליין, בתשלום מאובטח.'}
            </p>
            {cfg.intro_html && <div className="text-base leading-relaxed mb-6 max-w-md mx-auto md:mx-0" style={{ color: C.muted }} dangerouslySetInnerHTML={{ __html: cfg.intro_html }} />}

            <div className="flex flex-wrap gap-x-5 gap-y-2 justify-center md:justify-start text-sm font-semibold" style={{ color: C.text }}>
              <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4" style={{ color: accent }} /> אונליין ומהיר</span>
              <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4" style={{ color: accent }} /> תשלום מאובטח</span>
              <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4" style={{ color: accent }} /> קבלה למס</span>
            </div>
          </div>

          {/* Order card */}
          <div className="order-1 md:order-2">{FormCard}</div>
        </div>
      </section>

      {/* ── 3 STEPS ── */}
      <section className="px-5 py-14" style={{ background: C.soft }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="kap-h text-2xl md:text-3xl text-center mb-10" style={{ color: C.ink }}>סדר כפרות על כסף — בשלושה שלבים</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <div key={i} className="text-center md:text-right">
                  <div className="flex items-center gap-3 justify-center md:justify-start mb-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: C.accentSoft, color: accent }}><Icon className="w-5 h-5" strokeWidth={2} /></div>
                    <span className="kap-h text-sm" style={{ color: accent }}>שלב {i + 1}</span>
                  </div>
                  <h3 className="kap-h text-lg mb-1.5" style={{ color: C.ink }}>{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{step.text}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── NUSACH + declaration ── */}
      <section className="px-5 py-14">
        <div className="max-w-3xl mx-auto">
          <h2 className="kap-h text-2xl md:text-3xl text-center mb-6" style={{ color: C.ink }}>נוסח הכפרות</h2>
          <div className="rounded-3xl p-6 md:p-10" style={{ background: C.card, border: `1px solid ${C.line}`, borderTop: `3px solid ${accent}` }}>
            <p className="kap-serif text-2xl md:text-[2rem] text-center" style={{ lineHeight: 2, color: C.ink }}>{NUSACH}</p>
          </div>

          <p className="text-center text-sm md:text-base font-semibold mt-8 mb-3 max-w-2xl mx-auto" style={{ color: C.text }}>
            לוקחים את הכסף ומסובבים אותו שלוש פעמים מעל הראש, ובכל סיבוב אומרים:
          </p>
          <div className="kap-serif rounded-2xl p-5 text-center text-lg leading-relaxed max-w-2xl mx-auto" style={{ background: C.accentSoft, color: C.ink }}>
            &quot;{DECLARATION}&quot;
            <div className="text-xs mt-2 kap-h" style={{ color: C.muted }}>כך שלוש פעמים לכל אחד מבני הבית</div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-5 py-14" style={{ background: C.soft }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="kap-h text-2xl md:text-3xl text-center mb-8" style={{ color: C.ink }}>שאלות נפוצות</h2>
          <div className="grid md:grid-cols-3 gap-4">
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
        </div>
      </section>

      {/* ── ABOUT ── */}
      {cfg.about_text && (
        <section className="px-5 py-14">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="kap-h text-2xl mb-3" style={{ color: C.ink }}>אודות {org.name}</h2>
            <div className="text-base leading-relaxed" style={{ color: C.muted }} dangerouslySetInnerHTML={{ __html: cfg.about_text }} />
          </div>
        </section>
      )}
      {heroImg && (
        <div className="max-w-5xl mx-auto px-5 pb-4">
          <img src={heroImg} alt="" className="w-full rounded-3xl object-cover" style={{ maxHeight: 320, border: `1px solid ${C.line}` }} />
        </div>
      )}
      <footer className="px-5 py-8 text-center text-xs" style={{ color: C.muted, borderTop: `1px solid ${C.line}` }}>מופעל באמצעות Kafool</footer>

      <DonationModal
        isOpen={modalOpen} onClose={() => setModalOpen(false)}
        presetAmount={total} presetCustomData={presetCustomData}
        donationUrl={donationUrl} paymentUrls={paymentUrls} paymentProvider={paymentProvider} nedarim={nedarim}
        campaign={{ id: campaign.id, title: campaign.title, slug: campaign.slug }}
        primaryColor={accent} buttonRadius={(s.button_radius as string) || 'rounded-2xl'} groups={[]} lang={initialLang}
        stripeEnabled={stripeEnabled} currencies={allowedCurrencies} defaultCurrency="ils" ilsRate={Number(s.stripe_ils_rate) || 3.7}
      />
    </div>
  )
}
