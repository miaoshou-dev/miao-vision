import type { AgentChartSpec } from './types'
import type { SvgTheme } from './themes/types'
import { escapeHtml, markAttrs, numberStyle, renderUnsupported, svgFrame } from './svg-renderer-utils'
import { chartPalette, stableCategoryColor } from './semantic-color'

interface Options { chartId?: string }

export function renderParetoChart(chart: AgentChartSpec, rows: Record<string, unknown>[], theme: SvgTheme, options: Options): string {
  const xField = chart.encoding?.x?.field ?? ''; const yField = chart.encoding?.y?.field ?? ''
  const data = rows.map((row, index) => ({ row, index, value: Number(row[yField]) })).filter(item => Number.isFinite(item.value) && item.value >= 0).sort((a, b) => b.value - a.value)
  if (!xField || data.length === 0) return renderUnsupported(chart)
  const width = numberStyle(chart, 'width', 760); const height = numberStyle(chart, 'height', 430)
  const margin = { top: 28, right: 64, bottom: 70, left: 70 }; const w = width - margin.left - margin.right; const h = height - margin.top - margin.bottom
  const max = Math.max(...data.map(item => item.value), 1); const total = data.reduce((sum, item) => sum + item.value, 0) || 1; const step = w / data.length; let cumulative = 0
  const palette = chartPalette(chart, theme); const points: Array<{ x: number; y: number }> = []
  const bars = data.map((item, i) => { cumulative += item.value; const x = margin.left + i * step + step * 0.12; const barH = item.value / max * h; const pct = cumulative / total; points.push({ x: margin.left + (i + 0.5) * step, y: margin.top + h * (1 - pct) }); const label = String(item.row[xField] ?? '—'); return `<g><rect ${markAttrs(options.chartId, xField, item.row[xField], item.index, `${label}: ${item.value}`)} x="${x}" y="${margin.top + h - barH}" width="${step * 0.76}" height="${barH}" fill="${stableCategoryColor(label, palette)}"/><text x="${x + step * 0.38}" y="${height - 42}" text-anchor="middle" fill="${theme.labelColor}" font-size="10" transform="rotate(-30 ${x + step * 0.38} ${height - 42})">${escapeHtml(label)}</text></g>` }).join('')
  const path = points.map((point, i) => `${i ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ')
  return svgFrame(width, height, theme.background, `${bars}<path d="${path}" fill="none" stroke="#111827" stroke-width="2.5"/>${points.map(point => `<circle cx="${point.x}" cy="${point.y}" r="4" fill="#111827"/>`).join('')}<text x="${width - 8}" y="${margin.top + 4}" text-anchor="end" fill="${theme.labelColor}" font-size="11">100%</text>`)
}

export function renderComboBarLineChart(chart: AgentChartSpec, rows: Record<string, unknown>[], theme: SvgTheme, options: Options): string {
  const xField = chart.encoding?.x?.field ?? ''; const barField = chart.encoding?.y?.field ?? ''; const lineField = chart.encoding?.lineY?.field ?? ''
  const data = rows.map((row, index) => ({ row, index, bar: Number(row[barField]), line: Number(row[lineField]) })).filter(item => Number.isFinite(item.bar) && Number.isFinite(item.line))
  if (!xField || data.length === 0) return renderUnsupported(chart)
  const width = numberStyle(chart, 'width', 760); const height = numberStyle(chart, 'height', 430); const margin = { top: 28, right: 72, bottom: 62, left: 72 }; const w = width - margin.left - margin.right; const h = height - margin.top - margin.bottom
  const barMax = Math.max(...data.map(item => item.bar), 1); const lineMin = Math.min(...data.map(item => item.line)); const lineMax = Math.max(...data.map(item => item.line), lineMin + 1); const step = w / data.length
  const points = data.map((item, i) => ({ x: margin.left + (i + 0.5) * step, y: margin.top + h - ((item.line - lineMin) / (lineMax - lineMin)) * h }))
  const bars = data.map((item, i) => { const x = margin.left + i * step + step * 0.15; const barH = item.bar / barMax * h; const label = String(item.row[xField] ?? '—'); return `<g><rect ${markAttrs(options.chartId, xField, item.row[xField], item.index, `${label}: ${barField}=${item.bar}, ${lineField}=${item.line}`)} x="${x}" y="${margin.top + h - barH}" width="${step * 0.7}" height="${barH}" fill="${theme.palette[0]}" fill-opacity="0.72"/><text x="${x + step * 0.35}" y="${height - 28}" text-anchor="middle" fill="${theme.labelColor}" font-size="10">${escapeHtml(label)}</text></g>` }).join('')
  const path = points.map((point, i) => `${i ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ')
  return svgFrame(width, height, theme.background, `${bars}<path d="${path}" fill="none" stroke="${theme.palette[1] ?? '#E69F00'}" stroke-width="3"/>${points.map(point => `<circle cx="${point.x}" cy="${point.y}" r="4" fill="${theme.palette[1] ?? '#E69F00'}"/>`).join('')}<text x="${margin.left}" y="16" fill="${theme.labelColor}" font-size="11">${escapeHtml(barField)} (bars)</text><text x="${width - margin.right}" y="16" text-anchor="end" fill="${theme.labelColor}" font-size="11">${escapeHtml(lineField)} (line)</text>`)
}
