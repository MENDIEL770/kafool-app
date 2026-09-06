'use client'

import { useMemo, useState } from 'react'
import DonationModal from './DonationModal'

// ── Design tokens (approved mockup) ──────────────────────────────────────────
const C = {
  bg: '#faf6ee', text: '#1c2340', gold: '#b4882c', goldLight: '#f3e7c8',
  border: '#e7e0d2', muted: '#6f6a5c', card: '#ffffff',
}

interface KaparotCfg {
  price_per_soul?: number
  max_souls?: number
  intro_html?: string
  chabad_logo_url?: string
  about_text?: string
}
interface Campaign {
  id: string; title: string; slug: string
  cover_image_url?: string | null
  settings: Record<string, unknown> & { kaparot?: KaparotCfg; primary_color?: string; button_radius?: string; stripe_enabled?: boolean; allowed_currencies?: string[]; stripe_ils_rate?: number }
}
interface Org { id: string; name: string; logo_url?: string | null }

interface Props {
  org: Org
  campaign: Campaign
  initialLang?: 'he' | 'en'
  donationUrl: string
  paymentUrls: { one_time: string; hok: string; bit: string; bank: string; one_time_en?: string; hok_en?: string }
  paymentProvider: string
  nedarim: { mosad: string; apiValid: string; active: boolean } | null
}

const ils = (n: number) => '₪' + Math.round(n).toLocaleString('he-IL')

const DEFAULT_INTRO = 'לקראת יום הכיפורים נוהגים לערוך כפרות לכל אחד ואחת מבני הבית. במקום תרנגול, מקובל כיום לקיים את הסדר על מעות המיועדות לצדקה. בעמוד זה עורכים את הפדיון בכמה רגעים, והכסף מוקדש לפעילות בית חב״ד ולסיוע למשפחות הזקוקות לכך לקראת החג.'

const NUSACH = 'בְּנֵי אָדָם יוֹשְׁבֵי חשֶׁךְ וְצַלְמָוֶת אֲסִירֵי עֳנִי וּבַרְזֶל: יוֹצִיאֵם מֵחשֶׁךְ וְצַלְמָוֶת וּמוֹסְרוֹתֵיהֶם יְנַתֵּק: אֱוִילִים מִדֶּרֶךְ פִּשְׁעָם וּמֵעֲוֹנֹתֵיהֶם יִתְעַנּוּ: כָּל אֹכֶל תְּתַעֵב נַפְשָׁם וַיַּגִּיעוּ עַד שַׁעֲרֵי מָוֶת: וַיִּזְעֲקוּ אֶל אַ-דֹנָי בַּצַּר לָהֶם מִמְּצוּקוֹתֵיהֶם יוֹשִׁיעֵם: יִשְׁלַח דְּבָרוֹ וְיִרְפָּאֵם וִימַלֵּט מִשְּׁחִיתוֹתָם: יוֹדוּ לַ־דֹנָי חַסְדּוֹ וְנִפְלְאוֹתָיו לִבְנֵי אָדָם: אִם יֵשׁ עָלָיו מַלְאָךְ מֵלִיץ אֶחָד מִנִּי אָלֶף. לְהַגִּיד לְאָדָם יָשְׁרוֹ: יְחֻנֶּנּוּ וַיֹּאמֶר פְּדָעֵהוּ מֵרֶדֶת שַׁחַת מָצָאתִי כֹפֶר:'

const DECLARATION = 'זֶה חֲלִיפָתִי. זֶה תְּמוּרָתִי. זֶה כַּפָּרָתִי. זֶה הַכֶּסֶף יֵלֵךְ לִצְדָקָה, וַאֲנִי אֵלֵךְ לְחַיִּים טוֹבִים אֲרוּכִים וּלְשָׁלוֹם'

const FAQ = [
  { q: 'מתי עורכים את הכפרות?', a: 'בעשרת ימי תשובה, ורבים נוהגים לערוך זאת בערב יום הכיפורים.' },
  { q: 'כמה נותנים עבור כל נפש?', a: 'כערך תרנגול. הסכום נקבע על ידי בית חב״ד, וכל המוסיף — מוסיפים לו ברכה.' },
  { q: 'האם אפשר לערוך עבור כל המשפחה?', a: 'כן. הורה יכול לסובב ולומר עבור ילדיו ועבור בני משפחה שאינם נוכחים, בלשון המתאימה לכל אחד.' },
]

export default function KaparotPageClient({ org, campaign, initialLang, donationUrl, paymentUrls, paymentProvider, nedarim }: Props) {
  const s = campaign.settings || {}
  const cfg: KaparotCfg = s.kaparot || {}
  const primary = s.primary_color || C.gold
  const pricePerSoul = Number(cfg.price_per_soul) > 0 ? Number(cfg.price_per_soul) : 50
  const maxSouls = Number(cfg.max_souls) > 0 ? Number(cfg.max_souls) : 20
  const logo = cfg.chabad_logo_url || org.logo_url || ''

  const [souls, setSouls] = useState(1)
  const [names, setNames] = useState<string[]>([''])
  const [modalOpen, setModalOpen] = useState(false)

  const setCount = (n: number) => {
    const c = Math.max(1, Math.min(maxSouls, n))
    setSouls(c)
    setNames(prev => { const next = prev.slice(0, c); while (next.length < c) next.push(''); return next })
  }
  const total = souls * pricePerSoul

  const presetCustomData = useMemo(() => ({
    'מספר נפשות': String(souls),
    'שמות הנפשות': names.map((nm, i) => nm.trim() || `נפש ${i + 1}`).join(' · '),
  }), [souls, names])

  const stripeEnabled = s.stripe_enabled === true
  const allowedCurrencies = Array.isArray(s.allowed_currencies) ? s.allowed_currencies : ['ils']

  return (
    <div dir={initialLang === 'en' ? 'ltr' : 'rtl'} style={{ background: C.bg, color: C.text, minHeight: '100vh', fontFamily: "'Heebo', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700;900&family=Heebo:wght@400;500;700&display=swap');
        .kap-h{font-family:'Frank Ruhl Libre',Georgia,serif}
        .kap-serif{font-family:'Frank Ruhl Libre',Georgia,serif}`}</style>

      {/* Header */}
      <header className="px-5 py-4 border-b" style={{ borderColor: C.border, background: C.card }}>
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          {logo && <img src={logo} alt={org.name} className="h-11 w-auto object-contain" />}
          <span className="font-bold text-sm" style={{ color: C.text }}>{org.name}</span>
        </div>
      </header>

      {/* Hero + form (2-col on desktop) */}
      <section className="px-5 py-8 md:py-12">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 items-start">
          {/* Info */}
          <div className="order-2 md:order-1">
            <p className="text-xs font-bold tracking-wide mb-2" style={{ color: C.gold }}>תשפ״ז · 2026</p>
            <h1 className="kap-h text-4xl md:text-5xl font-black leading-tight">{campaign.title || 'פדיון כפרות'}</h1>
            <div className="w-16 h-1 rounded my-4" style={{ background: C.gold }} />
            <div className="text-base leading-relaxed" style={{ color: C.muted }}>
              {cfg.intro_html
                ? <div dangerouslySetInnerHTML={{ __html: cfg.intro_html }} />
                : <p>{DEFAULT_INTRO}</p>}
            </div>
            <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: C.text }}>
              <span style={{ color: C.gold }}>✓</span> התרומה מוכרת לצרכי מס (סעיף 46)
            </p>
          </div>

          {/* Form card */}
          <div className="order-1 md:order-2 rounded-lg border shadow-sm p-5 md:p-6" style={{ background: C.card, borderColor: C.border, borderRadius: 6 }}>
            <div className="flex items-baseline justify-between mb-4">
              <span className="text-sm font-semibold" style={{ color: C.muted }}>מחיר לנפש</span>
              <span className="kap-h text-2xl font-black" style={{ color: C.gold }}>{ils(pricePerSoul)}</span>
            </div>

            <label className="block text-sm font-bold mb-2">מספר הנפשות במשפחה</label>
            <div className="flex items-center gap-3 mb-4">
              <button type="button" onClick={() => setCount(souls - 1)} className="w-11 h-11 rounded-lg border text-2xl leading-none" style={{ borderColor: C.border }}>−</button>
              <span className="w-12 text-center text-2xl font-black tabular-nums">{souls}</span>
              <button type="button" onClick={() => setCount(souls + 1)} disabled={souls >= maxSouls} className="w-11 h-11 rounded-lg text-2xl leading-none text-white disabled:opacity-40" style={{ background: C.gold }}>+</button>
            </div>

            <div className="space-y-2 mb-4">
              {names.map((nm, i) => (
                <input
                  key={i}
                  value={nm}
                  onChange={e => setNames(prev => prev.map((x, idx) => idx === i ? e.target.value : x))}
                  placeholder={`נפש ${i + 1}: שם ושם האם (למשל: חנה בת רבקה)`}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                  style={{ borderColor: C.border }}
                />
              ))}
            </div>

            <div className="flex items-center justify-between py-3 border-t border-b mb-4" style={{ borderColor: C.border }}>
              <span className="font-bold">סה״כ לפדיון</span>
              <span className="kap-h text-3xl font-black" style={{ color: C.gold }}>{ils(total)}</span>
            </div>

            <p className="text-xs text-center mb-3" style={{ color: C.muted }}>המוסיפים על סכום הפדיון כפי נדבת לבם — תבוא עליהם ברכה</p>

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg py-3.5 text-white font-bold shadow"
              style={{ background: C.gold }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
              המשך לתשלום מאובטח
            </button>
            <p className="text-[11px] text-center mt-2" style={{ color: C.muted }}>תשלום מאובטח בכרטיס אשראי · קבלה מוכרת למס תישלח למייל</p>
          </div>
        </div>
      </section>

      {/* 3-step order */}
      <section className="px-5 py-8" style={{ background: C.card, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="kap-h text-2xl font-black text-center mb-6">סדר כפרות על כסף — בשלושה שלבים</h2>
          <ol className="space-y-4">
            {[
              'אוחזים את הכסף ואומרים את פסוקי הכפרות.',
              'מסובבים שלוש פעמים מעל הראש ואומרים — כך שלוש פעמים לכל אחד מבני הבית.',
              'מעבירים לצדקה — משלימים בטופס למעלה.',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm" style={{ background: C.gold }}>{i + 1}</span>
                <div className="pt-1">
                  <p className="leading-relaxed">{step}</p>
                  {i === 1 && (
                    <div className="kap-serif mt-2 rounded-lg border p-3 text-sm leading-relaxed" style={{ borderColor: C.border, background: C.bg }}>
                      {DECLARATION}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Full nusach */}
      <section className="px-5 py-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="kap-h text-2xl font-black text-center mb-4">נוסח הכפרות המלא</h2>
          <div className="kap-serif rounded-lg border p-5 text-lg leading-loose" style={{ borderColor: C.border, background: C.card }}>
            {NUSACH}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-5 py-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="kap-h text-2xl font-black text-center mb-5">שאלות נפוצות</h2>
          <div className="space-y-3">
            {FAQ.map((f, i) => (
              <div key={i} className="rounded-lg border p-4" style={{ borderColor: C.border, background: C.card }}>
                <p className="font-bold mb-1">{f.q}</p>
                <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About + footer */}
      {cfg.about_text && (
        <section className="px-5 py-8" style={{ background: C.card, borderTop: `1px solid ${C.border}` }}>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="kap-h text-xl font-black mb-2">אודות {org.name}</h2>
            <div className="text-sm leading-relaxed" style={{ color: C.muted }} dangerouslySetInnerHTML={{ __html: cfg.about_text }} />
          </div>
        </section>
      )}
      <footer className="px-5 py-6 text-center text-xs" style={{ color: C.muted }}>מופעל באמצעות Kafool</footer>

      <DonationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        presetAmount={total}
        presetCustomData={presetCustomData}
        donationUrl={donationUrl}
        paymentUrls={paymentUrls}
        paymentProvider={paymentProvider}
        nedarim={nedarim}
        campaign={{ id: campaign.id, title: campaign.title, slug: campaign.slug }}
        primaryColor={primary}
        buttonRadius={(s.button_radius as string) || 'rounded'}
        groups={[]}
        lang={initialLang}
        stripeEnabled={stripeEnabled}
        currencies={allowedCurrencies}
        defaultCurrency="ils"
        ilsRate={Number(s.stripe_ils_rate) || 3.7}
      />
    </div>
  )
}
