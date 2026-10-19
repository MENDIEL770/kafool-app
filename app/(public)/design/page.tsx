import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getHiddenNavPages } from '@/lib/nav'
import MarketingShell from '../../(marketing)/_components/MarketingShell'
import { Loop } from '../../(marketing)/_components/ui'
import InnerRuntime from '../../(marketing)/_components/InnerRuntime'

export const metadata: Metadata = {
  title: 'העיצובים שלנו · כפול',
  description: 'תיק העבודות של כפול — עיצובים, מודעות וקמפיינים שיצרנו ללקוחות שלנו.',
}
export const revalidate = 60

type Item = { id: string; image_url: string; label: string | null; title: string | null; slug: string | null; project_images: string[] | null }

const Lp = () => <svg className="lp-svg" viewBox="0 0 1400 840" aria-hidden="true"><use href="#kf-loop" /></svg>

export default async function DesignsPage() {
  const supabase = await createClient()
  const hidden = await getHiddenNavPages(supabase)
  if (hidden.includes('design')) redirect('/')

  const { data } = await supabase
    .from('portfolio_items')
    .select('id, image_url, label, title, slug, project_images')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
  const items = (data ?? []) as Item[]

  // Filter chips from the distinct labels (first-seen order) + counts.
  const order: string[] = []
  const counts: Record<string, number> = {}
  for (const it of items) { const l = (it.label || '').trim(); if (!l) continue; if (!(l in counts)) { order.push(l); counts[l] = 0 } counts[l]++ }
  const filters: [string, number][] = [['הכל', items.length], ...order.map(l => [l, counts[l]] as [string, number])]

  return (
    <MarketingShell>
      <main className="pg" data-page="designs">
        <header className="pg-hero">
          <div className="loopbg" aria-hidden="true"><Lp /></div>
          <span className="eyebrow rv">העיצובים שלנו</span>
          <h1 className="pg-t rv" style={{ '--d': '80ms' }}>תיק העבודות<span>שלנו.</span></h1>
          <p className="pg-sub rv" style={{ '--d': '160ms' }}>עיצובים, מודעות וקמפיינים שיצרנו ללקוחות שלנו. לחצו על עבודה כדי לראות את כל המודעות של הפרויקט.</p>
        </header>
        <section className="pg-sec"><div className="pg-in">
          <div className="ds-f" role="group" aria-label="סינון">
            {filters.map(([f, n], i) => <button type="button" data-f={f} aria-pressed={i === 0} key={f}>{f}<b>{n}</b></button>)}
          </div>
          <div className="ds-g">
            {items.map((it, i) => {
              const imgs = [it.image_url, ...((it.project_images ?? []).filter(u => u && u !== it.image_url))]
              const title = it.title || 'עבודת עיצוב'
              return (
                <button type="button" className="ds-c rv" data-cat={it.label || ''} data-i={i} data-link={it.slug ? `/design/${it.slug}` : `/design/${it.id}`} data-images={JSON.stringify(imgs)} style={{ '--d': `${(i % 6) * 50}ms` }} key={it.id}>
                  <span className="ds-im">
                    <img loading="lazy" decoding="async" alt={title} data-src={it.image_url} />
                    <span className={`ds-ph c${i % 4}`} style={{ '--ar': '4/5' }}><Lp /><b>{title}</b><small>{it.label || ''}</small></span>
                    {imgs.length > 1 && <span className="ds-count" aria-hidden="true">{imgs.length}</span>}
                  </span>
                  <span className="ds-cap"><b>{title}</b><span className="ds-tag">{it.label || ''}</span></span>
                </button>
              )
            })}
          </div>
        </div></section>
      </main>

      <div className="lb" id="lb" hidden role="dialog" aria-modal="true" aria-label="תצוגת עבודה">
        <div className="lb-bg" data-lbx />
        <button type="button" className="lb-x" data-lbx aria-label="סגירה"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        <button type="button" className="lb-nav p" data-lbn="-1" aria-label="הקודם"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg></button>
        <button type="button" className="lb-nav n" data-lbn="1" aria-label="הבא"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg></button>
        <div className="lb-p">
          <div className="lb-im" id="lb-im" />
          <div className="lb-thumbs" id="lb-thumbs" />
          <div className="lb-cap"><b id="lb-t" /><span className="ds-tag" id="lb-c" /><a className="pill light sm" id="lb-a" target="_blank" rel="noopener">לפרויקט המלא</a></div>
        </div>
      </div>
      <InnerRuntime />
    </MarketingShell>
  )
}
