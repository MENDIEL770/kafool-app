import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CmsClient, { type PageContentRow, type FaqItem, type ContactSettingsData } from './CmsClient'
import type { Submission } from './SubmissionModal'
import FeaturedCampaignsAdmin, { type FeatureRow } from './FeaturedCampaignsAdmin'

export default async function CmsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') redirect('/dashboard')

  // Fetch page_content for about
  let aboutContent: PageContentRow[] = []
  try {
    const { data } = await supabase
      .from('page_content')
      .select('key, value')
      .eq('page', 'about')
      .order('sort_order')
    aboutContent = (data ?? []) as PageContentRow[]
  } catch {
    aboutContent = []
  }

  // Fetch faq_items
  let faqItems: FaqItem[] = []
  try {
    const { data } = await supabase
      .from('faq_items')
      .select('*')
      .order('sort_order')
    faqItems = (data ?? []) as FaqItem[]
  } catch {
    faqItems = []
  }

  // Fetch contact_settings
  let contactSettings: ContactSettingsData | null = null
  try {
    const { data } = await supabase
      .from('contact_settings')
      .select('*')
      .limit(1)
      .single()
    contactSettings = data as ContactSettingsData | null
  } catch {
    contactSettings = null
  }

  // Fetch nav visibility
  let hiddenPages: string[] = []
  try {
    const { data } = await supabase
      .from('page_content')
      .select('value')
      .eq('page', 'settings')
      .eq('key', 'hidden_nav_pages')
      .single()
    if (data?.value) hiddenPages = JSON.parse(data.value)
  } catch {
    hiddenPages = []
  }

  // Fetch contact_submissions
  let submissions: Submission[] = []
  try {
    const { data } = await supabase
      .from('contact_submissions')
      .select('*')
      .order('created_at', { ascending: false })
    submissions = (data ?? []) as Submission[]
  } catch {
    submissions = []
  }

  // All campaigns, for the home-page showcase picker (guarded so a missing
  // show_on_homepage column just renders every campaign as "hidden").
  let featureRows: FeatureRow[] = []
  try {
    const admin = await createServiceClient()
    const { data } = await admin
      .from('campaigns')
      .select('id, title, slug, cover_image_url, show_on_homepage')
      .order('created_at', { ascending: false })
    featureRows = (data ?? []).map(c => ({
      id: c.id, title: c.title, slug: c.slug, cover_image_url: c.cover_image_url ?? null,
      show_on_homepage: (c as { show_on_homepage?: boolean }).show_on_homepage === true,
    }))
  } catch {
    featureRows = []
  }

  return (
    <>
      <CmsClient
        aboutContent={aboutContent}
        faqItems={faqItems}
        contactSettings={contactSettings}
        submissions={submissions}
        hiddenPages={hiddenPages}
      />
      <div className="mx-auto max-w-4xl px-4 pb-16">
        <FeaturedCampaignsAdmin campaigns={featureRows} />
      </div>
    </>
  )
}
