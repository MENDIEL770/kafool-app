// Shared scroll-lock counter so the menu, contact modal and feature panel never
// clobber each other's lock. Module state is shared across all importers.
let locks = 0

export function stopScroll() {
  locks++
  document.documentElement.style.overflow = 'hidden'
}

export function startScroll() {
  locks = Math.max(0, locks - 1)
  if (!locks) document.documentElement.style.removeProperty('overflow')
}
