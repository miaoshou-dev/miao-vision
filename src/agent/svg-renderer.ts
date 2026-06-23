import { prepareChartData } from './data-transform'
import type { AgentChartSpec } from './types'
import type { SvgTheme } from './themes/types'

const DEFAULT_SVG_THEME: SvgTheme = {
  palette: ['#2563eb', '#16a34a', '#f97316', '#dc2626', '#7c3aed', '#0891b2'],
  background: '#ffffff',
  axisColor: '#94a3b8',
  labelColor: '#475569'
}

export function renderChartSvg(
  chart: AgentChartSpec,
  rows: Record<string, unknown>[],
  svgTheme?: SvgTheme
): string {
  const theme = svgTheme ?? DEFAULT_SVG_THEME
  const data = prepareChartData(rows, chart)
  if (chart.type === 'line' || chart.type === 'area') return renderLineChart(chart, data, theme)
  if (chart.type === 'bar') return renderBarChart(chart, data, theme)
  if (chart.type === 'table') return renderTable(chart, data)
  if (chart.type === 'bigvalue') return renderBigValue(chart, data)
  return renderUnsupported(chart)
}

function renderBarChart(chart: AgentChartSpec, rows: Record<string, unknown>[], theme: SvgTheme): string {
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
    return `<g>
      <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" rx="3" fill="${color}" />
      <text x="${(x + barWidth / 2).toFixed(1)}" y="${(margin.top + chartHeight + 18).toFixed(1)}" text-anchor="middle" fill="${theme.labelColor}" font-size="11">${escapeHtml(String(row[xField] ?? ''))}</text>
    </g>`
  }).join('')

  return svgFrame(width, height, theme.background, `
    ${buildAxis(margin, chartWidth, chartHeight, xField, yField, yMin, yMax, theme)}
    ${bars}
  `)
}

function renderLineChart(chart: AgentChartSpec, rows: Record<string, unknown>[], theme: SvgTheme): string {
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
    `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="${lineColor}"><title>${escapeHtml(p.label)}: ${p.value}</title></circle>`
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

function renderTable(chart: AgentChartSpec, rows: Record<string, unknown>[]): string {
  const columns = Object.keys(rows[0] ?? {}).slice(0, 8)
  const header = columns.map(c => `<th>${escapeHtml(c)}</th>`).join('')
  const body = rows.slice(0, 20).map(row =>
    `<tr>${columns.map(c => `<td>${escapeHtml(String(row[c] ?? ''))}</td>`).join('')}</tr>`
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
