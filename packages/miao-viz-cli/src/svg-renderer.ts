import { prepareChartData } from './data-transform'
import {
  renderProgressChart, renderSparklineChart, renderDeltaChart,
  renderFunnelChart, renderGaugeChart, renderBubbleChart, renderBoxplotChart,
  renderWaterfallChart, renderRadarChart, renderCalendarChart,
  renderTreemapChart, renderPivotChart, renderSankeyChart,
  renderInfographicKpi, renderInfographicList, renderInfographicFlow,
  renderInfographicHierarchy, renderInfographicComparison
} from './extra-charts'
import type { AgentChartSpec } from './types'
import type { SvgTheme } from './themes/types'
import { escapeHtml, formatTick, svgFrame, buildAxis, markAttrs, numberStyle, renderUnsupported } from './svg-renderer-utils'
import { renderBarChart, renderLineChart, renderPieChart } from './svg-renderer-charts'
export { escapeHtml, svgFrame, buildAxis, formatTick, markAttrs, numberStyle }

interface RenderOptions {
  chartId?: string
}

const DEFAULT_SVG_THEME: SvgTheme = {
  palette: ['#2563eb', '#16a34a', '#f97316', '#dc2626', '#7c3aed', '#0891b2'],
  background: '#ffffff',
  axisColor: '#94a3b8',
  labelColor: '#475569'
}

export function renderChartSvg(
  chart: AgentChartSpec,
  rows: Record<string, unknown>[],
  svgTheme?: SvgTheme,
  options: RenderOptions = {}
): string {
  const theme = svgTheme ?? DEFAULT_SVG_THEME
  const data = prepareChartData(rows, chart)
  if (chart.type === 'line' || chart.type === 'area') return renderLineChart(chart, data, theme, options)
  if (chart.type === 'bar') return renderBarChart(chart, data, theme, options)
  if (chart.type === 'pie') return renderPieChart(chart, data, theme, options)
  if (chart.type === 'table') return renderTable(chart, data, options)
  if (chart.type === 'bigvalue') return renderBigValue(chart, data)
  if (chart.type === 'histogram') return renderHistogramChart(chart, data, theme, options)
  if (chart.type === 'scatter') return renderScatterChart(chart, data, theme, options)
  if (chart.type === 'heatmap') return renderHeatmapChart(chart, data, theme, options)
  if (chart.type === 'progress') return renderProgressChart(chart, data)
  if (chart.type === 'sparkline') return renderSparklineChart(chart, data, theme)
  if (chart.type === 'delta') return renderDeltaChart(chart, data)
  if (chart.type === 'funnel') return renderFunnelChart(chart, data, theme)
  if (chart.type === 'gauge') return renderGaugeChart(chart, data)
  if (chart.type === 'bubble') return renderBubbleChart(chart, data, theme, options)
  if (chart.type === 'boxplot') return renderBoxplotChart(chart, data, theme, options)
  if (chart.type === 'waterfall') return renderWaterfallChart(chart, data, theme, options)
  if (chart.type === 'radar') return renderRadarChart(chart, data, theme)
  if (chart.type === 'calendar') return renderCalendarChart(chart, data, theme, options)
  if (chart.type === 'treemap') return renderTreemapChart(chart, data)
  if (chart.type === 'pivot') return renderPivotChart(chart, data)
  if (chart.type === 'sankey') return renderSankeyChart(chart, data, theme, options)
  if (chart.type === 'infographic-kpi') return renderInfographicKpi(chart, data)
  if (chart.type === 'infographic-list') return renderInfographicList(chart, data)
  if (chart.type === 'infographic-flow') return renderInfographicFlow(chart, data)
  if (chart.type === 'infographic-hierarchy') return renderInfographicHierarchy(chart, data)
  if (chart.type === 'infographic-comparison') return renderInfographicComparison(chart, data)
  return renderUnsupported(chart)
}

function renderTable(chart: AgentChartSpec, rows: Record<string, unknown>[], options: RenderOptions): string {
  const columns = Object.keys(rows[0] ?? {})
  const sortable = chart.sortable === true
  const header = columns.map(c => {
    const attrs = sortable ? ` data-sortable="true" data-sort-field="${escapeHtml(c)}"` : ''
    return `<th${attrs}>${escapeHtml(c)}</th>`
  }).join('')
  const markField = chart.encoding?.label?.field ?? chart.encoding?.x?.field ?? columns[0] ?? ''
  const body = rows.slice(0, 20).map((row, i) =>
    `<tr ${markAttrs(options.chartId, markField, row[markField], i, String(row[markField] ?? 'Row'))}>${columns.map(c => `<td>${escapeHtml(String(row[c] ?? ''))}</td>`).join('')}</tr>`
  ).join('')
  return `<div class="miao-table-wrap"><table class="miao-table"><caption>${escapeHtml(chart.title ?? 'Table')}</caption><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div>`
}

function renderBigValue(chart: AgentChartSpec, rows: Record<string, unknown>[]): string {
  const valueField = chart.encoding?.value?.field ?? ''
  const value = rows[0]?.[valueField] ?? ''
  return `<div class="miao-bigvalue"><div class="miao-bigvalue-label">${escapeHtml(chart.title ?? valueField)}</div><div class="miao-bigvalue-number">${escapeHtml(String(value))}</div></div>`
}

function renderHistogramChart(chart: AgentChartSpec, rows: Record<string, unknown>[], theme: SvgTheme, options: RenderOptions): string {
  const xField = chart.encoding?.x?.field ?? ''
  const width = numberStyle(chart, 'width', 720)
  const height = numberStyle(chart, 'height', 420)
  const margin = { top: 24, right: 24, bottom: 56, left: 72 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom

  const values = rows.map(row => Number(row[xField])).filter(Number.isFinite)
  if (values.length === 0) return renderUnsupported(chart)

  const bucketCount = 8
  const xMin = Math.min(...values)
  const xMax = Math.max(...values)
  const bucketSpan = (xMax - xMin) || 1
  const bucketWidth = bucketSpan / bucketCount

  const counts = Array<number>(bucketCount).fill(0)
  for (const v of values) {
    counts[Math.min(Math.floor((v - xMin) / bucketWidth), bucketCount - 1)]++
  }

  const yMax = Math.max(...counts, 1)
  const barGap = 2
  const barW = (chartWidth - barGap * (bucketCount - 1)) / bucketCount
  const color = theme.palette[0]
  const x0 = margin.left
  const y0 = margin.top + chartHeight

  const bars = counts.map((count, i) => {
    const barH = (count / yMax) * chartHeight
    const x = margin.left + i * (barW + barGap)
    const y = margin.top + chartHeight - barH
    const lo = xMin + i * bucketWidth
    const tooltip = `${formatTick(lo)}–${formatTick(lo + bucketWidth)}: ${count}`
    return `<rect ${markAttrs(options.chartId, xField, lo, i, tooltip)} x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="${color}" />`
  }).join('')

  const xTickPositions = [0, 2, 4, 6, 8]
  const xTicks = xTickPositions.map(i => {
    const val = xMin + i * bucketWidth
    const x = margin.left + i * (barW + barGap)
    return `<text x="${x.toFixed(1)}" y="${(y0 + 18).toFixed(1)}" text-anchor="middle" fill="${theme.labelColor}" font-size="10">${escapeHtml(formatTick(val))}</text>`
  }).join('')

  const tickCount = 4
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => ({
    count: Math.round((i / tickCount) * yMax),
    y: margin.top + chartHeight - (i / tickCount) * chartHeight
  }))
  const gridLines = yTicks.filter((_, i) => i > 0).map(t =>
    `<line x1="${x0}" y1="${t.y.toFixed(1)}" x2="${x0 + chartWidth}" y2="${t.y.toFixed(1)}" stroke="${theme.axisColor}" stroke-opacity="0.4" stroke-dasharray="4 3" />`
  ).join('')
  const yTickLabels = yTicks.map(t =>
    `<text x="${(x0 - 6).toFixed(1)}" y="${(t.y + 4).toFixed(1)}" text-anchor="end" fill="${theme.labelColor}" font-size="11">${t.count}</text>`
  ).join('')

  return svgFrame(width, height, theme.background, `
    ${gridLines}
    <line x1="${x0}" y1="${y0}" x2="${(x0 + chartWidth).toFixed(1)}" y2="${y0}" stroke="${theme.axisColor}" />
    <line x1="${x0}" y1="${margin.top}" x2="${x0}" y2="${y0}" stroke="${theme.axisColor}" />
    ${yTickLabels}
    <text x="${(x0 + chartWidth / 2).toFixed(1)}" y="${(y0 + 50).toFixed(1)}" text-anchor="middle" fill="${theme.labelColor}" font-size="12">${escapeHtml(xField)}</text>
    <text x="14" y="${(margin.top + chartHeight / 2).toFixed(1)}" text-anchor="middle" transform="rotate(-90 14 ${(margin.top + chartHeight / 2).toFixed(1)})" fill="${theme.labelColor}" font-size="12">count</text>
    ${bars}
    ${xTicks}
  `)
}

function renderScatterChart(chart: AgentChartSpec, rows: Record<string, unknown>[], theme: SvgTheme, options: RenderOptions): string {
  const xField = chart.encoding?.x?.field ?? ''
  const yField = chart.encoding?.y?.field ?? ''
  const labelField = chart.encoding?.label?.field ?? ''
  const width = numberStyle(chart, 'width', 720)
  const height = numberStyle(chart, 'height', 420)
  const margin = { top: 24, right: 24, bottom: 56, left: 72 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom

  const MAX_POINTS = 400
  const sample = rows.length > MAX_POINTS
    ? rows.filter((_, i) => i % Math.ceil(rows.length / MAX_POINTS) === 0)
    : rows

  const xValues = sample.map(row => Number(row[xField])).filter(Number.isFinite)
  const yValues = sample.map(row => Number(row[yField])).filter(Number.isFinite)
  if (xValues.length === 0 || yValues.length === 0) return renderUnsupported(chart)

  const xMin = Math.min(...xValues)
  const xMax = Math.max(...xValues)
  const yMin = Math.min(...yValues)
  const yMax = Math.max(...yValues)
  const xSpan = (xMax - xMin) || 1
  const ySpan = (yMax - yMin) || 1
  const x0 = margin.left
  const y0 = margin.top + chartHeight

  const dots = sample.map((row, i) => {
    const xVal = Number(row[xField])
    const yVal = Number(row[yField])
    if (!Number.isFinite(xVal) || !Number.isFinite(yVal)) return ''
    const cx = margin.left + ((xVal - xMin) / xSpan) * chartWidth
    const cy = margin.top + chartHeight - ((yVal - yMin) / ySpan) * chartHeight
    const label = labelField ? String(row[labelField] ?? '') : `${formatTick(xVal)}, ${formatTick(yVal)}`
    const tooltip = labelField ? `${label}: (${formatTick(xVal)}, ${formatTick(yVal)})` : `(${formatTick(xVal)}, ${formatTick(yVal)})`
    return `<circle ${markAttrs(options.chartId, xField, xVal, i, tooltip)} cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4" fill="${theme.palette[0]}" fill-opacity="0.55" />`
  }).join('')

  const sampledNote = rows.length > MAX_POINTS
    ? `<text x="${(x0 + chartWidth).toFixed(1)}" y="${margin.top - 6}" text-anchor="end" fill="${theme.labelColor}" font-size="10">sampled ${MAX_POINTS} of ${rows.length} rows</text>`
    : ''

  const xTickCount = 5
  const xTicks = Array.from({ length: xTickCount }, (_, i) => {
    const val = xMin + (i / (xTickCount - 1)) * xSpan
    const x = margin.left + (i / (xTickCount - 1)) * chartWidth
    return `<text x="${x.toFixed(1)}" y="${(y0 + 18).toFixed(1)}" text-anchor="middle" fill="${theme.labelColor}" font-size="10">${escapeHtml(formatTick(val))}</text>`
  }).join('')

  return svgFrame(width, height, theme.background, `
    ${buildAxis(margin, chartWidth, chartHeight, xField, yField, yMin, yMax, theme)}
    ${dots}
    ${xTicks}
    ${sampledNote}
  `)
}

function renderHeatmapChart(chart: AgentChartSpec, rows: Record<string, unknown>[], theme: SvgTheme, options: RenderOptions): string {
  const xField = chart.encoding?.x?.field ?? ''
  const yField = chart.encoding?.y?.field ?? ''
  const valueField = chart.encoding?.value?.field ?? ''
  const width = numberStyle(chart, 'width', 720)
  const height = numberStyle(chart, 'height', 420)
  const margin = { top: 24, right: 24, bottom: 64, left: 80 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom

  const xValues = [...new Set(rows.map(row => String(row[xField] ?? '')))]
  const yValues = [...new Set(rows.map(row => String(row[yField] ?? '')))]
  if (xValues.length === 0 || yValues.length === 0) return renderUnsupported(chart)

  const cellMap = new Map<string, number>()
  for (const row of rows) {
    cellMap.set(`${row[xField]}|${row[yField]}`, Number(row[valueField]) || 0)
  }

  const allValues = [...cellMap.values()]
  const minVal = Math.min(...allValues)
  const maxVal = Math.max(...allValues, minVal + 1)
  const span = maxVal - minVal

  const cellW = chartWidth / xValues.length
  const cellH = chartHeight / yValues.length
  const x0 = margin.left
  const y0 = margin.top + chartHeight

  const cells = yValues.flatMap((yVal, yi) =>
    xValues.map((xVal, xi) => {
      const val = cellMap.get(`${xVal}|${yVal}`) ?? 0
      const opacity = (0.1 + ((val - minVal) / span) * 0.85).toFixed(2)
      const x = margin.left + xi * cellW
      const y = margin.top + yi * cellH
      const tooltip = `${xVal}, ${yVal}: ${formatTick(val)}`
      return `<rect ${markAttrs(options.chartId, xField, xVal, xi + yi * xValues.length, tooltip)} x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${cellW.toFixed(1)}" height="${cellH.toFixed(1)}" fill="${theme.palette[0]}" fill-opacity="${opacity}" stroke="${theme.background}" stroke-width="1" />`
    })
  ).join('')

  const MAX_LABELS = 12
  const xStep = Math.max(1, Math.ceil(xValues.length / MAX_LABELS))
  const xLabels = xValues.filter((_, i) => i % xStep === 0).map((val, i) => {
    const x = margin.left + (i * xStep + 0.5) * cellW
    return `<text x="${x.toFixed(1)}" y="${(y0 + 16).toFixed(1)}" text-anchor="middle" fill="${theme.labelColor}" font-size="10">${escapeHtml(val)}</text>`
  }).join('')

  const yStep = Math.max(1, Math.ceil(yValues.length / MAX_LABELS))
  const yLabels = yValues.filter((_, i) => i % yStep === 0).map((val, i) => {
    const y = margin.top + (i * yStep + 0.5) * cellH
    return `<text x="${(x0 - 6).toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="${theme.labelColor}" font-size="10">${escapeHtml(val)}</text>`
  }).join('')

  return svgFrame(width, height, theme.background, `
    <line x1="${x0}" y1="${y0}" x2="${(x0 + chartWidth).toFixed(1)}" y2="${y0}" stroke="${theme.axisColor}" />
    <line x1="${x0}" y1="${margin.top}" x2="${x0}" y2="${y0}" stroke="${theme.axisColor}" />
    ${cells}
    ${xLabels}
    ${yLabels}
    <text x="${(x0 + chartWidth / 2).toFixed(1)}" y="${(y0 + 52).toFixed(1)}" text-anchor="middle" fill="${theme.labelColor}" font-size="12">${escapeHtml(xField)}</text>
    <text x="14" y="${(margin.top + chartHeight / 2).toFixed(1)}" text-anchor="middle" transform="rotate(-90 14 ${(margin.top + chartHeight / 2).toFixed(1)})" fill="${theme.labelColor}" font-size="12">${escapeHtml(yField)}</text>
  `)
}
