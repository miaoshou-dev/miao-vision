import type { SvgTheme } from '../../themes/types'
import type { IconClusterData } from '../types'
import { escapeHtml, svgFrame } from '../primitives/svg'
import { svgTextBlock } from '../primitives/text'

export function renderIconCluster(data: IconClusterData, theme: SvgTheme, palette: string[]): string {
  const items = data.items
  const cols = 3
  const cellW = 110
  const cellH = 80
  const gap = 12
  const rows = Math.ceil(items.length / cols)
  const w = cols * (cellW + gap) + 20
  const h = rows * (cellH + gap) + 20
  const iconR = 18

  const grid = items
    .map((item, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const cx = 10 + col * (cellW + gap) + cellW / 2
      const cy = 10 + row * (cellH + gap) + 28
      const color = palette[i % palette.length]
      const label = escapeHtml(item.label)
      const text = escapeHtml(item.text)
      const initial = label.charAt(0).toUpperCase()
      return `<g>
      <circle cx="${cx}" cy="${cy}" r="${iconR}" fill="${color}" opacity="0.15" stroke="${color}" stroke-width="1.5"/>
      <text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="16" font-weight="700" fill="${color}">${initial}</text>
      ${svgTextBlock({ x: cx, y: cy + iconR + 14, width: cellW - 10, text: label, fontSize: 11, fontWeight: 600, fill: color, anchor: 'middle', maxLines: 1 })}
      ${svgTextBlock({ x: cx, y: cy + iconR + 30, width: cellW - 10, text, fontSize: 10, fill: theme.labelColor, anchor: 'middle', maxLines: 2 })}
    </g>`
    })
    .join('\n')

  const svg = svgFrame(w, h, theme.background, grid)
  return svg
}
