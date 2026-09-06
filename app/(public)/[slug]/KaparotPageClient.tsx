'use client'

import { useMemo, useState } from 'react'
import DonationModal from './DonationModal'
import { Banknote, RefreshCw, HeartHandshake, Calendar, Coins, Users, Lock, ShieldCheck } from 'lucide-react'

// ── Design tokens (approved mockup) ──────────────────────────────────────────
const C = {
  bg: '#faf6ee', text: '#1c2340', gold: '#b4882c', goldSoft: '#d4af5f', goldLight: '#f3e7c8',
  border: '#e7e0d2', muted: '#6f6a5c', card: '#ffffff', parch1: '#f7efdf', parch2: '#efe3c8',
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
  { icon: Banknote, text: 'אוחזים את הכסף ואומרים את פסוקי הכפרות.' },
  { icon: RefreshCw, text: 'מסובבים שלוש פעמים מעל הראש ואומרים:' },
  { icon: HeartHandshake, text: 'מעבירים לצדקה — משלימים בטופס.' },
]
const FAQ = [
  { icon: Calendar, q: 'מתי עורכים כפרות?', a: 'בעשרת ימי תשובה, ורבים עורכים בערב יום הכיפורים.' },
  { icon: Coins, q: 'כמה תורמים לנפש?', a: 'כערך תרנגול. הסכום נקבע ע״י בית חב״ד, וכל המוסיף — מוסיפים לו.' },
  { icon: Users, q: 'האם עורכים עבור כל המשפחה?', a: 'כן. הורה מסובב עבור ילדיו ונעדרים, בלשון המתאימה.' },
]

export default function KaparotPageClient({ org, campaign, initialLang, donationUrl, paymentUrls, paymentProvider, nedarim }: Props) {
  const s = campaign.settings || {}
  const cfg: KaparotCfg = s.kaparot || {}
  const primary = s.primary_color || C.gold
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

  // ── Form card (shared between the hero and mobile) ─────────────────────────
  const FormCard = (
    <div className="rounded-xl shadow-xl p-5 md:p-6" style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <h2 className="kap-h text-xl font-black text-center mb-1">ערכו את פדיון הכפרות שלכם</h2>
      <p className="text-sm text-center mb-4" style={{ color: C.muted }}>כמה נפשות במשפחה?</p>

      <div className="flex items-center justify-center gap-4 mb-1">
        <button type="button" onClick={() => setCount(souls - 1)} className="w-11 h-11 rounded-lg text-2xl leading-none text-white" style={{ background: C.gold }}>−</button>
        <span className="w-16 text-center text-3xl font-black tabular-nums rounded-lg py-1" style={{ background: C.bg, color: C.text }}>{souls}</span>
        <button type="button" onClick={() => setCount(souls + 1)} disabled={souls >= maxSouls} className="w-11 h-11 rounded-lg text-2xl leading-none text-white disabled:opacity-40" style={{ background: C.gold }}>+</button>
      </div>
      <p className="text-[11px] text-center mb-4" style={{ color: C.muted }}>(מינימום 1 · מקסימום {maxSouls})</p>

      <div className="space-y-3 mb-4">
        {names.map((nm, i) => (
          <div key={i}>
            <label className="text-xs font-bold block mb-1"><span style={{ color: C.gold }}>נפש {i + 1}:</span> שם ושם האם</label>
            <input value={nm} onChange={e => setNames(prev => prev.map((x, idx) => idx === i ? e.target.value : x))}
              placeholder={i === 0 ? 'למשל: חנה בת רבקה' : 'שם ושם האם'} className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none" style={{ borderColor: C.border }} />
          </div>
        ))}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-bold mb-1.5">הוספת סכום לצדקה (אופציונלי)</label>
        <div className="relative">
          <input type="number" inputMode="numeric" min={0} value={extra} onChange={e => setExtra(e.target.value.replace(/[^\d]/g, ''))}
            placeholder="0" className="w-full rounded-lg border px-3 py-2.5 pl-8 text-sm outline-none" style={{ borderColor: C.border }} dir="ltr" />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: C.muted }}>₪</span>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg px-4 py-3 mb-3" style={{ background: C.goldLight }}>
        <span className="font-bold">סה״כ לתשלום</span>
        <div className="text-left">
          <span className="kap-h text-3xl font-black" style={{ color: C.gold }}>{ils(total)}</span>
          <div className="text-[11px]" style={{ color: C.muted }}>{ils(pricePerSoul)} לנפש{extraAmount > 0 ? ` + ${ils(extraAmount)}` : ''}</div>
        </div>
      </div>
      <p className="text-[11px] text-center mb-4" style={{ color: C.muted }}>המוסיפים על סכום הפדיון כפי נדבת לבם — תבוא עליהם ברכה</p>

      <button type="button" onClick={() => setModalOpen(true)} className="w-full inline-flex items-center justify-center gap-2 rounded-lg py-3.5 text-white font-bold shadow-lg" style={{ background: C.gold }}>
        <Lock className="w-4 h-4" /> המשך לתשלום מאובטח
      </button>
      <p className="text-[11px] text-center mt-2" style={{ color: C.muted }}>תשלום מאובטח בכרטיס אשראי · קבלה מוכרת למס תישלח למייל</p>
    </div>
  )

  return (
    <div dir={initialLang === 'en' ? 'ltr' : 'rtl'} style={{ background: C.bg, color: C.text, minHeight: '100vh', fontFamily: "'Heebo', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700;900&family=Heebo:wght@400;500;700&display=swap');
        .kap-h{font-family:'Frank Ruhl Libre',Georgia,serif}
        .kap-serif{font-family:'Frank Ruhl Libre',Georgia,serif}
        .kap-script{font-family:'Frank Ruhl Libre',Georgia,serif;font-style:italic}`}</style>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        {heroImg
          ? <img src={heroImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
          : <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${C.goldLight}, ${C.bg} 60%, ${C.parch2})` }} />}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(250,246,238,.55), rgba(250,246,238,.15))' }} />

        <div className="relative max-w-6xl mx-auto px-5 py-6">
          {/* top row */}
          <div className="flex items-start justify-between gap-4 mb-6">
            {logo ? <img src={logo} alt={org.name} className="h-14 w-auto object-contain" /> : <span className="font-black text-lg">{org.name}</span>}
            {yechi && <p className="text-xs md:text-sm font-bold text-left leading-snug max-w-[200px]" style={{ color: C.text }}>{yechi}</p>}
          </div>

          <div className="grid md:grid-cols-2 gap-6 items-start pb-4">
            {/* Form (left on desktop, first on mobile) */}
            <div className="order-1 md:order-1">{FormCard}</div>

            {/* Info (right) */}
            <div className="order-2 md:order-2 md:pt-4">
              <p className="text-sm font-bold tracking-wide mb-1" style={{ color: C.gold }}>תשפ״ז · 2026</p>
              <h1 className="kap-h text-5xl md:text-6xl font-black leading-none">פדיון כפרות</h1>
              <div className="w-20 h-1 rounded my-4" style={{ background: C.gold }} />
              <p className="text-lg leading-relaxed font-semibold mb-4">לקראת יום הכיפורים נוהגים לערוך כפרות לכל אחד ואחת מבני הבית.</p>

              <div className="rounded-xl p-4 md:p-5" style={{ background: 'rgba(255,255,255,.75)', border: `1px solid ${C.border}` }}>
                <div className="text-sm leading-relaxed" style={{ color: C.muted }}>
                  {cfg.intro_html ? <div dangerouslySetInnerHTML={{ __html: cfg.intro_html }} /> : <p>{DEFAULT_INTRO}</p>}
                </div>
                <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: C.text }}>
                  <ShieldCheck className="w-4 h-4" style={{ color: C.gold }} /> התרומה מוכרת לצרכי מס (סעיף 46)
                </p>
              </div>

              <p className="kap-script text-2xl mt-5 text-center md:text-right" style={{ color: C.goldSoft }}>זכות לצדקה · זכות לחיים טובים</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3-STEP ORDER ── */}
      <section className="px-5 py-12" style={{ background: C.card, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="kap-h text-2xl md:text-3xl font-black text-center mb-8">סדר כפרות על כסף — בשלושה שלבים</h2>
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <div key={i} className="text-center">
                  <div className="mx-auto w-9 h-9 rounded-full flex items-center justify-center text-white font-black mb-2" style={{ background: C.gold }}>{i + 1}</div>
                  <Icon className="w-8 h-8 mx-auto mb-2" style={{ color: C.gold }} strokeWidth={1.5} />
                  <p className="text-sm leading-relaxed" style={{ color: C.text }}>{step.text}</p>
                </div>
              )
            })}
          </div>
          <div className="kap-serif rounded-xl border p-4 text-center text-base leading-relaxed max-w-2xl mx-auto" style={{ borderColor: C.gold, background: C.bg }}>
            &quot;{DECLARATION}&quot;
            <div className="text-xs mt-2" style={{ color: C.muted }}>כך שלוש פעמים לכל אחד מבני הבית.</div>
          </div>
        </div>
      </section>

      {/* ── FULL NUSACH (parchment) ── */}
      <section className="px-5 py-12">
        <div className="max-w-3xl mx-auto">
          <h2 className="kap-h text-2xl md:text-3xl font-black text-center mb-5">נוסח הכפרות המלא</h2>
          <div className="relative rounded-2xl border p-6 md:p-8" style={{ borderColor: C.border, background: `linear-gradient(180deg, ${C.parch1}, ${C.parch2})` }}>
            <span className="absolute top-2 right-3 text-2xl" style={{ color: C.goldSoft }}>❦</span>
            <span className="absolute bottom-2 left-3 text-2xl" style={{ color: C.goldSoft }}>❦</span>
            <p className="kap-serif text-lg md:text-xl leading-loose text-center">{NUSACH}</p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-5 py-12" style={{ background: C.card, borderTop: `1px solid ${C.border}` }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="kap-h text-2xl md:text-3xl font-black text-center mb-6">שאלות נפוצות</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {FAQ.map((f, i) => {
              const Icon = f.icon
              return (
                <div key={i} className="rounded-xl border p-4 text-center" style={{ borderColor: C.border, background: C.bg }}>
                  <Icon className="w-7 h-7 mx-auto mb-2" style={{ color: C.gold }} strokeWidth={1.5} />
                  <p className="font-bold mb-1">{f.q}</p>
                  <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{f.a}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      {cfg.about_text && (
        <section className="px-5 py-12" style={{ borderTop: `1px solid ${C.border}` }}>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="kap-h text-2xl font-black mb-3">אודות {org.name}</h2>
            <div className="text-sm leading-relaxed" style={{ color: C.muted }} dangerouslySetInnerHTML={{ __html: cfg.about_text }} />
          </div>
        </section>
      )}
      <footer className="px-5 py-6 text-center text-xs flex items-center justify-center gap-1.5" style={{ color: C.muted }}>מופעל באמצעות Kafool <span style={{ color: '#e11d48' }}>♥</span></footer>

      <DonationModal
        isOpen={modalOpen} onClose={() => setModalOpen(false)}
        presetAmount={total} presetCustomData={presetCustomData}
        donationUrl={donationUrl} paymentUrls={paymentUrls} paymentProvider={paymentProvider} nedarim={nedarim}
        campaign={{ id: campaign.id, title: campaign.title, slug: campaign.slug }}
        primaryColor={primary} buttonRadius={(s.button_radius as string) || 'rounded'} groups={[]} lang={initialLang}
        stripeEnabled={stripeEnabled} currencies={allowedCurrencies} defaultCurrency="ils" ilsRate={Number(s.stripe_ils_rate) || 3.7}
      />
    </div>
  )
}
