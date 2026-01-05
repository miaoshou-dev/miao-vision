/**
 * Bar Chart Component Definition (Adapter Layer)
 *
 * Declarative component definition using the adapter layer.
 * Transforms SQL query results into bar chart data.
 */

import { defineComponent } from '@core/registry'
import { BarChartMetadata } from './metadata'
import BarChart from './BarChart.svelte'
import type { BarChartConfig, BarChartData, BarItem } from './types'

/**
 * Props passed to BarChart.svelte
 */
interface BarChartProps {
  data: BarChartData
}

/**
 * Color palettes for charts
 */
const PALETTES: Record<string, string[]> = {
  vibrant: ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'],
  business: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
  ocean: ['#0ea5e9', '#06b6d4', '#14b8a6', '#22c55e', '#3b82f6', '#6366f1'],
  sunset: ['#f43f5e', '#f97316', '#eab308', '#f59e0b', '#ec4899', '#8b5cf6'],
  forest: ['#22c55e', '#10b981', '#14b8a6', '#84cc16', '#059669', '#0d9488'],
  categorical: ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'],
  pastel: ['#c4b5fd', '#fbcfe8', '#fde68a', '#a7f3d0', '#bae6fd', '#fecaca'],
  darkMode: ['#818cf8', '#a78bfa', '#f472b6', '#fb7185', '#fb923c', '#facc15', '#4ade80', '#22d3ee']
}

/**
 * Default color palette for grouped bars
 */
const DEFAULT_COLORS = PALETTES.categorical

/**
 * Get colors from palette name or use default
 */
function getColorsFromPalette(palette?: string): string[] {
  if (!palette) return DEFAULT_COLORS
  return PALETTES[palette] || DEFAULT_COLORS
}

/**
 * Format a value based on format type
 */
function formatValue(
  value: number,
  format: 'number' | 'currency' | 'percent' = 'number',
  currencySymbol: string = '$'
): string {
  if (format === 'currency') {
    return `${currencySymbol}${value.toLocaleString()}`
  }
  if (format === 'percent') {
    return `${value.toFixed(1)}%`
  }
  return value.toLocaleString()
}

/**
 * Config schema for bar chart
 */
const BarChartSchema = {
  fields: [
    { name: 'data', type: 'string' as const, required: true },
    { name: 'x', type: 'string' as const, required: true },
    { name: 'y', type: 'string' as const, required: true },
    { name: 'group', type: 'string' as const, required: false },
    { name: 'title', type: 'string' as const, required: false },
    { name: 'subtitle', type: 'string' as const, required: false },
    { name: 'xLabel', type: 'string' as const, required: false },
    { name: 'yLabel', type: 'string' as const, required: false },
    { name: 'height', type: 'number' as const, required: false, default: 300 },
    { name: 'color', type: 'string' as const, required: false, default: '#3B82F6' },
    { name: 'palette', type: 'string' as const, required: false },
    { name: 'horizontal', type: 'boolean' as const, required: false, default: false },
    { name: 'showLabels', type: 'boolean' as const, required: false, default: true },
    { name: 'showLegend', type: 'boolean' as const, required: false, default: true },
    { name: 'showGrid', type: 'boolean' as const, required: false, default: true },
    { name: 'borderRadius', type: 'number' as const, required: false, default: 4 },
    { name: 'valueFormat', type: 'string' as const, required: false, default: 'number' },
    { name: 'currencySymbol', type: 'string' as const, required: false, default: '$' },
    { name: 'sort', type: 'string' as const, required: false, default: 'none' }
  ]
}

/**
 * Bar Chart component registration
 */
export const barChartRegistration = defineComponent<BarChartConfig, BarChartProps>({
  metadata: BarChartMetadata,
  configSchema: BarChartSchema,
  component: BarChart,
  containerClass: 'bar-chart-wrapper',

  // Data binding: extract rows from SQL query
  dataBinding: {
    sourceField: 'data',
    transform: (queryResult, config) => {
      if (!queryResult.data || queryResult.data.length === 0) {
        console.warn('[BarChart] No data available')
        return null
      }

      const xCol = config.x
      const yCol = config.y

      if (!xCol || !yCol) {
        console.warn('[BarChart] x and y columns are required')
        return null
      }

      // Validate columns exist
      const firstRow = queryResult.data[0]
      if (!(xCol in firstRow)) {
        console.warn(`[BarChart] Column "${xCol}" not found in data`)
        return null
      }
      if (!(yCol in firstRow)) {
        console.warn(`[BarChart] Column "${yCol}" not found in data`)
        return null
      }

      return queryResult.data
    }
  },

  // Build props from extracted data
  buildProps: (config, rawData, _context): BarChartProps => {
    const rows = rawData as Record<string, unknown>[] | null

    // Empty state
    if (!rows || rows.length === 0) {
      return {
        data: {
          categories: [],
          groups: [],
          bars: [],
          maxValue: 0,
          minValue: 0,
          total: 0,
          config
        }
      }
    }

    const xCol = config.x
    const yCol = config.y
    const groupCol = config.group
    const valueFormat = config.valueFormat || 'number'
    const currencySymbol = config.currencySymbol || '$'
    const colors = config.colors || getColorsFromPalette(config.palette)
    const defaultColor = config.color || '#3B82F6'

    // Extract unique categories and groups
    const categoriesSet = new Set<string>()
    const groupsSet = new Set<string>()

    for (const row of rows) {
      const category = String(row[xCol] ?? '')
      categoriesSet.add(category)

      if (groupCol && row[groupCol] !== undefined) {
        groupsSet.add(String(row[groupCol]))
      }
    }

    let categories = Array.from(categoriesSet)
    const groups = Array.from(groupsSet)

    // Create bars
    const bars: BarItem[] = []
    let maxValue = 0
    let minValue = Infinity
    let total = 0

    for (const row of rows) {
      const category = String(row[xCol] ?? '')
      const value = typeof row[yCol] === 'number' ? row[yCol] : parseFloat(String(row[yCol])) || 0
      const group = groupCol ? String(row[groupCol] ?? '') : undefined
      const groupIndex = group ? groups.indexOf(group) : 0
      const color = groups.length > 0 ? colors[groupIndex % colors.length] : defaultColor

      bars.push({
        id: `${category}-${group || 'default'}-${bars.length}`,
        category,
        value,
        formatted: formatValue(value, valueFormat, currencySymbol),
        group,
        color,
        percent: 0 // Will be calculated after maxValue is known
      })

      maxValue = Math.max(maxValue, value)
      minValue = Math.min(minValue, value)
      total += value
    }

    // Handle case where all values are 0 or negative
    if (minValue === Infinity) minValue = 0
    if (maxValue === 0) maxValue = 1

    // Calculate percentages
    for (const bar of bars) {
      bar.percent = (bar.value / maxValue) * 100
    }

    // Sort categories if requested
    if (config.sort === 'asc' || config.sort === 'desc') {
      // Calculate total value per category for sorting
      const categoryTotals = new Map<string, number>()
      for (const bar of bars) {
        const current = categoryTotals.get(bar.category) || 0
        categoryTotals.set(bar.category, current + bar.value)
      }

      categories = categories.sort((a, b) => {
        const aTotal = categoryTotals.get(a) || 0
        const bTotal = categoryTotals.get(b) || 0
        return config.sort === 'asc' ? aTotal - bTotal : bTotal - aTotal
      })
    }

    return {
      data: {
        categories,
        groups,
        bars,
        maxValue,
        minValue,
        total,
        config
      }
    }
  }
})

export default barChartRegistration
