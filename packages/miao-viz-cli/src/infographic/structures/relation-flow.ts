import type { SvgTheme } from '../../themes/types'
import type { RelationFlowData } from '../types'
import { escapeHtml, svgFrame } from '../primitives/svg'
import { arrowDef, arrowHeadId } from '../primitives/layout'
import { svgTextBlock } from '../primitives/text'

export function renderRelationFlow(data: RelationFlowData, theme: SvgTheme, palette: string[]): string {
  const nodes = data.nodes.slice(0, 12)
  const edges = data.edges.slice(0, 18)
  const w = 700
  const nodeW = 138
  const nodeH = 58
  const cols = Math.min(4, nodes.length)
  const rows = Math.ceil(nodes.length / cols)
  const h = 56 + rows * 116
  const gapX = (w - cols * nodeW) / (cols + 1)

  const positions = nodes.map((_, i) => ({
    x: gapX + (i % cols) * (nodeW + gapX),
    y: 34 + Math.floor(i / cols) * 116
  }))

  const edgeEls = edges.map(edge => {
    const from = positions[edge.from]
    const to = positions[edge.to]
    if (!from || !to) return ''
    const x1 = from.x + nodeW / 2
    const y1 = from.y + nodeH / 2
    const x2 = to.x + nodeW / 2
    const y2 = to.y + nodeH / 2
    const midX = (x1 + x2) / 2
    const midY = (y1 + y2) / 2
    return `<g>
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${theme.axisColor}" stroke-width="1.2" marker-end="url(#${arrowHeadId('relation')})"/>
      ${edge.label ? `<text x="${midX}" y="${midY - 5}" text-anchor="middle" font-size="9" fill="${theme.axisColor}">${escapeHtml(edge.label)}</text>` : ''}
    </g>`
  }).join('\n')

  const nodeEls = nodes.map((node, i) => {
    const pos = positions[i]
    const color = palette[i % palette.length]
    return `<g>
      <rect x="${pos.x}" y="${pos.y}" width="${nodeW}" height="${nodeH}" rx="8" fill="${theme.background}" stroke="${color}" stroke-width="1.5"/>
      <circle cx="${pos.x + 16}" cy="${pos.y + 18}" r="6" fill="${color}"/>
      ${svgTextBlock({ x: pos.x + 30, y: pos.y + 21, width: nodeW - 40, text: node.label, fontSize: 12, fontWeight: 700, fill: color, maxLines: 1 })}
      ${node.detail ? svgTextBlock({ x: pos.x + 12, y: pos.y + 43, width: nodeW - 24, text: node.detail, fontSize: 10, fill: theme.labelColor, maxLines: 1 }) : ''}
    </g>`
  }).join('\n')

  return svgFrame(w, h, theme.background, `<defs>${arrowDef('relation', theme.axisColor)}</defs>${edgeEls}${nodeEls}`)
}
