import type { SvgTheme } from '../../themes/types'
import type { GridListData } from '../types'
import { svgFrame } from '../primitives/svg'
import { svgTextBlock } from '../primitives/text'

export function renderGridList(data: GridListData, theme: SvgTheme, palette: string[]): string {
  const items = data.items.slice(0, 12)
  const cols = items.length <= 4 ? 2 : 3
  const cardW = 170
  const cardH = 92
  const gap = 14
  const pad = 24
  const rows = Math.ceil(items.length / cols)
  const w = pad * 2 + cols * cardW + (cols - 1) * gap
  const h = pad * 2 + rows * cardH + (rows - 1) * gap

  const cards = items.map((item, i) => {
    const x = pad + (i % cols) * (cardW + gap)
    const y = pad + Math.floor(i / cols) * (cardH + gap)
    const color = palette[i % palette.length]
    return `<g>
      <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="8" fill="${color}" opacity="0.09" stroke="${color}" stroke-width="1.4"/>
      <circle cx="${x + 18}" cy="${y + 20}" r="9" fill="${color}"/>
      <text x="${x + 18}" y="${y + 24}" text-anchor="middle" font-size="10" font-weight="800" fill="#fff">${i + 1}</text>
      ${svgTextBlock({ x: x + 34, y: y + 23, width: cardW - 46, text: item.label, fontSize: 12, fontWeight: 700, fill: color, maxLines: 1 })}
      ${svgTextBlock({ x: x + 14, y: y + 50, width: cardW - 28, text: item.text, fontSize: 10, fill: theme.labelColor, maxLines: 2 })}
    </g>`
  }).join('\n')

  return svgFrame(w, h, theme.background, cards)
}
