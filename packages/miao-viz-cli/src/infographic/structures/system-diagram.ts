import type { SvgTheme } from '../../themes/types'
import type { SystemDiagramData } from '../types'
import { escapeHtml, svgFrame } from '../primitives/svg'

export function renderSystemDiagram(data: SystemDiagramData, theme: SvgTheme, palette: string[]): string {
  const nodes = data.nodes
  const edges = data.edges
  const nodeW = 120
  const nodeH = 40
  const gap = 30
  const pad = 30
  const cols = 3
  const rows = Math.ceil(nodes.length / cols)
  const w = cols * (nodeW + gap) + pad
  const h = rows * (nodeH + gap) + pad + 30

  const defEdges = edges
    .map((edge) => {
      const from = edge.from
      const to = edge.to
      const fx = pad + (from % cols) * (nodeW + gap) + nodeW / 2
      const fy = pad + Math.floor(from / cols) * (nodeH + gap) + nodeH / 2
      const tx = pad + (to % cols) * (nodeW + gap) + nodeW / 2
      const ty = pad + Math.floor(to / cols) * (nodeH + gap) + nodeH / 2
      return `<line x1="${fx}" y1="${fy}" x2="${tx}" y2="${ty}" stroke="${theme.axisColor}" stroke-width="1.5" marker-end="url(#sd-arr)"/>`
    })
    .join('\n')

  const defs = `<marker id="sd-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="${theme.axisColor}"/></marker>`

  const defNodes = nodes
    .map((node, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = pad + col * (nodeW + gap)
      const y = pad + row * (nodeH + gap)
      const color = node.color ?? palette[i % palette.length]
      const label = escapeHtml(node.label ?? `Node ${i + 1}`)
      const zoneLabel = node.zone
        ? `<text x="${x + nodeW / 2}" y="${y - 6}" text-anchor="middle" font-size="9" fill="${theme.axisColor}" font-style="italic">${escapeHtml(node.zone)}</text>`
        : ''
      return `<g>
      ${zoneLabel}
      <rect x="${x}" y="${y}" width="${nodeW}" height="${nodeH}" rx="4" fill="${color}" opacity="0.12" stroke="${color}" stroke-width="1.5"/>
      <text x="${x + nodeW / 2}" y="${y + nodeH / 2 + 4}" text-anchor="middle" font-size="11" font-weight="600" fill="${color}">${label}</text>
    </g>`
    })
    .join('\n')

  const svg = svgFrame(w, h, theme.background, `<defs>${defs}</defs>${defEdges}\n${defNodes}`)
  return svg
}
