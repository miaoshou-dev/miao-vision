import type { SvgTheme } from '../../themes/types'
import type { ConceptContrastData, ConceptContrastItemData } from '../types'
import { escapeHtml, svgFrame } from '../primitives/svg'
import { svgTextBlock } from '../primitives/text'

function extractCriteria(items: ConceptContrastItemData[]): string[] {
  const keys = new Set<string>()
  for (const item of items) {
    for (const key of Object.keys(item)) {
      if (key !== 'label' && key !== 'text') keys.add(key)
    }
  }
  return Array.from(keys).slice(0, 6)
}

function extractValue(item: ConceptContrastItemData, key: string): string {
  const v = (item as Record<string, unknown>)[key]
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  if (v === true) return '\u2713'
  if (v === false) return '\u2717'
  return ''
}

function requireVisualCriteria(data: ConceptContrastData): string[] {
  const items = data.items
  const criteria = extractCriteria(items)
  if (criteria.length === 0) {
    throw new Error(
      `concept-contrast visual requires at least one comparison dimension per item beyond 'label' and 'text'. ` +
        `Add shared keys (e.g., {"label":"Option A","text":"Description","dimension1":"value1","dimension2":"value2"}) or use a different visual type.`
    )
  }
  return criteria
}

export function renderConceptContrast(data: ConceptContrastData, theme: SvgTheme, palette: string[]): string {
  const items = data.items
  const criteria = requireVisualCriteria(data)
  const cols = items.length
  const colW = 240
  const rowH = 24
  const headerH = 30
  const rowCount = criteria.length
  const h = headerH + rowCount * rowH + 16
  const w = cols * colW + 60

  const headers = items
    .map(
      (item, i) =>
        `<text x="${60 + i * colW + colW / 2}" y="20" text-anchor="middle" font-size="11" font-weight="600" fill="${palette[i % palette.length]}">${escapeHtml(item.label ?? `Item ${i + 1}`)}</text>`
    )
    .join('\n')

  const rows = criteria
    .map((criterion, ri) => {
      const y = headerH + ri * rowH + 15
      const bgColor = ri % 2 === 1 ? theme.background : ''
      const bgRect = bgColor ? `<rect x="0" y="${y - 12}" width="${w}" height="${rowH}" fill="${theme.axisColor}" opacity="0.04" />` : ''
      const sep = `<line x1="0" y1="${y - 10}" x2="${w}" y2="${y - 10}" stroke="${theme.axisColor}" stroke-opacity="0.2" stroke-width="0.5" />`
      const label = `<text x="0" y="${y}" font-size="10" fill="${theme.labelColor}">${escapeHtml(criterion)}</text>`
      const cells = items
        .map((item, ci) => {
          const val = extractValue(item, criterion)
          const x = 60 + ci * colW + colW / 2
          return `<text x="${x}" y="${y}" text-anchor="middle" font-size="10" fill="${theme.labelColor}">${escapeHtml(val)}</text>`
        })
        .join('\n')
      return `${bgRect}${sep}${label}${cells}`
    })
    .join('\n')

  const headerSep = `<line x1="0" y1="${headerH - 2}" x2="${w}" y2="${headerH - 2}" stroke="${theme.axisColor}" stroke-opacity="0.4" stroke-width="1" />`
  const svg = svgFrame(w, h, theme.background, headers + '\n' + headerSep + '\n' + rows)
  return svg
}
