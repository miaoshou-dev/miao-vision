import type { SvgTheme } from '../../themes/types'
import type { BeforeAfterData } from '../types'
import { escapeHtml, svgFrame } from '../primitives/svg'

export function renderBeforeAfter(data: BeforeAfterData, theme: SvgTheme, palette: string[]): string {
  const before = data.before
  const after = data.after
  const items = data.items.length > 0 ? data.items : before
  const afterItems = after.length > 0 ? after : items

  const rows = Math.max(items.length, afterItems.length)
  const colW = 180
  const rowH = 28
  const h = 50 + rows * rowH
  const w = colW * 2 + 80
  const midX = colW + 40

  const beforeLabel = escapeHtml(data.beforeLabel ?? 'Before')
  const afterLabel = escapeHtml(data.afterLabel ?? 'After')

  const header = `<text x="${midX / 2}" y="22" text-anchor="middle" font-size="13" font-weight="700" fill="${palette[1]}">${beforeLabel}</text>
    <text x="${midX + colW / 2}" y="22" text-anchor="middle" font-size="13" font-weight="700" fill="${palette[0]}">${afterLabel}</text>
    <line x1="${midX - 40}" y1="30" x2="${midX + 40}" y2="30" stroke="${theme.axisColor}" stroke-width="1"/>
    <text x="${midX}" y="42" text-anchor="middle" font-size="10" fill="${theme.axisColor}">\u2192</text>`

  const rowsSvg = Array.from({ length: rows }, (_, i) => {
    const y = 48 + i * rowH
    const bItem = items[i]
    const aItem = afterItems[i]
    const bVal = bItem ? escapeHtml(String(bItem.value ?? bItem.text ?? '')) : ''
    const aVal = aItem ? escapeHtml(String(aItem.value ?? aItem.text ?? '')) : ''
    const bLabel = bItem ? escapeHtml(bItem.label ?? '') : ''
    const aLabel = aItem ? escapeHtml(aItem.label ?? '') : ''
    return `<text x="${midX / 2}" y="${y + 14}" text-anchor="middle" font-size="11" fill="${theme.labelColor}">${bLabel}${bVal ? ` ${bVal}` : ''}</text>
      <text x="${midX + colW / 2}" y="${y + 14}" text-anchor="middle" font-size="11" fill="${theme.labelColor}">${aLabel}${aVal ? ` ${aVal}` : ''}</text>`
  }).join('\n')

  const svg = svgFrame(w, h, theme.background, header + '\n' + rowsSvg)
  return svg
}
