import type { AgentChartSpec } from './types'
import type { SvgTheme } from './themes/types'
import { escapeHtml } from './infographic/primitives/svg'
import { formatTick } from './infographic/primitives/axis'
export { escapeHtml, formatTick }

export function svgFrame(width: number, height: number, bgColor: string, body: string): string {
  return `<svg class="miao-chart-svg" viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${width}" height="${height}" fill="${bgColor}" />
    ${body}
  </svg>`
}

export function markAttrs(chartId: string | undefined, field: string, value: unknown, rowKey: number, tooltip: string): string {
  return [
    'data-miao-mark="true"',
    chartId ? `data-chart-id="${escapeHtml(chartId)}"` : '',
    `data-field="${escapeHtml(field)}"`,
    `data-value="${escapeHtml(String(value ?? ''))}"`,
    `data-row-key="${escapeHtml(String(rowKey))}"`,
    `data-tooltip="${escapeHtml(tooltip)}"`
  ].filter(Boolean).join(' ')
}

export function polarToCartesian(cx: number, cy: number, radius: number, angle: number): { x: number; y: number } {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle)
  }
}

export function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
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

export function numberStyle(chart: AgentChartSpec, key: string, fallback: number): number {
  const value = chart.style?.[key]
  return typeof value === 'number' ? value : fallback
}

export function renderUnsupported(chart: AgentChartSpec): string {
  return `<div class="miao-unsupported">Static HTML rendering for ${escapeHtml(chart.type)} is not implemented yet.</div>`
}

export function buildAxis(
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
