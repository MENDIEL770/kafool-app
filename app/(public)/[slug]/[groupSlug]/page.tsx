// New short group URL: /[campaign]/[groupSlug] (no "/g/"). Renders the exact same
// group page as /[campaign]/g/[groupSlug], which stays live so links already
// shared with the old "/g/" form keep working. Static siblings (donate, join,
// thanks, g) take precedence over this dynamic segment.
export const revalidate = 60
export { default, generateMetadata } from '../g/[groupSlug]/page'
