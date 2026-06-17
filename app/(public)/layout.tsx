import { createClient } from '@/lib/supabase/server'
import PublicHeaderGate from './_components/PublicHeaderGate'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
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

  return (
    <>
      <PublicHeaderGate hiddenPages={hiddenPages} />
      {children}
    </>
  )
}
