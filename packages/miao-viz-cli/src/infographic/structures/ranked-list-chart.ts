import type { SvgTheme } from '../../themes/types'
import type { RankedListChartData } from '../types'
import { escapeHtml } from '../primitives/svg'
import { formatTick } from '../primitives/axis'

export function renderRankedListChart(data: RankedListChartData, theme: SvgTheme, palette: string[]): string {
  const items = data.items
  const values = items.map((item) => item.value)
  const max = Math.max(...values, 1)

  const rows = items
    .map((item, i) => {
      const v = values[i]
      const pct = Math.max((v / max) * 100, 1)
      const color = palette[i % palette.length]
      const label = item.label
      const val = escapeHtml(v.toLocaleString())
      const rank = i + 1
      return `<div class="mv-visual-ranked-row">
      <span class="mv-visual-ranked-rank">${rank}</span>
      <p>${escapeHtml(label)}</p>
      <div class="mv-visual-ranked-track"><span style="width:${pct.toFixed(2)}%;background:${color}"></span></div>
      <strong>${val}</strong>
    </div>`
    })
    .join('\n')

  const tickCount = 4
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const pct = (i / tickCount) * 100
    const val = i === 0 ? '0' : formatTick(Math.round((i / tickCount) * max))
    return `<span style="position:absolute;left:${pct}%;top:0;font-size:9px;color:${theme.labelColor};opacity:0.5;transform:translateX(-50%)">${escapeHtml(val)}</span>`
  }).join('')
  const scaleBar = `<div style="position:relative;height:14px;margin:4px 0 0 34px;border-top:1px solid ${theme.axisColor};opacity:0.3">${ticks}</div>`

  return `<div class="mv-visual-ranked" style="position:relative">${rows}${scaleBar}</div>`
}
