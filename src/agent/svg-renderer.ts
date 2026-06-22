import { prepareChartData } from './data-transform'
import type { AgentChartSpec } from './types'

const COLORS = ['#2563eb', '#16a34a', '#f97316', '#dc2626', '#7c3aed', '#0891b2']

export function renderChartSvg(chart: AgentChartSpec, rows: Record<string, unknown>[]): string {
  const data = prepareChartData(rows, chart)
  if (chart.type === 'line' || chart.type === 'area') return renderLineChart(chart, data)
  if (chart.type === 'bar') return renderBarChart(chart, data)
  if (chart.type === 'table') return renderTable(chart, data)
  if (chart.type === 'bigvalue') return renderBigValue(chart, data)
  return renderUnsupported(chart)
}

function renderBarChart(chart: AgentChartSpec, rows: Record<string, unknown>[]): string {
  const xField = chart.encoding.x?.field ?? ''
  const yField = chart.encoding.y?.field ?? ''
  const width = numberStyle(chart, 'width', 720)
  const height = numberStyle(chart, 'height', 420)
  const margin = { top: 24, right: 24, bottom: 80, left: 72 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom
  const values = rows.map(row => Number(row[yField])).filter(Number.isFinite)
  const max = Math.max(...values, 1)
  const barGap = 8
  const barWidth = Math.max(8, (chartWidth - barGap * Math.max(rows.length - 1, 0)) / Math.max(rows.length, 1))

  const bars = rows.map((row, index) => {
    const value = Number(row[yField]) || 0
    const barHeight = (value / max) * chartHeight
    const x = margin.left + index * (barWidth + barGap)
    const y = margin.top + chartHeight - barHeight
    return `<g>
      <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" fill="${COLORS[index % COLORS.length]}" />
      <text x="${x + barWidth / 2}" y="${height - 44}" text-anchor="end" transform="rotate(-35 ${x + barWidth / 2} ${height - 44})">${escapeHtml(String(row[xField] ?? ''))}</text>
    </g>`
  }).join('')

  return svgFrame(width, height, `
    ${axis(margin, chartWidth, chartHeight, xField, yField)}
    ${bars}
  `)
}

function renderLineChart(chart: AgentChartSpec, rows: Record<string, unknown>[]): string {
  const xField = chart.encoding.x?.field ?? ''
  const yField = chart.encoding.y?.field ?? ''
  const width = numberStyle(chart, 'width', 720)
  const height = numberStyle(chart, 'height', 420)
  const margin = { top: 24, right: 24, bottom: 64, left: 72 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom
  const values = rows.map(row => Number(row[yField])).filter(Number.isFinite)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const span = Math.max(max - min, 1)

  const points = rows.map((row, index) => {
    const x = margin.left + (index / Math.max(rows.length - 1, 1)) * chartWidth
    const y = margin.top + chartHeight - (((Number(row[yField]) || 0) - min) / span) * chartHeight
    return { x, y, label: String(row[xField] ?? ''), value: Number(row[yField]) || 0 }
  })

  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const dots = points.map(point => `<circle cx="${point.x}" cy="${point.y}" r="4" fill="#2563eb"><title>${escapeHtml(point.label)}: ${point.value}</title></circle>`).join('')
  const labels = points.map((point, index) => {
    if (index % Math.ceil(points.length / 8) !== 0) return ''
    return `<text x="${point.x}" y="${height - 28}" text-anchor="middle">${escapeHtml(point.label)}</text>`
  }).join('')

  return svgFrame(width, height, `
    ${axis(margin, chartWidth, chartHeight, xField, yField)}
    <path d="${path}" fill="none" stroke="#2563eb" stroke-width="3" />
    ${dots}
    ${labels}
  `)
}

function renderTable(chart: AgentChartSpec, rows: Record<string, unknown>[]): string {
  const columns = Object.keys(rows[0] ?? {}).slice(0, 8)
  const header = columns.map(column => `<th>${escapeHtml(column)}</th>`).join('')
  const body = rows.slice(0, 20).map(row => {
    return `<tr>${columns.map(column => `<td>${escapeHtml(String(row[column] ?? ''))}</td>`).join('')}</tr>`
  }).join('')
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

function svgFrame(width: number, height: number, body: string): string {
  return `<svg class="miao-chart-svg" viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />
    ${body}
  </svg>`
}

function axis(
  margin: { top: number; left: number },
  chartWidth: number,
  chartHeight: number,
  xLabel: string,
  yLabel: string
): string {
  const x0 = margin.left
  const y0 = margin.top + chartHeight
  return `
    <line x1="${x0}" y1="${y0}" x2="${x0 + chartWidth}" y2="${y0}" stroke="#94a3b8" />
    <line x1="${x0}" y1="${margin.top}" x2="${x0}" y2="${y0}" stroke="#94a3b8" />
    <text x="${x0 + chartWidth / 2}" y="${y0 + 54}" text-anchor="middle" fill="#475569">${escapeHtml(xLabel)}</text>
    <text x="18" y="${margin.top + chartHeight / 2}" text-anchor="middle" transform="rotate(-90 18 ${margin.top + chartHeight / 2})" fill="#475569">${escapeHtml(yLabel)}</text>
  `
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
