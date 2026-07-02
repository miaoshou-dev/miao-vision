import type { SvgTheme } from '../../themes/types'
import type { MetricBarsData } from '../types'
import { escapeHtml, svgFrame } from '../primitives/svg'
import { bar } from '../primitives/layout'
import { svgTextBlock } from '../primitives/text'
import { formatTick, numericTicks } from '../primitives/axis'

export function renderMetricBars(data: MetricBarsData, theme: SvgTheme, palette: string[]): string {
  const items = data.items
  const values = items.map((item) => item.value)
  const max = Math.max(...values, 1)
  const barH = 22
  const rowH = 50
  const labelW = 190
  const valueW = 78
  const barW = 300
  const w = labelW + barW + valueW + 24
  const axisH = 30
  const h = items.length * rowH + 14 + axisH
  const defs = palette
    .map(
      (c, i) =>
        `<linearGradient id="mg-${i}" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="${c}"/><stop offset="100%" stop-color="${c}" stop-opacity="0.6"/></linearGradient>`
    )
    .join('')

  const bars = items
    .map((item, i) => {
      const y = 10 + i * rowH
      const v = values[i]
      const bw = (v / max) * barW
      const label = item.label ?? ''
      const val = escapeHtml(v.toLocaleString())
      const unit = item.unit ? ` ${escapeHtml(item.unit)}` : ''
      return `${svgTextBlock({ x: 0, y: y + 13, width: labelW - 12, text: label, fontSize: 11, fill: theme.labelColor, maxLines: 2 })}
      ${bar(labelW, y, bw, barH, `url(#mg-${i % palette.length})`, `${label}: ${val}${unit}`)}
      <text x="${labelW + barW + valueW}" y="${y + 15}" font-size="11" fill="${theme.labelColor}" text-anchor="end">${val}${unit}</text>`
    })
    .join('\n')

  const axisY = items.length * rowH + 14 + 12
  const ticks = numericTicks(0, max, 4)
  const gridLinesSvg = ticks
    .filter((_, i) => i > 0)
    .map((t) => {
      const x = labelW + (t.value / max) * barW
      return `<line x1="${x}" y1="10" x2="${x}" y2="${axisY - 5}" stroke="${theme.axisColor}" stroke-opacity="0.4" stroke-dasharray="4 3" />`
    })
    .join('\n')
  const axisLine = `<line x1="${labelW}" y1="${axisY}" x2="${labelW + barW}" y2="${axisY}" stroke="${theme.axisColor}" stroke-width="1" />`
  const xLabels = ticks
    .map((t) => {
      const x = labelW + (t.value / max) * barW
      return `<text x="${x}" y="${axisY + 14}" text-anchor="middle" font-size="10" fill="${theme.labelColor}">${escapeHtml(formatTick(t.value))}</text>`
    })
    .join('\n')

  const svg = svgFrame(w, h, theme.background, `<defs>${defs}</defs>${gridLinesSvg}\n${bars}\n${axisLine}\n${xLabels}`)
  return svg
}
