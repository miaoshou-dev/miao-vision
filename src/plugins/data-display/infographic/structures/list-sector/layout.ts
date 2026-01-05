/**
 * ListSector Layout Calculations
 *
 * Pure functions for calculating radial sector positions.
 * All functions are side-effect free and easily testable.
 *
 * @module plugins/data-display/infographic/structures/list-sector/layout
 */

import type {
  SectorItem,
  SectorLayout,
  SectorListLayout
} from './types'
import { LIST_SECTOR_DEFAULTS } from './types'
import type { ThemeColors, Palette } from '../../theme'
import { getPaletteColor, generateItemThemeColors } from '../../theme'

/**
 * Convert degrees to radians
 *
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Convert radians to degrees
 *
 * @param radians - Angle in radians
 * @returns Angle in degrees
 */
export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI
}

/**
 * Calculate total value from items
 *
 * @param items - Sector items
 * @returns Sum of all values
 */
export function calculateTotalValue(items: SectorItem[]): number {
  return items.reduce((sum, item) => sum + (item.value ?? 1), 0)
}

/**
 * Calculate angle for an item based on its value
 *
 * @param item - Sector item
 * @param totalValue - Total value of all items
 * @param totalAngle - Total angle available (in radians)
 * @param proportional - Whether to use proportional sizing
 * @param itemCount - Total number of items
 * @returns Angle in radians for this item
 */
export function calculateItemAngle(
  item: SectorItem,
  totalValue: number,
  totalAngle: number,
  proportional: boolean,
  itemCount: number
): number {
  if (!proportional || totalValue === 0) {
    return totalAngle / itemCount
  }
  const value = item.value ?? 1
  return (value / totalValue) * totalAngle
}

/**
 * Generate SVG arc path for a sector
 *
 * @param centerX - Center X coordinate
 * @param centerY - Center Y coordinate
 * @param innerRadius - Inner radius (0 for full pie)
 * @param outerRadius - Outer radius
 * @param startAngle - Start angle in radians
 * @param endAngle - End angle in radians
 * @returns SVG path data string
 */
export function generateSectorPath(
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  // Adjust angles so 0 is at 12 o'clock (top)
  const adjustedStart = startAngle - Math.PI / 2
  const adjustedEnd = endAngle - Math.PI / 2

  // Calculate arc points
  const startOuterX = centerX + outerRadius * Math.cos(adjustedStart)
  const startOuterY = centerY + outerRadius * Math.sin(adjustedStart)
  const endOuterX = centerX + outerRadius * Math.cos(adjustedEnd)
  const endOuterY = centerY + outerRadius * Math.sin(adjustedEnd)

  // Large arc flag (1 if angle > 180 degrees)
  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0

  if (innerRadius === 0) {
    // Full pie sector (triangle to arc)
    return [
      `M ${centerX} ${centerY}`,
      `L ${startOuterX} ${startOuterY}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endOuterX} ${endOuterY}`,
      'Z'
    ].join(' ')
  } else {
    // Donut sector
    const startInnerX = centerX + innerRadius * Math.cos(adjustedStart)
    const startInnerY = centerY + innerRadius * Math.sin(adjustedStart)
    const endInnerX = centerX + innerRadius * Math.cos(adjustedEnd)
    const endInnerY = centerY + innerRadius * Math.sin(adjustedEnd)

    return [
      `M ${startInnerX} ${startInnerY}`,
      `L ${startOuterX} ${startOuterY}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endOuterX} ${endOuterY}`,
      `L ${endInnerX} ${endInnerY}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${startInnerX} ${startInnerY}`,
      'Z'
    ].join(' ')
  }
}

/**
 * Calculate label position for a sector
 *
 * @param centerX - Center X coordinate
 * @param centerY - Center Y coordinate
 * @param midAngle - Middle angle of sector in radians
 * @param innerRadius - Inner radius
 * @param outerRadius - Outer radius
 * @param position - Label position type
 * @returns { x, y } coordinates for label
 */
export function calculateLabelPosition(
  centerX: number,
  centerY: number,
  midAngle: number,
  innerRadius: number,
  outerRadius: number,
  position: 'inside' | 'outside' | 'center'
): { x: number; y: number } {
  // Adjust angle so 0 is at 12 o'clock
  const adjustedAngle = midAngle - Math.PI / 2

  let radius: number
  switch (position) {
    case 'inside':
      radius = innerRadius + (outerRadius - innerRadius) * 0.5
      break
    case 'outside':
      radius = outerRadius + 20
      break
    case 'center':
    default:
      radius = innerRadius + (outerRadius - innerRadius) * 0.65
      break
  }

  return {
    x: centerX + radius * Math.cos(adjustedAngle),
    y: centerY + radius * Math.sin(adjustedAngle)
  }
}

/**
 * Calculate complete sector list layout
 *
 * @param items - Items to layout
 * @param options - Layout options
 * @returns Complete layout with all sector positions
 */
export function calculateSectorLayout(
  items: SectorItem[],
  options: {
    width?: number
    height?: number
    innerRadius?: number
    outerRadius?: number
    startAngle?: number
    endAngle?: number
    sectorGap?: number
    proportional?: boolean
    labelPosition?: 'inside' | 'outside' | 'center'
    palette?: Palette
    baseColors: ThemeColors
    gradientsEnabled?: boolean
    instanceId?: string
  }
): SectorListLayout {
  const {
    width = LIST_SECTOR_DEFAULTS.width,
    height = LIST_SECTOR_DEFAULTS.height,
    innerRadius = LIST_SECTOR_DEFAULTS.innerRadius,
    startAngle = LIST_SECTOR_DEFAULTS.startAngle,
    endAngle = LIST_SECTOR_DEFAULTS.endAngle,
    sectorGap = LIST_SECTOR_DEFAULTS.sectorGap,
    proportional = LIST_SECTOR_DEFAULTS.proportional,
    labelPosition = LIST_SECTOR_DEFAULTS.labelPosition,
    palette,
    baseColors,
    gradientsEnabled = false,
    instanceId = 'sector'
  } = options

  const centerX = width / 2
  const centerY = height / 2
  const maxRadius = Math.min(width, height) / 2
  const calculatedOuterRadius = options.outerRadius ?? maxRadius * 0.8
  const calculatedInnerRadius = innerRadius * calculatedOuterRadius

  const totalValue = calculateTotalValue(items)
  const totalAngle = degreesToRadians(endAngle - startAngle)
  const gapAngle = degreesToRadians(sectorGap)
  const totalGaps = items.length * gapAngle
  const availableAngle = totalAngle - totalGaps

  const sectors: SectorLayout[] = []
  let currentAngle = degreesToRadians(startAngle)

  items.forEach((item, index) => {
    const itemAngle = calculateItemAngle(
      item,
      totalValue,
      availableAngle,
      proportional,
      items.length
    )

    const sectorStartAngle = currentAngle
    const sectorEndAngle = currentAngle + itemAngle
    const midAngle = (sectorStartAngle + sectorEndAngle) / 2

    const color = item.color || getPaletteColor(palette, index, items.length)
    const themeColors = generateItemThemeColors(color, baseColors)
    const gradientId = gradientsEnabled ? `grad-${instanceId}-${index}` : undefined

    const pathData = generateSectorPath(
      centerX,
      centerY,
      calculatedInnerRadius,
      calculatedOuterRadius,
      sectorStartAngle,
      sectorEndAngle
    )

    const labelPos = calculateLabelPosition(
      centerX,
      centerY,
      midAngle,
      calculatedInnerRadius,
      calculatedOuterRadius,
      labelPosition
    )

    sectors.push({
      item,
      index,
      startAngle: sectorStartAngle,
      endAngle: sectorEndAngle,
      midAngle,
      innerRadius: calculatedInnerRadius,
      outerRadius: calculatedOuterRadius,
      centerX,
      centerY,
      pathData,
      labelX: labelPos.x,
      labelY: labelPos.y,
      themeColors,
      gradientId
    })

    currentAngle = sectorEndAngle + gapAngle
  })

  return {
    sectors,
    centerX,
    centerY,
    outerRadius: calculatedOuterRadius,
    innerRadius: calculatedInnerRadius,
    totalValue
  }
}

/**
 * Find sector at a given point (for click handling)
 *
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param layout - Sector list layout
 * @returns Sector index or -1 if not found
 */
export function findSectorAtPoint(
  x: number,
  y: number,
  layout: SectorListLayout
): number {
  const { centerX, centerY, outerRadius, innerRadius, sectors } = layout

  // Calculate distance from center
  const dx = x - centerX
  const dy = y - centerY
  const distance = Math.sqrt(dx * dx + dy * dy)

  // Check if within radius range
  if (distance < innerRadius || distance > outerRadius) {
    return -1
  }

  // Calculate angle (adjusted so 0 is at top)
  let angle = Math.atan2(dy, dx) + Math.PI / 2
  if (angle < 0) angle += 2 * Math.PI

  // Find matching sector
  for (let i = 0; i < sectors.length; i++) {
    const sector = sectors[i]
    if (angle >= sector.startAngle && angle <= sector.endAngle) {
      return i
    }
  }

  return -1
}

/**
 * Calculate percentage for a sector
 *
 * @param sectorValue - Value of the sector
 * @param totalValue - Total value
 * @returns Percentage as number (0-100)
 */
export function calculatePercentage(sectorValue: number, totalValue: number): number {
  if (totalValue === 0) return 0
  return (sectorValue / totalValue) * 100
}
