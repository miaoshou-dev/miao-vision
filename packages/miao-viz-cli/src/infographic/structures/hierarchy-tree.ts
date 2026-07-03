import type { SvgTheme } from '../../themes/types'
import type { HierarchyTreeData } from '../types'
import { svgFrame } from '../primitives/svg'
import { svgTextBlock } from '../primitives/text'

export function renderHierarchyTree(data: HierarchyTreeData, theme: SvgTheme, palette: string[]): string {
  const items = data.items.slice(0, 12)
  const w = 680
  const nodeW = 150
  const nodeH = 56
  const levels = buildLevels(items)
  const h = 50 + levels.length * 112

  const positions = new Map<number, { x: number; y: number }>()
  levels.forEach((level, depth) => {
    const gap = (w - level.length * nodeW) / (level.length + 1)
    level.forEach((itemIndex, pos) => {
      positions.set(itemIndex, { x: gap + pos * (nodeW + gap), y: 32 + depth * 112 })
    })
  })

  const links = items.map((item, i) => {
    if (item.parent === undefined || !positions.has(item.parent) || !positions.has(i)) return ''
    const from = positions.get(item.parent)!
    const to = positions.get(i)!
    return `<path d="M ${from.x + nodeW / 2} ${from.y + nodeH} V ${to.y - 18} H ${to.x + nodeW / 2} V ${to.y}" fill="none" stroke="${theme.axisColor}" stroke-width="1.3"/>`
  }).join('\n')

  const nodes = items.map((item, i) => {
    const pos = positions.get(i)
    if (!pos) return ''
    const color = palette[i % palette.length]
    return `<g>
      <rect x="${pos.x}" y="${pos.y}" width="${nodeW}" height="${nodeH}" rx="8" fill="${color}" opacity="0.10" stroke="${color}" stroke-width="1.5"/>
      ${svgTextBlock({ x: pos.x + 12, y: pos.y + 23, width: nodeW - 24, text: item.label, fontSize: 12, fontWeight: 700, fill: color, maxLines: 1 })}
      ${item.text ? svgTextBlock({ x: pos.x + 12, y: pos.y + 42, width: nodeW - 24, text: item.text, fontSize: 10, fill: theme.labelColor, maxLines: 1 }) : ''}
    </g>`
  }).join('\n')

  return svgFrame(w, h, theme.background, links + nodes)
}

function buildLevels(items: HierarchyTreeData['items']): number[][] {
  const levels: number[][] = []
  for (let i = 0; i < items.length; i += 1) {
    let depth = 0
    let parent = items[i].parent
    const seen = new Set<number>()
    while (parent !== undefined && items[parent] && !seen.has(parent) && depth < 3) {
      seen.add(parent)
      depth += 1
      parent = items[parent].parent
    }
    if (!levels[depth]) levels[depth] = []
    levels[depth].push(i)
  }
  return levels
}
