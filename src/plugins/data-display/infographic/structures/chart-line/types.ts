/**
 * ChartLine Types
 *
 * Line chart infographic - trend visualization with points and connecting lines
 */

import type { Snippet } from 'svelte'
import type { ThemeColors } from '../../theme'

/**
 * Line data point
 */
export interface LineDataPoint {
  /** X-axis label (category or date) */
  label: string
  /** Y-axis value */
  value: number
  /** Optional description for tooltip */
  desc?: string
}

/**
 * Line series data
 */
export interface LineSeriesData {
  /** Series name */
  name: string
  /** Data points */
  points: LineDataPoint[]
  /** Optional custom color */
  color?: string
  /** Line style */
  lineStyle?: 'solid' | 'dashed' | 'dotted'
  /** Show area fill under line */
  showArea?: boolean
}

/**
 * Point layout info for rendering
 */
export interface PointLayout {
  /** Point data */
  data: LineDataPoint
  /** Series info */
  series: LineSeriesData
  /** Index in series */
  index: number
  /** X position */
  x: number
  /** Y position */
  y: number
  /** Theme colors */
  themeColors: ThemeColors
}

/**
 * ChartLine props
 */
export interface ChartLineProps {
  /** Line series data */
  series: LineSeriesData[]
  /** Show data points */
  showPoints?: boolean
  /** Point radius */
  pointRadius?: number
  /** Line stroke width */
  lineWidth?: number
  /** Show grid lines */
  showGrid?: boolean
  /** Show X-axis labels */
  showXLabels?: boolean
  /** Show Y-axis labels */
  showYLabels?: boolean
  /** Value format prefix */
  valuePrefix?: string
  /** Value format suffix */
  valueSuffix?: string
  /** Curve type */
  curveType?: 'linear' | 'smooth' | 'step'
  /** Color palette name */
  palette?: string
  /** Custom point renderer */
  point?: Snippet<[PointLayout]>
  /** Width */
  width?: number
  /** Height */
  height?: number
}
