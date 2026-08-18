'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadImage, uploadVideo, MAX_VIDEO_BYTES } from '@/lib/image-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import RichTextEditor from '@/components/RichTextEditor'
import {
  Upload, ImageIcon, Trash2, X, Monitor, Smartphone,
  LayoutGrid, Plus, Check, ArrowRight, Eye, Palette, Image, Ruler, ChevronUp, ChevronDown, Video, BookOpen
} from 'lucide-react'

// YouTube thumbnail from a URL (for the editor preview); null for non-YouTube.
function ytThumb(url: string): string | null {
  const m = (url || '').match(/(?:youtube\.com\/.*[?&]v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/)
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null
}
// An uploaded video file (not a YouTube/Vimeo/Drive link) — supports frame capture.
function isFileVideo(url: string): boolean {
  return /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(url || '') || /supabase\.co\/storage/i.test(url || '')
}

/* ─── Frame grabber: capture a still from an uploaded video ─── */
function FrameGrabber({ src, onClose, onCapture }: { src: string; onClose: () => void; onCapture: (blob: Blob) => void }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [busy, setBusy] = useState(false)
  function capture() {
    const video = ref.current; if (!video) return
    setBusy(true)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 1280
      canvas.height = video.videoHeight || 720
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error()
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(b => { setBusy(false); if (b) onCapture(b); else alert('לכידת הפריים נכשלה.') }, 'image/jpeg', 0.85)
    } catch { setBusy(false); alert('לא ניתן ללכוד פריים מהסרטון (בעיית CORS). העלה תמונה במקום.') }
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-4 w-full max-w-lg" onClick={e => e.stopPropagation()} dir="rtl">
        <h3 className="font-bold text-gray-800 mb-1">בחר פריים מהסרטון</h3>
        <p className="text-xs text-gray-400 mb-3">הרץ/עצור את הסרטון על הפריים הרצוי ולחץ &quot;צלם פריים זה&quot;.</p>
        <video ref={ref} src={src} controls crossOrigin="anonymous" playsInline className="w-full rounded-lg bg-black max-h-[55vh]" />
        <div className="flex gap-2 mt-3">
          <button onClick={capture} disabled={busy} className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">{busy ? 'מעבד…' : 'צלם פריים זה'}</button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm border border-gray-200 text-gray-600">ביטול</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Types ─── */
interface GalleryItem { id: string; image_url: string; caption: string | null; sort_order: number }
interface DonationPlan { amount: number; label?: string | null; image_url?: string | null; image_url_en?: string | null; payment_type?: 'one_time' | 'hok'; months?: number | null; form?: string | null; cta?: string | null }
interface FormOption { id: string; name: string }

interface Props {
  campaignId: string
  campaignTitle: string
  campaignSlug: string
  orgId: string
  orgName: string
  orgLogoUrl: string | null
  initialCoverUrl: string | null
  initialLogoUrl: string | null
  initialVideoUrl: string | null
  initialGallery: GalleryItem[]
  initialSettings: Record<string, unknown>
}


type Tab = 'banner' | 'gallery' | 'buttons' | 'videos'

/* ─── Banner Preview Component ─── */
function BannerPreview({
  coverUrl, mobileCoverUrl, logoUrl, orgLogoUrl, title, orgName, primaryColor, viewMode,
}: {
  coverUrl: string | null; mobileCoverUrl?: string | null; logoUrl: string | null; orgLogoUrl: string | null;
  title: string; orgName: string; primaryColor: string; viewMode: 'desktop' | 'mobile';
}) {
  const logoSrc = logoUrl || orgLogoUrl
  const mobileSrc = mobileCoverUrl || coverUrl

  if (viewMode === 'mobile') {
    return (
      <div className="mx-auto" style={{ width: 280 }}>
        {/* Phone frame */}
        <div className="relative bg-black rounded-[2.5rem] p-2.5 shadow-2xl border-4 border-gray-800">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-full z-10" />
          <div className="rounded-[2rem] overflow-hidden bg-gray-100" style={{ height: 480 }}>
            {/* Hero */}
            <div className="relative h-44 overflow-hidden" style={{ backgroundColor: primaryColor }}>
              {mobileSrc
                ? <img src={mobileSrc} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}99)` }} />
              }
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/70" />
              {logoSrc && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                  <img src={logoSrc} alt="" className="w-12 h-12 rounded-full border-2 border-white object-cover" />
                </div>
              )}
            </div>
            {/* Content below hero */}
            <div className={`text-center px-3 ${logoSrc ? 'pt-8' : 'pt-3'} pb-3`}>
              <p className="text-xs font-black text-gray-800 leading-tight line-clamp-2">{title}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{orgName}</p>
              {/* Fake donate button */}
              <div className="mt-3 rounded-xl py-2 text-white text-[10px] font-bold text-center" style={{ backgroundColor: primaryColor }}>
                לתרומה
              </div>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-3">מצב מובייל</p>
      </div>
    )
  }

  // Desktop preview
  return (
    <div className="w-full">
      <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-lg" style={{ height: 280 }}>
        {/* Browser chrome */}
        <div className="bg-gray-100 px-3 py-2 flex items-center gap-2 border-b border-gray-200">
          <div className="flex gap-1.5">
            {['bg-red-400', 'bg-yellow-400', 'bg-green-400'].map(c => <div key={c} className={`w-2.5 h-2.5 rounded-full ${c}`} />)}
          </div>
          <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-gray-400 font-mono mx-2 truncate">
            kafool.com/{campaignSlugRef}
          </div>
        </div>
        {/* Hero area */}
        <div className="relative" style={{ height: 220, backgroundColor: primaryColor }}>
          {coverUrl
            ? <img src={coverUrl} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}88 100%)` }} />
          }
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/65" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            {logoSrc && (
              <img src={logoSrc} alt="" className="w-14 h-14 rounded-full border-2 border-white/40 object-cover mb-3 shadow-lg" />
            )}
            <h3 className="text-white font-black text-xl drop-shadow-lg line-clamp-1">{title}</h3>
            <p className="text-white/70 text-xs mt-1">{orgName}</p>
            <div className="mt-4 px-6 py-2 rounded-full text-white text-xs font-bold shadow-lg"
              style={{ backgroundColor: primaryColor }}>
              לתרומה עכשיו →
            </div>
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-gray-400 mt-2">תצוגת מחשב</p>
    </div>
  )
}

// Trick: pass slug as module-level var for the preview (avoids prop drilling)
let campaignSlugRef = ''

/* ─── Upload Zone ─── */
function UploadZone({
  label, sublabel, hint, currentUrl, onUpload, uploading, aspectClass, specs,
}: {
  label: string; sublabel: string; hint?: string;
  currentUrl: string | null; onUpload: (file: File) => void;
  uploading: boolean; aspectClass: string;
  specs?: { label: string; value: string }[];
}) {
  const ref = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-2">
      <div>
        <p className="font-semibold text-gray-800 text-sm">{label}</p>
        <p className="text-xs text-gray-500">{sublabel}</p>
      </div>
      <div
        className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${aspectClass} ${currentUrl ? 'border-transparent' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 bg-gray-50'}`}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) onUpload(f) }}
        onDragOver={e => e.preventDefault()}
        onClick={() => ref.current?.click()}
      >
        {currentUrl ? (
          <>
            <img src={currentUrl} alt={label} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-sm font-medium flex items-center gap-2"><Upload className="w-4 h-4" />החלף</span>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            {uploading
              ? <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              : <><Upload className="w-7 h-7 mb-2 opacity-40" /><p className="text-xs font-medium">גרור תמונה או לחץ לבחירה</p></>
            }
          </div>
        )}
        {uploading && currentUrl && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      {specs && (
        <div className="rounded-xl bg-blue-50/60 border border-blue-100 px-3 py-2.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700">
            <Ruler className="w-3.5 h-3.5" /> מפרט הקובץ
          </div>
          {specs.map(s => (
            <div key={s.label} className="flex items-center justify-between text-[11px]">
              <span className="text-gray-500">{s.label}</span>
              <span className="font-semibold text-gray-700">{s.value}</span>
            </div>
          ))}
        </div>
      )}
      {hint && <p className="text-[11px] text-gray-400 leading-snug">{hint}</p>}
      {currentUrl && (
        <button onClick={e => { e.stopPropagation(); onUpload(new File([], '')) }}
          className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
          <Trash2 className="w-3 h-3" /> הסר תמונה
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = '' }} />
    </div>
  )
}

/* ─── Donation button (plan) editor row ─── */
function PlanEditor({ plan, lang, uploading, isFirst, isLast, customForms, preStepEnabled, onChange, onUpload, onRemove, onMoveUp, onMoveDown }: {
  plan: DonationPlan
  lang: 'he' | 'en'
  uploading: boolean
  isFirst: boolean
  isLast: boolean
  customForms: FormOption[]
  preStepEnabled: boolean
  onChange: (patch: Partial<DonationPlan>) => void
  onUpload: (file: File) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const imgKey = lang === 'en' ? 'image_url_en' : 'image_url'
  const img = lang === 'en' ? plan.image_url_en : plan.image_url
  return (
    <div className="flex items-center gap-3 border border-gray-100 rounded-2xl p-3 bg-gray-50/50">
      {/* reorder */}
      <div className="flex flex-col gap-0.5 shrink-0">
        <button onClick={onMoveUp} disabled={isFirst} title="העבר למעלה"
          className="text-gray-300 hover:text-blue-600 disabled:opacity-20 transition-colors"><ChevronUp className="w-4 h-4" /></button>
        <button onClick={onMoveDown} disabled={isLast} title="העבר למטה"
          className="text-gray-300 hover:text-blue-600 disabled:opacity-20 transition-colors"><ChevronDown className="w-4 h-4" /></button>
      </div>

      {/* design upload (circle) */}
      <div
        onClick={() => ref.current?.click()}
        className="w-16 h-16 rounded-full overflow-hidden shrink-0 cursor-pointer relative border-2 border-dashed border-gray-200 hover:border-blue-300 bg-white flex items-center justify-center group"
        title="העלה עיצוב לכפתור"
      >
        {img ? (
          <>
            <img src={img} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Upload className="w-4 h-4 text-white" />
            </div>
          </>
        ) : uploading ? (
          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Image className="w-5 h-5 text-gray-300" />
        )}
        <input ref={ref} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = '' }} />
      </div>

      {/* amount + label + payment type */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] text-gray-400">סכום (₪)</label>
            <input type="number" value={plan.amount || ''} onChange={e => onChange({ amount: Number(e.target.value) || 0 })}
              placeholder="180" dir="ltr"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="text-[11px] text-gray-400">טקסט מתחת (אופציונלי)</label>
            <input value={plan.label ?? ''} onChange={e => onChange({ label: e.target.value })}
              placeholder='למשל: "סועד חודש"'
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-gray-400 shrink-0">סוג תשלום:</span>
          {([['one_time', 'תרומה חד-פעמית'], ['hok', 'הוראת קבע']] as const).map(([val, lbl]) => {
            const active = (plan.payment_type ?? 'one_time') === val
            return (
              <button key={val} type="button"
                onClick={() => onChange(val === 'hok' ? { payment_type: val, months: plan.months || 12 } : { payment_type: val })}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'}`}>
                {lbl}
              </button>
            )
          })}
          {plan.payment_type === 'hok' && (() => {
            const missingMonths = !(Number(plan.months) >= 1)
            return (
              <div className="flex items-center gap-1 mr-1">
                <span className="text-[11px] text-gray-400">למשך</span>
                <input type="number" min="1" value={plan.months ?? ''} onChange={e => onChange({ months: Number(e.target.value) || null })}
                  placeholder="12" dir="ltr" required aria-invalid={missingMonths}
                  className={`w-14 border rounded-lg px-2 py-1 text-xs text-center outline-none focus:ring-2 focus:ring-blue-400 ${missingMonths ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                <span className="text-[11px] text-gray-400">חודשים <span className="text-red-400">*</span></span>
              </div>
            )
          })()}
        </div>
        {(customForms.length > 0 || preStepEnabled) && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-400 shrink-0">טופס שנפתח:</span>
            <select value={plan.form || ''} onChange={e => onChange({ form: e.target.value || null })}
              className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">ברירת מחדל</option>
              <option value="regular">טופס רגיל (פרטי-תורם)</option>
              {preStepEnabled && <option value="choice">שלב מקדים</option>}
              {customForms.map(f => <option key={f.id} value={f.id}>{f.name || 'ללא שם'}</option>)}
            </select>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-gray-400 shrink-0">טקסט כפתור:</span>
          <input value={plan.cta ?? ''} onChange={e => onChange({ cta: e.target.value })}
            placeholder='ברירת מחדל (למשל "המשך")'
            className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 shrink-0">
        {img && (
          <button onClick={() => onChange({ [imgKey]: null })} className="text-[10px] text-gray-400 hover:text-red-500" title="הסר עיצוב">הסר עיצוב</button>
        )}
        <button onClick={onRemove} className="w-8 h-8 rounded-lg text-red-400 hover:bg-red-50 flex items-center justify-center" title="מחק כפתור">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

/* ─── Main Component ─── */
export default function CampaignMediaClient({
  campaignId, campaignTitle, campaignSlug, orgId, orgName, orgLogoUrl,
  initialCoverUrl, initialLogoUrl, initialVideoUrl, initialGallery, initialSettings,
}: Props) {
  campaignSlugRef = campaignSlug

  const router = useRouter()
  const supabase = createClient()

  const [tab, setTab] = useState<Tab>('banner')
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')

  // Banner state — multiple rotating banners
  const initialBanners: string[] =
    (initialSettings.banners as { url: string; sort_order: number }[] | undefined)?.length
      ? [...(initialSettings.banners as { url: string; sort_order: number }[])].sort((a, b) => a.sort_order - b.sort_order).map(b => b.url)
      : (initialCoverUrl ? [initialCoverUrl] : [])
  const [banners, setBanners] = useState<string[]>(initialBanners)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const bannerRef = useRef<HTMLInputElement>(null)

  // Dedicated mobile banners (optional) — shown only on phones
  const initialMobileBanners: string[] =
    (initialSettings.mobile_banners as { url: string; sort_order: number }[] | undefined)?.length
      ? [...(initialSettings.mobile_banners as { url: string; sort_order: number }[])].sort((a, b) => a.sort_order - b.sort_order).map(b => b.url)
      : []
  const [mobileBanners, setMobileBanners] = useState<string[]>(initialMobileBanners)
  const [uploadingMobileBanner, setUploadingMobileBanner] = useState(false)
  const mobileBannerRef = useRef<HTMLInputElement>(null)

  // Parallel English banner sets — shown on the public page when the site is in
  // English (falls back to the Hebrew banners when none uploaded). One language
  // toggle drives all the banner uploaders below.
  const urlsFrom = (v: unknown): string[] =>
    (v as { url: string; sort_order: number }[] | undefined)?.length
      ? [...(v as { url: string; sort_order: number }[])].sort((a, b) => a.sort_order - b.sort_order).map(b => b.url)
      : []
  const [bannersEn, setBannersEn] = useState<string[]>(urlsFrom(initialSettings.banners_en))
  const [mobileBannersEn, setMobileBannersEn] = useState<string[]>(urlsFrom(initialSettings.mobile_banners_en))
  const [bannerLang, setBannerLang] = useState<'he' | 'en'>('he')
  // Active sets the uploaders/lists below operate on.
  const isEn = bannerLang === 'en'
  const curBanners = isEn ? bannersEn : banners
  const setCurBanners = isEn ? setBannersEn : setBanners
  const curMobileBanners = isEn ? mobileBannersEn : mobileBanners
  const setCurMobileBanners = isEn ? setMobileBannersEn : setMobileBanners

  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [shareImage, setShareImage] = useState<string | null>((initialSettings.share_image as string) || null)
  const [shareText, setShareText] = useState<string>((initialSettings.share_text as string) || '')
  const [uploadingShare, setUploadingShare] = useState(false)
  const initialPopup = (initialSettings.popup_ad as { image_url?: string; link?: string } | undefined) || {}
  const [popupImage, setPopupImage] = useState<string | null>(initialPopup.image_url || null)
  const [popupLink, setPopupLink] = useState<string>(initialPopup.link || '')
  const [uploadingPopup, setUploadingPopup] = useState(false)
  const [primaryColor, setPrimaryColor] = useState<string>(
    (initialSettings.primary_color as string) || '#2563eb'
  )
  const [aboutText, setAboutText] = useState<string>(
    (initialSettings.about_text as string) || ''
  )
  const [savingBanner, setSavingBanner] = useState(false)
  const [savedBanner, setSavedBanner] = useState(false)
  const [bannerVideoButton, setBannerVideoButton] = useState<boolean>((initialSettings.banner_video_button as boolean) ?? true)

  // Gallery state
  const [gallery, setGallery] = useState<GalleryItem[]>(initialGallery)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [galleryMode, setGalleryMode] = useState<'carousel' | 'stacked'>(
    (initialSettings.gallery_mode as 'carousel' | 'stacked') || 'carousel'
  )

  async function saveGalleryMode(mode: 'carousel' | 'stacked') {
    setGalleryMode(mode)
    const { data: existing } = await supabase.from('campaigns').select('settings').eq('id', campaignId).single()
    await supabase.from('campaigns').update({ settings: { ...(existing?.settings as object), gallery_mode: mode } }).eq('id', campaignId)
    router.refresh()
  }

  // Reorder a gallery image — swaps sort_order with its neighbour in the DB.
  async function moveGalleryItem(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= gallery.length) return
    const a = gallery[i], b = gallery[j]
    const next = [...gallery]; next[i] = b; next[j] = a
    setGallery(next.map((g, k) => ({ ...g, sort_order: k })))
    await Promise.all([
      supabase.from('campaign_gallery').update({ sort_order: j }).eq('id', a.id),
      supabase.from('campaign_gallery').update({ sort_order: i }).eq('id', b.id),
    ])
    router.refresh()
  }

  // Donation buttons (plans) state — each button: amount + optional design + label
  const initialPlans: DonationPlan[] =
    (initialSettings.donation_plans as DonationPlan[] | undefined) ||
    (((initialSettings.donation_amounts as number[]) || [180, 360, 720, 1800, 3600]).map(amount => ({ amount })))
  const [plans, setPlans] = useState<DonationPlan[]>(initialPlans)
  const [buttonLang, setButtonLang] = useState<'he' | 'en'>('he')
  const [uploadingPlan, setUploadingPlan] = useState<number | null>(null)
  const [otherAmountImage, setOtherAmountImage] = useState<string | null>((initialSettings.other_amount_design as string) || null)
  // how the "other amount" button appears: in the buttons grid, or beside the donate CTA
  const [otherAmountPlacement, setOtherAmountPlacement] = useState<'grid' | 'cta'>(
    (initialSettings.other_amount_placement as 'grid' | 'cta') === 'cta' ? 'cta' : 'grid'
  )
  const [uploadingOther, setUploadingOther] = useState(false)
  const [donateCta, setDonateCta] = useState<string>((initialSettings.donate_cta as string) || '')
  // Custom forms + pre-step (defined in the "התאמות אישיות" tab) — for the
  // per-button "which form opens" selector.
  const campaignCustomForms: FormOption[] = Array.isArray(initialSettings.custom_forms)
    ? (initialSettings.custom_forms as { id: string; name: string }[]).map(f => ({ id: f.id, name: f.name }))
    : []
  // The "pre-step" button option is offered whenever a pre-step is configured
  // (choice/info/consent) — activation is per-button, not a global flag.
  const campaignPreStepEnabled = !!(initialSettings.pre_donation_step as { enabled?: boolean } | undefined)?.enabled
  const [savingAmounts, setSavingAmounts] = useState(false)
  const [savedAmounts, setSavedAmounts] = useState(false)

  // Campaign videos (YouTube/Vimeo) — main video shows on the banner + social
  // preview; all videos show above the donate button and the About section.
  const initialVideos: { url: string; title: string; thumb: string }[] = (() => {
    const raw = (initialSettings.videos as (string | { url: string; title?: string; thumb?: string })[] | undefined)?.length
      ? (initialSettings.videos as (string | { url: string; title?: string; thumb?: string })[])
      : (initialVideoUrl ? [initialVideoUrl] : [])
    return raw.map(v => typeof v === 'string' ? { url: v, title: '', thumb: '' } : { url: v.url || '', title: v.title || '', thumb: v.thumb || '' })
  })()
  const [videos, setVideos] = useState(initialVideos)
  const [mainVideo, setMainVideo] = useState(Math.max(0, initialVideos.findIndex(v => v.url === initialVideoUrl)))
  const [savingVideos, setSavingVideos] = useState(false)
  const [savedVideos, setSavedVideos] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState<number | null>(null)
  const [videoProgress, setVideoProgress] = useState(0)
  // whether the videos section is shown on the public campaign page (default: yes)
  const [showVideos, setShowVideos] = useState<boolean>((initialSettings.show_videos as boolean) ?? true)

  async function uploadVideoFile(i: number, file: File) {
    if (file.size > MAX_VIDEO_BYTES) {
      alert('הסרטון גדול מ-100MB. נסו קובץ קטן יותר, או הדביקו קישור YouTube / Drive.')
      return
    }
    setUploadingVideo(i)
    setVideoProgress(0)
    try {
      const url = await uploadVideo(file, `${orgId}/${campaignId}/video-${Date.now()}`, setVideoProgress)
      setVideoField(i, 'url', url)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'העלאת הסרטון נכשלה')
    }
    setUploadingVideo(null)
  }

  function setVideoField(i: number, field: 'url' | 'title' | 'thumb', val: string) {
    setVideos(v => v.map((x, idx) => (idx === i ? { ...x, [field]: val } : x)))
  }
  function addVideo() { setVideos(v => [...v, { url: '', title: '', thumb: '' }]) }

  // upload a custom preview image for a video
  const [uploadingThumb, setUploadingThumb] = useState<number | null>(null)
  async function uploadVideoThumb(i: number, file: File) {
    setUploadingThumb(i)
    try {
      const url = await uploadImage(file, `${orgId}/${campaignId}/video-thumb-${i}-${Date.now()}`)
      setVideoField(i, 'thumb', url)
    } catch (e) { alert(e instanceof Error ? e.message : 'העלאת התמונה נכשלה') }
    setUploadingThumb(null)
  }
  // frame-grabber modal: pick a frame from an uploaded video file
  const [framePicker, setFramePicker] = useState<number | null>(null)
  function removeVideo(i: number) {
    setVideos(v => v.filter((_, idx) => idx !== i))
    setMainVideo(m => (i === m ? 0 : i < m ? m - 1 : m))
  }

  async function saveVideos() {
    setSavingVideos(true)
    const mainUrl = (videos[mainVideo]?.url || '').trim()
    const clean = videos.map(v => ({ url: v.url.trim(), title: v.title.trim(), thumb: (v.thumb || '').trim() })).filter(v => v.url)
    const ordered = mainUrl
      ? [...clean.filter(v => v.url === mainUrl), ...clean.filter(v => v.url !== mainUrl)]
      : clean
    // re-fetch current settings so we never clobber edits made on another tab
    const { data: existing } = await supabase.from('campaigns').select('settings').eq('id', campaignId).single()
    await supabase.from('campaigns').update({
      video_url: ordered[0]?.url || null,
      settings: { ...(existing?.settings as object), videos: ordered, banner_video_button: bannerVideoButton, show_videos: showVideos },
    }).eq('id', campaignId)
    setSavingVideos(false); setSavedVideos(true)
    setTimeout(() => setSavedVideos(false), 2000)
    router.refresh()
  }

  /* ─── Upload helper — uses server-side API to bypass RLS ─── */
  async function uploadFile(file: File, path: string): Promise<string | null> {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('path', path)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (!res.ok) { console.error('Upload failed:', await res.text()); return null }
    const { url } = await res.json()
    return url
  }

  /* ─── Banners (multiple, auto-rotating) — operate on the active language set ─── */
  async function handleBannerUpload(files: FileList) {
    setUploadingBanner(true)
    for (let i = 0; i < files.length; i++) {
      const url = await uploadFile(files[i], `${orgId}/${campaignId}/banner-${bannerLang}-${Date.now()}-${i}`)
      if (url) setCurBanners(p => [...p, url])
    }
    setUploadingBanner(false)
  }
  function removeBanner(i: number) { setCurBanners(p => p.filter((_, idx) => idx !== i)) }
  function moveBanner(i: number, dir: -1 | 1) {
    setCurBanners(p => {
      const j = i + dir
      if (j < 0 || j >= p.length) return p
      const next = [...p]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  /* ─── Mobile banners (optional) — active language set ─── */
  async function handleMobileBannerUpload(files: FileList) {
    setUploadingMobileBanner(true)
    for (let i = 0; i < files.length; i++) {
      const url = await uploadFile(files[i], `${orgId}/${campaignId}/banner-mobile-${bannerLang}-${Date.now()}-${i}`)
      if (url) setCurMobileBanners(p => [...p, url])
    }
    setUploadingMobileBanner(false)
  }
  function removeMobileBanner(i: number) { setCurMobileBanners(p => p.filter((_, idx) => idx !== i)) }
  function moveMobileBanner(i: number, dir: -1 | 1) {
    setCurMobileBanners(p => {
      const j = i + dir
      if (j < 0 || j >= p.length) return p
      const next = [...p]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  /* ─── Logo upload ─── */
  async function handleLogoUpload(file: File) {
    if (!file.size) {
      await supabase.from('campaigns').update({ logo_url: null }).eq('id', campaignId)
      setLogoUrl(null); return
    }
    setUploadingLogo(true)
    const url = await uploadFile(file, `${orgId}/${campaignId}/logo`)
    if (url) { await supabase.from('campaigns').update({ logo_url: url }).eq('id', campaignId); setLogoUrl(url) }
    setUploadingLogo(false)
  }

  /* ─── Social share image upload ─── */
  async function handleShareUpload(file: File) {
    if (!file.size) { setShareImage(null); return }
    setUploadingShare(true)
    const url = await uploadFile(file, `${orgId}/${campaignId}/share-${Date.now()}`)
    if (url) setShareImage(url)
    setUploadingShare(false)
  }

  /* ─── Popup ad image upload ─── */
  async function handlePopupUpload(file: File) {
    if (!file.size) { setPopupImage(null); return }
    setUploadingPopup(true)
    const url = await uploadFile(file, `${orgId}/${campaignId}/popup-${Date.now()}`)
    if (url) setPopupImage(url)
    setUploadingPopup(false)
  }

  /* ─── Save banner settings ─── */
  async function saveBannerSettings() {
    setSavingBanner(true)
    const settings = {
      ...(initialSettings as object),
      banners: banners.map((url, i) => ({ url, sort_order: i })),
      mobile_banners: mobileBanners.map((url, i) => ({ url, sort_order: i })),
      banners_en: bannersEn.map((url, i) => ({ url, sort_order: i })),
      mobile_banners_en: mobileBannersEn.map((url, i) => ({ url, sort_order: i })),
      banner_video_button: bannerVideoButton,
      share_image: shareImage,
      share_text: shareText.trim() || null,
      popup_ad: popupImage ? { image_url: popupImage, link: popupLink.trim() || null } : null,
      primary_color: primaryColor,
      about_text: aboutText || null,
    }
    // keep cover_image_url in sync (first banner) for fallback + previews
    await supabase.from('campaigns').update({ settings, cover_image_url: banners[0] || null }).eq('id', campaignId)
    setSavingBanner(false); setSavedBanner(true)
    setTimeout(() => setSavedBanner(false), 2000)
    router.refresh()
  }

  /* ─── Gallery upload ─── */
  async function handleGalleryUpload(files: FileList) {
    setUploadingGallery(true)
    for (let i = 0; i < files.length; i++) {
      const url = await uploadFile(files[i], `${orgId}/${campaignId}/gallery/${Date.now() + i}`)
      if (url) {
        const { data } = await supabase.from('campaign_gallery').insert({
          campaign_id: campaignId, org_id: orgId, image_url: url, caption: null, sort_order: gallery.length + i,
        }).select().single()
        if (data) setGallery(p => [...p, data])
      }
    }
    setUploadingGallery(false)
  }

  async function deleteGalleryItem(id: string) {
    await supabase.from('campaign_gallery').delete().eq('id', id)
    setGallery(p => p.filter(g => g.id !== id))
  }

  async function updateCaption(id: string, caption: string) {
    await supabase.from('campaign_gallery').update({ caption }).eq('id', id)
    setGallery(p => p.map(g => g.id === id ? { ...g, caption } : g))
  }

  /* ─── Donation buttons (plans) ─── */
  function updatePlan(i: number, patch: Partial<DonationPlan>) {
    setPlans(p => p.map((x, idx) => idx === i ? { ...x, ...patch } : x))
  }
  function removePlan(i: number) { setPlans(p => p.filter((_, idx) => idx !== i)) }
  function addPlan() { setPlans(p => [...p, { amount: 0, label: '', image_url: null }]) }
  function movePlan(i: number, dir: -1 | 1) {
    setPlans(p => {
      const j = i + dir
      if (j < 0 || j >= p.length) return p
      const next = [...p]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  async function uploadPlanImage(i: number, file: File) {
    setUploadingPlan(i)
    const url = await uploadFile(file, `${orgId}/${campaignId}/plan-${i}-${buttonLang}-${Date.now()}`)
    if (url) updatePlan(i, buttonLang === 'en' ? { image_url_en: url } : { image_url: url })
    setUploadingPlan(null)
  }

  async function uploadOtherImage(file: File) {
    setUploadingOther(true)
    const url = await uploadFile(file, `${orgId}/${campaignId}/other-amount-${Date.now()}`)
    if (url) setOtherAmountImage(url)
    setUploadingOther(false)
  }

  async function savePlans() {
    // הוראת קבע מחייבת מספר חודשי תרומה — חוסם שמירה אם חסר
    const missingMonths = plans.some(p => p.amount > 0 && p.payment_type === 'hok' && !(Number(p.months) >= 1))
    if (missingMonths) {
      alert('יש להגדיר מספר חודשי תרומה לכל כפתור של הוראת קבע.')
      return
    }
    setSavingAmounts(true)
    const clean = plans.filter(p => p.amount > 0).map(p => ({
      amount: p.amount, label: p.label?.trim() || null, image_url: p.image_url || null,
      image_url_en: p.image_url_en || null,
      payment_type: p.payment_type || 'one_time',
      months: p.payment_type === 'hok' ? (Number(p.months) || null) : null,
      form: p.form || null,
      cta: p.cta?.trim() || null,
    }))
    const settings = {
      ...(initialSettings as object),
      donation_plans: clean,
      donation_amounts: clean.map(p => p.amount), // keep in sync for backward-compat
      other_amount_design: otherAmountImage || null,
      other_amount_placement: otherAmountPlacement,
      donate_cta: donateCta.trim() || null,
      primary_color: primaryColor,
    }
    await supabase.from('campaigns').update({ settings }).eq('id', campaignId)
    setSavingAmounts(false); setSavedAmounts(true)
    setTimeout(() => setSavedAmounts(false), 2000)
    router.refresh()
  }

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'banner', label: 'באנר עליון', icon: Image },
    { key: 'videos', label: 'סרטונים', icon: Video },
    { key: 'gallery', label: 'גלריה', icon: LayoutGrid },
    { key: 'buttons', label: 'כפתורי תרומה', icon: Palette },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">מדיה וגרפיקה</h1>
          <p className="text-gray-500 text-sm mt-0.5">{campaignTitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/${campaignSlug}`} target="_blank"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <Eye className="w-4 h-4 ml-1.5" />
            צפה בדף
          </Link>
          <Link href={`/campaigns/${campaignId}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <ArrowRight className="w-4 h-4 ml-1.5" />
            חזרה
          </Link>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-xl transition-all ${
              tab === t.key ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
        {/* Highlighted link to the full media guide (opens in a new tab) */}
        <Link href="/media-guide" target="_blank"
          className="flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-bold rounded-xl text-white shadow-md transition-all hover:opacity-90 hover:scale-[1.02]"
          style={{ background: '#2B4C9B' }}>
          <BookOpen className="w-4 h-4" />
          מדריך מדיה
        </Link>
      </div>

      {/* ─── TAB: Banner ─── */}
      {tab === 'banner' && (
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Left: controls */}
          <div className="space-y-6">
            {/* language toggle — which language's banners you're editing */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 text-sm font-semibold">
                {(['he', 'en'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => setBannerLang(l)}
                    className={`px-4 py-1.5 rounded-lg transition-colors ${bannerLang === l ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {l === 'he' ? 'עברית' : 'English'}
                  </button>
                ))}
              </div>
              <span className="text-xs text-gray-400">
                {bannerLang === 'en' ? 'באנרים למבקרים באנגלית (אם ריק — יוצגו באנרי העברית)' : 'ברירת המחדל'}
              </span>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-gray-400" />
                תמונת הבאנר
              </h2>

              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">באנרים (מתחלפים אוטומטית)</p>
                    <p className="text-xs text-gray-500">העלה כמה באנרים — הם יתחלפו לבד כל 4 שניות בראש עמוד הגיוס</p>
                  </div>
                  <button onClick={() => bannerRef.current?.click()} disabled={uploadingBanner}
                    className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50 shrink-0">
                    {uploadingBanner
                      ? <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      : <Plus className="w-4 h-4" />}
                    הוסף באנר
                  </button>
                  <input ref={bannerRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={e => e.target.files && handleBannerUpload(e.target.files)} />
                </div>

                {curBanners.length === 0 ? (
                  <button onClick={() => bannerRef.current?.click()}
                    className="w-full aspect-video border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:border-blue-300 hover:bg-blue-50/30 transition-all">
                    <Upload className="w-7 h-7 mb-2 opacity-40" />
                    <p className="text-xs font-medium">גרור תמונות או לחץ להוספת באנרים</p>
                  </button>
                ) : (
                  <div className="space-y-2">
                    {curBanners.map((url, i) => (
                      <div key={i} className="flex items-center gap-2 border border-gray-100 rounded-xl p-2 bg-gray-50/50">
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button onClick={() => moveBanner(i, -1)} disabled={i === 0} title="העבר למעלה"
                            className="text-gray-300 hover:text-blue-600 disabled:opacity-20 transition-colors"><ChevronUp className="w-4 h-4" /></button>
                          <button onClick={() => moveBanner(i, 1)} disabled={i === curBanners.length - 1} title="העבר למטה"
                            className="text-gray-300 hover:text-blue-600 disabled:opacity-20 transition-colors"><ChevronDown className="w-4 h-4" /></button>
                        </div>
                        <img src={url} alt="" className="h-14 flex-1 min-w-0 object-cover rounded-lg" />
                        <span className="text-[11px] font-bold text-gray-400 shrink-0">#{i + 1}</span>
                        <button onClick={() => removeBanner(i)} title="מחק באנר"
                          className="w-8 h-8 rounded-lg text-red-400 hover:bg-red-50 flex items-center justify-center shrink-0"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-xl bg-blue-50/60 border border-blue-100 px-3 py-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700">
                    <Ruler className="w-3.5 h-3.5" /> מפרט כל באנר
                  </div>
                  {[['מידות מומלצות', '1920 × 640 px'], ['יחס', '3:1 (פנורמי, רחב)'], ['פורמט', 'JPG / WebP'], ['משקל מקסימלי', 'עד 2MB']].map(([l, v]) => (
                    <div key={l} className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-500">{l}</span><span className="font-semibold text-gray-700">{v}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 leading-snug">שמרו פרטים חשובים במרכז — הקצוות עשויים להיחתך. הסדר למעלה קובע את סדר ההתחלפות.</p>
              </div>

              {/* ─── Mobile banners (optional) ─── */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-gray-400" /> באנרים לנייד (אופציונלי)
                    </p>
                    <p className="text-xs text-gray-500">תמונה מותאמת לנייד. אם לא תעלה — יוצגו באנרי המחשב.</p>
                  </div>
                  <button onClick={() => mobileBannerRef.current?.click()} disabled={uploadingMobileBanner}
                    className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50 shrink-0">
                    {uploadingMobileBanner
                      ? <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      : <Plus className="w-4 h-4" />}
                    הוסף באנר לנייד
                  </button>
                  <input ref={mobileBannerRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={e => e.target.files && handleMobileBannerUpload(e.target.files)} />
                </div>

                {curMobileBanners.length === 0 ? (
                  <button onClick={() => mobileBannerRef.current?.click()}
                    className="w-full aspect-[4/5] max-w-[180px] mx-auto border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:border-blue-300 hover:bg-blue-50/30 transition-all">
                    <Upload className="w-7 h-7 mb-2 opacity-40" />
                    <p className="text-xs font-medium px-3 text-center">גרור תמונות או לחץ להוספה</p>
                  </button>
                ) : (
                  <div className="space-y-2">
                    {curMobileBanners.map((url, i) => (
                      <div key={i} className="flex items-center gap-2 border border-gray-100 rounded-xl p-2 bg-gray-50/50">
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button onClick={() => moveMobileBanner(i, -1)} disabled={i === 0} title="העבר למעלה"
                            className="text-gray-300 hover:text-blue-600 disabled:opacity-20 transition-colors"><ChevronUp className="w-4 h-4" /></button>
                          <button onClick={() => moveMobileBanner(i, 1)} disabled={i === curMobileBanners.length - 1} title="העבר למטה"
                            className="text-gray-300 hover:text-blue-600 disabled:opacity-20 transition-colors"><ChevronDown className="w-4 h-4" /></button>
                        </div>
                        <img src={url} alt="" className="h-20 w-16 object-cover rounded-lg shrink-0" />
                        <span className="text-[11px] font-bold text-gray-400 flex-1">#{i + 1}</span>
                        <button onClick={() => removeMobileBanner(i)} title="מחק באנר"
                          className="w-8 h-8 rounded-lg text-red-400 hover:bg-red-50 flex items-center justify-center shrink-0"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-xl bg-blue-50/60 border border-blue-100 px-3 py-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700">
                    <Ruler className="w-3.5 h-3.5" /> מפרט באנר נייד
                  </div>
                  {[['מידות מומלצות', '1080 × 1350 px'], ['יחס', '4:5 (לאורך) או 1:1'], ['פורמט', 'JPG / WebP'], ['משקל מקסימלי', 'עד 2MB']].map(([l, v]) => (
                    <div key={l} className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-500">{l}</span><span className="font-semibold text-gray-700">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <UploadZone
                label="לוגו הקמפיין"
                sublabel="מוצג בהדר העליון של עמוד הגיוס ומעל הבאנר"
                specs={[
                  { label: 'מידות מומלצות', value: '500 × 500 px' },
                  { label: 'יחס', value: '1:1 (ריבוע)' },
                  { label: 'פורמט', value: 'PNG (רקע שקוף)' },
                  { label: 'משקל מקסימלי', value: 'עד 500KB' },
                ]}
                hint="רקע שקוף (PNG) מומלץ — כך הלוגו משתלב יפה בכל רקע."
                currentUrl={logoUrl}
                onUpload={handleLogoUpload}
                uploading={uploadingLogo}
                aspectClass="aspect-square max-w-[160px]"
              />

              <UploadZone
                label="תמונת שיתוף לרשתות"
                sublabel="התמונה שתוצג כשמשתפים את הקמפיין בוואטסאפ, פייסבוק וכו׳"
                specs={[
                  { label: 'מידות מומלצות', value: '1200 × 630 px' },
                  { label: 'יחס', value: '1.91:1 (לרוחב)' },
                  { label: 'פורמט', value: 'JPG / PNG' },
                  { label: 'משקל מקסימלי', value: 'עד 2MB' },
                ]}
                hint="שמרו טקסט ופרטים חשובים במרכז. אם לא תעלו תמונה — תיווצר אוטומטית תמונת שיתוף ממותגת."
                currentUrl={shareImage}
                onUpload={handleShareUpload}
                uploading={uploadingShare}
                aspectClass="aspect-[1200/630]"
              />

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">טקסט תצוגה מקדימה בשיתוף</label>
                <p className="text-xs text-gray-400">הטקסט שמופיע מתחת לכותרת כששולחים את הקישור בוואטסאפ / פייסבוק וכו׳. אם ריק — יוצג ה"תיאור קצר" או טקסט אוטומטי.</p>
                <textarea
                  value={shareText}
                  onChange={e => setShareText(e.target.value)}
                  rows={2}
                  maxLength={200}
                  placeholder="למשל: כל תרומה מקרבת אותנו ליעד — הצטרפו עכשיו 💙"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>

              <UploadZone
                label="פרסומת פופ-אפ"
                sublabel="תקפוץ למבקר ל-5 שניות אחרי שגולל מעבר למקטע 'אודות'"
                specs={[
                  { label: 'מידות מומלצות', value: '1080 × 1080 px' },
                  { label: 'יחס', value: '1:1 (ריבוע) — מתאים לנייד ולמחשב' },
                  { label: 'פורמט', value: 'JPG / PNG' },
                  { label: 'משקל מקסימלי', value: 'עד 2MB' },
                ]}
                hint="ריבוע נראה הכי טוב בחלון הקופץ בשני המכשירים. אפשר גם 4:5 לאורך. השאר ריק כדי לבטל את הפופ-אפ."
                currentUrl={popupImage}
                onUpload={handlePopupUpload}
                uploading={uploadingPopup}
                aspectClass="aspect-square max-w-[220px]"
              />
              {popupImage && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">קישור בלחיצה (אופציונלי)</label>
                  <input
                    value={popupLink}
                    onChange={e => setPopupLink(e.target.value)}
                    placeholder="https://...  (לאן להוביל בלחיצה על הפרסומת)"
                    dir="ltr"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <Palette className="w-4 h-4 text-gray-400" />
                עיצוב
              </h2>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">צבע ראשי</label>
                <p className="text-xs text-gray-400">משפיע על הבאנר, כפתורים ו-progress bar</p>
                <div className="flex items-center gap-3 mt-1">
                  <input type="color" value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="w-12 h-12 rounded-xl cursor-pointer border border-gray-200 p-1" />
                  <span className="text-sm font-mono text-gray-600">{primaryColor}</span>
                  {/* Presets */}
                  <div className="flex gap-1.5 mr-2">
                    {['#2563eb','#7c3aed','#dc2626','#059669','#d97706','#0891b2'].map(c => (
                      <button key={c} onClick={() => setPrimaryColor(c)}
                        title={c}
                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${primaryColor === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">טקסט אודות / תיאור</label>
                <p className="text-xs text-gray-400">מופיע במקטע "אודות". אפשר להדגיש, לצבוע, לשנות גודל, ליישר ולהוסיף קישורים</p>
                <div className="mt-1">
                  <RichTextEditor value={aboutText} onChange={setAboutText} placeholder="כתוב כאן את תיאור הקמפיין..." />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
                <input type="checkbox" checked={bannerVideoButton} onChange={e => setBannerVideoButton(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                <span className="text-sm text-gray-700">הצג כפתור הפעלת סרטון על הבאנר (כשמוגדר סרטון ראשי)</span>
              </label>


              <button onClick={saveBannerSettings} disabled={savingBanner}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50 transition-colors bg-blue-600 hover:bg-blue-700">
                {savedBanner ? <><Check className="w-4 h-4" /> נשמר!</> : savingBanner ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> שומר...</> : 'שמור שינויים'}
              </button>
            </div>
          </div>

          {/* Right: live preview */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-800 text-sm">תצוגה מקדימה</h2>
                <div className="flex bg-gray-100 rounded-xl p-0.5">
                  <button onClick={() => setViewMode('desktop')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === 'desktop' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>
                    <Monitor className="w-3.5 h-3.5" /> מחשב
                  </button>
                  <button onClick={() => setViewMode('mobile')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === 'mobile' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>
                    <Smartphone className="w-3.5 h-3.5" /> נייד
                  </button>
                </div>
              </div>

              <BannerPreview
                coverUrl={curBanners[0] || null}
                mobileCoverUrl={curMobileBanners[0] || null}
                logoUrl={logoUrl}
                orgLogoUrl={orgLogoUrl}
                title={campaignTitle}
                orgName={orgName}
                primaryColor={primaryColor}
                viewMode={viewMode}
              />

              {curBanners.length === 0 ? (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 text-center">
                  העלה באנר כדי לראות את התצוגה המלאה
                </div>
              ) : curBanners.length > 1 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 text-center">
                  {curBanners.length} באנרים — יתחלפו אוטומטית כל 4 שניות בעמוד הגיוס
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: Videos ─── */}
      {tab === 'videos' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-bold text-gray-800">סרטוני הקמפיין</h2>
            <p className="text-xs text-gray-400 mt-1">
              קישורי YouTube / Vimeo / Google Drive. הסרטון המסומן כ<strong>ראשי</strong> מופיע על באנר הקמפיין ובתצוגה לרשתות;
              כל הסרטונים מוצגים מעל כפתור התרומה ומעל מקטע &quot;אודות&quot;.
            </p>
            <p className="text-[11px] text-amber-600 mt-1">💡 העלאת קובץ וידאו פחות מומלצת — היא מכבידה על טעינת האתר. עדיף קישור YouTube / Drive.</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-3">
              {videos.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6 bg-gray-50 rounded-xl">עוד לא נוספו סרטונים.</p>
              )}
              {videos.map((v, i) => (
                <div key={i} className="flex items-start gap-2 border border-gray-100 rounded-xl p-2.5 bg-gray-50/50">
                  <label className="flex flex-col items-center gap-0.5 text-[11px] text-gray-500 shrink-0 cursor-pointer pt-1.5" title="קבע כסרטון ראשי">
                    <input type="radio" name="mainVideo" checked={mainVideo === i} onChange={() => setMainVideo(i)} className="accent-blue-600" />
                    ראשי
                  </label>
                  <div className="flex-1 space-y-2 min-w-0">
                    <input
                      value={v.url}
                      onChange={(e) => setVideoField(i, 'url', e.target.value)}
                      placeholder="YouTube / Vimeo / Google Drive — הדבק קישור"
                      dir="ltr"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    />
                    <label className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-blue-600 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingVideo === i ? `מעלה… ${videoProgress}%` : 'או העלה קובץ וידאו (עד 100MB)'}
                      <input type="file" accept="video/*" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadVideoFile(i, f); e.target.value = '' }} />
                    </label>
                    {uploadingVideo === i && (
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all duration-150" style={{ width: `${videoProgress}%` }} />
                      </div>
                    )}
                    <input
                      value={v.title}
                      onChange={(e) => setVideoField(i, 'title', e.target.value)}
                      placeholder="כותרת לסרטון (אופציונלי) — מוצגת בסרטונים הנוספים"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    />
                    {/* preview image (custom thumbnail or auto YouTube thumb) */}
                    <div className="flex items-center gap-2 pt-1">
                      <div className="w-20 h-12 rounded-md overflow-hidden bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center">
                        {(v.thumb || ytThumb(v.url))
                          ? <img src={v.thumb || ytThumb(v.url)!} alt="" className="w-full h-full object-cover" />
                          : <Image className="w-4 h-4 text-gray-300" />}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                        <label className="inline-flex items-center gap-1 text-gray-500 hover:text-blue-600 cursor-pointer">
                          <Upload className="w-3 h-3" /> {uploadingThumb === i ? 'מעלה…' : 'העלה תמונת תצוגה'}
                          <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadVideoThumb(i, f); e.target.value = '' }} />
                        </label>
                        {isFileVideo(v.url) && (
                          <button type="button" onClick={() => setFramePicker(i)} className="inline-flex items-center gap-1 text-gray-500 hover:text-blue-600">
                            <Image className="w-3 h-3" /> בחר פריים מהסרטון
                          </button>
                        )}
                        {v.thumb && <button type="button" onClick={() => setVideoField(i, 'thumb', '')} className="text-red-400 hover:text-red-600">הסר</button>}
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => removeVideo(i)} title="הסר"
                    className="w-9 h-9 rounded-lg text-red-400 hover:bg-red-50 flex items-center justify-center shrink-0"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>

            <button type="button" onClick={addVideo}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700">
              <Plus className="w-4 h-4" /> הוסף סרטון
            </button>

            <label className="flex items-center gap-2 cursor-pointer bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
              <input type="checkbox" checked={showVideos} onChange={e => setShowVideos(e.target.checked)} className="w-4 h-4 accent-blue-600" />
              <span className="text-sm text-gray-700">הצג את הסרטונים בדף הקמפיין</span>
            </label>
            <p className="text-[11px] text-gray-400 -mt-2">בטל סימון כדי להסתיר את מקטע הסרטונים מהדף הציבורי — מבלי למחוק את הסרטונים.</p>

            <label className="flex items-center gap-2 cursor-pointer bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
              <input type="checkbox" checked={bannerVideoButton} onChange={e => setBannerVideoButton(e.target.checked)} className="w-4 h-4 accent-blue-600" />
              <span className="text-sm text-gray-700">הצג כפתור הפעלת סרטון (▶) על הבאנר העליון</span>
            </label>
            <p className="text-[11px] text-gray-400 -mt-2">בטל סימון כדי להסיר את כפתור הפליי שמופיע על תמונת הבאנר.</p>

            <div className="pt-2">
              <button onClick={saveVideos} disabled={savingVideos}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
                {savedVideos ? <><Check className="w-4 h-4" /> נשמר!</> : savingVideos ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> שומר...</> : 'שמור'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: Gallery ─── */}
      {tab === 'gallery' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-gray-800">גלריית תמונות</h2>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{gallery.length} תמונות</span>
            </div>
            <button onClick={() => galleryRef.current?.click()} disabled={uploadingGallery}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50">
              {uploadingGallery
                ? <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                : <Plus className="w-4 h-4" />}
              הוסף תמונות
            </button>
            <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => e.target.files && handleGalleryUpload(e.target.files)} />
          </div>

          {/* Gallery specs */}
          <div className="mx-6 mt-4 rounded-xl bg-blue-50/60 border border-blue-100 px-4 py-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 mb-1.5">
              <Ruler className="w-3.5 h-3.5" /> מפרט תמונות הגלריה
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[11px]">
              <span className="text-gray-500">מידות מומלצות: <strong className="text-gray-700">1200 × 800 px</strong></span>
              <span className="text-gray-500">יחס: <strong className="text-gray-700">3:2</strong></span>
              <span className="text-gray-500">פורמט: <strong className="text-gray-700">JPG / WebP</strong></span>
              <span className="text-gray-500">משקל: <strong className="text-gray-700">עד 2MB לתמונה</strong></span>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* מצב תצוגת הגלריה */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-700 shrink-0">תצוגה בדף:</span>
              {([['carousel', 'מתחלפות (סלייד-שואו)'], ['stacked', 'כל התמונות בזו אחר זו']] as const).map(([val, label]) => (
                <button key={val} type="button" onClick={() => saveGalleryMode(val)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${galleryMode === val ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'}`}>
                  {label}
                </button>
              ))}
              <span className="text-[11px] text-gray-400 w-full">סדר התמונות נקבע לפי החצים על כל תמונה (במצב &quot;כל התמונות&quot; מוצגות לפי הסדר).</span>
            </div>
            {gallery.length === 0 ? (
              <button onClick={() => galleryRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center hover:border-blue-300 hover:bg-blue-50/30 transition-all">
                <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">לחץ להוספת תמונות לגלריה</p>
                <p className="text-xs text-gray-400 mt-1">הגלריה מוצגת כ-slideshow בדף הגיוס</p>
              </button>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {gallery.map((item, i) => (
                  <div key={item.id} className="group relative rounded-2xl overflow-hidden aspect-video bg-gray-100">
                    <img src={item.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          <button onClick={() => moveGalleryItem(i, -1)} disabled={i === 0} title="הזז ימינה (מוקדם יותר)"
                            className="w-6 h-6 bg-white/20 hover:bg-white/30 disabled:opacity-30 text-white rounded-full flex items-center justify-center"><ChevronUp className="w-3.5 h-3.5 -rotate-90" /></button>
                          <button onClick={() => moveGalleryItem(i, 1)} disabled={i === gallery.length - 1} title="הזז שמאלה (מאוחר יותר)"
                            className="w-6 h-6 bg-white/20 hover:bg-white/30 disabled:opacity-30 text-white rounded-full flex items-center justify-center"><ChevronDown className="w-3.5 h-3.5 -rotate-90" /></button>
                        </div>
                        <button onClick={() => deleteGalleryItem(item.id)}
                          className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <input type="text" defaultValue={item.caption || ''}
                        onBlur={e => updateCaption(item.id, e.target.value)}
                        placeholder="כיתוב (אופציונלי)"
                        className="w-full bg-black/50 text-white text-xs placeholder-white/50 border-none outline-none rounded px-2 py-1"
                        onClick={e => e.stopPropagation()} />
                    </div>
                  </div>
                ))}
                <button onClick={() => galleryRef.current?.click()}
                  className="aspect-video rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/30 transition-all">
                  <Plus className="w-5 h-5 mb-1" />
                  <span className="text-xs">הוסף</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB: Buttons ─── */}
      {tab === 'buttons' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <Palette className="w-4 h-4 text-gray-400" /> כפתורי תרומה
            </h2>
            <button onClick={addPlan} className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700">
              <Plus className="w-4 h-4" /> הוסף כפתור
            </button>
          </div>
          <p className="text-xs text-gray-400">
            לכל כפתור אפשר להעלות <strong>עיצוב (תמונה)</strong> שיופיע במקום הסכום הגדול, ולכתוב <strong>טקסט שיופיע מתחת לכפתור</strong>.
          </p>

          <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
            <span className="text-xs text-gray-500 shrink-0 font-medium">טקסט כפתור התרומה (ברירת מחדל):</span>
            <input value={donateCta} onChange={e => setDonateCta(e.target.value)}
              placeholder='"תרומה" (ברירת מחדל). אפשר לדרוס לכל כפתור.'
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          {/* language toggle — which language's button designs you're editing */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 text-sm font-semibold">
              {(['he', 'en'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setButtonLang(l)}
                  className={`px-4 py-1.5 rounded-lg transition-colors ${buttonLang === l ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {l === 'he' ? 'עברית' : 'English'}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-gray-400">
              {buttonLang === 'en' ? 'עיצובי הכפתורים למבקרים באנגלית (אם ריק — יוצג עיצוב העברית)' : 'עיצוב ברירת המחדל'}
            </span>
          </div>

          {/* Plan editors */}
          <div className="space-y-3">
            {plans.map((plan, i) => (
              <PlanEditor key={i} plan={plan} lang={buttonLang}
                uploading={uploadingPlan === i}
                isFirst={i === 0} isLast={i === plans.length - 1}
                customForms={campaignCustomForms}
                preStepEnabled={campaignPreStepEnabled}
                onChange={patch => updatePlan(i, patch)}
                onUpload={file => uploadPlanImage(i, file)}
                onRemove={() => removePlan(i)}
                onMoveUp={() => movePlan(i, -1)}
                onMoveDown={() => movePlan(i, 1)} />
            ))}
            {plans.length === 0 && (
              <button onClick={addPlan} className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-8 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-all">
                + הוסף כפתור תרומה ראשון
              </button>
            )}

            {/* עיצוב לכפתור "סכום אחר" */}
            <div className="flex items-center gap-3 border border-gray-100 rounded-2xl p-3 bg-gray-50/50">
              <label className="w-16 h-16 rounded-full overflow-hidden shrink-0 cursor-pointer relative border-2 border-dashed border-gray-200 hover:border-blue-300 bg-white flex items-center justify-center group" title="עיצוב לכפתור סכום אחר">
                {otherAmountImage ? (
                  <>
                    <img src={otherAmountImage} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Upload className="w-4 h-4 text-white" /></div>
                  </>
                ) : uploadingOther ? (
                  <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                ) : <Image className="w-5 h-5 text-gray-300" />}
                <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadOtherImage(f); e.target.value = '' }} />
              </label>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800">כפתור &quot;סכום אחר&quot;</p>
                <p className="text-[11px] text-gray-400">עיצוב אופציונלי לכפתור שבו התורם מקליד סכום חופשי. בלי עיצוב — יוצג העיגול המקווקו הרגיל.</p>
              </div>
              {otherAmountImage && (
                <button onClick={() => setOtherAmountImage(null)} className="text-[10px] text-gray-400 hover:text-red-500 shrink-0" title="הסר עיצוב">הסר עיצוב</button>
              )}
            </div>

            {/* מיקום כפתור "סכום אחר" */}
            <div className="border border-gray-100 rounded-2xl p-3 bg-gray-50/50">
              <p className="text-sm font-bold text-gray-800 mb-2">מיקום כפתור &quot;סכום אחר&quot;</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['grid', 'ברשימת הכפתורים', 'ככפתור נוסף בין הסכומים — עם אפשרות להעלאת גרפיקה'],
                  ['cta', 'ליד כפתור "לתרומה"', 'כפתור נפרד מימין לכפתור התרומה (פותח חלון להקלדת סכום)'],
                ] as const).map(([val, title, desc]) => (
                  <button key={val} type="button" onClick={() => setOtherAmountPlacement(val)}
                    className={`text-right rounded-xl border px-3 py-2.5 transition-colors ${otherAmountPlacement === val ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <span className={`text-xs font-bold block ${otherAmountPlacement === val ? 'text-blue-700' : 'text-gray-600'}`}>{title}</span>
                    <span className="text-[10px] text-gray-400">{desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live preview — like the donation page */}
          {plans.some(p => p.amount > 0) && (
            <div className="p-5 bg-gray-50 rounded-2xl space-y-3">
              <p className="text-xs text-gray-400 font-medium">תצוגה מקדימה (כמו בעמוד הגיוס)</p>
              <div className="flex gap-4 flex-wrap">
                {plans.filter(p => p.amount > 0).map((plan, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="w-[88px] h-[88px] rounded-full overflow-hidden shadow-md">
                      {plan.image_url
                        ? <img src={plan.image_url} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${primaryColor}dd, ${primaryColor}88)` }}>
                            <span className="text-white font-black text-lg">₪{plan.amount.toLocaleString()}</span>
                          </div>}
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-gray-800">₪{plan.amount.toLocaleString()}</div>
                      {plan.label && <div className="text-[11px] text-gray-400 mt-0.5">{plan.label}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={savePlans} disabled={savingAmounts}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
            {savedAmounts ? <><Check className="w-4 h-4" /> נשמר!</> : savingAmounts ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> שומר...</> : 'שמור'}
          </button>
        </div>
      )}

      {framePicker !== null && videos[framePicker] && (
        <FrameGrabber
          src={videos[framePicker].url}
          onClose={() => setFramePicker(null)}
          onCapture={(blob) => {
            const idx = framePicker
            setFramePicker(null)
            uploadVideoThumb(idx, new File([blob], 'frame.jpg', { type: 'image/jpeg' }))
          }}
        />
      )}
    </div>
  )
}
