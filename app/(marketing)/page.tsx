import type { Metadata } from 'next'
import Hero from './_components/Hero'
import Pain from './_components/Pain'
import Zero from './_components/Zero'
import Features from './_components/Features'
import Campaigns from './_components/Campaigns'
import Trust from './_components/Trust'
import HomeRuntime from './_components/HomeRuntime'
import FeaturesRuntime from './_components/FeaturesRuntime'

export const metadata: Metadata = {
  title: 'כפול — כפול בהשפעה. כפול בתוצאה.',
  description: 'פלטפורמת גיוס התרומות לבתי חב״ד, עמותות ומוסדות. דף תרומה, מוקד טלפנים וחיבור וואטסאפ — במקום אחד.',
}

export default function HomePage() {
  return (
    <main>
      <Hero />
      <Pain />
      <Zero />
      <Features />
      <Campaigns />
      <Trust />
      <HomeRuntime />
      <FeaturesRuntime />
    </main>
  )
}
