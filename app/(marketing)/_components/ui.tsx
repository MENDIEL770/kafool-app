import type { ButtonHTMLAttributes, ReactNode } from 'react'

// Kaf wordmark + infinity loop, drawn from the shared <symbol> sheet (SvgDefs).
// Put the `dk` class on an ANCESTOR to get the white-on-navy variant.
export function Wordmark({ className = 'wm-svg' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 4344 775" role="img" aria-label="כפול">
      <use href="#kf-wordmark" />
    </svg>
  )
}

export function Loop({ className = 'lp-svg' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1400 840" aria-hidden="true">
      <use href="#kf-loop" />
    </svg>
  )
}

// Primary CTA — brand pill with a white circular arrow badge (↖), per the approved button style.
export function Cta({
  children,
  className = '',
  large = false,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { large?: boolean; children: ReactNode }) {
  return (
    <button type="button" className={`pill cta${large ? ' lg' : ''}${className ? ' ' + className : ''}`} {...rest}>
      <span>{children}</span>
      <span className="cta-ic" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 16 8 8M8 14V8h6" />
        </svg>
      </span>
    </button>
  )
}
