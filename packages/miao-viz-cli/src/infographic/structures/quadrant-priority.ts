import type { SvgTheme } from '../../themes/types'
import type { QuadrantPriorityData } from '../types'
import { escapeHtml, svgFrame } from '../primitives/svg'
import { svgTextBlock } from '../primitives/text'

export function renderQuadrantPriority(data: QuadrantPriorityData, theme: SvgTheme, palette: string[]): string {
  const labels = ['Low / High', 'High / High', 'Low / Low', 'High / Low']
  const cells = data.items.slice(0, 4)
  const w = 520
  const h = 360
  const pad = 70
  const gap = 10
  const cellW = (w - pad * 2 - gap) / 2
  const cellH = (h - pad * 2 - gap) / 2

  const body = cells.map((item, i) => {
    const col = i % 2
    const row = i < 2 ? 0 : 1
    const x = pad + col * (cellW + gap)
    const y = pad + row * (cellH + gap)
    const color = palette[i % palette.length]
    return `<g>
      <rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="8" fill="${color}" opacity="0.10" stroke="${color}" stroke-width="1.5"/>
      <text x="${x + 12}" y="${y + 20}" font-size="10" font-weight="700" fill="${color}">${escapeHtml(labels[i])}</text>
      ${svgTextBlock({ x: x + 12, y: y + 44, width: cellW - 24, text: item.label, fontSize: 14, fontWeight: 700, fill: color, maxLines: 1 })}
      ${svgTextBlock({ x: x + 12, y: y + 68, width: cellW - 24, text: item.text, fontSize: 11, fill: theme.labelColor, maxLines: 3 })}
    </g>`
  }).join('\n')

  const axes = `<line x1="${pad}" y1="${h - pad + 14}" x2="${w - pad}" y2="${h - pad + 14}" stroke="${theme.axisColor}" stroke-width="1.5"/>
    <line x1="${pad - 14}" y1="${h - pad}" x2="${pad - 14}" y2="${pad}" stroke="${theme.axisColor}" stroke-width="1.5"/>
    <text x="${w / 2}" y="${h - 18}" text-anchor="middle" font-size="11" fill="${theme.axisColor}">${escapeHtml(data.xLabel ?? 'Low effort to high impact')}</text>
    <text x="22" y="${h / 2}" transform="rotate(-90 22 ${h / 2})" text-anchor="middle" font-size="11" fill="${theme.axisColor}">${escapeHtml(data.yLabel ?? 'Low urgency to high urgency')}</text>`

  return svgFrame(w, h, theme.background, axes + body)
}
