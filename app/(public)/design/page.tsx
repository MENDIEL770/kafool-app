import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import Footer from '../_components/Footer'
import AnimatedKafoolLogo from '../_components/AnimatedKafoolLogo'
import PortfolioGallery, { type PortfolioItem } from './PortfolioGallery'

export const metadata: Metadata = {
  title: 'תיק עבודות | Kafool',
  description: 'עיצובים, מודעות וקמפיינים שיצרנו ללקוחות שלנו',
}

export default async function DesignPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  const items = (data ?? []) as PortfolioItem[]

  return (
    <div dir="rtl" className="min-h-screen bg-white">
      {/* Hero — animated logo */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <AnimatedKafoolLogo className="w-52 sm:w-64 h-auto kafool-logo-float" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3">תיק העבודות שלנו</h1>
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            עיצובים, מודעות וקמפיינים שיצרנו ללקוחות שלנו — לחצו על כל עבודה כדי להגדיל
          </p>
          <Link
            href="/contact"
            className="inline-block bg-blue-600 text-white font-black text-lg px-8 py-4 rounded-2xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            הזמנת עבודה
          </Link>
        </div>
      </section>

      {/* Gallery */}
      <PortfolioGallery items={items} />

      <Footer />
    </div>
  )
}
