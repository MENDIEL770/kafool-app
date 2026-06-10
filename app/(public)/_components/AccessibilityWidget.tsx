'use client'

import { useState, useEffect, useRef } from 'react'

interface A11yState {
  fontSize: number       // 0 = normal, 1 = large, 2 = xlarge
  contrast: boolean
  underlineLinks: boolean
  readableFont: boolean
}

const DEFAULTS: A11yState = { fontSize: 0, contrast: false, underlineLinks: false, readableFont: false }
const STORAGE_KEY = 'kafool_a11y'

function applyToHtml(state: A11yState) {
  const html = document.documentElement
  // font size
  html.style.fontSize = state.fontSize === 2 ? '120%' : state.fontSize === 1 ? '110%' : ''
  // high contrast
  html.classList.toggle('a11y-contrast', state.contrast)
  // underline links
  html.classList.toggle('a11y-underline', state.underlineLinks)
  // readable font
  html.classList.toggle('a11y-font', state.readableFont)
}

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<A11yState>(DEFAULTS)
  const panelRef = useRef<HTMLDivElement>(null)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as A11yState
        setState(parsed)
        applyToHtml(parsed)
      }
    } catch {}
  }, [])

  // Apply changes
  useEffect(() => {
    applyToHtml(state)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch {}
  }, [state])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function set(key: keyof A11yState, val: A11yState[keyof A11yState]) {
    setState(s => ({ ...s, [key]: val }))
  }

  function reset() {
    setState(DEFAULTS)
    applyToHtml(DEFAULTS)
  }

  const hasChanges = state.fontSize !== 0 || state.contrast || state.underlineLinks || state.readableFont

  return (
    <>
      {/* Global CSS for a11y modes */}
      <style>{`
        .a11y-contrast { filter: contrast(1.5) !important; }
        .a11y-underline a { text-decoration: underline !important; }
        .a11y-font, .a11y-font * { font-family: Arial, sans-serif !important; }
      `}</style>

      <div ref={panelRef} style={{ position: 'fixed', left: '1rem', bottom: '1rem', zIndex: 9999 }} dir="rtl">
        {/* Panel */}
        {open && (
          <div
            className="mb-3 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
            style={{ width: '260px' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
              <span className="text-sm font-bold text-gray-800">הגדרות נגישות</span>
              {hasChanges && (
                <button
                  onClick={reset}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  אפס הכל
                </button>
              )}
            </div>

            <div className="p-3 space-y-2">
              {/* Font size */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">גודל טקסט</p>
                <div className="flex gap-2">
                  {[
                    { label: 'רגיל', val: 0 },
                    { label: 'גדול', val: 1 },
                    { label: 'גדול מאוד', val: 2 },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => set('fontSize', opt.val)}
                      className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                        state.fontSize === opt.val
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              {[
                { key: 'contrast' as const,      label: 'ניגודיות גבוהה',   icon: '◑' },
                { key: 'underlineLinks' as const, label: 'הדגשת קישורים',    icon: '🔗' },
                { key: 'readableFont' as const,   label: 'פונט קריא (Arial)', icon: 'A' },
              ].map(item => (
                <button
                  key={item.key}
                  onClick={() => set(item.key, !state[item.key])}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-sm transition-colors ${
                    state[item.key]
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium">{item.label}</span>
                  <span className="text-base">{item.icon}</span>
                </button>
              ))}

              {/* Accessibility statement */}
              <a
                href="/accessibility"
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 transition-colors pt-1 px-1"
              >
                <span>📋</span>
                הצהרת נגישות
              </a>
            </div>
          </div>
        )}

        {/* Toggle button */}
        <button
          onClick={() => setOpen(v => !v)}
          className="w-12 h-12 rounded-full bg-gray-800 hover:bg-gray-700 text-white flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95"
          aria-label="פתח הגדרות נגישות"
          aria-expanded={open}
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" aria-hidden>
            <path d="M12 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0 6c1.1 0 2 .9 2 2v5h-1v5h-2v-5H9V15H8v-5c0-1.1.9-2 2-2h2zm-4.5-.5a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1zM12 0a12 12 0 1 0 0 24A12 12 0 0 0 12 0zm0 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z"/>
          </svg>
        </button>
      </div>
    </>
  )
}
