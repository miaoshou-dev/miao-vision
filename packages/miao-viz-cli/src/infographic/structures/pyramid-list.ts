import type { SvgTheme } from '../../themes/types'
import type { PyramidListData } from '../types'
import { svgFrame } from '../primitives/svg'
import { svgTextBlock } from '../primitives/text'

export function renderPyramidList(data: PyramidListData, theme: SvgTheme, palette: string[]): string {
  const items = data.items.slice(0, 6)
  const w = 560
  const rowH = 62
  const h = 36 + items.length * rowH
  const center = w / 2

  const rows = items.map((item, i) => {
    const width = 180 + i * ((w - 110) / Math.max(items.length - 1, 1))
    const x = center - width / 2
    const y = 22 + i * rowH
    const color = palette[i % palette.length]
    return `<g>
      <path d="M ${x + 18} ${y} H ${x + width - 18} L ${x + width} ${y + 48} H ${x} Z" fill="${color}" opacity="${0.18 + i * 0.06}" stroke="${color}" stroke-width="1.4"/>
      ${svgTextBlock({ x: x + 18, y: y + 20, width: width - 36, text: item.label, fontSize: 13, fontWeight: 800, fill: color, maxLines: 1 })}
      ${svgTextBlock({ x: x + 18, y: y + 40, width: width - 36, text: item.text, fontSize: 10, fill: theme.labelColor, maxLines: 1 })}
    </g>`
  }).join('\n')

  return svgFrame(w, h, theme.background, rows)
}
