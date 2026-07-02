import type { SvgTheme } from '../../themes/types'
import type { CalloutDiagramData } from '../types'
import { escapeHtml, svgFrame } from '../primitives/svg'
import { svgTextBlock } from '../primitives/text'

export function renderCalloutDiagram(data: CalloutDiagramData, theme: SvgTheme, palette: string[]): string {
  const items = data.items
  const w = 400
  const rowH = 36
  const h = items.length * rowH + 30
  const calloutX = 20
  const lineX = 50
  const textX = 60
  const dotR = 4

  const defs = `<marker id="cd-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="${theme.axisColor}"/></marker>`

  const callouts = items
    .map((item, i) => {
      const y = 15 + i * rowH
      const color = palette[i % palette.length]
      const label = escapeHtml(item.label)
      const text = escapeHtml(item.text)
      const detail = item.detail ? escapeHtml(item.detail) : ''
      return `<g>
      <circle cx="${calloutX}" cy="${y + 6}" r="${dotR}" fill="${color}"/>
      <line x1="${calloutX + dotR + 2}" y1="${y + 6}" x2="${lineX - 4}" y2="${y + 6}" stroke="${theme.axisColor}" stroke-width="1" marker-end="url(#cd-arr)"/>
      ${svgTextBlock({ x: textX, y: y + 4, width: 320, text: label, fontSize: 12, fontWeight: 600, fill: color, maxLines: 1 })}
      ${svgTextBlock({ x: textX, y: y + 18, width: 320, text: `${text}${detail ? ` - ${detail}` : ''}`, fontSize: 11, fill: theme.labelColor, maxLines: 2 })}
    </g>`
    })
    .join('\n')

  const svg = svgFrame(w, h, theme.background, `<defs>${defs}</defs>${callouts}`)
  return svg
}
