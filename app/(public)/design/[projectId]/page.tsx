import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getHiddenNavPages } from '@/lib/nav'
import Footer from '../../_components/Footer'
import { isUuid } from '@/lib/media'
import ProjectView, { type Project } from './ProjectView'

export const revalidate = 60 // ISR

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://kafool.com'

async function getProject(projectId: string): Promise<Project | null> {
  const supabase = await createClient()
  // Links use the slug when present, otherwise the uuid. Query the matching
  // column to avoid casting a non-uuid slug against the uuid `id` column.
  const query = supabase.from('portfolio_items').select('*').eq('is_published', true).limit(1)
  const { data } = isUuid(projectId)
    ? await query.eq('id', projectId)
    : await query.eq('slug', projectId)
  const row = data?.[0]
  return row ? (row as Project) : null
}

export async function generateMetadata({ params }: { params: Promise<{ projectId: string }> }): Promise<Metadata> {
  const { projectId } = await params
  const project = await getProject(projectId)
  if (!project) return { title: 'תיק עבודות | Kafool' }
  const title = `${project.title || project.label || 'פרויקט'} | תיק עבודות Kafool`
  const description = project.description?.slice(0, 160) || 'עיצוב, מודעה וקמפיין שיצרנו ב-Kafool'
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/design/${project.slug || project.id}`,
      siteName: 'Kafool',
      images: [{ url: project.image_url, width: 1200, height: 630, alt: project.title || 'פרויקט' }],
      locale: 'he_IL',
      type: 'article',
    },
  }
}

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params

  // Whole portfolio hidden from the public site? send visitors home.
  const hidden = await getHiddenNavPages(await createClient())
  if (hidden.includes('design')) redirect('/')

  const project = await getProject(projectId)
  if (!project) notFound()

  return (
    <div dir="rtl" className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <Link href="/design" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors">
          <ArrowRight className="w-4 h-4" />
          חזרה לתיק העבודות
        </Link>
      </div>

      <ProjectView project={project} />

      <div className="max-w-5xl mx-auto px-4 pb-20 text-center">
        <Link
          href="/contact"
          className="inline-block bg-blue-600 text-white font-black text-lg px-8 py-4 rounded-2xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
        >
          רוצה עבודה כזו? דברו איתנו
        </Link>
      </div>

      <Footer />
    </div>
  )
}
