'use client'

import { X } from 'lucide-react'

export interface Submission {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  subject: string | null
  message: string
  is_read: boolean
  created_at: string
}

interface Props {
  submission: Submission
  onClose: () => void
}

export default function SubmissionModal({ submission, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 relative" dir="rtl">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-black text-gray-900 mb-6">פנייה מאת {submission.full_name}</h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {submission.phone && (
              <div>
                <p className="text-xs text-gray-500 mb-1">טלפון</p>
                <p className="text-sm font-bold text-gray-800">{submission.phone}</p>
              </div>
            )}
            {submission.email && (
              <div>
                <p className="text-xs text-gray-500 mb-1">אימייל</p>
                <p className="text-sm font-bold text-gray-800">{submission.email}</p>
              </div>
            )}
          </div>

          {submission.subject && (
            <div>
              <p className="text-xs text-gray-500 mb-1">נושא</p>
              <p className="text-sm font-bold text-gray-800">{submission.subject}</p>
            </div>
          )}

          <div>
            <p className="text-xs text-gray-500 mb-1">הודעה</p>
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{submission.message}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500">
              נשלח:{' '}
              {new Date(submission.created_at).toLocaleString('he-IL', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
