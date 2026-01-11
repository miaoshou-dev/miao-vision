/**
 * Chart Utilities
 *
 * Pure functions for chart operations: scales, colors, data preparation.
 *
 * @module core/shared/pure/chart
 */

// ============================================================================
// Colors
// ============================================================================

/**
 * Default chart color palette
 */
export const CHART_COLORS = [
  '#667EEA', // Indigo
  '#48BB78', // Green
  '#F6AD55', // Orange
  '#FC8181', // Red
  '#63B3ED', // Blue
  '#B794F4', // Purple
  '#F687B3', // Pink
  '#68D391', // Light Green
  '#FBD38D', // Yellow
  '#90CDF4', // Light Blue
  '#CBD5E0', // Gray
  '#9AE6B4', // Mint
]

/**
 * Get chart color by index
 */
export function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length]
}

/**
 * Generate color scale for range of values
 */
export function generateColorScale(
  count: number,
  startColor: string = '#667EEA',
  endColor: string = '#48BB78'
): string[] {
  if (count <= 1) return [startColor]

  const start = hexToRgb(startColor)
  const end = hexToRgb(endColor)

  if (!start || !end) return Array(count).fill(startColor)

  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1)
    const r = Math.round(start.r + (end.r - start.r) * t)
    const g = Math.round(start.g + (end.g - start.g) * t)
    const b = Math.round(start.b + (end.b - start.b) * t)
    return rgbToHex(r, g, b)
  })
}

/**
 * Convert hex to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
}

/**
 * Adjust color brightness
 */
export function adjustBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex

  const adjust = (c: number) => Math.min(255, Math.max(0, Math.round(c * (1 + percent / 100))))

  return rgbToHex(adjust(rgb.r), adjust(rgb.g), adjust(rgb.b))
}

/**
 * Get contrasting text color (black or white)
 */
export function getContrastColor(hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#000000'

  // Calculate relative luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance > 0.5 ? '#000000' : '#FFFFFF'
}

// ============================================================================
// Scales
// ============================================================================

export interface ScaleLinear {
  (value: number): number
  domain: () => [number, number]
  range: () => [number, number]
  invert: (value: number) => number
}

/**
 * Create a linear scale
 */
export function createLinearScale(
  domain: [number, number],
  range: [number, number]
): ScaleLinear {
  const [d0, d1] = domain
  const [r0, r1] = range
  const domainSpan = d1 - d0 || 1
  const rangeSpan = r1 - r0

  const scale = ((value: number) => {
    const t = (value - d0) / domainSpan
    return r0 + t * rangeSpan
  }) as ScaleLinear

  scale.domain = () => domain
  scale.range = () => range
  scale.invert = (value: number) => {
    const t = (value - r0) / rangeSpan
    return d0 + t * domainSpan
  }

  return scale
}

/**
 * Calculate nice domain for axis
 */
export function niceExtent(
  min: number,
  max: number,
  tickCount: number = 5
): [number, number] {
  const span = max - min || 1
  const step = niceStep(span / tickCount)
  const niceMin = Math.floor(min / step) * step
  const niceMax = Math.ceil(max / step) * step
  return [niceMin, niceMax]
}

/**
 * Calculate nice step size
 */
export function niceStep(roughStep: number): number {
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)))
  const normalizedStep = roughStep / magnitude

  let niceNormalized: number
  if (normalizedStep <= 1) niceNormalized = 1
  else if (normalizedStep <= 2) niceNormalized = 2
  else if (normalizedStep <= 5) niceNormalized = 5
  else niceNormalized = 10

  return niceNormalized * magnitude
}

/**
 * Generate tick values
 */
export function generateTicks(
  min: number,
  max: number,
  tickCount: number = 5
): number[] {
  const [niceMin, niceMax] = niceExtent(min, max, tickCount)
  const step = niceStep((niceMax - niceMin) / tickCount)

  const ticks: number[] = []
  for (let tick = niceMin; tick <= niceMax + step / 2; tick += step) {
    ticks.push(Math.round(tick * 1e10) / 1e10) // Fix floating point
  }

  return ticks
}

// ============================================================================
// Data Preparation
// ============================================================================

export interface ChartDataPoint {
  x: number | string
  y: number
  label?: string
  color?: string
}

export interface PreparedChartData {
  data: ChartDataPoint[]
  xExtent: [number | string, number | string]
  yExtent: [number, number]
  totalValue: number
}

/**
 * Prepare data for chart rendering
 */
export function prepareChartData<T extends Record<string, unknown>>(
  rawData: T[],
  xKey: keyof T,
  yKey: keyof T,
  options: {
    sortBy?: 'x' | 'y' | 'none'
    sortDirection?: 'asc' | 'desc'
    limit?: number
    aggregation?: 'sum' | 'avg' | 'count' | 'none'
  } = {}
): PreparedChartData {
  const { sortBy = 'none', sortDirection = 'desc', limit, aggregation = 'none' } = options

  let data: ChartDataPoint[] = rawData.map((item, index) => ({
    x: item[xKey] as number | string,
    y: Number(item[yKey]) || 0,
    label: String(item[xKey]),
    color: getChartColor(index)
  }))

  // Aggregate if needed
  if (aggregation !== 'none') {
    data = aggregateChartData(data, aggregation)
  }

  // Sort
  if (sortBy !== 'none') {
    data.sort((a, b) => {
      const aVal = sortBy === 'x' ? a.x : a.y
      const bVal = sortBy === 'x' ? b.x : b.y
      const cmp = typeof aVal === 'number' && typeof bVal === 'number'
        ? aVal - bVal
        : String(aVal).localeCompare(String(bVal))
      return sortDirection === 'asc' ? cmp : -cmp
    })
  }

  // Limit
  if (limit && data.length > limit) {
    data = data.slice(0, limit)
  }

  // Calculate extents
  const xValues = data.map(d => d.x)
  const yValues = data.map(d => d.y)

  return {
    data,
    xExtent: [xValues[0], xValues[xValues.length - 1]],
    yExtent: [Math.min(0, ...yValues), Math.max(...yValues)],
    totalValue: yValues.reduce((sum, v) => sum + v, 0)
  }
}

/**
 * Aggregate chart data by x value
 */
function aggregateChartData(
  data: ChartDataPoint[],
  aggregation: 'sum' | 'avg' | 'count'
): ChartDataPoint[] {
  const groups = new Map<string | number, ChartDataPoint[]>()

  for (const point of data) {
    const key = point.x
    const existing = groups.get(key) || []
    groups.set(key, [...existing, point])
  }

  return Array.from(groups.entries()).map(([x, points], index) => {
    let y: number
    switch (aggregation) {
      case 'sum':
        y = points.reduce((sum, p) => sum + p.y, 0)
        break
      case 'avg':
        y = points.reduce((sum, p) => sum + p.y, 0) / points.length
        break
      case 'count':
        y = points.length
        break
      default:
        y = points[0].y
    }

    return {
      x,
      y,
      label: String(x),
      color: getChartColor(index)
    }
  })
}

/**
 * Calculate percentage for each data point
 */
export function calculatePercentages(data: ChartDataPoint[]): ChartDataPoint[] {
  const total = data.reduce((sum, d) => sum + d.y, 0)
  return data.map(d => ({
    ...d,
    y: total > 0 ? (d.y / total) * 100 : 0
  }))
}

// ============================================================================
// SVG Utilities
// ============================================================================

/**
 * Generate SVG path for line
 */
export function linePath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return ''
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')
}

/**
 * Generate SVG path for area (line to bottom)
 */
export function areaPath(
  points: Array<{ x: number; y: number }>,
  baseline: number
): string {
  if (points.length === 0) return ''
  const line = linePath(points)
  const lastX = points[points.length - 1].x
  const firstX = points[0].x
  return `${line} L ${lastX} ${baseline} L ${firstX} ${baseline} Z`
}

/**
 * Generate SVG arc path (for pie/donut charts)
 */
export function arcPath(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(cx, cy, radius, endAngle)
  const end = polarToCartesian(cx, cy, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1

  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(' ')
}

/**
 * Generate SVG sector path (filled arc for pie charts)
 */
export function sectorPath(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(cx, cy, radius, endAngle)
  const end = polarToCartesian(cx, cy, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1

  return [
    'M', cx, cy,
    'L', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    'Z'
  ].join(' ')
}

/**
 * Convert polar coordinates to cartesian
 */
export function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians)
  }
}

/**
 * Calculate pie slice angles
 */
export function calculatePieAngles(
  data: ChartDataPoint[]
): Array<{ data: ChartDataPoint; startAngle: number; endAngle: number }> {
  const total = data.reduce((sum, d) => sum + d.y, 0)
  let currentAngle = 0

  return data.map(d => {
    const angle = total > 0 ? (d.y / total) * 360 : 0
    const slice = {
      data: d,
      startAngle: currentAngle,
      endAngle: currentAngle + angle
    }
    currentAngle += angle
    return slice
  })
}
