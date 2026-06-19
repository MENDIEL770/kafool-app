'use client'

import { useRef, useEffect } from 'react'
import { Bold, Link2, AlignRight, AlignCenter, AlignLeft, Type } from 'lucide-react'

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  dir?: 'rtl' | 'ltr'
}

/**
 * Lightweight rich-text editor (contentEditable + execCommand) — no external
 * dependency. Supports bold, text color, font size up/down, alignment and links.
 * Emits HTML via onChange; render it with dangerouslySetInnerHTML (sanitized).
 */
export default function RichTextEditor({ value, onChange, placeholder, dir = 'rtl' }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  // Sync external value in (e.g. when the form finishes loading) without
  // clobbering the caret while the user is actively typing.
  useEffect(() => {
    const el = ref.current
    if (el && document.activeElement !== el && el.innerHTML !== (value || '')) {
      el.innerHTML = value || ''
    }
  }, [value])

  function emit() {
    if (ref.current) onChange(ref.current.innerHTML)
  }

  function exec(command: string, val?: string) {
    ref.current?.focus()
    document.execCommand(command, false, val)
    emit()
  }

  function addLink() {
    const url = window.prompt(dir === 'rtl' ? 'הדבק קישור (URL):' : 'Paste a link (URL):')
    if (url) exec('createLink', /^https?:\/\//i.test(url) ? url : `https://${url}`)
  }

  const btn = 'w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0'

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition">
      <style>{`.kf-rte:empty:before{content:attr(data-placeholder);color:#9ca3af;pointer-events:none}.kf-rte a{color:#2563eb;text-decoration:underline}`}</style>
      {/* toolbar — onMouseDown preventDefault keeps the text selection in the editor */}
      <div className="flex flex-wrap items-center gap-1 p-1.5 bg-gray-50 border-b border-gray-200" onMouseDown={e => e.preventDefault()}>
        <button type="button" title="מודגש" onClick={() => exec('bold')} className={btn}><Bold className="w-4 h-4" /></button>
        <button type="button" title="הגדל טקסט" onClick={() => exec('fontSize', '5')} className={`${btn} text-base font-black`}>A</button>
        <button type="button" title="הקטן טקסט" onClick={() => exec('fontSize', '2')} className={`${btn} text-[10px] font-bold`}>A</button>
        <label title="צבע טקסט" className={`${btn} cursor-pointer relative`}>
          <Type className="w-4 h-4" />
          <input type="color" defaultValue="#2563eb" onChange={e => exec('foreColor', e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
        </label>
        <span className="w-px h-5 bg-gray-200 mx-0.5" />
        <button type="button" title="יישור לימין" onClick={() => exec('justifyRight')} className={btn}><AlignRight className="w-4 h-4" /></button>
        <button type="button" title="מרכוז" onClick={() => exec('justifyCenter')} className={btn}><AlignCenter className="w-4 h-4" /></button>
        <button type="button" title="יישור לשמאל" onClick={() => exec('justifyLeft')} className={btn}><AlignLeft className="w-4 h-4" /></button>
        <span className="w-px h-5 bg-gray-200 mx-0.5" />
        <button type="button" title="הוסף קישור" onClick={addLink} className={btn}><Link2 className="w-4 h-4" /></button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        dir={dir}
        onInput={emit}
        data-placeholder={placeholder || ''}
        className="kf-rte min-h-[120px] max-h-[300px] overflow-y-auto px-3 py-2.5 text-sm leading-relaxed outline-none"
      />
    </div>
  )
}
