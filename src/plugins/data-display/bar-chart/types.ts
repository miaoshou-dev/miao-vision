/**
 * Bar Chart Component Types
 *
 * Types for displaying categorical data comparison.
 */

/**
 * Configuration for the Bar Chart component
 */
export interface BarChartConfig {
  /** Query name providing the data */
  data: string
  /** Column name for X-axis (categories) */
  x: string
  /** Column name for Y-axis (values) */
  y: string
  /** Column name for grouping/coloring multiple series */
  group?: string
  /** Chart title */
  title?: string
  /** Chart subtitle */
  subtitle?: string
  /** X-axis label */
  xLabel?: string
  /** Y-axis label */
  yLabel?: string
  /** Chart height in pixels */
  height?: number
  /** Bar color (single series) or color palette (grouped) */
  color?: string
  /** Color palette for grouped bars */
  colors?: string[]
  /** Named color palette preset */
  palette?: string
  /** Horizontal bar chart */
  horizontal?: boolean
  /** Show value labels on bars */
  showLabels?: boolean
  /** Show legend for grouped bars */
  showLegend?: boolean
  /** Show grid lines */
  showGrid?: boolean
  /** Bar corner radius */
  borderRadius?: number
  /** Gap between bars (0-1) */
  barGap?: number
  /** Gap between groups (0-1) */
  groupGap?: number
  /** Value format: 'number', 'currency', 'percent' */
  valueFormat?: 'number' | 'currency' | 'percent'
  /** Currency symbol for currency format */
  currencySymbol?: string
  /** Sort order: 'none', 'asc', 'desc' */
  sort?: 'none' | 'asc' | 'desc'
  /** Custom CSS class */
  class?: string

  // Cross-view linking options
  /** Enable click-to-select on bars */
  selectable?: boolean
  /** Field name used for selection (defaults to x column) */
  selectionField?: string
  /** Fields to filter by when other charts have selections */
  linkedFields?: string[]
}

/**
 * A single bar in the chart
 */
export interface BarItem {
  /** Unique identifier */
  id: string
  /** Category label (x-axis) */
  category: string
  /** Value (y-axis) */
  value: number
  /** Formatted value for display */
  formatted: string
  /** Group name (for grouped bars) */
  group?: string
  /** Bar color */
  color: string
  /** Bar height/width as percentage (0-100) */
  percent: number
}

/**
 * Processed bar chart data for rendering
 */
export interface BarChartData {
  /** Categories (x-axis labels) */
  categories: string[]
  /** Groups (for legend) */
  groups: string[]
  /** Bars organized by category */
  bars: BarItem[]
  /** Maximum value (for scaling) */
  maxValue: number
  /** Minimum value */
  minValue: number
  /** Total of all values */
  total: number
  /** Configuration */
  config: BarChartConfig

  // Cross-view linking state
  /** Currently selected values (for highlighting) */
  selectedValues?: Set<string>
  /** Selection field name */
  selectionField?: string
  /** Callback when a bar is clicked */
  onSelect?: (field: string, value: string) => void
}
