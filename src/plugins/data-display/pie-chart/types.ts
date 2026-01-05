/**
 * Pie Chart Component Types
 *
 * Types for displaying proportions as pie/donut slices.
 */

/**
 * Configuration for the Pie Chart component
 */
export interface PieChartConfig {
  /** Query name providing the data */
  data: string
  /** Column name for category labels (slices) */
  x: string
  /** Column name for values (slice size) */
  y: string
  /** Chart title */
  title?: string
  /** Chart subtitle */
  subtitle?: string
  /** Chart width in pixels */
  width?: number
  /** Chart height in pixels */
  height?: number
  /** Inner radius for donut chart (0 = pie, >0 = donut) */
  innerRadius?: number
  /** Show category labels */
  showLabels?: boolean
  /** Show percentage values */
  showPercentages?: boolean
  /** Show legend */
  showLegend?: boolean
  /** Legend position */
  legendPosition?: 'right' | 'bottom'
  /** Gap between slices (0-0.1) */
  padAngle?: number
  /** Rounded corners on slices */
  cornerRadius?: number
  /** Color palette */
  colors?: string[]
  /** Named color palette preset */
  palette?: string
  /** Value format: 'number', 'currency', 'percent' */
  valueFormat?: 'number' | 'currency' | 'percent'
  /** Currency symbol for currency format */
  currencySymbol?: string
  /** Sort slices by value */
  sort?: 'none' | 'asc' | 'desc'
  /** Custom CSS class */
  class?: string
}

/**
 * A single slice in the pie chart
 */
export interface PieSlice {
  /** Unique identifier */
  id: string
  /** Category label */
  label: string
  /** Raw value */
  value: number
  /** Formatted value for display */
  formatted: string
  /** Percentage of total (0-100) */
  percent: number
  /** Slice color */
  color: string
  /** Start angle in radians */
  startAngle: number
  /** End angle in radians */
  endAngle: number
  /** SVG path for the slice */
  path: string
  /** Label position (x, y) */
  labelPosition: { x: number; y: number }
  /** Whether label is on right side */
  isRightSide: boolean
}

/**
 * Processed pie chart data for rendering
 */
export interface PieChartData {
  /** Pie slices */
  slices: PieSlice[]
  /** Total value */
  total: number
  /** Center point */
  center: { x: number; y: number }
  /** Outer radius */
  outerRadius: number
  /** Inner radius (0 for pie, >0 for donut) */
  innerRadius: number
  /** Configuration */
  config: PieChartConfig
}
