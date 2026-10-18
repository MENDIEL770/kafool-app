import type { Metadata } from 'next'
import Hero from './_components/Hero'
import HomeRuntime from './_components/HomeRuntime'

export const metadata: Metadata = {
  title: 'כפול — כפול בהשפעה. כפול בתוצאה.',
  description: 'פלטפורמת גיוס התרומות לבתי חב״ד, עמותות ומוסדות. דף תרומה, מוקד טלפנים וחיבור וואטסאפ — במקום אחד.',
}

export default function HomePage() {
  return (
    <main>
      <Hero />
      <HomeRuntime />
    </main>
  )
}
