import type { SvgTheme } from '../../themes/types'
import type { TradeoffMatrixData } from '../types'
import { escapeHtml, svgFrame } from '../primitives/svg'

export function renderTradeoffMatrix(data: TradeoffMatrixData, theme: SvgTheme, palette: string[]): string {
  const items = data.items
  const cellW = 170
  const cellH = 70
  const gap = 8
  const w = cellW * 2 + gap + 80
  const h = cellH * 2 + gap + 80

  const xLabel = escapeHtml(data.xLabel ?? 'Low \u2192 High')
  const yLabel = escapeHtml(data.yLabel ?? 'Low \u2192 High')

  const quads = [
    { col: 0, row: 0, color: palette[3], label: 'Avoid', opacity: '0.08' },
    { col: 1, row: 0, color: palette[1], label: 'Investigate', opacity: '0.08' },
    { col: 0, row: 1, color: palette[1], label: 'Monitor', opacity: '0.08' },
    { col: 1, row: 1, color: palette[0], label: 'Priority', opacity: '0.12' },
  ]

  const quadrants = quads
    .map((q, i) => {
      const px = 50 + q.col * (cellW + gap)
      const py = 50 + q.row * (cellH + gap)
      const item = items[i]
      const text = item ? escapeHtml(item.text ?? '') : ''
      const detail = item && item.detail ? escapeHtml(item.detail) : ''
      const itemTitle = item ? escapeHtml(item.label ?? q.label) : q.label
      return `<g>
      <rect x="${px}" y="${py}" width="${cellW}" height="${cellH}" rx="4" fill="${q.color}" opacity="${q.opacity}" stroke="${q.color}" stroke-width="1"/>
      <text x="${px + cellW / 2}" y="${py + cellH / 2 - (detail ? 8 : 0)}" text-anchor="middle" font-size="12" font-weight="600" fill="${q.color}">${itemTitle}</text>
      ${text ? `<text x="${px + cellW / 2}" y="${py + cellH / 2 + 10}" text-anchor="middle" font-size="10" fill="${theme.labelColor}">${text}</text>` : ''}
      ${detail ? `<text x="${px + cellW / 2}" y="${py + cellH / 2 + 24}" text-anchor="middle" font-size="9" fill="${theme.labelColor}" opacity="0.7">${detail}</text>` : ''}
    </g>`
    })
    .join('\n')

  const axes = `<text x="50" y="38" font-size="10" fill="${theme.axisColor}">${yLabel}</text>
    <text x="${50 + cellW + gap - 5}" y="${h - 8}" text-anchor="end" font-size="10" fill="${theme.axisColor}">${xLabel}</text>`

  const svg = svgFrame(w, h, theme.background, axes + '\n' + quadrants)
  return svg
}
