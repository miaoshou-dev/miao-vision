import { prepareChartData } from './data-transform'
import type { AgentChartSpec } from './types'
import type { SvgTheme } from './themes/types'

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
  return renderUnsupported(chart)
}

function renderBarChart(chart: AgentChartSpec, rows: Record<string, unknown>[], theme: SvgTheme, options: RenderOptions): string {
  const xField = chart.encoding.x?.field ?? ''
  const yField = chart.encoding.y?.field ?? ''
  const width = numberStyle(chart, 'width', 720)
  const height = numberStyle(chart, 'height', 420)
  const margin = { top: 24, right: 24, bottom: 48, left: 72 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom
  const values = rows.map(row => Number(row[yField])).filter(Number.isFinite)
  const yMax = Math.max(...values, 1)
  const yMin = 0
  const barGap = 8
  const barWidth = Math.max(8, (chartWidth - barGap * Math.max(rows.length - 1, 0)) / Math.max(rows.length, 1))

  const bars = rows.map((row, index) => {
    const value = Number(row[yField]) || 0
    const barHeight = (value / yMax) * chartHeight
    const x = margin.left + index * (barWidth + barGap)
    const y = margin.top + chartHeight - barHeight
    const color = theme.palette[index % theme.palette.length]
    const label = String(row[xField] ?? '')
    const tooltip = `${label}: ${value}`
    return `<g>
      <rect ${markAttrs(options.chartId, xField, row[xField], index, tooltip)} x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" rx="3" fill="${color}" />
      <text x="${(x + barWidth / 2).toFixed(1)}" y="${(margin.top + chartHeight + 18).toFixed(1)}" text-anchor="middle" fill="${theme.labelColor}" font-size="11">${escapeHtml(label)}</text>
    </g>`
  }).join('')

  return svgFrame(width, height, theme.background, `
    ${buildAxis(margin, chartWidth, chartHeight, xField, yField, yMin, yMax, theme)}
    ${bars}
  `)
}

function renderLineChart(chart: AgentChartSpec, rows: Record<string, unknown>[], theme: SvgTheme, options: RenderOptions): string {
  const xField = chart.encoding.x?.field ?? ''
  const yField = chart.encoding.y?.field ?? ''
  const width = numberStyle(chart, 'width', 720)
  const height = numberStyle(chart, 'height', 420)
  const margin = { top: 24, right: 24, bottom: 64, left: 72 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom
  const values = rows.map(row => Number(row[yField])).filter(Number.isFinite)
  const yMax = Math.max(...values, 1)
  const yMin = Math.min(...values, 0)
  const span = Math.max(yMax - yMin, 1)
  const lineColor = theme.palette[0]

  const points = rows.map((row, index) => {
    const x = margin.left + (index / Math.max(rows.length - 1, 1)) * chartWidth
    const y = margin.top + chartHeight - (((Number(row[yField]) || 0) - yMin) / span) * chartHeight
    return { x, y, label: String(row[xField] ?? ''), value: Number(row[yField]) || 0 }
  })

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const dots = points.map(p =>
    `<circle ${markAttrs(options.chartId, xField, p.label, 0, `${p.label}: ${p.value}`)} cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="${lineColor}"><title>${escapeHtml(p.label)}: ${p.value}</title></circle>`
  ).join('')
  const labels = points.map((p, i) => {
    if (i % Math.ceil(points.length / 8) !== 0) return ''
    return `<text x="${p.x.toFixed(1)}" y="${height - 20}" text-anchor="middle" fill="${theme.labelColor}">${escapeHtml(p.label)}</text>`
  }).join('')

  return svgFrame(width, height, theme.background, `
    ${buildAxis(margin, chartWidth, chartHeight, xField, yField, yMin, yMax, theme)}
    <path d="${path}" fill="none" stroke="${lineColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
    ${dots}
    ${labels}
  `)
}

function renderPieChart(chart: AgentChartSpec, rows: Record<string, unknown>[], theme: SvgTheme, options: RenderOptions): string {
  const labelField = chart.encoding.label?.field ?? ''
  const valueField = chart.encoding.value?.field ?? ''
  const width = numberStyle(chart, 'width', 720)
  const height = numberStyle(chart, 'height', 420)
  const cx = width / 2 - 80
  const cy = height / 2
  const radius = Math.min(width, height) * 0.34
  const values = rows.map(row => Math.max(0, Number(row[valueField]) || 0))
  const total = values.reduce((sum, value) => sum + value, 0) || 1
  let angle = -Math.PI / 2

  const slices = rows.map((row, index) => {
    const value = values[index]
    const nextAngle = angle + (value / total) * Math.PI * 2
    const path = describeArc(cx, cy, radius, angle, nextAngle)
    const color = theme.palette[index % theme.palette.length]
    const label = String(row[labelField] ?? '')
    const tooltip = `${label}: ${value}`
    angle = nextAngle
    return `<path ${markAttrs(options.chartId, labelField, row[labelField], index, tooltip)} d="${path}" fill="${color}" stroke="${theme.background}" stroke-width="2" />`
  }).join('')

  const legend = rows.map((row, index) => {
    const y = 72 + index * 24
    return `<g>
      <rect x="${width - 210}" y="${y - 10}" width="10" height="10" fill="${theme.palette[index % theme.palette.length]}" />
      <text x="${width - 192}" y="${y}" fill="${theme.labelColor}" font-size="12">${escapeHtml(String(row[labelField] ?? ''))}</text>
    </g>`
  }).join('')

  return svgFrame(width, height, theme.background, `${slices}${legend}`)
}

function renderTable(chart: AgentChartSpec, rows: Record<string, unknown>[], options: RenderOptions): string {
  const columns = Object.keys(rows[0] ?? {}).slice(0, 8)
  const header = columns.map(c => `<th>${escapeHtml(c)}</th>`).join('')
  const markField = chart.encoding?.label?.field ?? chart.encoding?.x?.field ?? columns[0] ?? ''
  const body = rows.slice(0, 20).map(row =>
    `<tr ${markAttrs(options.chartId, markField, row[markField], 0, String(row[markField] ?? 'Row'))}>${columns.map(c => `<td>${escapeHtml(String(row[c] ?? ''))}</td>`).join('')}</tr>`
  ).join('')
  return `<div class="miao-table-wrap"><table class="miao-table"><caption>${escapeHtml(chart.title ?? 'Table')}</caption><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div>`
}

function renderBigValue(chart: AgentChartSpec, rows: Record<string, unknown>[]): string {
  const valueField = chart.encoding.value?.field ?? ''
  const value = rows[0]?.[valueField] ?? ''
  return `<div class="miao-bigvalue"><div class="miao-bigvalue-label">${escapeHtml(chart.title ?? valueField)}</div><div class="miao-bigvalue-number">${escapeHtml(String(value))}</div></div>`
}

function renderUnsupported(chart: AgentChartSpec): string {
  return `<div class="miao-unsupported">Static HTML rendering for ${escapeHtml(chart.type)} is not implemented yet.</div>`
}

function svgFrame(width: number, height: number, bgColor: string, body: string): string {
  return `<svg class="miao-chart-svg" viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${width}" height="${height}" fill="${bgColor}" />
    ${body}
  </svg>`
}

function markAttrs(chartId: string | undefined, field: string, value: unknown, rowKey: number, tooltip: string): string {
  return [
    'data-miao-mark="true"',
    chartId ? `data-chart-id="${escapeHtml(chartId)}"` : '',
    `data-field="${escapeHtml(field)}"`,
    `data-value="${escapeHtml(String(value ?? ''))}"`,
    `data-row-key="${escapeHtml(String(rowKey))}"`,
    `data-tooltip="${escapeHtml(tooltip)}"`
  ].filter(Boolean).join(' ')
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, radius, endAngle)
  const end = polarToCartesian(cx, cy, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= Math.PI ? '0' : '1'
  return [
    `M ${cx.toFixed(1)} ${cy.toFixed(1)}`,
    `L ${start.x.toFixed(1)} ${start.y.toFixed(1)}`,
    `A ${radius.toFixed(1)} ${radius.toFixed(1)} 0 ${largeArcFlag} 0 ${end.x.toFixed(1)} ${end.y.toFixed(1)}`,
    'Z'
  ].join(' ')
}

function polarToCartesian(cx: number, cy: number, radius: number, angle: number): { x: number; y: number } {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle)
  }
}

function buildAxis(
  margin: { top: number; left: number },
  chartWidth: number,
  chartHeight: number,
  xLabel: string,
  yLabel: string,
  yMin: number,
  yMax: number,
  theme: SvgTheme
): string {
  const x0 = margin.left
  const y0 = margin.top + chartHeight
  const tickCount = 4
  const span = yMax - yMin || 1

  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => ({
    value: yMin + (i / tickCount) * span,
    y: margin.top + chartHeight - (i / tickCount) * chartHeight
  }))

  const gridLines = ticks
    .filter((_, i) => i > 0)
    .map(t => `<line x1="${x0}" y1="${t.y.toFixed(1)}" x2="${x0 + chartWidth}" y2="${t.y.toFixed(1)}" stroke="${theme.axisColor}" stroke-opacity="0.4" stroke-dasharray="4 3" />`)
    .join('')

  const tickLabels = ticks
    .map(t => `<text x="${x0 - 6}" y="${(t.y + 4).toFixed(1)}" text-anchor="end" fill="${theme.labelColor}" font-size="11">${formatTick(t.value)}</text>`)
    .join('')

  return `
    ${gridLines}
    <line x1="${x0}" y1="${y0}" x2="${x0 + chartWidth}" y2="${y0}" stroke="${theme.axisColor}" />
    <line x1="${x0}" y1="${margin.top}" x2="${x0}" y2="${y0}" stroke="${theme.axisColor}" />
    ${tickLabels}
    <text x="${(x0 + chartWidth / 2).toFixed(1)}" y="${y0 + 54}" text-anchor="middle" fill="${theme.labelColor}" font-size="12">${escapeHtml(xLabel)}</text>
    <text x="14" y="${(margin.top + chartHeight / 2).toFixed(1)}" text-anchor="middle" transform="rotate(-90 14 ${(margin.top + chartHeight / 2).toFixed(1)})" fill="${theme.labelColor}" font-size="12">${escapeHtml(yLabel)}</text>
  `
}

function formatTick(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value % 1 === 0 ? String(Math.round(value)) : value.toFixed(1)
}

function numberStyle(chart: AgentChartSpec, key: string, fallback: number): number {
  const value = chart.style?.[key]
  return typeof value === 'number' ? value : fallback
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
