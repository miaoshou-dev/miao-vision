/**
 * Chart Configuration Constants
 *
 * Chart types, aggregation options, and color palettes.
 */

import type { QueryResult } from '@/types/database'
import type { ResultsChartConfig } from '../types'

/**
 * Chart type options
 */
export const CHART_TYPES = [
  { value: 'bar', label: 'Bar Chart', icon: '📊' },
  { value: 'line', label: 'Line Chart', icon: '📈' },
  { value: 'pie', label: 'Pie Chart', icon: '🥧' },
  { value: 'scatter', label: 'Scatter Plot', icon: '⚬' },
  { value: 'histogram', label: 'Histogram', icon: '📶' }
] as const

export type ChartType = typeof CHART_TYPES[number]['value']

/**
 * Aggregation options
 */
export const AGGREGATIONS = [
  { value: 'none', label: 'None (Raw)' },
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'count', label: 'Count' },
  { value: 'min', label: 'Min' },
  { value: 'max', label: 'Max' }
] as const

/**
 * Default chart colors
 */
export const CHART_COLORS = [
  '#8B5CF6', // Purple
  '#4285F4', // Blue
  '#22C55E', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16'  // Lime
]

/**
 * Get color by index with wrap-around
 */
export function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length]
}

/**
 * Generate hash for query result to detect changes
 */
export function getResultHash(result: QueryResult): string {
  return `${result.data.length}_${result.columns.join('_')}_${result.rowCount}`
}

/**
 * Generate hash for chart config to detect meaningful changes
 */
export function getConfigHash(
  config: ResultsChartConfig,
  dimensions: {
    width: number
    height: number
    title: string
    xLabel: string
    yLabel: string
    sort: string
  }
): string {
  return JSON.stringify({
    type: config.type,
    xColumn: config.xColumn,
    yColumns: config.yColumns,
    aggregation: config.aggregation,
    groupBy: config.groupBy,
    ...dimensions
  })
}

/**
 * Check if chart type is supported by vgplot
 */
export function isVgplotSupported(type: string | undefined): boolean {
  return ['bar', 'line', 'scatter', 'histogram'].includes(type || '')
}

/**
 * Default chart dimensions
 */
export const DEFAULT_CHART_DIMENSIONS = {
  width: 700,
  height: 400,
  dataLimit: 20
}
