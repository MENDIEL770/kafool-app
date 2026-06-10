import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CmsClient, { type PageContentRow, type FaqItem, type ContactSettingsData } from './CmsClient'
import type { Submission } from './SubmissionModal'

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

  return (
    <CmsClient
      aboutContent={aboutContent}
      faqItems={faqItems}
      contactSettings={contactSettings}
      submissions={submissions}
    />
  )
}
