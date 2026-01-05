/**
 * ChartBar Types
 *
 * Bar chart infographic - horizontal or vertical bars with labels and values
 */

import type { Snippet } from 'svelte'
import type { ThemeColors } from '../../theme'

/**
 * Bar data item
 */
export interface BarDataItem {
  /** Bar label */
  label: string
  /** Bar value (numeric) */
  value: number
  /** Optional description */
  desc?: string
  /** Optional icon */
  icon?: string
  /** Optional custom color */
  color?: string
}

/**
 * Bar layout info for rendering
 */
export interface BarLayout {
  /** Bar data */
  data: BarDataItem
  /** Index in array */
  index: number
  /** X position */
  x: number
  /** Y position */
  y: number
  /** Bar width */
  width: number
  /** Bar height */
  height: number
  /** Value as percentage (0-100) */
  percentage: number
  /** Formatted value string */
  formattedValue: string
  /** Theme colors */
  themeColors: ThemeColors
  /** Gradient ID if applicable */
  gradientId?: string
}

/**
 * ChartBar props
 */
export interface ChartBarProps {
  /** Bar data items */
  items: BarDataItem[]
  /** Bar orientation */
  orientation?: 'horizontal' | 'vertical'
  /** Show value labels on bars */
  showValues?: boolean
  /** Show percentage instead of absolute value */
  showPercentage?: boolean
  /** Value format (e.g., '$', '%', 'K') */
  valuePrefix?: string
  valueSuffix?: string
  /** Bar corner radius */
  cornerRadius?: number
  /** Gap between bars (0-1 as fraction of bar width) */
  barGap?: number
  /** Show grid lines */
  showGrid?: boolean
  /** Maximum value (auto if not specified) */
  maxValue?: number
  /** Color palette name */
  palette?: string
  /** Custom bar renderer */
  bar?: Snippet<[BarLayout]>
  /** Width */
  width?: number
  /** Height */
  height?: number
}
