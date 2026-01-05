/**
 * Line Chart Types
 */

export interface LineChartConfig {
  data: string
  x: string
  y: string
  group?: string
  title?: string
  subtitle?: string
  xLabel?: string
  yLabel?: string
  width?: number
  height?: number
  color?: string
  colors?: string[]
  palette?: string
  showLabels?: boolean
  showLegend?: boolean
  showGrid?: boolean
  showPoints?: boolean
  curve?: 'linear' | 'monotone' | 'step' | 'basis'
  strokeWidth?: number
  pointRadius?: number
  valueFormat?: 'number' | 'currency' | 'percent'
  currencySymbol?: string
  class?: string
}

export interface LinePoint {
  x: number | string
  y: number
  xValue: number | string  // Original x value (for date/string)
  yValue: number
  formatted: string
  group?: string
}

export interface LineSeries {
  id: string
  label: string
  points: LinePoint[]
  color: string
  path: string  // SVG path string
}

export interface LineChartData {
  config: LineChartConfig
  series: LineSeries[]
  xValues: (number | string)[]  // Unique x values for axis
  xMin: number
  xMax: number
  yMin: number
  yMax: number
  xIsNumeric: boolean  // Whether x-axis is numeric or categorical
}
