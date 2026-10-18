import 'react'

// Allow CSS custom properties (e.g. style={{ '--dl': '120ms' }}) used throughout
// the marketing components, matching the reference's inline reveal variables.
declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number
  }
}
