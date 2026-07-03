import type { SvgTheme } from '../../themes/types'
import type { RoadmapSequenceData } from '../types'
import { svgFrame } from '../primitives/svg'
import { svgTextBlock } from '../primitives/text'

export function renderRoadmapSequence(data: RoadmapSequenceData, theme: SvgTheme, palette: string[]): string {
  const items = data.items.slice(0, 8)
  const w = 720
  const pad = 44
  const stepW = 150
  const rowH = 126
  const cols = Math.min(4, items.length)
  const rows = Math.ceil(items.length / cols)
  const h = pad * 2 + rows * rowH

  const body = items.map((item, i) => {
    const row = Math.floor(i / cols)
    const pos = i % cols
    const col = row % 2 === 0 ? pos : cols - 1 - pos
    const x = pad + col * ((w - pad * 2 - stepW) / Math.max(cols - 1, 1))
    const y = pad + row * rowH
    const color = palette[i % palette.length]
    const next = i < items.length - 1
      ? `<path d="M ${x + stepW} ${y + 34} C ${x + stepW + 22} ${y + 34}, ${x + stepW + 22} ${y + 84}, ${x + stepW + 44} ${y + 84}" fill="none" stroke="${theme.axisColor}" stroke-width="1.3" stroke-dasharray="5 4"/>`
      : ''
    return `<g>
      ${row % 2 === 0 && col < cols - 1 ? next : ''}
      <rect x="${x}" y="${y}" width="${stepW}" height="92" rx="8" fill="${color}" opacity="0.10" stroke="${color}" stroke-width="1.5"/>
      <circle cx="${x + 20}" cy="${y + 22}" r="12" fill="${color}"/>
      <text x="${x + 20}" y="${y + 26}" text-anchor="middle" font-size="11" font-weight="800" fill="#fff">${i + 1}</text>
      ${svgTextBlock({ x: x + 40, y: y + 22, width: stepW - 52, text: item.label ?? `Stage ${i + 1}`, fontSize: 12, fontWeight: 700, fill: color, maxLines: 1 })}
      ${svgTextBlock({ x: x + 14, y: y + 50, width: stepW - 28, text: item.text, fontSize: 11, fill: theme.labelColor, maxLines: 2 })}
    </g>`
  }).join('\n')

  return svgFrame(w, h, theme.background, body)
}
