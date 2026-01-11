/**
 * Chart Data Processing Logic
 *
 * Pure functions for preparing chart data with aggregation, sorting, and limiting.
 */

import type { ResultsChartConfig } from '../types'

export interface ChartDataset {
  label: string
  values: number[]
}

export interface PreparedChartData {
  labels: string[]
  datasets: ChartDataset[]
  totalCount: number
  limitedCount: number
}

export type AggregationType = 'none' | 'sum' | 'avg' | 'count' | 'min' | 'max'
export type SortOrder = 'desc' | 'asc' | 'none'

/**
 * Prepare chart data with aggregation, sorting, and limiting
 */
export function prepareChartData(
  data: Record<string, unknown>[],
  config: ResultsChartConfig,
  options: {
    limit?: number
    sort?: SortOrder
    dataLimit?: number
    sortOrder?: SortOrder
  } = {}
): PreparedChartData | null {
  if (!config.xColumn || config.yColumns.length === 0) return null

  const { limit, sort, dataLimit = 20, sortOrder = 'none' } = options
  const agg = config.aggregation || 'none'

  // For "none" aggregation, use raw data without grouping
  if (agg === 'none') {
    return prepareRawData(data, config, limit ?? dataLimit, sort ?? sortOrder)
  }

  // With aggregation, group by X column
  return prepareAggregatedData(data, config, agg, limit ?? dataLimit, sort ?? sortOrder)
}

/**
 * Prepare raw data without aggregation
 */
function prepareRawData(
  data: Record<string, unknown>[],
  config: ResultsChartConfig,
  maxItems: number,
  sortBy: SortOrder
): PreparedChartData {
  let entries = data.map(row => ({
    label: String(row[config.xColumn!] ?? 'null'),
    values: config.yColumns.map(yCol => Number(row[yCol]) || 0)
  }))

  // Sort by first Y column value
  if (sortBy !== 'none') {
    entries.sort((a, b) => {
      const diff = b.values[0] - a.values[0]
      return sortBy === 'desc' ? diff : -diff
    })
  }

  // Limit data points
  const totalCount = entries.length
  if (maxItems > 0 && entries.length > maxItems) {
    entries = entries.slice(0, maxItems)
  }

  return {
    labels: entries.map(e => e.label),
    datasets: config.yColumns.map((col, i) => ({
      label: col,
      values: entries.map(e => e.values[i])
    })),
    totalCount,
    limitedCount: entries.length
  }
}

/**
 * Prepare aggregated data
 */
function prepareAggregatedData(
  data: Record<string, unknown>[],
  config: ResultsChartConfig,
  agg: AggregationType,
  maxItems: number,
  sortBy: SortOrder
): PreparedChartData {
  const grouped = new Map<string, { values: number[], count: number }>()

  data.forEach(row => {
    const xVal = String(row[config.xColumn!] ?? 'null')
    if (!grouped.has(xVal)) {
      grouped.set(xVal, {
        values: config.yColumns.map(() => 0),
        count: 0
      })
    }
    const group = grouped.get(xVal)!
    group.count++

    config.yColumns.forEach((yCol, i) => {
      const yVal = Number(row[yCol]) || 0

      switch (agg) {
        case 'sum':
          group.values[i] += yVal
          break
        case 'count':
          group.values[i] = group.count
          break
        case 'max':
          group.values[i] = Math.max(group.values[i], yVal)
          break
        case 'min':
          if (group.count === 1) {
            group.values[i] = yVal
          } else {
            group.values[i] = Math.min(group.values[i], yVal)
          }
          break
        case 'avg':
          // Will calculate after loop
          group.values[i] += yVal
          break
      }
    })
  })

  // Calculate averages
  if (agg === 'avg') {
    grouped.forEach((group) => {
      group.values = group.values.map(v => v / group.count)
    })
  }

  // Convert to arrays
  let entries = Array.from(grouped.entries()).map(([label, data]) => ({
    label,
    values: data.values
  }))

  // Sort by first Y column value
  if (sortBy !== 'none') {
    entries.sort((a, b) => {
      const diff = b.values[0] - a.values[0]
      return sortBy === 'desc' ? diff : -diff
    })
  }

  // Limit data points
  if (maxItems > 0 && entries.length > maxItems) {
    entries = entries.slice(0, maxItems)
  }

  return {
    labels: entries.map(e => e.label),
    datasets: config.yColumns.map((col, i) => ({
      label: col,
      values: entries.map(e => e.values[i])
    })),
    totalCount: grouped.size,
    limitedCount: entries.length
  }
}

/**
 * Check if X column has duplicate values (needs aggregation)
 */
export function hasXColumnDuplicates(
  data: Record<string, unknown>[],
  xColumn: string
): boolean {
  if (!xColumn || data.length === 0) return false
  const values = data.map(row => row[xColumn])
  const uniqueValues = new Set(values)
  return uniqueValues.size < values.length
}

/**
 * Get smart aggregation default based on data
 */
export function getSmartAggregation(
  data: Record<string, unknown>[],
  xColumn: string | null
): AggregationType {
  if (!xColumn) return 'none'
  return hasXColumnDuplicates(data, xColumn) ? 'sum' : 'none'
}
