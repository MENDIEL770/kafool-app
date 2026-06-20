/**
 * Shared page-builder configuration — the single source of truth for the block
 * list, theme defaults, and the stored config shape. Used by both the builder
 * UI (super-admin) and the public donation page so they never drift.
 *
 * The config is persisted inside `campaigns.settings.builder` (a JSONB sub-key,
 * no migration needed). When that key is ABSENT the public page renders exactly
 * as before (full backward compatibility) — visibility gating only kicks in once
 * a campaign has been edited in the builder at least once.
 */

export type BlockId =
  | 'hero' | 'goal' | 'amounts' | 'impact' | 'video'
  | 'donors' | 'stats' | 'testimonials' | 'faq' | 'map' | 'cta' | 'gallery'

export interface BuilderBlock {
  id: BlockId
  active: boolean
}

export interface BuilderDesign {
  primary: string
  secondary: string
  cta: string
  bg: string
  titleFont: string
  bodyFont: string
  radius: 'none' | 'md' | 'full'
  fontSize: number
}

export interface BuilderConfig {
  blocks: BuilderBlock[]
  design: BuilderDesign
}

/** Canonical block order + default visibility (matches the original builder). */
export const DEFAULT_BLOCKS: BuilderBlock[] = [
  { id: 'hero', active: true },
  { id: 'goal', active: true },
  { id: 'amounts', active: true },
  { id: 'impact', active: true },
  { id: 'video', active: false },
  { id: 'donors', active: true },
  { id: 'stats', active: false },
  { id: 'testimonials', active: true },
  { id: 'faq', active: true },
  { id: 'map', active: false },
  { id: 'cta', active: true },
  { id: 'gallery', active: false },
]

export const DEFAULT_DESIGN: BuilderDesign = {
  primary: '#1a56db', secondary: '#16a34a', cta: '#f59e0b', bg: '#ffffff',
  titleFont: 'Heebo', bodyFont: 'Rubik', radius: 'full', fontSize: 16,
}

export const DEFAULT_CONFIG: BuilderConfig = { blocks: DEFAULT_BLOCKS, design: DEFAULT_DESIGN }

/**
 * Block ids whose visibility the public page currently honors. The rest are
 * present in the builder for layout planning but don't yet map to a live section
 * (they'll be wired as those sections get built).
 */
export const WIRED_BLOCKS: ReadonlySet<BlockId> = new Set<BlockId>([
  'hero', 'video', 'amounts', 'goal', 'donors', 'gallery',
])

/**
 * Merge a stored (possibly partial / legacy) config with the defaults, keeping
 * the canonical block order and dropping unknown ids. Returns null for empty
 * input so callers can preserve the pre-builder default rendering.
 */
export function resolveBuilderConfig(raw: unknown): BuilderConfig | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Partial<BuilderConfig>
  if (!Array.isArray(r.blocks) && !r.design) return null

  const stored = new Map<BlockId, boolean>()
  if (Array.isArray(r.blocks)) {
    for (const b of r.blocks) {
      if (b && typeof b.id === 'string') stored.set(b.id as BlockId, !!b.active)
    }
  }
  // Preserve the stored order when present, falling back to canonical order.
  const orderedIds = Array.isArray(r.blocks) && r.blocks.length
    ? r.blocks.map(b => b?.id).filter((id): id is BlockId => DEFAULT_BLOCKS.some(d => d.id === id))
    : DEFAULT_BLOCKS.map(b => b.id)
  // Append any canonical block missing from the stored order (newly added blocks).
  for (const d of DEFAULT_BLOCKS) if (!orderedIds.includes(d.id)) orderedIds.push(d.id)

  const blocks: BuilderBlock[] = orderedIds.map(id => ({
    id,
    active: stored.has(id) ? stored.get(id)! : DEFAULT_BLOCKS.find(d => d.id === id)!.active,
  }))

  return {
    blocks,
    design: { ...DEFAULT_DESIGN, ...(r.design ?? {}) },
  }
}

/** Convenience: a lookup of active states for the public page. */
export function activeBlockMap(cfg: BuilderConfig | null): Record<string, boolean> | null {
  if (!cfg) return null
  return Object.fromEntries(cfg.blocks.map(b => [b.id, b.active]))
}

/** Map the builder radius token to the public page's button-radius classes. */
export function radiusToButtonClass(radius: BuilderDesign['radius']): string {
  return radius === 'none' ? 'rounded-md' : radius === 'md' ? 'rounded-xl' : 'rounded-full'
}
