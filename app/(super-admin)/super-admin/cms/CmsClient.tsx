'use client'

import { useState } from 'react'
import SubmissionModal, { type Submission } from './SubmissionModal'
import { Trash2, ChevronUp, ChevronDown, Plus, Save } from 'lucide-react'

export interface PageContentRow {
  key: string
  value: string | null
}

export interface FaqItem {
  id: string
  question: string
  answer: string
  sort_order: number
  is_active: boolean
}

export interface ContactSettingsData {
  id?: string
  phone: string
  email: string
  hours: string
}

interface Props {
  aboutContent: PageContentRow[]
  faqItems: FaqItem[]
  contactSettings: ContactSettingsData | null
  submissions: Submission[]
}

type Tab = 'about' | 'faq' | 'contact' | 'submissions'

const ABOUT_KEYS: { key: string; label: string; multiline?: boolean }[] = [
  { key: 'hero_title', label: 'כותרת ראשית' },
  { key: 'hero_subtitle', label: 'תת-כותרת', multiline: true },
  { key: 'pricing_title', label: 'כותרת תמחור' },
  { key: 'pricing_text', label: 'טקסט תמחור', multiline: true },
  { key: 'iframe_title', label: 'כותרת iFrame' },
  { key: 'iframe_text', label: 'טקסט iFrame', multiline: true },
  { key: 'services_title', label: 'כותרת שירותים' },
  { key: 'services_text', label: 'טקסט שירותים', multiline: true },
  { key: 'tools_title', label: 'כותרת כלי ניהול' },
  { key: 'tools_text', label: 'טקסט כלי ניהול', multiline: true },
  { key: 'vision_title', label: 'כותרת חזון' },
  { key: 'vision_text', label: 'טקסט חזון', multiline: true },
  { key: 'cta_text', label: 'טקסט CTA' },
]

export default function CmsClient({ aboutContent, faqItems: initialFaq, contactSettings: initialContact, submissions: initialSubmissions }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('about')

  // About state
  const initialAboutMap: Record<string, string> = {}
  for (const row of aboutContent) {
    initialAboutMap[row.key] = row.value ?? ''
  }
  const [aboutMap, setAboutMap] = useState<Record<string, string>>(initialAboutMap)
  const [aboutSaving, setAboutSaving] = useState(false)
  const [aboutMsg, setAboutMsg] = useState<string | null>(null)

  // FAQ state
  const [faqItems, setFaqItems] = useState<FaqItem[]>(initialFaq)
  const [newQuestion, setNewQuestion] = useState('')
  const [newAnswer, setNewAnswer] = useState('')
  const [faqMsg, setFaqMsg] = useState<string | null>(null)
  const [editingFaq, setEditingFaq] = useState<Record<string, { question: string; answer: string }>>({})

  // Contact settings state
  const [contact, setContact] = useState<ContactSettingsData>(
    initialContact ?? { phone: '', email: '', hours: '' }
  )
  const [contactSaving, setContactSaving] = useState(false)
  const [contactMsg, setContactMsg] = useState<string | null>(null)

  // Submissions state
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions)
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)

  // ---- About handlers ----
  async function saveAbout() {
    setAboutSaving(true)
    setAboutMsg(null)
    try {
      const rows = Object.entries(aboutMap).map(([key, value]) => ({ page: 'about', key, value }))
      const res = await fetch('/api/super-admin/cms/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rows),
      })
      if (!res.ok) throw new Error('error')
      setAboutMsg('נשמר בהצלחה!')
    } catch {
      setAboutMsg('שגיאה בשמירה')
    } finally {
      setAboutSaving(false)
      setTimeout(() => setAboutMsg(null), 3000)
    }
  }

  // ---- FAQ handlers ----
  async function addFaq() {
    if (!newQuestion.trim() || !newAnswer.trim()) return
    try {
      const res = await fetch('/api/super-admin/cms/faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: newQuestion, answer: newAnswer, sort_order: faqItems.length }),
      })
      if (!res.ok) throw new Error('error')
      const data = await res.json() as FaqItem
      setFaqItems((prev) => [...prev, data])
      setNewQuestion('')
      setNewAnswer('')
      setFaqMsg('נוסף בהצלחה!')
    } catch {
      setFaqMsg('שגיאה בהוספה')
    } finally {
      setTimeout(() => setFaqMsg(null), 3000)
    }
  }

  async function deleteFaq(id: string) {
    if (!confirm('למחוק שאלה זו?')) return
    try {
      const res = await fetch(`/api/super-admin/cms/faq?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('error')
      setFaqItems((prev) => prev.filter((f) => f.id !== id))
    } catch {
      setFaqMsg('שגיאה במחיקה')
      setTimeout(() => setFaqMsg(null), 3000)
    }
  }

  async function moveFaq(index: number, dir: 'up' | 'down') {
    const newItems = [...faqItems]
    const swapIndex = dir === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= newItems.length) return
    ;[newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]]
    const updated = newItems.map((item, i) => ({ ...item, sort_order: i }))
    setFaqItems(updated)
    // Save new sort orders
    await Promise.all(
      updated.map((item) =>
        fetch('/api/super-admin/cms/faq', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.id, sort_order: item.sort_order }),
        })
      )
    )
  }

  async function saveFaqEdit(id: string) {
    const edit = editingFaq[id]
    if (!edit) return
    try {
      const res = await fetch('/api/super-admin/cms/faq', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, question: edit.question, answer: edit.answer }),
      })
      if (!res.ok) throw new Error('error')
      setFaqItems((prev) =>
        prev.map((f) => (f.id === id ? { ...f, question: edit.question, answer: edit.answer } : f))
      )
      setEditingFaq((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setFaqMsg('נשמר!')
    } catch {
      setFaqMsg('שגיאה בשמירה')
    } finally {
      setTimeout(() => setFaqMsg(null), 3000)
    }
  }

  // ---- Contact handlers ----
  async function saveContact() {
    setContactSaving(true)
    setContactMsg(null)
    try {
      const res = await fetch('/api/super-admin/cms/contact-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contact),
      })
      if (!res.ok) throw new Error('error')
      const data = await res.json() as ContactSettingsData
      setContact(data)
      setContactMsg('נשמר בהצלחה!')
    } catch {
      setContactMsg('שגיאה בשמירה')
    } finally {
      setContactSaving(false)
      setTimeout(() => setContactMsg(null), 3000)
    }
  }

  // ---- Submission handlers ----
  async function toggleRead(sub: Submission) {
    const newIsRead = !sub.is_read
    // optimistic
    setSubmissions((prev) => prev.map((s) => (s.id === sub.id ? { ...s, is_read: newIsRead } : s)))
    try {
      await fetch('/api/super-admin/cms/submissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sub.id, is_read: newIsRead }),
      })
    } catch {
      // revert
      setSubmissions((prev) => prev.map((s) => (s.id === sub.id ? { ...s, is_read: sub.is_read } : s)))
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'about', label: 'אודות' },
    { key: 'faq', label: 'שאלות ותשובות' },
    { key: 'contact', label: 'צור קשר' },
    { key: 'submissions', label: 'פניות' },
  ]

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-black text-gray-900 mb-6">ניהול תוכן</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {tab.label}
              {tab.key === 'submissions' && submissions.filter((s) => !s.is_read).length > 0 && (
                <span className="mr-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {submissions.filter((s) => !s.is_read).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* About tab */}
        {activeTab === 'about' && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-black text-gray-900 mb-6">תוכן עמוד אודות</h2>
            <div className="space-y-5">
              {ABOUT_KEYS.map(({ key, label, multiline }) => (
                <div key={key}>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">{label}</label>
                  {multiline ? (
                    <textarea
                      value={aboutMap[key] ?? ''}
                      onChange={(e) => setAboutMap((prev) => ({ ...prev, [key]: e.target.value }))}
                      rows={3}
                      className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  ) : (
                    <input
                      type="text"
                      value={aboutMap[key] ?? ''}
                      onChange={(e) => setAboutMap((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-4">
              <button
                onClick={saveAbout}
                disabled={aboutSaving}
                className="flex items-center gap-2 bg-blue-600 text-white font-bold px-6 py-3 rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {aboutSaving ? 'שומר...' : 'שמור הכל'}
              </button>
              {aboutMsg && <span className="text-sm text-green-600 font-medium">{aboutMsg}</span>}
            </div>
          </div>
        )}

        {/* FAQ tab */}
        {activeTab === 'faq' && (
          <div className="space-y-4">
            {faqMsg && (
              <div className="bg-blue-50 text-blue-700 text-sm font-medium px-4 py-3 rounded-2xl">{faqMsg}</div>
            )}

            {faqItems.map((item, index) => {
              const isEditing = !!editingFaq[item.id]
              const editData = editingFaq[item.id] ?? { question: item.question, answer: item.answer }
              return (
                <div key={item.id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col gap-1 pt-1">
                      <button
                        onClick={() => moveFaq(index, 'up')}
                        disabled={index === 0}
                        className="text-gray-400 hover:text-gray-700 disabled:opacity-20"
                        title="העלה"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveFaq(index, 'down')}
                        disabled={index === faqItems.length - 1}
                        className="text-gray-400 hover:text-gray-700 disabled:opacity-20"
                        title="הורד"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex-1 space-y-3">
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            value={editData.question}
                            onChange={(e) =>
                              setEditingFaq((prev) => ({ ...prev, [item.id]: { ...editData, question: e.target.value } }))
                            }
                            className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                          />
                          <textarea
                            value={editData.answer}
                            onChange={(e) =>
                              setEditingFaq((prev) => ({ ...prev, [item.id]: { ...editData, answer: e.target.value } }))
                            }
                            rows={3}
                            className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveFaqEdit(item.id)}
                              className="bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-blue-700"
                            >
                              שמור
                            </button>
                            <button
                              onClick={() => setEditingFaq((prev) => { const n = { ...prev }; delete n[item.id]; return n })}
                              className="bg-gray-100 text-gray-700 text-sm font-bold px-4 py-2 rounded-xl hover:bg-gray-200"
                            >
                              ביטול
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="font-bold text-gray-900 text-sm">{item.question}</p>
                          <p className="text-gray-600 text-sm leading-relaxed">{item.answer}</p>
                          <button
                            onClick={() => setEditingFaq((prev) => ({ ...prev, [item.id]: { question: item.question, answer: item.answer } }))}
                            className="text-blue-600 text-xs font-bold hover:underline"
                          >
                            ערוך
                          </button>
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => deleteFaq(item.id)}
                      className="text-red-400 hover:text-red-600 transition-colors shrink-0 mt-1"
                      title="מחק"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}

            {/* Add new FAQ */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-dashed border-blue-200">
              <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                הוסף שאלה חדשה
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="שאלה"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  placeholder="תשובה"
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <button
                  onClick={addFaq}
                  disabled={!newQuestion.trim() || !newAnswer.trim()}
                  className="bg-blue-600 text-white font-bold px-5 py-2.5 rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                >
                  הוסף שאלה
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contact settings tab */}
        {activeTab === 'contact' && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-black text-gray-900 mb-6">הגדרות צור קשר</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">טלפון</label>
                <input
                  type="text"
                  value={contact.phone}
                  onChange={(e) => setContact((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">אימייל</label>
                <input
                  type="email"
                  value={contact.email}
                  onChange={(e) => setContact((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">שעות פעילות</label>
                <input
                  type="text"
                  value={contact.hours}
                  onChange={(e) => setContact((prev) => ({ ...prev, hours: e.target.value }))}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-6 flex items-center gap-4">
              <button
                onClick={saveContact}
                disabled={contactSaving}
                className="flex items-center gap-2 bg-blue-600 text-white font-bold px-6 py-3 rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {contactSaving ? 'שומר...' : 'שמור'}
              </button>
              {contactMsg && <span className="text-sm text-green-600 font-medium">{contactMsg}</span>}
            </div>
          </div>
        )}

        {/* Submissions tab */}
        {activeTab === 'submissions' && (
          <div className="space-y-3">
            {submissions.length === 0 && (
              <div className="bg-white rounded-3xl p-10 text-center text-gray-500">אין פניות עדיין</div>
            )}
            {submissions.map((sub) => (
              <div
                key={sub.id}
                className={`bg-white rounded-3xl p-5 shadow-sm border cursor-pointer hover:border-blue-300 transition-colors ${
                  sub.is_read ? 'border-gray-100' : 'border-blue-200 bg-blue-50/30'
                }`}
                onClick={() => setSelectedSubmission(sub)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      {!sub.is_read && (
                        <span className="w-2 h-2 bg-blue-600 rounded-full shrink-0" />
                      )}
                      <p className="font-black text-gray-900 text-sm">{sub.full_name}</p>
                      {sub.subject && (
                        <span className="text-gray-500 text-xs">— {sub.subject}</span>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs truncate">{sub.message}</p>
                    <p className="text-gray-400 text-xs mt-1">
                      {new Date(sub.created_at).toLocaleString('he-IL', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleRead(sub) }}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors shrink-0 ${
                      sub.is_read
                        ? 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        : 'border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100'
                    }`}
                  >
                    {sub.is_read ? 'סמן כלא נקרא' : 'סמן כנקרא'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedSubmission && (
        <SubmissionModal
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
        />
      )}
    </div>
  )
}
