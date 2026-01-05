/**
 * BigValue Component Types
 */

import type { FormatType } from '@core/shared/format'

export interface BigValueConfig {
  query: string       // SQL result name to use as data source
  value: string       // Column name to extract the value from
  title?: string      // Display title
  format?: FormatType // Value format (currency, percent, num0, compact, etc.)
  comparison?: string // Optional: reference to comparison query result
  comparisonLabel?: string  // Label for comparison (e.g., "vs last month")
  // New: Sparkline support
  sparkline?: string  // Optional: query name for sparkline data
  sparklineField?: string // Optional: field name for sparkline values
  // Theme/color
  color?: string      // Accent color for the value
  palette?: string    // Named palette (uses first color as accent)
}

export interface BigValueData {
  value: number
  title: string
  formatted: string
  comparison?: ComparisonData
  color?: string  // Accent color for value display
}

export interface ComparisonData {
  value: number           // Raw comparison value
  percent: number         // Percentage change
  trend: 'up' | 'down' | 'neutral'
  label: string           // Display label
  formatted: string       // Formatted comparison value
}
