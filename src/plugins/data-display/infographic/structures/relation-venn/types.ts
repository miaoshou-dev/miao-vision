/**
 * RelationVenn Structure Types
 *
 * Venn diagram for showing set relationships and overlaps.
 */
import type { Palette } from '../../theme'

/**
 * Venn circle/set data
 */
export interface VennSetData {
  /** Unique identifier */
  id: string
  /** Set label */
  label: string
  /** Optional description */
  desc?: string
  /** Items in this set only (not in overlaps) */
  items?: string[]
  /** Custom color */
  color?: string
}

/**
 * Venn overlap region data
 */
export interface VennOverlapData {
  /** Sets involved (ids) */
  sets: string[]
  /** Label for overlap region */
  label?: string
  /** Items in this overlap */
  items?: string[]
}

/**
 * Calculated circle layout
 */
export interface VennCircleLayout {
  /** Set data */
  set: VennSetData
  /** Center X */
  cx: number
  /** Center Y */
  cy: number
  /** Radius */
  r: number
  /** Index */
  index: number
}

/**
 * RelationVenn component props
 */
export interface RelationVennProps {
  /** Array of sets (2-3 sets supported) */
  sets: VennSetData[]
  /** Overlap data */
  overlaps?: VennOverlapData[]
  /** Available width */
  width?: number
  /** Available height */
  height?: number
  /** Circle opacity */
  opacity?: number
  /** Show labels */
  showLabels?: boolean
  /** Show items in regions */
  showItems?: boolean
  /** Palette override */
  palette?: Palette
}

/**
 * Default values
 */
export const RELATION_VENN_DEFAULTS = {
  width: 500,
  height: 400,
  opacity: 0.6,
  showLabels: true,
  showItems: true
}
