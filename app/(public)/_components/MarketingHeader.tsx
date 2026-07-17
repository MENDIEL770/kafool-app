'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import AccessibilityWidget from './AccessibilityWidget'
import { Menu, X } from 'lucide-react'

function KafoolLogo() {
  const sp =
    'M 408.691406 276.410156 L 407.988281 276.015625 C 404.148438 268.371094 394.164062 267.949219 387.035156 270.828125 L 385.925781 270.785156 L 381.527344 273.050781 C 379.183594 274.257812 377.238281 275.847656 375.332031 277.609375 L 372.460938 280.261719 L 369.589844 282.902344 L 366.714844 285.539062 L 363.839844 288.167969 L 361.203125 290.570312 L 358.332031 293.203125 L 355.457031 295.847656 L 350.417969 300.648438 L 339.402344 311.355469 L 334.269531 316.316406 C 330.460938 319.605469 326.019531 321.660156 321.371094 323.546875 C 316.644531 325.464844 311.964844 326.996094 306.824219 327.179688 C 297.019531 327.53125 288.484375 324.621094 282.824219 316.433594 C 279.945312 312.269531 278.578125 307.484375 278.15625 302.425781 C 277.78125 297.957031 278.609375 293.601562 279.898438 289.332031 C 280.878906 286.089844 281.890625 283.179688 283.519531 280.199219 C 289.175781 269.828125 297.972656 261.578125 308.921875 257.019531 C 314.152344 254.839844 319.535156 253.585938 325.136719 254.035156 C 335.78125 254.894531 344.753906 261.265625 349.300781 270.863281 L 351.304688 275.085938 C 351.527344 275.554688 351.761719 275.894531 351.539062 276.453125 C 351.390625 276.828125 351.058594 277.046875 350.625 277.382812 L 339.414062 286.039062 L 335.6875 277.488281 C 334.457031 274.664062 331.847656 272.632812 329.289062 271.023438 C 318.238281 264.574219 304.328125 272.964844 297.910156 282.664062 C 294.351562 288.042969 292.261719 294.066406 293.023438 300.546875 C 293.445312 304.183594 295.101562 307.433594 297.921875 309.753906 C 300.878906 312.183594 304.664062 312.984375 308.496094 312.835938 C 316.441406 312.519531 324.90625 308.066406 330.554688 302.558594 L 339.164062 294.160156 L 347.546875 286.015625 L 356.175781 277.640625 L 364.308594 269.761719 L 366.953125 267.332031 C 375.574219 259.417969 387.828125 253.152344 399.652344 254.046875 C 405.488281 254.492188 410.957031 256.375 415.375 260.128906 L 418.492188 263.253906 C 422.609375 267.992188 424.339844 274.039062 424.550781 280.246094 C 424.589844 281.460938 424.632812 282.382812 424.53125 283.640625 L 424.261719 287.027344 C 422.96875 295.96875 419.050781 304.226562 413.078125 311.027344 L 407.804688 316.285156 C 404.136719 319.488281 400.117188 322.042969 395.6875 324.027344 C 392.113281 325.625 388.574219 326.480469 384.675781 326.96875 C 374.777344 328.214844 364.984375 324.796875 358.320312 317.390625 C 356.1875 315.019531 354.523438 312.515625 353.027344 309.734375 C 352.386719 308.546875 351.664062 307.484375 351.324219 306.066406 L 363.601562 296.164062 L 367.023438 303.65625 C 370.476562 309.863281 377.0625 313.484375 384.242188 312.777344 C 389.910156 312.21875 394.976562 309.535156 399.296875 305.875 C 403.035156 302.710938 405.847656 298.808594 407.886719 294.375 C 409.121094 291.679688 409.789062 288.941406 410.15625 286.023438 C 410.574219 282.703125 409.933594 279.390625 408.691406 276.410156'
  return (
    <svg
      width="100"
      height="30"
      viewBox="55 242 490 106"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      aria-label="Kafool"
    >
      <defs>
        <path id="mh0" d="M 68.578125 -71.953125 L 49.890625 -71.953125 L 24.34375 -40.453125 L 29.421875 -71.953125 L 13.8125 -71.953125 L 2.28125 0 L 17.890625 0 L 22.65625 -29.921875 L 40.453125 0 L 58.84375 0 L 37.875 -35.390625 Z" />
        <path id="mh1" d="M 49.890625 0 L 66.59375 0 L 51.78125 -71.953125 L 34.1875 -71.953125 L -3.671875 0 L 12.828125 0 L 20.171875 -14.515625 L 47.203125 -14.515625 Z M 26.828125 -27.828125 L 39.859375 -53.578125 L 44.625 -27.828125 Z" />
        <path id="mh2" d="M 2.28125 0 L 17.796875 0 L 22.265625 -28.03125 L 43.03125 -28.03125 L 45.21875 -42.046875 L 24.453125 -42.046875 L 26.9375 -57.546875 L 49.59375 -57.546875 L 51.875 -71.953125 L 13.609375 -71.953125 Z" />
        <path id="mh3" d="M 2.28125 0 L 40.15625 0 L 42.4375 -14.40625 L 20.171875 -14.40625 L 29.421875 -71.953125 L 13.8125 -71.953125 Z" />
      </defs>
      <path fill="rgb(94.5%,36.9%,30.2%)" d={sp} />
      <g fill="rgb(25.1%,42%,70.6%)"><use xlinkHref="#mh3" x="421.282518" y="326.941531" /></g>
      <g fill="rgb(25.1%,42%,70.6%)"><use xlinkHref="#mh2" x="226.182145" y="326.941531" /></g>
      <g fill="rgb(25.1%,42%,70.6%)"><use xlinkHref="#mh1" x="154.914132" y="326.941531" /></g>
      <g fill="rgb(25.1%,42%,70.6%)"><use xlinkHref="#mh0" x="93.088881" y="326.941531" /></g>
    </svg>
  )
}

const ALL_NAV_LINKS = [
  { label: 'אודות', href: '/about', key: 'about' },
  { label: 'העיצובים שלנו', href: '/design', key: 'design' },
  { label: 'שאלות ותשובות', href: '/faq', key: 'faq' },
  { label: 'צור קשר', href: '/contact', key: 'contact' },
]

export default function MarketingHeader({ hiddenPages = [] }: { hiddenPages?: string[] }) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const navLinks = ALL_NAV_LINKS.filter(l => !hiddenPages.includes(l.key))

  return (
    <>
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center shrink-0">
          <KafoolLogo />
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-blue-600 border-b-2 border-blue-600 pb-0.5'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/login"
            className="text-sm font-bold text-gray-600 hover:text-blue-600 px-4 py-2.5 rounded-2xl border border-gray-200 hover:border-blue-200 transition-colors"
          >
            כניסה למערכת
          </Link>
          <Link
            href="/dashboard"
            className="bg-blue-600 text-white text-sm font-bold px-5 py-2.5 rounded-2xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            הקימו דף גיוס
          </Link>
        </div>

        <button
          className="md:hidden p-2 text-gray-600 hover:text-gray-900"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="תפריט"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3" dir="rtl">
          {navLinks.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block text-sm font-medium px-2 py-2 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
          <Link
            href="/login"
            onClick={() => setMenuOpen(false)}
            className="block text-sm font-bold text-center text-gray-700 px-5 py-2.5 rounded-2xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            כניסה למערכת
          </Link>
          <Link
            href="/dashboard"
            onClick={() => setMenuOpen(false)}
            className="block bg-blue-600 text-white text-sm font-bold text-center px-5 py-2.5 rounded-2xl hover:bg-blue-700 transition-colors"
          >
            הקימו דף גיוס
          </Link>
        </div>
      )}
    </header>
    <AccessibilityWidget />
    </>
  )
}
