/**
 * CompareSwot Layout Calculations
 *
 * Pure functions for calculating SWOT quadrant positions and sizes.
 * All functions are side-effect free and easily testable.
 *
 * @module plugins/data-display/infographic/structures/compare-swot/layout
 */

import type {
  SwotData,
  SwotQuadrant,
  SwotItem,
  QuadrantLayout,
  SwotLayout,
  QuadrantConfig
} from './types'
import { SWOT_QUADRANT_CONFIGS, COMPARE_SWOT_DEFAULTS } from './types'
import type { ThemeColors, Palette } from '../../theme'
import { generateItemThemeColors } from '../../theme'

/**
 * Get total item count across all quadrants
 *
 * @param data - SWOT data
 * @returns Total number of items
 *
 * @example
 * getTotalItemCount({ strengths: [item1], weaknesses: [], opportunities: [item2, item3], threats: [] })
 * // => 3
 */
export function getTotalItemCount(data: SwotData): number {
  return (
    data.strengths.length +
    data.weaknesses.length +
    data.opportunities.length +
    data.threats.length
  )
}

/**
 * Get item count for a specific quadrant
 *
 * @param data - SWOT data
 * @param quadrant - Quadrant type
 * @returns Number of items in quadrant
 */
export function getQuadrantItemCount(data: SwotData, quadrant: SwotQuadrant): number {
  return data[quadrant].length
}

/**
 * Get maximum item count among all quadrants
 *
 * @param data - SWOT data
 * @returns Maximum item count in any single quadrant
 */
export function getMaxQuadrantItemCount(data: SwotData): number {
  return Math.max(
    data.strengths.length,
    data.weaknesses.length,
    data.opportunities.length,
    data.threats.length
  )
}

/**
 * Get items for a specific quadrant
 *
 * @param data - SWOT data
 * @param quadrant - Quadrant type
 * @returns Array of items in that quadrant
 */
export function getQuadrantItems(data: SwotData, quadrant: SwotQuadrant): SwotItem[] {
  return data[quadrant]
}

/**
 * Calculate quadrant position in 2x2 grid
 *
 * Layout:
 * ┌───────────┬───────────┐
 * │ Strengths │ Weaknesses│
 * ├───────────┼───────────┤
 * │ Opportun. │ Threats   │
 * └───────────┴───────────┘
 *
 * @param quadrant - Quadrant type
 * @param totalWidth - Total available width
 * @param totalHeight - Total available height
 * @param gap - Gap between quadrants
 * @returns Position and size { x, y, width, height }
 */
export function calculateQuadrantPosition(
  quadrant: SwotQuadrant,
  totalWidth: number,
  totalHeight: number,
  gap: number
): { x: number; y: number; width: number; height: number } {
  const quadrantWidth = (totalWidth - gap) / 2
  const quadrantHeight = (totalHeight - gap) / 2

  const positions: Record<SwotQuadrant, { x: number; y: number }> = {
    strengths: { x: 0, y: 0 },
    weaknesses: { x: quadrantWidth + gap, y: 0 },
    opportunities: { x: 0, y: quadrantHeight + gap },
    threats: { x: quadrantWidth + gap, y: quadrantHeight + gap }
  }

  return {
    ...positions[quadrant],
    width: quadrantWidth,
    height: quadrantHeight
  }
}

/**
 * Calculate complete SWOT layout
 *
 * @param data - SWOT data
 * @param options - Layout options
 * @returns Complete layout with all quadrant positions
 */
export function calculateSwotLayout(
  data: SwotData,
  options: {
    width?: number
    height?: number
    gap?: number
    palette?: Palette
    baseColors: ThemeColors
    gradientsEnabled?: boolean
    instanceId?: string
    titles?: {
      strengths?: string
      weaknesses?: string
      opportunities?: string
      threats?: string
    }
  }
): SwotLayout {
  const {
    width = COMPARE_SWOT_DEFAULTS.width,
    height = COMPARE_SWOT_DEFAULTS.height,
    gap = COMPARE_SWOT_DEFAULTS.gap,
    baseColors,
    gradientsEnabled = false,
    instanceId = 'swot',
    titles
  } = options

  const quadrants: SwotQuadrant[] = ['strengths', 'weaknesses', 'opportunities', 'threats']

  const quadrantLayouts: QuadrantLayout[] = quadrants.map((quadrant, index) => {
    const position = calculateQuadrantPosition(quadrant, width, height, gap)
    const config = {
      ...SWOT_QUADRANT_CONFIGS[quadrant],
      title: titles?.[quadrant] || SWOT_QUADRANT_CONFIGS[quadrant].title
    }
    const themeColors = generateItemThemeColors(config.color, baseColors)
    const gradientId = gradientsEnabled ? `grad-${instanceId}-${quadrant}` : undefined

    return {
      quadrant,
      x: position.x,
      y: position.y,
      width: position.width,
      height: position.height,
      items: data[quadrant],
      config,
      themeColors,
      gradientId
    }
  })

  return {
    quadrants: quadrantLayouts,
    totalWidth: width,
    totalHeight: height,
    gap
  }
}

/**
 * Calculate item positions within a quadrant
 *
 * @param items - Items in the quadrant
 * @param quadrantWidth - Width of the quadrant
 * @param quadrantHeight - Height of the quadrant
 * @param showHeader - Whether header is shown
 * @returns Array of item positions { x, y, width, height }
 */
export function calculateItemPositions(
  items: SwotItem[],
  quadrantWidth: number,
  quadrantHeight: number,
  showHeader: boolean = true
): Array<{ x: number; y: number; width: number; height: number }> {
  const { headerHeight, itemPadding, itemGap } = COMPARE_SWOT_DEFAULTS

  const startY = showHeader ? headerHeight + itemPadding : itemPadding
  const availableHeight = quadrantHeight - startY - itemPadding
  const availableWidth = quadrantWidth - itemPadding * 2

  if (items.length === 0) {
    return []
  }

  // Calculate item height based on available space
  const totalGap = (items.length - 1) * itemGap
  const itemHeight = Math.min(
    40, // Max item height
    (availableHeight - totalGap) / items.length
  )

  return items.map((_, index) => ({
    x: itemPadding,
    y: startY + index * (itemHeight + itemGap),
    width: availableWidth,
    height: itemHeight
  }))
}

/**
 * Get quadrant by position (for click handling)
 *
 * @param x - Click X coordinate
 * @param y - Click Y coordinate
 * @param width - Total width
 * @param height - Total height
 * @param gap - Gap between quadrants
 * @returns Quadrant type or null if in gap area
 */
export function getQuadrantAtPosition(
  x: number,
  y: number,
  width: number,
  height: number,
  gap: number
): SwotQuadrant | null {
  const midX = width / 2
  const midY = height / 2
  const halfGap = gap / 2

  // Check if in gap area
  if (Math.abs(x - midX) < halfGap || Math.abs(y - midY) < halfGap) {
    return null
  }

  const isLeft = x < midX
  const isTop = y < midY

  if (isTop && isLeft) return 'strengths'
  if (isTop && !isLeft) return 'weaknesses'
  if (!isTop && isLeft) return 'opportunities'
  return 'threats'
}

/**
 * Sort items by priority within a quadrant
 *
 * @param items - Items to sort
 * @returns Sorted items (priority 1 first, then 2, then 3, then undefined)
 */
export function sortItemsByPriority(items: SwotItem[]): SwotItem[] {
  return [...items].sort((a, b) => {
    const priorityA = a.priority ?? 4
    const priorityB = b.priority ?? 4
    return priorityA - priorityB
  })
}

/**
 * Filter items by minimum priority
 *
 * @param items - Items to filter
 * @param maxPriority - Maximum priority to include (1, 2, or 3)
 * @returns Filtered items
 */
export function filterItemsByPriority(
  items: SwotItem[],
  maxPriority: 1 | 2 | 3
): SwotItem[] {
  return items.filter((item) => !item.priority || item.priority <= maxPriority)
}

/**
 * Get quadrant display info (for labels, colors)
 *
 * @param quadrant - Quadrant type
 * @returns Quadrant configuration
 */
export function getQuadrantConfig(quadrant: SwotQuadrant): QuadrantConfig {
  return SWOT_QUADRANT_CONFIGS[quadrant]
}

/**
 * Validate SWOT data structure
 *
 * @param data - Data to validate
 * @returns True if valid, false otherwise
 */
export function isValidSwotData(data: unknown): data is SwotData {
  if (!data || typeof data !== 'object') return false

  const d = data as Record<string, unknown>

  return (
    Array.isArray(d.strengths) &&
    Array.isArray(d.weaknesses) &&
    Array.isArray(d.opportunities) &&
    Array.isArray(d.threats)
  )
}
