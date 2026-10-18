# Kafool homepage: handoff to Claude Code

`kafool-baseline.html` is the approved design reference: a single self-contained file (CSS, JS, fonts and images inlined). Rebuild it as real pages inside the Kafool Next.js app, pixel-close to the reference.

## Stack
- Next.js (App Router) + TypeScript + Tailwind, deployed on Vercel.
- Animations: GSAP (`npm i gsap`), the same library the reference uses.
- Font: Rubik (`next/font/google`). Direction: `dir="rtl"`, `lang="he"`.
- Use native scrolling only. Do not add a smooth-scroll library: it caused stuck scrolling on iPhone.

## Design tokens (from the reference `:root`)
| Token | Value |
|---|---|
| brand | `#3E5DB3` |
| brand-deep (navy) | `#14204A` |
| coral | `#E0583F` |
| coral-lt | `#FF7A63` |
| surface | `#F3F4F8` |
| ink-soft | `#6B7290` |
| hairline | `#E5E7EF` |
| WhatsApp green | `#25A55F` |
| card radius / large card / pill | `1.5rem` / `2rem` / `999px` |

## Routes
| Route | Reference anchor |
|---|---|
| `/` | home (`<main>` without class) |
| `/about` | `main[data-page="about"]` |
| `/designs` | `main[data-page="designs"]` |
| `/faq` | `main[data-page="faq"]` |
| `/contact` | `main[data-page="contact"]` |

In the reference these pages are hash routes (`#/about`…). In Next.js make them real routes, and share the header, menu and footer through `app/layout.tsx`.

## Home sections, in order
1. **Logo intro (loader).** Plays on every visit and has a "דלג" (skip) button. The ready-made component is in `KafoolIntro.tsx`.
2. **Hero.**
   - Navy rounded panel with three background photos that crossfade every 5.5s, a slow zoom, and a navy gradient rising from the bottom.
   - Headline: "כפול בהשפעה. / כפול בתוצאה."
   - One CTA: "פתחו קמפיין".
3. **Pain sequence (`#pain`).**
   - Autoplays when the section is in view and loops. It is not scroll-driven.
   - **Headaches:** each of the 5 headaches appears huge on a white veil, then shrinks into its row. The counter goes 0→5.
   - **Solution:** the navy panel fades in behind the rows, and the rows flip to green ✓ while the counter goes 5→0.
   - **End line:** "הכל במקום אחד!" appears huge and shrinks into place, then the CTA "אני רוצה דף גיוס" appears.
   - On phones the whole section fits one screen (100svh).
4. **Zero fees (`#zero`).** A giant "0%": digits roll 9→0 four times, then "%" pops in. Headline: "עמלות סליקה לפלטפורמה שלנו". Below it, chips for קשר, נדרים פלוס, קארדקום and Stripe.
5. **Features marquee (`#wa`).**
   - Three cards scroll right→left in an infinite loop and pause on hover.
   - Tapping a card opens a panel that grows from the card on desktop, or a bottom sheet with swipe-down-to-close on phones.
   - Each panel has a live demo (WhatsApp chat / abandoned-donation funnel / contacts sync + call statuses), four bullet points, and a CTA.
6. **Campaigns (`#campaigns`).** Three staggered banner cards, each linking to its campaign page.
7. **Trust strip.** Four badges: הקמה מהירה, תשלום קבוע מראש, תמיכה אישית, אבטחה ברמה גבוהה.
8. **Footer.** "מוכנים לקמפיין הבא?", links, and admin@kafool.com.

## Global UI
- **Header:** a full-width translucent bar pinned to the top (blur). The logo is smaller on phones.
- **Menu overlay:** קמפיינים שבחרו ׳כפול׳, אודות, שאלות ותשובות, העיצובים שלנו, and the button "אני רוצה דף גיוס". Underneath: צור קשר and כניסה למערכת.
- **Contact modal:** opened by every `[data-modal]` button. Connect it to the real backend (Supabase).

## Inner pages
- **About:** hero, 4 feature cards, "למה כפול" checklist, vision on navy, solutions chips, CTA plus a "שאלות ותשובות" button.
- **Designs:** filter pills by category, a masonry grid, and a lightbox with prev/next and swipe. Images come from the Supabase `campaign-media/portfolio/` bucket; the URLs are in the reference.
- **FAQ:** 12 accordion items and a live search box. The answers were drafted for the demo; confirm the wording before launch.
- **Contact:**
  - Cards: WhatsApp, phone 053-503-5770, admin@kafool.com, hours א׳–ה׳ 09:00–18:00.
  - Form fields: name*, phone, email, topic chips (multi-select), "how did you hear" select, message*.
  - Inline validation is already built. The submit itself is a stub: wire it to Supabase or an email service.

## Must keep
- RTL everywhere. Fully responsive; test at 375, 390, 430 and 1440 widths. No horizontal scroll.
- `prefers-reduced-motion`: replace movement with fades; the content must stay fully readable.
- Animate only `transform` and `opacity`.
