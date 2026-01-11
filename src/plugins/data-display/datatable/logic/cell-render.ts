/**
 * DataTable Cell Rendering Logic
 *
 * Pure functions for cell styling, data bars, color scales, and icons.
 */

import type { ColumnDef, ConditionalFormatRule, ColorScaleConfig, IconSetConfig } from '../types'
import { formatValue } from '../formatter'

/**
 * Get formatted cell value
 */
export function getCellValue(
  row: Record<string, unknown>,
  column: ColumnDef
): string {
  const value = row[column.name]
  return formatValue(value, column.format || 'text')
}

/**
 * Get conditional formatting style for a cell
 */
export function getCellStyle(
  row: Record<string, unknown>,
  column: ColumnDef
): string {
  if (!column.conditionalFormat || column.conditionalFormat.length === 0) {
    return ''
  }

  const value = Number(row[column.name])
  if (isNaN(value)) return ''

  for (const rule of column.conditionalFormat) {
    if (matchesCondition(value, rule)) {
      return buildStyleString(rule)
    }
  }

  return ''
}

function matchesCondition(value: number, rule: ConditionalFormatRule): boolean {
  switch (rule.condition) {
    case 'greater_than':
      return value > rule.value
    case 'less_than':
      return value < rule.value
    case 'equals':
      return value === rule.value
    case 'between':
      return rule.value2 !== undefined && value >= rule.value && value <= rule.value2
    default:
      return false
  }
}

function buildStyleString(rule: ConditionalFormatRule): string {
  const styles: string[] = []
  if (rule.backgroundColor) styles.push(`background-color: ${rule.backgroundColor}`)
  if (rule.textColor) styles.push(`color: ${rule.textColor}`)
  if (rule.fontWeight) styles.push(`font-weight: ${rule.fontWeight}`)
  return styles.join('; ')
}

/**
 * Calculate data bar width percentage
 */
export function getDataBarWidth(
  row: Record<string, unknown>,
  column: ColumnDef,
  allRows: Record<string, unknown>[]
): number {
  if (!column.showDataBar) return 0

  const value = Number(row[column.name])
  if (isNaN(value)) return 0

  const values = allRows
    .map(r => Number(r[column.name]))
    .filter(v => !isNaN(v))

  if (values.length === 0) return 0

  const min = Math.min(...values)
  const max = Math.max(...values)

  if (max === min) return 100

  return ((value - min) / (max - min)) * 100
}

// Color scale palettes
const COLOR_SCALE_PALETTES: Record<string, [string, string, string?]> = {
  'red-green': ['#EF4444', '#22C55E'],
  'green-red': ['#22C55E', '#EF4444'],
  'red-yellow-green': ['#EF4444', '#EAB308', '#22C55E'],
  'blue-white-red': ['#3B82F6', '#FFFFFF', '#EF4444'],
  'white-blue': ['#FFFFFF', '#3B82F6']
}

/**
 * Interpolate between two colors
 */
export function interpolateColor(color1: string, color2: string, factor: number): string {
  const hex = (c: string) => parseInt(c, 16)
  const r1 = hex(color1.slice(1, 3))
  const g1 = hex(color1.slice(3, 5))
  const b1 = hex(color1.slice(5, 7))
  const r2 = hex(color2.slice(1, 3))
  const g2 = hex(color2.slice(3, 5))
  const b2 = hex(color2.slice(5, 7))

  const r = Math.round(r1 + (r2 - r1) * factor)
  const g = Math.round(g1 + (g2 - g1) * factor)
  const b = Math.round(b1 + (b2 - b1) * factor)

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Get color scale background for a cell
 */
export function getColorScaleBackground(
  row: Record<string, unknown>,
  column: ColumnDef,
  allRows: Record<string, unknown>[]
): string {
  if (!column.colorScale) return ''

  const value = Number(row[column.name])
  if (isNaN(value)) return ''

  const values = allRows
    .map(r => Number(r[column.name]))
    .filter(v => !isNaN(v))

  if (values.length === 0) return ''

  const min = column.colorScale.min ?? Math.min(...values)
  const max = column.colorScale.max ?? Math.max(...values)

  if (max === min) return ''

  const palette = COLOR_SCALE_PALETTES[column.colorScale.type] || COLOR_SCALE_PALETTES['red-green']
  const factor = Math.max(0, Math.min(1, (value - min) / (max - min)))

  if (palette.length === 3 && palette[2]) {
    // Three-color gradient
    if (factor <= 0.5) {
      return interpolateColor(palette[0], palette[1], factor * 2)
    } else {
      return interpolateColor(palette[1], palette[2], (factor - 0.5) * 2)
    }
  } else {
    // Two-color gradient
    return interpolateColor(palette[0], palette[1], factor)
  }
}

// Icon sets
const ICON_SETS: Record<string, [string, string, string]> = {
  'arrows': ['↓', '→', '↑'],
  'trend': ['▼', '–', '▲'],
  'rating': ['★', '★★', '★★★'],
  'flags': ['🔴', '🟡', '🟢'],
  'symbols': ['✕', '●', '✓']
}

const ICON_COLORS: Record<string, [string, string, string]> = {
  'arrows': ['#EF4444', '#9CA3AF', '#22C55E'],
  'trend': ['#EF4444', '#9CA3AF', '#22C55E'],
  'rating': ['#F59E0B', '#F59E0B', '#F59E0B'],
  'flags': ['#EF4444', '#EAB308', '#22C55E'],
  'symbols': ['#EF4444', '#9CA3AF', '#22C55E']
}

export interface IconInfo {
  icon: string
  color: string
}

/**
 * Get icon for a cell value based on icon set configuration
 */
export function getIconForValue(
  row: Record<string, unknown>,
  column: ColumnDef,
  allRows: Record<string, unknown>[]
): IconInfo | null {
  if (!column.iconSet) return null

  const value = Number(row[column.name])
  if (isNaN(value)) return null

  const values = allRows
    .map(r => Number(r[column.name]))
    .filter(v => !isNaN(v))

  if (values.length === 0) return null

  const sortedValues = [...values].sort((a, b) => a - b)
  const thresholds = column.iconSet.thresholds || [33, 67]
  const lowIdx = Math.floor(sortedValues.length * thresholds[0] / 100)
  const highIdx = Math.floor(sortedValues.length * thresholds[1] / 100)
  const lowThreshold = sortedValues[lowIdx] || sortedValues[0]
  const highThreshold = sortedValues[highIdx] || sortedValues[sortedValues.length - 1]

  const icons = ICON_SETS[column.iconSet.type] || ICON_SETS['arrows']
  const colors = ICON_COLORS[column.iconSet.type] || ICON_COLORS['arrows']

  if (value < lowThreshold) {
    return { icon: icons[0], color: colors[0] }
  } else if (value >= highThreshold) {
    return { icon: icons[2], color: colors[2] }
  } else {
    return { icon: icons[1], color: colors[1] }
  }
}
