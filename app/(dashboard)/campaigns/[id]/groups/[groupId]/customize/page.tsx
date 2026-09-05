'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadImage } from '@/lib/image-client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import RichTextEditor from '@/components/RichTextEditor'
import { PlanEditor, withCid, type DonationPlan } from '../../../media/CampaignMediaClient'
import { Upload, Trash2, ArrowRight, Check } from 'lucide-react'

type BannerObj = { url: string; sort_order: number }
const urlsOf = (v?: BannerObj[]) => v?.length ? [...v].sort((a, b) => a.sort_order - b.sort_order).map(b => b.url) : []

// A row of banner thumbnails with always-visible delete + replace (touch-friendly)
// plus an upload tile. Module-scoped so it doesn't remount on every keystroke.
function BannerList({ list, kind, busy, onDelete, onReplace, onAdd }: {
  list: string[]
  kind: 'desktop' | 'mobile'
  busy: boolean
  onDelete: (i: number) => void
  onReplace: (i: number, f: File) => void
  onAdd: (f: File) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {list.map((url, i) => (
          <div key={i} className="relative w-28 h-16 rounded-lg overflow-hidden border border-gray-200">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <div className="absolute top-1 left-1 flex gap-1">
              <button type="button" onClick={() => onDelete(i)} title="מחק"
                className="w-6 h-6 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow hover:bg-red-700"><Trash2 className="w-3.5 h-3.5" /></button>
              <label title="החלף" className="w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center shadow hover:bg-black/80 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onReplace(i, f); e.target.value = '' }} />
              </label>
            </div>
          </div>
        ))}
        <label className={`w-28 h-16 rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-300 flex items-center justify-center cursor-pointer bg-gray-50 ${busy ? 'opacity-60 pointer-events-none' : ''}`}>
          {busy ? <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4 text-gray-300" />}
          <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onAdd(f); e.target.value = '' }} />
        </label>
      </div>
      {list.length === 0 && <p className="text-[11px] text-gray-400">ריק — יוצגו הבאנרים של הקמפיין.</p>}
    </div>
  )
}

// Per-group customization: banners / donation buttons / about text / primary color.
// Anything left empty is INHERITED from the campaign (the public page falls back).
export default function GroupCustomizePage() {
  const { id: campaignId, groupId } = useParams() as { id: string; groupId: string }
  const router = useRouter()
  const supabase = createClient()

  const [groupName, setGroupName] = useState('')
  const [groupSlug, setGroupSlug] = useState('')
  const [campaignSlug, setCampaignSlug] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [banners, setBanners] = useState<string[]>([])
  const [mobileBanners, setMobileBanners] = useState<string[]>([])
  const [plans, setPlans] = useState<DonationPlan[]>([])
  const [aboutText, setAboutText] = useState('')
  const [primaryColor, setPrimaryColor] = useState('')
  const [uploadingBanner, setUploadingBanner] = useState<'desktop' | 'mobile' | null>(null)
  const [uploadingPlan, setUploadingPlan] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      const { data: g } = await supabase.from('groups').select('*, campaigns(slug)').eq('id', groupId).single()
      if (g) {
        setGroupName(g.name); setGroupSlug(g.slug)
        setCampaignSlug((g as { campaigns?: { slug?: string } }).campaigns?.slug || '')
        const s = (g.settings || {}) as {
          banners?: BannerObj[]; mobile_banners?: BannerObj[]; donation_plans?: DonationPlan[]; about_text?: string; primary_color?: string
        }
        setBanners(urlsOf(s.banners))
        setMobileBanners(urlsOf(s.mobile_banners))
        setPlans(withCid(s.donation_plans || []))
        setAboutText(s.about_text || '')
        setPrimaryColor(s.primary_color || '')
      }
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  async function addBanner(file: File, kind: 'desktop' | 'mobile') {
    setUploadingBanner(kind)
    try {
      const url = await uploadImage(file, `groups/${groupId}/banner-${kind}-${Date.now()}`)
      if (kind === 'mobile') setMobileBanners(b => [...b, url]); else setBanners(b => [...b, url])
    } catch { alert('העלאת התמונה נכשלה') }
    setUploadingBanner(null)
  }

  async function replaceBanner(file: File, kind: 'desktop' | 'mobile', i: number) {
    setUploadingBanner(kind)
    try {
      const url = await uploadImage(file, `groups/${groupId}/banner-${kind}-${Date.now()}`)
      const set = kind === 'mobile' ? setMobileBanners : setBanners
      set(b => b.map((u, idx) => idx === i ? url : u))
    } catch { alert('העלאת התמונה נכשלה') }
    setUploadingBanner(null)
  }

  const deleteBanner = (kind: 'desktop' | 'mobile', i: number) => {
    const set = kind === 'mobile' ? setMobileBanners : setBanners
    set(b => b.filter((_, idx) => idx !== i))
  }

  // plan operations (reuse PlanEditor)
  const updatePlan = (i: number, patch: Partial<DonationPlan>) => setPlans(p => p.map((x, idx) => idx === i ? { ...x, ...patch } : x))
  const removePlan = (i: number) => setPlans(p => p.filter((_, idx) => idx !== i))
  const addPlan = () => setPlans(p => [...p, { amount: 0, label: '', image_url: null, _cid: crypto.randomUUID() }])
  const movePlan = (i: number, dir: -1 | 1) => setPlans(p => { const j = i + dir; if (j < 0 || j >= p.length) return p; const n = [...p]; [n[i], n[j]] = [n[j], n[i]]; return n })
  async function uploadPlanImage(i: number, file: File) {
    setUploadingPlan(i)
    try { const url = await uploadImage(file, `groups/${groupId}/plan-${i}-${Date.now()}`); updatePlan(i, { image_url: url }) } catch { alert('העלאת התמונה נכשלה') }
    setUploadingPlan(null)
  }

  async function save() {
    setSaving(true)
    // re-fetch current settings so we never clobber other keys
    const { data: cur } = await supabase.from('groups').select('settings').eq('id', groupId).single()
    const clean = plans.filter(p => p.amount > 0).map(p => ({
      amount: p.amount, label: p.label?.trim() || null, image_url: p.image_url || null,
      amount_usd: Number(p.amount_usd) > 0 ? Number(p.amount_usd) : null,
      payment_type: p.payment_type || 'one_time',
      months: p.payment_type === 'hok' ? (Number(p.months) || null) : null,
      form: p.form || null, cta: p.cta?.trim() || null,
    }))
    const settings = {
      ...(cur?.settings as object || {}),
      banners: banners.map((url, i) => ({ url, sort_order: i })),
      mobile_banners: mobileBanners.map((url, i) => ({ url, sort_order: i })),
      donation_plans: clean,
      about_text: aboutText.trim() || null,
      primary_color: primaryColor || null,
    }
    const { error } = await supabase.from('groups').update({ settings }).eq('id', groupId)
    if (error) {
      if (/settings/i.test(error.message) || /column/i.test(error.message)) {
        alert('חסרה עמודת settings בטבלת הקבוצות. הרץ ב-Supabase:\nalter table groups add column if not exists settings jsonb;')
      } else alert('השמירה נכשלה: ' + error.message)
      setSaving(false); return
    }
    // bust the public group page's ISR cache
    try { await fetch('/api/revalidate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: campaignSlug, groupSlug }) }) } catch { /* best effort */ }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
    router.refresh()
  }

  if (loading) return <div className="p-6 text-sm text-gray-400" dir="rtl">טוען…</div>

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-10" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.push(`/campaigns/${campaignId}/groups`)} className="text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1 mb-1">
            <ArrowRight className="w-3 h-3" /> חזרה לקבוצות
          </button>
          <h1 className="text-xl font-bold text-gray-900">התאמה אישית — {groupName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">באנרים, כפתורים, אודות וצבע שיוצגו כשנכנסים לדף הקבוצה. מה שריק — יורש מהקמפיין.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <h2 className="text-base font-bold text-gray-900">באנרים</h2>
        <div className="space-y-1"><Label className="text-xs">באנרים (מחשב)</Label>
          <BannerList list={banners} kind="desktop" busy={uploadingBanner === 'desktop'}
            onAdd={f => addBanner(f, 'desktop')} onReplace={(i, f) => replaceBanner(f, 'desktop', i)} onDelete={i => deleteBanner('desktop', i)} />
        </div>
        <div className="space-y-1"><Label className="text-xs">באנרים לנייד (אופציונלי)</Label>
          <BannerList list={mobileBanners} kind="mobile" busy={uploadingBanner === 'mobile'}
            onAdd={f => addBanner(f, 'mobile')} onReplace={(i, f) => replaceBanner(f, 'mobile', i)} onDelete={i => deleteBanner('mobile', i)} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">כפתורי תרומה</h2>
          <button onClick={addPlan} className="text-sm font-semibold text-blue-600 hover:text-blue-700">+ הוסף כפתור</button>
        </div>
        {plans.map((plan, i) => (
          <PlanEditor key={plan._cid || i} plan={plan} lang="he" uploading={uploadingPlan === i}
            isFirst={i === 0} isLast={i === plans.length - 1} customForms={[]} preStepEnabled={false}
            onChange={patch => updatePlan(i, patch)} onUpload={file => uploadPlanImage(i, file)}
            onRemove={() => removePlan(i)} onMoveUp={() => movePlan(i, -1)} onMoveDown={() => movePlan(i, 1)} />
        ))}
        {plans.length === 0 && <p className="text-[11px] text-gray-400">אין כפתורים — יוצגו כפתורי הקמפיין.</p>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2">
        <h2 className="text-base font-bold text-gray-900">טקסט אודות</h2>
        <RichTextEditor value={aboutText} onChange={setAboutText} placeholder="טקסט אודות מיוחד לקבוצה… (ריק = טקסט הקמפיין)" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2">
        <h2 className="text-base font-bold text-gray-900">צבע ראשי</h2>
        <div className="flex items-center gap-3">
          <input type="color" value={primaryColor || '#2563eb'} onChange={e => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border border-gray-200" />
          <span className="text-sm text-gray-500 font-mono">{primaryColor || '(ברירת מחדל של הקמפיין)'}</span>
          {primaryColor && <button onClick={() => setPrimaryColor('')} className="text-xs text-red-400 hover:text-red-600">אפס לברירת מחדל</button>}
        </div>
      </div>

      <div className="sticky bottom-0 bg-gray-50/90 backdrop-blur py-3 -mx-1 px-1">
        <Button onClick={save} disabled={saving || uploadingBanner !== null || uploadingPlan !== null} className="w-full">
          {saved ? <><Check className="w-4 h-4" /> נשמר!</> : saving ? 'שומר…' : (uploadingBanner || uploadingPlan !== null) ? 'מעלה תמונה…' : 'שמור התאמה אישית'}
        </Button>
      </div>
    </div>
  )
}
