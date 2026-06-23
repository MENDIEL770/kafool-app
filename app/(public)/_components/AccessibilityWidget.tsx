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

export default function AccessibilityWidget({ offsetBottom = '1rem' }: { offsetBottom?: string }) {
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

      <div ref={panelRef} style={{ position: 'fixed', left: '1rem', bottom: offsetBottom, zIndex: 55, transition: 'bottom .3s' }} dir="rtl">
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
                { key: 'underlineLinks' as const, label: 'הדגשת קישורים',    icon: '' },
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
                <span></span>
                הצהרת נגישות
              </a>
            </div>
          </div>
        )}

        {/* Toggle button */}
        <button
          onClick={() => setOpen(v => !v)}
          className="w-12 h-12 rounded-full bg-sky-500 hover:bg-sky-400 text-white flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95"
          aria-label="פתח הגדרות נגישות"
          aria-expanded={open}
        >
          <svg viewBox="0 0 512 512" className="w-6 h-6 fill-white" aria-hidden>
            <path d="M343.401,380.58c-10.363-4.567-22.446,0.246-26.911,10.629c-21.053,48.497-68.915,79.831-121.938,79.831
              c-73.4,0-133.12-59.72-133.12-133.12c0-47.596,25.641-91.771,66.888-115.343c9.851-5.591,13.251-18.104,7.639-27.935
              c-5.591-9.83-18.125-13.312-27.935-7.619c-54.006,30.822-87.552,88.637-87.552,150.897c0,95.99,78.09,174.08,174.08,174.08
              c69.366,0,131.973-41.021,159.498-104.489C358.556,397.148,353.804,385.085,343.401,380.58z"/>
            <path d="M490.058,402.002c-4.219-10.527-16.056-15.647-26.624-11.428l-30.638,12.268l-44.585-142.705
              c-2.683-8.561-10.609-14.377-19.579-14.377H222.364l-6.369-40.96h80.957c11.325,0,20.48-9.155,20.48-20.48
              s-9.155-20.48-20.48-20.48h-87.306l-10.588-68.219c15.565-8.806,26.214-25.293,26.214-44.421c0-28.242-22.958-51.2-51.2-51.2
              c-28.221,0-51.2,22.958-51.2,51.2c0,22.671,14.909,41.718,35.369,48.435l26.317,169.738c1.557,9.994,10.138,17.347,20.234,17.347
              h148.787l46.694,149.463c1.72,5.448,5.612,9.933,10.773,12.39c2.765,1.331,5.796,1.987,8.786,1.987
              c2.581,0,5.161-0.471,7.619-1.454l51.2-20.48C489.157,424.428,494.256,412.508,490.058,402.002z"/>
          </svg>
        </button>
      </div>
    </>
  )
}
