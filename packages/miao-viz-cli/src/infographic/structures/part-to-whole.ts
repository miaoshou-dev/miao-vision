import type { SvgTheme } from '../../themes/types'
import type { PartToWholeData } from '../types'
import { escapeHtml, svgFrame } from '../primitives/svg'
import { bar } from '../primitives/layout'

export function renderPartToWhole(data: PartToWholeData, theme: SvgTheme, palette: string[]): string {
  const items = data.items
  const values = items.map((item) => item.value)
  const total = values.reduce((a, b) => a + b, 0) || 1
  const barH = 28
  const gap = 8
  const w = 400
  const h = items.length * (barH + gap) + 40

  const bars = items
    .map((item, i) => {
      const y = 20 + i * (barH + gap)
      const pct = (values[i] / total) * 100
      const bw = (pct / 100) * (w - 120)
      const color = palette[i % palette.length]
      const label = escapeHtml(item.label)
      const val = escapeHtml(pct.toFixed(1))
      return `<g>
      <text x="0" y="${y + 18}" font-size="11" fill="${theme.labelColor}">${label}</text>
      ${bar(110, y, bw, barH, color, `${label}: ${val}%`)}
      <text x="${w - 8}" y="${y + 18}" font-size="11" fill="${theme.labelColor}" text-anchor="end" font-weight="600">${val}%</text>
    </g>`
    })
    .join('\n')

  const svg = svgFrame(w, h, theme.background, bars)
  return svg
}
