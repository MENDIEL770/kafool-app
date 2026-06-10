'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export interface FaqItem {
  id: string
  question: string
  answer: string
  sort_order: number
  is_active: boolean
}

interface Props {
  items: FaqItem[]
}

export default function FaqClient({ items }: Props) {
  const [openId, setOpenId] = useState<string | null>(null)

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id))
  }

  if (items.length === 0) {
    return (
      <p className="text-center text-gray-500 py-12">אין שאלות להצגה כרגע.</p>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isOpen = openId === item.id
        return (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
          >
            <button
              onClick={() => toggle(item.id)}
              className="w-full flex items-center justify-between gap-4 px-6 py-5 text-right hover:bg-gray-50 transition-colors"
              aria-expanded={isOpen}
            >
              <span className="text-gray-900 font-bold text-base">{item.question}</span>
              <ChevronDown
                className={`w-5 h-5 text-blue-600 shrink-0 transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {isOpen && (
              <div className="px-6 pb-5">
                <p className="text-gray-600 leading-relaxed">{item.answer}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
