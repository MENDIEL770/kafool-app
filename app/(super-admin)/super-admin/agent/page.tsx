'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_ACTIONS = [
  { label: 'סקירת מערכת', prompt: 'תן לי סקירה כללית של מצב המערכת — ארגונים, קמפיינים, תרומות, ובעיות.' },
  { label: 'ארגונים ממתינים', prompt: 'הצג לי את כל הארגונים הממתינים לאישור.' },
  { label: 'בעיות סליקה', prompt: 'בדוק אם יש webhooks שלא עובדו או תרומות תקועות.' },
  { label: 'ביצועי קמפיינים', prompt: 'אילו קמפיינים פעילים כרגע ומה הביצועים שלהם?' },
  { label: 'כשלי SMS', prompt: 'בדוק אם יש הודעות SMS שנכשלו לאחרונה.' },
  { label: 'תרומות היום', prompt: 'כמה תרומות התקבלו ב-24 שעות האחרונות וסה"כ כמה גויס?' },
]

export default function AgentPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'שלום! אני הסוכן של Kafool. אני מחובר לכל המערכת ויכול לעזור לך לאתר בעיות, לנתח נתונים, ולאשר ארגונים. מה תרצה לבדוק?',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text?: string) {
    const userText = text || input.trim()
    if (!userText || loading) return

    const newMessages: Message[] = [...messages, { role: 'user', content: userText }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `שגיאה: ${String(err)}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-xl">
         
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">סוכן Kafool AI</h1>
          <p className="text-xs text-gray-400">מחובר לכל המערכת — ארגונים, קמפיינים, סליקה, SMS</p>
        </div>
        <div className="mr-auto flex items-center gap-1.5">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-green-600 font-medium">פעיל</span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 flex-wrap mb-3">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => sendMessage(action.prompt)}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 transition-colors disabled:opacity-40"
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-gray-100 text-gray-800 rounded-tr-sm'
                  : 'bg-purple-600 text-white rounded-tl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-end">
            <div className="bg-purple-100 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5 items-center">
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-xs text-purple-500 mr-1">מנתח נתונים...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-3 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="שאל שאלה, בקש ניתוח, או הזן פקודה... (Enter לשליחה)"
          rows={2}
          disabled={loading}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none disabled:opacity-50"
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          className="px-5 bg-purple-600 text-white rounded-xl font-medium text-sm hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          שלח
        </button>
      </div>
      <p className="text-xs text-gray-300 mt-1.5 text-center">
        Shift+Enter לשורה חדשה • Enter לשליחה
      </p>
    </div>
  )
}
