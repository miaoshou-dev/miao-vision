/**
 * Line Chart Component Definition (Adapter Layer)
 *
 * Transforms SQL query results into line chart data with SVG paths.
 */

import { defineComponent } from '@core/registry'
import { LineChartMetadata } from '@core/engine/chart-metadata'
import LineChart from './LineChart.svelte'
import type { LineChartConfig, LineChartData, LineSeries, LinePoint } from './types'

/**
 * Props passed to LineChart.svelte
 */
interface LineChartProps {
  data: LineChartData
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
 * Default color palette for multiple series
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
 * Generate SVG path string for a line series
 */
function generateLinePath(
  points: LinePoint[],
  xValues: (number | string)[],
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  chartWidth: number,
  chartHeight: number,
  xIsNumeric: boolean,
  curve: 'linear' | 'monotone' | 'step' | 'basis' = 'linear'
): string {
  if (points.length === 0) return ''

  const pathParts: string[] = []

  for (let i = 0; i < points.length; i++) {
    const point = points[i]

    // Calculate x position
    const x = xIsNumeric
      ? ((Number(point.xValue) - xMin) / (xMax - xMin)) * chartWidth
      : (xValues.indexOf(point.xValue) / Math.max(xValues.length - 1, 1)) * chartWidth

    // Calculate y position (flip because SVG y increases downward)
    const y = chartHeight - ((point.y - yMin) / (yMax - yMin)) * chartHeight

    if (i === 0) {
      pathParts.push(`M ${x} ${y}`)
    } else {
      if (curve === 'step') {
        const prevPoint = points[i - 1]
        const prevX = xIsNumeric
          ? ((Number(prevPoint.xValue) - xMin) / (xMax - xMin)) * chartWidth
          : (xValues.indexOf(prevPoint.xValue) / Math.max(xValues.length - 1, 1)) * chartWidth
        pathParts.push(`H ${x} V ${y}`)
      } else {
        // Linear (default)
        pathParts.push(`L ${x} ${y}`)
      }
    }
  }

  return pathParts.join(' ')
}

/**
 * Config schema for line chart
 */
const LineChartSchema = {
  fields: [
    { name: 'data', type: 'string' as const, required: true },
    { name: 'x', type: 'string' as const, required: true },
    { name: 'y', type: 'string' as const, required: true },
    { name: 'group', type: 'string' as const, required: false },
    { name: 'title', type: 'string' as const, required: false },
    { name: 'subtitle', type: 'string' as const, required: false },
    { name: 'xLabel', type: 'string' as const, required: false },
    { name: 'yLabel', type: 'string' as const, required: false },
    { name: 'width', type: 'number' as const, required: false, default: 680 },
    { name: 'height', type: 'number' as const, required: false, default: 400 },
    { name: 'color', type: 'string' as const, required: false, default: '#3B82F6' },
    { name: 'palette', type: 'string' as const, required: false },
    { name: 'showLabels', type: 'boolean' as const, required: false, default: true },
    { name: 'showLegend', type: 'boolean' as const, required: false, default: true },
    { name: 'showGrid', type: 'boolean' as const, required: false, default: true },
    { name: 'showPoints', type: 'boolean' as const, required: false, default: true },
    { name: 'curve', type: 'string' as const, required: false, default: 'linear' },
    { name: 'strokeWidth', type: 'number' as const, required: false, default: 2 },
    { name: 'pointRadius', type: 'number' as const, required: false, default: 4 },
    { name: 'valueFormat', type: 'string' as const, required: false, default: 'number' },
    { name: 'currencySymbol', type: 'string' as const, required: false, default: '$' }
  ]
}

/**
 * Line Chart component registration
 */
export const lineChartRegistration = defineComponent<LineChartConfig, LineChartProps>({
  metadata: LineChartMetadata,
  configSchema: LineChartSchema,
  component: LineChart,
  containerClass: 'line-chart-wrapper',

  // Data binding: extract rows from SQL query
  dataBinding: {
    sourceField: 'data',
    transform: (queryResult, config) => {
      if (!queryResult.data || queryResult.data.length === 0) {
        console.warn('[LineChart] No data available')
        return null
      }

      const xCol = config.x
      const yCol = config.y

      if (!xCol || !yCol) {
        console.warn('[LineChart] x and y columns are required')
        return null
      }

      // Validate columns exist
      const firstRow = queryResult.data[0]
      if (!(xCol in firstRow)) {
        console.warn(`[LineChart] Column "${xCol}" not found in data`)
        return null
      }
      if (!(yCol in firstRow)) {
        console.warn(`[LineChart] Column "${yCol}" not found in data`)
        return null
      }

      return queryResult.data
    }
  },

  // Build props from extracted data
  buildProps: (config, rawData, _context): LineChartProps | null => {
    const rows = rawData as Record<string, unknown>[] | null

    // Empty state
    if (!rows || rows.length === 0) {
      return {
        data: {
          config,
          series: [],
          xValues: [],
          xMin: 0,
          xMax: 1,
          yMin: 0,
          yMax: 1,
          xIsNumeric: true
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
    const curve = config.curve as 'linear' | 'monotone' | 'step' | 'basis' || 'linear'

    // Chart dimensions (match SVG rendering)
    const width = config.width || 680
    const height = config.height || 400
    const margin = { top: 20, right: 20, bottom: 60, left: 60 }
    const chartWidth = width - margin.left - margin.right
    const chartHeight = height - margin.top - margin.bottom

    // Extract and sort unique x values
    const xValuesSet = new Set<number | string>()
    let xIsNumeric = true

    for (const row of rows) {
      const xVal = row[xCol]
      if (xVal !== null && xVal !== undefined) {
        // Try to parse as number
        const numVal = Number(xVal)
        if (!isNaN(numVal)) {
          xValuesSet.add(numVal)
        } else {
          xValuesSet.add(String(xVal))
          xIsNumeric = false
        }
      }
    }

    const xValues = Array.from(xValuesSet).sort((a, b) => {
      if (xIsNumeric) {
        return Number(a) - Number(b)
      }
      return String(a).localeCompare(String(b))
    })

    // Extract unique groups
    const groupsSet = new Set<string>()
    if (groupCol) {
      for (const row of rows) {
        if (row[groupCol] !== undefined && row[groupCol] !== null) {
          groupsSet.add(String(row[groupCol]))
        }
      }
    }
    const groups = Array.from(groupsSet)

    // If no groups, create a single default group
    if (groups.length === 0) {
      groups.push('default')
    }

    // Build series
    const seriesMap = new Map<string, LinePoint[]>()
    for (const group of groups) {
      seriesMap.set(group, [])
    }

    let yMin = Infinity
    let yMax = -Infinity

    for (const row of rows) {
      const xVal = row[xCol]
      const yVal = typeof row[yCol] === 'number' ? row[yCol] : parseFloat(String(row[yCol])) || 0
      const group = groupCol && row[groupCol] !== null ? String(row[groupCol]) : 'default'

      if (xVal === null || xVal === undefined) continue

      const xValue = xIsNumeric ? Number(xVal) : String(xVal)

      const point: LinePoint = {
        x: xIsNumeric ? Number(xValue) : xValues.indexOf(xValue),
        y: yVal,
        xValue,
        yValue: yVal,
        formatted: formatValue(yVal, valueFormat, currencySymbol),
        group
      }

      seriesMap.get(group)?.push(point)

      yMin = Math.min(yMin, yVal)
      yMax = Math.max(yMax, yVal)
    }

    // Handle edge cases
    if (yMin === Infinity) yMin = 0
    if (yMax === -Infinity) yMax = 1
    if (yMin === yMax) {
      yMin = yMin - 1
      yMax = yMax + 1
    }

    const xMin = xIsNumeric ? Number(xValues[0]) : 0
    const xMax = xIsNumeric ? Number(xValues[xValues.length - 1]) : xValues.length - 1

    // Create series with SVG paths
    const series: LineSeries[] = []
    groups.forEach((group, index) => {
      const points = seriesMap.get(group) || []

      // Sort points by x value
      points.sort((a, b) => {
        if (typeof a.xValue === 'number' && typeof b.xValue === 'number') {
          return a.xValue - b.xValue
        }
        return xValues.indexOf(a.xValue) - xValues.indexOf(b.xValue)
      })

      const color = groups.length > 1 ? colors[index % colors.length] : defaultColor
      const path = generateLinePath(
        points,
        xValues,
        xMin,
        xMax,
        yMin,
        yMax,
        chartWidth,
        chartHeight,
        xIsNumeric,
        curve
      )

      series.push({
        id: `series-${group}`,
        label: group === 'default' ? config.yLabel || config.y : group,
        points,
        color,
        path
      })
    })

    return {
      data: {
        config,
        series,
        xValues,
        xMin,
        xMax,
        yMin,
        yMax,
        xIsNumeric
      }
    }
  }
})

export default lineChartRegistration
