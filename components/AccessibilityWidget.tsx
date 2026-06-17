'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'kafool_a11y'

interface A11yState {
  fontScale: number
  readableFont: boolean
  letterSpacing: boolean
  lineHeight: boolean
  highContrast: boolean
  darkContrast: boolean
  invertColors: boolean
  monochrome: boolean
  bigCursor: boolean
  highlightHeadings: boolean
  highlightLinks: boolean
  noAnimations: boolean
  reduceMotion: boolean
  donationMode: boolean
}

const DEFAULT: A11yState = {
  fontScale: 1,
  readableFont: false,
  letterSpacing: false,
  lineHeight: false,
  highContrast: false,
  darkContrast: false,
  invertColors: false,
  monochrome: false,
  bigCursor: false,
  highlightHeadings: false,
  highlightLinks: false,
  noAnimations: false,
  reduceMotion: false,
  donationMode: false,
}

function applyState(s: A11yState) {
  const root = document.documentElement
  const body = document.body
  root.style.setProperty('--a11y-font-scale', String(s.fontScale))
  const classes: Record<string, boolean> = {
    'a11y-readable-font': s.readableFont,
    'a11y-letter-spacing': s.letterSpacing,
    'a11y-line-height': s.lineHeight,
    'a11y-high-contrast': s.highContrast,
    'a11y-dark-contrast': s.darkContrast,
    'a11y-invert': s.invertColors,
    'a11y-monochrome': s.monochrome,
    'a11y-big-cursor': s.bigCursor,
    'a11y-highlight-headings': s.highlightHeadings,
    'a11y-highlight-links': s.highlightLinks,
    'a11y-no-animations': s.noAnimations,
    'a11y-reduce-motion': s.reduceMotion,
    'a11y-donation-mode': s.donationMode,
  }
  Object.entries(classes).forEach(([cls, active]) => {
    body.classList.toggle(cls, active)
  })
}

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false)
  const [s, setS] = useState<A11yState>(DEFAULT)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = { ...DEFAULT, ...JSON.parse(saved) }
        setS(parsed)
        applyState(parsed)
      }
    } catch {}
  }, [])

  function update(patch: Partial<A11yState>) {
    setS(prev => {
      const next = { ...prev, ...patch }
      applyState(next)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  function reset() {
    setS(DEFAULT)
    applyState(DEFAULT)
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  const Toggle = ({ label, icon, active, onClick }: { label: string; icon: string; active: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-right transition-colors ${
        active ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
      }`}
    >
      <span>{icon}</span>
      <span className="flex-1">{label}</span>
      {active && <span className="text-xs opacity-80">✓</span>}
    </button>
  )

  return (
    <>
      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:right-4 focus:z-[10000] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:text-sm"
      >
        דלג לתוכן הראשי
      </a>

      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? 'סגור תפריט נגישות' : 'פתח תפריט נגישות'}
        aria-expanded={open}
        className="fixed bottom-6 left-6 z-[9999] w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center text-2xl transition-transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-300"
        style={{ direction: 'ltr' }}
      >
       
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="הגדרות נגישות"
          aria-modal="true"
          className="fixed bottom-24 left-6 z-[9998] w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white">
            <h2 className="font-bold text-sm">הגדרות נגישות</h2>
            <div className="flex gap-2">
              <button onClick={reset} className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg">איפוס</button>
              <button onClick={() => setOpen(false)} aria-label="סגור" className="text-xl leading-none hover:opacity-80">×</button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[70vh] p-3 space-y-4">
            {/* Donation mode - special */}
            <div>
              <button
                onClick={() => update({ donationMode: !s.donationMode })}
                aria-pressed={s.donationMode}
                className={`w-full px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                  s.donationMode ? 'bg-amber-400 text-amber-900' : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                מצב תרומה נגיש {s.donationMode ? '(פעיל)' : ''}
              </button>
              <p className="text-xs text-gray-400 mt-1 text-center">טפסים פשוטים, כפתורים גדולים, ללא אנימציות</p>
            </div>

            {/* Text */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">טקסט</p>
              <div className="flex gap-2">
                <button
                  onClick={() => update({ fontScale: Math.min(2, Math.round((s.fontScale + 0.1) * 10) / 10) })}
                  className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm"
                  aria-label="הגדל גופן"
                >A+</button>
                <button
                  onClick={() => update({ fontScale: Math.max(0.8, Math.round((s.fontScale - 0.1) * 10) / 10) })}
                  className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm"
                  aria-label="הקטן גופן"
                >A-</button>
                <div className="flex-1 py-2 bg-gray-100 rounded-lg text-xs text-center text-gray-500">{Math.round(s.fontScale * 100)}%</div>
              </div>
              <Toggle label="פונט קריא" icon="" active={s.readableFont} onClick={() => update({ readableFont: !s.readableFont })} />
              <Toggle label="רווח אותיות" icon="↔" active={s.letterSpacing} onClick={() => update({ letterSpacing: !s.letterSpacing })} />
              <Toggle label="גובה שורה" icon="↕" active={s.lineHeight} onClick={() => update({ lineHeight: !s.lineHeight })} />
            </div>

            {/* Colors */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">צבעים</p>
              <Toggle label="ניגודיות גבוהה" icon="◑" active={s.highContrast} onClick={() => update({ highContrast: !s.highContrast })} />
              <Toggle label="מצב כהה" icon="" active={s.darkContrast} onClick={() => update({ darkContrast: !s.darkContrast })} />
              <Toggle label="היפוך צבעים" icon="" active={s.invertColors} onClick={() => update({ invertColors: !s.invertColors })} />
              <Toggle label="מונוכרום" icon="" active={s.monochrome} onClick={() => update({ monochrome: !s.monochrome })} />
            </div>

            {/* Reading */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">קריאה</p>
              <Toggle label="סמן גדול" icon="" active={s.bigCursor} onClick={() => update({ bigCursor: !s.bigCursor })} />
              <Toggle label="הדגש כותרות" icon="" active={s.highlightHeadings} onClick={() => update({ highlightHeadings: !s.highlightHeadings })} />
              <Toggle label="הדגש קישורים" icon="" active={s.highlightLinks} onClick={() => update({ highlightLinks: !s.highlightLinks })} />
            </div>

            {/* Motion */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">תנועה</p>
              <Toggle label="עצור אנימציות" icon="" active={s.noAnimations} onClick={() => update({ noAnimations: !s.noAnimations })} />
              <Toggle label="הפחת תנועה" icon="" active={s.reduceMotion} onClick={() => update({ reduceMotion: !s.reduceMotion })} />
            </div>

            {/* Statement link */}
            <a
              href="/accessibility-statement"
              className="block text-center text-xs text-blue-600 hover:underline py-2"
            >
              הצהרת נגישות
            </a>
          </div>
        </div>
      )}
    </>
  )
}
