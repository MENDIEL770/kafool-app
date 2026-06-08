'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  slug: string
  orgName: string
  campaignTitle: string
  primaryColor: string
  receiptUrl: string | null
}

export default function ThanksClient({ slug, orgName, campaignTitle, primaryColor, receiptUrl }: Props) {
  const router = useRouter()
  const [seconds, setSeconds] = useState(10)

  useEffect(() => {
    const t = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(t)
          router.push(`/${slug}`)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [router, slug])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="text-center space-y-6 max-w-md w-full">
        {/* Icon */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center text-5xl mx-auto shadow-lg"
          style={{ backgroundColor: primaryColor + '20' }}
        >
          🙏
        </div>

        {/* Title */}
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">תודה רבה!</h1>
          <p className="text-gray-500 text-lg">תרומתך התקבלה בהצלחה</p>
          {orgName && <p className="text-gray-400 text-sm mt-1">{orgName}</p>}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <p className="text-gray-600 text-sm leading-relaxed">
            קבלה תישלח לאימייל שלך בקרוב.
            <br />
            תרומתך תשנה חיים.
          </p>

          {receiptUrl && (
            <a
              href={receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 font-bold text-sm transition-colors hover:bg-gray-50"
              style={{ borderColor: primaryColor, color: primaryColor }}
            >
              <span>📄</span>
              הורד קבלה
            </a>
          )}
        </div>

        {/* Back button + countdown */}
        <div className="space-y-2">
          <button
            onClick={() => router.push(`/${slug}`)}
            className="w-full py-3 rounded-xl font-bold text-white text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
          >
            חזרה לדף הקמפיין
          </button>
          <p className="text-gray-400 text-xs">
            חוזר אוטומטית בעוד {seconds} שניות...
          </p>
        </div>
      </div>
    </div>
  )
}
