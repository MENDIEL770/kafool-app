import type { SupabaseClient } from '@supabase/supabase-js'

// Pages the super admin chose to hide from the public site, stored in the CMS
// "ניווט" tab (page_content: page='settings', key='hidden_nav_pages' → JSON
// array of keys like ['design','faq']). Used to drop nav links AND to fully
// block the matching public page.
export async function getHiddenNavPages(supabase: SupabaseClient): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('page_content')
      .select('value')
      .eq('page', 'settings')
      .eq('key', 'hidden_nav_pages')
      .single()
    if (data?.value) return JSON.parse(data.value)
  } catch {
    // missing row / parse error → nothing hidden
  }
  return []
}
