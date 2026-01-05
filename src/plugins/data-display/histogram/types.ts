/**
 * Histogram Component Types
 *
 * Types for displaying data distribution as binned bars.
 */

/**
 * Configuration for the Histogram component
 */
export interface HistogramConfig {
  /** Query name providing the data */
  data: string
  /** Column containing values to bin */
  valueColumn: string
  /** Number of bins (default: 10) */
  bins?: number
  /** Chart title */
  title?: string
  /** Chart subtitle */
  subtitle?: string
  /** Chart height in pixels */
  height?: number
  /** Bar color */
  color?: string
  /** Named color palette preset (uses first color) */
  palette?: string
  /** Show X-axis */
  showXAxis?: boolean
  /** Show Y-axis */
  showYAxis?: boolean
  /** X-axis label */
  xAxisLabel?: string
  /** Y-axis label */
  yAxisLabel?: string
  /** Value format: 'number', 'currency', 'percent' */
  valueFormat?: 'number' | 'currency' | 'percent'
  /** Currency symbol for currency format */
  currencySymbol?: string
  /** Show count labels on bars */
  showLabels?: boolean
  /** Bin boundary mode: 'include-min' or 'include-max' */
  binMode?: 'include-min' | 'include-max'
  /** Custom CSS class */
  class?: string
}

/**
 * A single bin in the histogram
 */
export interface HistogramBin {
  /** Bin index */
  id: number
  /** Minimum value (inclusive based on binMode) */
  min: number
  /** Maximum value (exclusive based on binMode) */
  max: number
  /** Number of values in this bin */
  count: number
  /** Formatted range label */
  label: string
  /** Percentage of total */
  percent: number
  /** Bar height as percentage (0-100) */
  heightPercent: number
}

/**
 * Processed histogram data for rendering
 */
export interface HistogramData {
  /** Histogram bins */
  bins: HistogramBin[]
  /** Chart title */
  title?: string
  /** Chart subtitle */
  subtitle?: string
  /** Total count of values */
  totalCount: number
  /** Maximum bin count (for scaling) */
  maxCount: number
  /** Minimum value in dataset */
  minValue: number
  /** Maximum value in dataset */
  maxValue: number
  /** Configuration */
  config: HistogramConfig
}
