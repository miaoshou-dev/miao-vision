/**
 * Pie Chart Component Definition (Adapter Layer)
 *
 * Declarative component definition using the adapter layer.
 * Transforms SQL query results into pie chart slices.
 */

import { defineComponent } from '@core/registry'
import { PieChartMetadata } from './metadata'
import PieChart from './PieChart.svelte'
import type { PieChartConfig, PieChartData, PieSlice } from './types'

/**
 * Props passed to PieChart.svelte
 */
interface PieChartProps {
  data: PieChartData
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
 * Default color palette for pie slices
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
 * Convert polar coordinates to cartesian
 */
function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInRadians: number
): { x: number; y: number } {
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  }
}

/**
 * Generate SVG arc path for a pie slice
 */
function describeArc(
  x: number,
  y: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
  padAngle: number = 0
): string {
  // Apply padding
  const actualStartAngle = startAngle + padAngle / 2
  const actualEndAngle = endAngle - padAngle / 2

  const outerStart = polarToCartesian(x, y, outerRadius, actualEndAngle)
  const outerEnd = polarToCartesian(x, y, outerRadius, actualStartAngle)
  const innerStart = polarToCartesian(x, y, innerRadius, actualEndAngle)
  const innerEnd = polarToCartesian(x, y, innerRadius, actualStartAngle)

  const largeArcFlag = actualEndAngle - actualStartAngle <= Math.PI ? '0' : '1'

  if (innerRadius === 0) {
    // Pie slice (no hole)
    return [
      'M', outerStart.x, outerStart.y,
      'A', outerRadius, outerRadius, 0, largeArcFlag, 0, outerEnd.x, outerEnd.y,
      'L', x, y,
      'Z'
    ].join(' ')
  } else {
    // Donut slice (with hole)
    return [
      'M', outerStart.x, outerStart.y,
      'A', outerRadius, outerRadius, 0, largeArcFlag, 0, outerEnd.x, outerEnd.y,
      'L', innerEnd.x, innerEnd.y,
      'A', innerRadius, innerRadius, 0, largeArcFlag, 1, innerStart.x, innerStart.y,
      'Z'
    ].join(' ')
  }
}

/**
 * Config schema for pie chart
 */
const PieChartSchema = {
  fields: [
    { name: 'data', type: 'string' as const, required: true },
    { name: 'x', type: 'string' as const, required: true },
    { name: 'y', type: 'string' as const, required: true },
    { name: 'title', type: 'string' as const, required: false },
    { name: 'subtitle', type: 'string' as const, required: false },
    { name: 'width', type: 'number' as const, required: false, default: 400 },
    { name: 'height', type: 'number' as const, required: false, default: 300 },
    { name: 'innerRadius', type: 'number' as const, required: false, default: 0 },
    { name: 'palette', type: 'string' as const, required: false },
    { name: 'showLabels', type: 'boolean' as const, required: false, default: true },
    { name: 'showPercentages', type: 'boolean' as const, required: false, default: true },
    { name: 'showLegend', type: 'boolean' as const, required: false, default: true },
    { name: 'legendPosition', type: 'string' as const, required: false, default: 'right' },
    { name: 'padAngle', type: 'number' as const, required: false, default: 0.02 },
    { name: 'cornerRadius', type: 'number' as const, required: false, default: 0 },
    { name: 'valueFormat', type: 'string' as const, required: false, default: 'number' },
    { name: 'currencySymbol', type: 'string' as const, required: false, default: '$' },
    { name: 'sort', type: 'string' as const, required: false, default: 'none' }
  ]
}

/**
 * Pie Chart component registration
 */
export const pieChartRegistration = defineComponent<PieChartConfig, PieChartProps>({
  metadata: PieChartMetadata,
  configSchema: PieChartSchema,
  component: PieChart,
  containerClass: 'pie-chart-wrapper',

  // Data binding: extract rows from SQL query
  dataBinding: {
    sourceField: 'data',
    transform: (queryResult, config) => {
      if (!queryResult.data || queryResult.data.length === 0) {
        console.warn('[PieChart] No data available')
        return null
      }

      const xCol = config.x
      const yCol = config.y

      if (!xCol || !yCol) {
        console.warn('[PieChart] x and y columns are required')
        return null
      }

      // Validate columns exist
      const firstRow = queryResult.data[0]
      if (!(xCol in firstRow)) {
        console.warn(`[PieChart] Column "${xCol}" not found in data`)
        return null
      }
      if (!(yCol in firstRow)) {
        console.warn(`[PieChart] Column "${yCol}" not found in data`)
        return null
      }

      return queryResult.data
    }
  },

  // Build props from extracted data
  buildProps: (config, rawData, _context): PieChartProps => {
    const rows = rawData as Record<string, unknown>[] | null

    // Chart dimensions
    const width = config.width || 400
    const height = config.height || 300
    const padding = 20
    const labelSpace = config.showLabels !== false ? 60 : 0

    // Calculate center and radius
    const chartWidth = width - labelSpace * 2
    const chartHeight = height
    const centerX = width / 2
    const centerY = height / 2
    const outerRadius = Math.min(chartWidth, chartHeight) / 2 - padding
    const innerRadiusRatio = config.innerRadius || 0
    const innerRadius = innerRadiusRatio > 0 ? Math.min(innerRadiusRatio, outerRadius * 0.8) : 0

    // Empty state
    if (!rows || rows.length === 0) {
      return {
        data: {
          slices: [],
          total: 0,
          center: { x: centerX, y: centerY },
          outerRadius,
          innerRadius,
          config
        }
      }
    }

    const xCol = config.x
    const yCol = config.y
    const valueFormat = config.valueFormat || 'number'
    const currencySymbol = config.currencySymbol || '$'
    const colors = config.colors || getColorsFromPalette(config.palette)
    const padAngle = config.padAngle ?? 0.02

    // Extract data and calculate total
    let items: { label: string; value: number }[] = []
    let total = 0

    for (const row of rows) {
      const label = String(row[xCol] ?? '')
      const value = typeof row[yCol] === 'number' ? row[yCol] : parseFloat(String(row[yCol])) || 0

      if (value > 0) {
        items.push({ label, value })
        total += value
      }
    }

    // Sort if requested
    if (config.sort === 'asc') {
      items.sort((a, b) => a.value - b.value)
    } else if (config.sort === 'desc') {
      items.sort((a, b) => b.value - a.value)
    }

    // Generate slices
    const slices: PieSlice[] = []
    let currentAngle = -Math.PI / 2 // Start at top

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const percent = total > 0 ? (item.value / total) * 100 : 0
      const sliceAngle = (item.value / total) * Math.PI * 2
      const startAngle = currentAngle
      const endAngle = currentAngle + sliceAngle

      // Calculate label position
      const midAngle = (startAngle + endAngle) / 2
      const labelRadius = outerRadius + 20
      const labelPos = polarToCartesian(0, 0, labelRadius, midAngle)

      slices.push({
        id: `slice-${i}`,
        label: item.label,
        value: item.value,
        formatted: formatValue(item.value, valueFormat, currencySymbol),
        percent,
        color: colors[i % colors.length],
        startAngle,
        endAngle,
        path: describeArc(0, 0, outerRadius, innerRadius, startAngle, endAngle, padAngle),
        labelPosition: labelPos,
        isRightSide: midAngle > -Math.PI / 2 && midAngle < Math.PI / 2
      })

      currentAngle = endAngle
    }

    return {
      data: {
        slices,
        total,
        center: { x: centerX, y: centerY },
        outerRadius,
        innerRadius,
        config
      }
    }
  }
})

export default pieChartRegistration
