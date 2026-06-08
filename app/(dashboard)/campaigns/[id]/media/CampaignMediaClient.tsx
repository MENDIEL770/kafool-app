'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import {
  Upload, ImageIcon, Trash2, X, Monitor, Smartphone,
  LayoutGrid, Plus, Check, ArrowRight, Eye, Palette, Image
} from 'lucide-react'

/* ─── Types ─── */
interface GalleryItem { id: string; image_url: string; caption: string | null; sort_order: number }

interface Props {
  campaignId: string
  campaignTitle: string
  campaignSlug: string
  orgId: string
  orgName: string
  orgLogoUrl: string | null
  initialCoverUrl: string | null
  initialLogoUrl: string | null
  initialGallery: GalleryItem[]
  initialSettings: Record<string, unknown>
}


type Tab = 'banner' | 'gallery' | 'buttons'

/* ─── Banner Preview Component ─── */
function BannerPreview({
  coverUrl, logoUrl, orgLogoUrl, title, orgName, primaryColor, viewMode,
}: {
  coverUrl: string | null; logoUrl: string | null; orgLogoUrl: string | null;
  title: string; orgName: string; primaryColor: string; viewMode: 'desktop' | 'mobile';
}) {
  const logoSrc = logoUrl || orgLogoUrl

  if (viewMode === 'mobile') {
    return (
      <div className="mx-auto" style={{ width: 280 }}>
        {/* Phone frame */}
        <div className="relative bg-black rounded-[2.5rem] p-2.5 shadow-2xl border-4 border-gray-800">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-full z-10" />
          <div className="rounded-[2rem] overflow-hidden bg-gray-100" style={{ height: 480 }}>
            {/* Hero */}
            <div className="relative h-44 overflow-hidden" style={{ backgroundColor: primaryColor }}>
              {coverUrl
                ? <img src={coverUrl} alt="" className="w-full h-full object-cover" />
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
  label, sublabel, hint, currentUrl, onUpload, uploading, aspectClass,
}: {
  label: string; sublabel: string; hint?: string;
  currentUrl: string | null; onUpload: (file: File) => void;
  uploading: boolean; aspectClass: string;
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
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
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

/* ─── Amount Button ─── */
function AmountPill({ amount, color, onRemove, onEdit }: {
  amount: number; color: string; onRemove: () => void; onEdit: (v: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(amount))

  if (editing) return (
    <div className="flex items-center gap-1">
      <input type="number" value={val} onChange={e => setVal(e.target.value)} autoFocus
        onKeyDown={e => { if (e.key === 'Enter' && Number(val) > 0) { onEdit(Number(val)); setEditing(false) } if (e.key === 'Escape') setEditing(false) }}
        className="w-20 border border-gray-300 rounded-xl px-2 py-2 text-sm text-center font-bold outline-none focus:ring-2 focus:ring-blue-400" dir="ltr" />
      <button onClick={() => { if (Number(val) > 0) { onEdit(Number(val)); setEditing(false) } }} className="text-green-600 p-1"><Check className="w-3.5 h-3.5" /></button>
      <button onClick={() => setEditing(false)} className="text-gray-400 p-1"><X className="w-3.5 h-3.5" /></button>
    </div>
  )

  return (
    <div className="relative group">
      <button onDoubleClick={() => setEditing(true)} title="לחץ פעמיים לעריכה"
        className="px-4 py-2.5 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-all"
        style={{ backgroundColor: color }}>
        ₪{amount.toLocaleString()}
      </button>
      <button onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full items-center justify-center hidden group-hover:flex">
        <X className="w-2.5 h-2.5" />
      </button>
    </div>
  )
}

/* ─── Main Component ─── */
export default function CampaignMediaClient({
  campaignId, campaignTitle, campaignSlug, orgId, orgName, orgLogoUrl,
  initialCoverUrl, initialLogoUrl, initialGallery, initialSettings,
}: Props) {
  campaignSlugRef = campaignSlug

  const router = useRouter()
  const supabase = createClient()

  const [tab, setTab] = useState<Tab>('banner')
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')

  // Banner state
  const [coverUrl, setCoverUrl] = useState<string | null>(initialCoverUrl)
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [primaryColor, setPrimaryColor] = useState<string>(
    (initialSettings.primary_color as string) || '#2563eb'
  )
  const [aboutText, setAboutText] = useState<string>(
    (initialSettings.about_text as string) || ''
  )
  const [savingBanner, setSavingBanner] = useState(false)
  const [savedBanner, setSavedBanner] = useState(false)

  // Gallery state
  const [gallery, setGallery] = useState<GalleryItem[]>(initialGallery)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const galleryRef = useRef<HTMLInputElement>(null)

  // Amounts state
  const [amounts, setAmounts] = useState<number[]>(
    (initialSettings.donation_amounts as number[]) || [180, 360, 720, 1800, 3600]
  )
  const [newAmount, setNewAmount] = useState('')
  const [savingAmounts, setSavingAmounts] = useState(false)
  const [savedAmounts, setSavedAmounts] = useState(false)

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

  /* ─── Cover upload ─── */
  async function handleCoverUpload(file: File) {
    if (!file.size) { // remove
      await supabase.from('campaigns').update({ cover_image_url: null }).eq('id', campaignId)
      setCoverUrl(null); return
    }
    setUploadingCover(true)
    const url = await uploadFile(file, `${orgId}/${campaignId}/cover`)
    if (url) { await supabase.from('campaigns').update({ cover_image_url: url }).eq('id', campaignId); setCoverUrl(url) }
    setUploadingCover(false)
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

  /* ─── Save banner settings ─── */
  async function saveBannerSettings() {
    setSavingBanner(true)
    const settings = { ...(initialSettings as object), primary_color: primaryColor, about_text: aboutText || null }
    await supabase.from('campaigns').update({ settings }).eq('id', campaignId)
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

  /* ─── Save amounts ─── */
  async function saveAmounts() {
    setSavingAmounts(true)
    const settings = { ...(initialSettings as object), donation_amounts: amounts, primary_color: primaryColor }
    await supabase.from('campaigns').update({ settings }).eq('id', campaignId)
    setSavingAmounts(false); setSavedAmounts(true)
    setTimeout(() => setSavedAmounts(false), 2000)
    router.refresh()
  }

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'banner', label: 'באנר עליון', icon: Image },
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
      </div>

      {/* ─── TAB: Banner ─── */}
      {tab === 'banner' && (
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Left: controls */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-gray-400" />
                תמונת הבאנר
              </h2>

              <UploadZone
                label="תמונת רקע"
                sublabel="מוצגת כהיירו בראש עמוד הגיוס"
                hint="מומלץ: 1920×600px, יחס 16:6, JPG/WebP"
                currentUrl={coverUrl}
                onUpload={handleCoverUpload}
                uploading={uploadingCover}
                aspectClass="aspect-video"
              />

              <UploadZone
                label="לוגו / תמונה עגולה"
                sublabel="מוצגת מעל הבאנר — ריבועי, 1:1"
                hint="מומלץ: 400×400px, PNG עם רקע שקוף"
                currentUrl={logoUrl}
                onUpload={handleLogoUpload}
                uploading={uploadingLogo}
                aspectClass="aspect-square max-w-[160px]"
              />
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
                <p className="text-xs text-gray-400">מופיע כ-tagline מתחת לכותרת בהיירו ובטאב "אודות"</p>
                <textarea
                  value={aboutText}
                  onChange={e => setAboutText(e.target.value)}
                  rows={3}
                  placeholder="כתוב כאן את תיאור הקמפיין..."
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>

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
                coverUrl={coverUrl}
                logoUrl={logoUrl}
                orgLogoUrl={orgLogoUrl}
                title={campaignTitle}
                orgName={orgName}
                primaryColor={primaryColor}
                viewMode={viewMode}
              />

              {!coverUrl && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 text-center">
                  💡 העלה תמונת רקע כדי לראות את הבאנר המלא
                </div>
              )}
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
          <div className="p-6">
            {gallery.length === 0 ? (
              <button onClick={() => galleryRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center hover:border-blue-300 hover:bg-blue-50/30 transition-all">
                <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">לחץ להוספת תמונות לגלריה</p>
                <p className="text-xs text-gray-400 mt-1">הגלריה מוצגת כ-slideshow בדף הגיוס</p>
              </button>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {gallery.map(item => (
                  <div key={item.id} className="group relative rounded-2xl overflow-hidden aspect-video bg-gray-100">
                    <img src={item.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                      <button onClick={() => deleteGalleryItem(item.id)}
                        className="self-end w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center">
                        <Trash2 className="w-3 h-3" />
                      </button>
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
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <Palette className="w-4 h-4 text-gray-400" />
            כפתורי תרומה
          </h2>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">סכומי תרומה מוצעים</label>
            <p className="text-xs text-gray-400">לחץ פעמיים על כפתור לעריכה. גרור לשינוי סדר.</p>
            <div className="flex flex-wrap gap-2 items-center pt-1">
              {amounts.map((a, i) => (
                <AmountPill key={`${a}-${i}`} amount={a} color={primaryColor}
                  onRemove={() => setAmounts(p => p.filter((_, idx) => idx !== i))}
                  onEdit={val => setAmounts(p => p.map((x, idx) => idx === i ? val : x))} />
              ))}
              <div className="flex items-center gap-1">
                <input type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && Number(newAmount) > 0) { setAmounts(p => [...p, Number(newAmount)].sort((a, b) => a - b)); setNewAmount('') } }}
                  placeholder="+ הוסף"
                  className="w-24 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-center outline-none focus:ring-2 focus:ring-blue-400" dir="ltr" />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="p-5 bg-gray-50 rounded-2xl space-y-3">
            <p className="text-xs text-gray-400 font-medium">תצוגה מקדימה</p>
            <div className="flex gap-2 flex-wrap">
              {amounts.map(a => (
                <div key={a} className="px-5 py-3 rounded-xl text-white font-bold text-sm shadow-sm" style={{ backgroundColor: primaryColor }}>
                  ₪{a.toLocaleString()}
                </div>
              ))}
              <div className="px-5 py-3 rounded-xl border-2 font-bold text-sm" style={{ borderColor: primaryColor, color: primaryColor }}>
                סכום אחר
              </div>
            </div>
          </div>

          <button onClick={saveAmounts} disabled={savingAmounts}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
            {savedAmounts ? <><Check className="w-4 h-4" /> נשמר!</> : savingAmounts ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> שומר...</> : 'שמור'}
          </button>
        </div>
      )}
    </div>
  )
}
