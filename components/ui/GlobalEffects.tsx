'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'

/* ── Ripple on all buttons/links ── */
function useRipple() {
  useEffect(() => {
    function addRipple(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest('button, a, [role="button"]') as HTMLElement | null
      if (!target) return
      if (target.classList.contains('no-ripple')) return

      target.classList.add('btn-ripple')

      const rect = target.getBoundingClientRect()
      const ripple = document.createElement('span')
      ripple.className = 'ripple-effect'
      ripple.style.left = `${e.clientX - rect.left - 20}px`
      ripple.style.top = `${e.clientY - rect.top - 20}px`

      target.appendChild(ripple)
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true })
    }

    document.addEventListener('mousedown', addRipple)
    return () => document.removeEventListener('mousedown', addRipple)
  }, [])
}

/* ── Page navigation loader ── */
function useNavLoader() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const [prevPath, setPrevPath] = useState(pathname)

  // כשמשתמש לוחץ על קישור — הצג loader
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest('a') as HTMLAnchorElement | null
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return
      if (anchor.target === '_blank') return
      setLoading(true)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  // כשה-pathname משתנה — הסתר loader
  useEffect(() => {
    if (pathname !== prevPath) {
      setLoading(false)
      setPrevPath(pathname)
    }
  }, [pathname, prevPath])

  return loading
}

export default function GlobalEffects() {
  useRipple()
  const loading = useNavLoader()

  if (!loading) return null

  return (
    <div className="nav-loader">
      <div className="ping-wrapper">
        <div className="dot" />
      </div>
      <span>טוען...</span>
    </div>
  )
}
