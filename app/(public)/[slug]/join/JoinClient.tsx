'use client'

import { useState } from 'react'
import { Users } from 'lucide-react'
import CreateGroupModal from '../CreateGroupModal'

// Pre-launch page: the community sees ONLY the main banner and a way to open their
// own fundraising group — not the campaign itself (amounts, donors, about, etc.).
export default function JoinClient({
  campaign, desktopBanners, mobileBanners, primaryColor, logoUrl, orgName, intro,
}: {
  campaign: { id: string; title: string; slug: string }
  desktopBanners: string[]
  mobileBanners: string[]
  primaryColor: string
  logoUrl: string | null
  orgName: string
  intro: string
}) {
  const [open, setOpen] = useState(false)
  const dBanner = desktopBanners[0] || null
  const mBanner = mobileBanners[0] || dBanner

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      {/* Main banner only */}
      {(dBanner || mBanner) && (
        <div className="w-full">
          {mBanner && <img src={mBanner} alt={campaign.title} className="w-full h-auto md:hidden" />}
          {dBanner && <img src={dBanner} alt={campaign.title} className="w-full h-auto hidden md:block" />}
        </div>
      )}

      <div className="max-w-lg mx-auto px-5 py-10 text-center space-y-6">
        {logoUrl && <img src={logoUrl} alt={orgName} className="h-16 w-auto object-contain mx-auto" />}

        <div>
          <h1 className="text-2xl font-black text-gray-900">{campaign.title}</h1>
          <p className="mt-2 text-gray-500 leading-relaxed whitespace-pre-line">
            {intro || 'הצטרפו כמגייסים — פתחו קבוצת גיוס משלכם, שתפו עם חברים ומשפחה, וכשהקמפיין יצא לדרך כבר תהיו מוכנים.'}
          </p>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-white text-base shadow-lg hover:opacity-90 active:scale-[0.99] transition-all"
          style={{ backgroundColor: primaryColor }}
        >
          <Users className="w-5 h-5" />
          פתח קבוצת גיוס משלך
        </button>

        <p className="text-xs text-gray-400">לאחר פתיחת הקבוצה יישלח אליך SMS עם הקישור האישי שלך לשיתוף.</p>
      </div>

      <CreateGroupModal
        isOpen={open}
        onClose={() => setOpen(false)}
        campaignId={campaign.id}
        primaryColor={primaryColor}
      />
    </div>
  )
}
