import type { SvgTheme } from '../../themes/types'
import type { TimelinePathData } from '../types'
import { escapeHtml, svgFrame } from '../primitives/svg'
import { svgTextBlock } from '../primitives/text'

export function renderTimelinePath(data: TimelinePathData, theme: SvgTheme, palette: string[]): string {
  const items = data.items
  const dotR = 6
  const rowH = 56
  const h = items.length * rowH + 30
  const lineX = 30

  const defs = `<marker id="tl-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="${theme.axisColor}"/></marker>`

  const nodes = items
    .map((item, i) => {
      const y = 15 + i * rowH
      const label = escapeHtml(item.label ?? '')
      const text = escapeHtml(item.text ?? '')
      const color = palette[i % palette.length]
      const line =
        i < items.length - 1
          ? `<line x1="${lineX}" y1="${y + dotR * 2 + 4}" x2="${lineX}" y2="${y + rowH - 4}" stroke="${theme.axisColor}" stroke-width="1.5"/>`
          : ''
      return `<g>
      <circle cx="${lineX}" cy="${y + dotR}" r="${dotR}" fill="${color}"/>
      ${line}
      ${svgTextBlock({ x: lineX + 18, y: y + 4, width: 320, text: label, fontSize: 12, fontWeight: 600, fill: color, maxLines: 1 })}
      ${svgTextBlock({ x: lineX + 18, y: y + 20, width: 340, text, fontSize: 11, fill: theme.labelColor, maxLines: 2 })}
    </g>`
    })
    .join('\n')

  const svg = svgFrame(400, h, theme.background, `<defs>${defs}</defs>${nodes}`)
  return svg
}
