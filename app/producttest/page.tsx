import KaparotPageClient from '../(public)/[slug]/KaparotPageClient'

// TEMP preview of the kaparot page. Delete after.
export default function ProductTest() {
  const campaign = {
    id: 'test', title: 'פדיון כפרות · בית חב״ד לדוגמה', slug: 'producttest',
    cover_image_url: null,
    settings: { page_type: 'kaparot', primary_color: '#b4882c', kaparot: { price_per_soul: 50, max_souls: 20, about_text: 'בית חב״ד לדוגמה פועל למען הקהילה כל ימות השנה — שיעורי תורה, סיוע למשפחות, ופעילות לילדים ולנוער.' } },
  }
  const org = { id: 'o1', name: 'בית חב״ד לדוגמה', logo_url: null }
  return (
    <KaparotPageClient
      org={org}
      campaign={campaign}
      initialLang="he"
      donationUrl="https://example.com/onetime"
      paymentUrls={{ one_time: 'https://example.com/onetime', hok: '', bit: '', bank: '' }}
      paymentProvider="kesher"
      nedarim={null}
    />
  )
}
