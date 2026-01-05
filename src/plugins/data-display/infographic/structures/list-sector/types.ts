/**
 * ListSector Structure Types
 *
 * Type definitions for radial sector layouts.
 * Displays items arranged in pie-like sectors around a center point.
 *
 * @module plugins/data-display/infographic/structures/list-sector
 *
 * @example
 * // Basic sector data
 * const items: SectorItem[] = [
 *   { id: '1', label: 'Category A', value: 30 },
 *   { id: '2', label: 'Category B', value: 25 },
 *   { id: '3', label: 'Category C', value: 45 }
 * ]
 */

import type { ThemeColors, Palette } from '../../theme'

/**
 * Single item in the sector layout
 *
 * @property id - Unique identifier
 * @property label - Display text
 * @property value - Numeric value (determines sector size if proportional)
 * @property desc - Optional description
 * @property icon - Optional icon name (MDI)
 * @property color - Optional custom color
 */
export interface SectorItem {
  id: string
  label: string
  value?: number
  desc?: string
  icon?: string
  color?: string
}

/**
 * Calculated layout for a single sector
 */
export interface SectorLayout {
  /** Original item data */
  item: SectorItem
  /** Index in the list */
  index: number
  /** Start angle in radians */
  startAngle: number
  /** End angle in radians */
  endAngle: number
  /** Midpoint angle in radians */
  midAngle: number
  /** Inner radius */
  innerRadius: number
  /** Outer radius */
  outerRadius: number
  /** Center X of the sector arc */
  centerX: number
  /** Center Y of the sector arc */
  centerY: number
  /** SVG path data for the sector */
  pathData: string
  /** Label position X */
  labelX: number
  /** Label position Y */
  labelY: number
  /** Theme colors for this sector */
  themeColors: ThemeColors
  /** Gradient ID if enabled */
  gradientId?: string
}

/**
 * Complete sector layout result
 */
export interface SectorListLayout {
  /** All sector layouts */
  sectors: SectorLayout[]
  /** Center X of the radial layout */
  centerX: number
  /** Center Y of the radial layout */
  centerY: number
  /** Outer radius */
  outerRadius: number
  /** Inner radius */
  innerRadius: number
  /** Total value sum */
  totalValue: number
}

/**
 * ListSector component props
 */
export interface ListSectorProps {
  /** Items to display */
  items: SectorItem[]
  /** Available width */
  width?: number
  /** Available height */
  height?: number
  /** Inner radius (0 = full pie, > 0 = donut) */
  innerRadius?: number
  /** Outer radius (auto-calculated if not provided) */
  outerRadius?: number
  /** Start angle in degrees (0 = 12 o'clock) */
  startAngle?: number
  /** End angle in degrees (360 = full circle) */
  endAngle?: number
  /** Gap between sectors in degrees */
  sectorGap?: number
  /** Whether sector sizes are proportional to values */
  proportional?: boolean
  /** Show labels */
  showLabels?: boolean
  /** Label position: inside, outside, or center */
  labelPosition?: 'inside' | 'outside' | 'center'
  /** Color palette */
  palette?: Palette
  /** Show center content */
  showCenter?: boolean
  /** Center label */
  centerLabel?: string
  /** Center value */
  centerValue?: string | number
}

/**
 * Default configuration values
 */
export const LIST_SECTOR_DEFAULTS = {
  width: 400,
  height: 400,
  innerRadius: 0,
  startAngle: 0,
  endAngle: 360,
  sectorGap: 2,
  proportional: true,
  showLabels: true,
  labelPosition: 'outside' as const,
  showCenter: false
} as const
