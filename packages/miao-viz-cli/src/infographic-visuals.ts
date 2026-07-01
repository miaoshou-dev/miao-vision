import type { SvgTheme } from './themes/types'
import type { InfographicVisual, InfographicStyle } from './article-infographic'
import { getTheme } from './themes'
import { escapeHtml, svgFrame, bar, visualCard, getPalette, svgTextBlock } from './infographic-visual-primitives'

function articleStyleToTheme(style: InfographicStyle): SvgTheme {
  const map: Record<string, string> = { editorial: 'editorial', executive: 'minimal', minimal: 'minimal' }
  return getTheme(map[style] ?? 'default').svg
}

export function renderSectionVisual(visual: InfographicVisual, style: InfographicStyle): string {
  const theme = articleStyleToTheme(style)
  const palette = getPalette(theme)

  switch (visual.type) {
    case 'kpi-strip':
      return renderKpiStrip(visual, theme, palette)
    case 'metric-bars':
      return renderMetricBars(visual, theme, palette)
    case 'process-flow':
      return renderProcessFlow(visual, theme, palette)
    case 'concept-contrast':
      return renderConceptContrast(visual, theme, palette)
    case 'timeline-path':
      return renderTimelinePath(visual, theme, palette)
    case 'part-to-whole':
      return renderPartToWhole(visual, theme, palette)
    case 'before-after':
      return renderBeforeAfter(visual, theme, palette)
    case 'tradeoff-matrix':
      return renderTradeoffMatrix(visual, theme, palette)
    case 'ranked-list-chart':
      return renderRankedListChart(visual, theme, palette)
    case 'system-diagram':
      return renderSystemDiagram(visual, theme, palette)
    case 'callout-diagram':
      return renderCalloutDiagram(visual, theme, palette)
    case 'icon-cluster':
      return renderIconCluster(visual, theme, palette)
  }
}

function itemLabel(item: Record<string, unknown>, fallback: string): string {
  return typeof item.label === 'string' ? item.label : fallback
}

function itemValue(item: Record<string, unknown>): number {
  const v = item.value
  return typeof v === 'number' ? v : typeof v === 'string' ? Number.parseFloat(v) || 0 : 0
}

function itemText(item: Record<string, unknown>, fallback: string = ''): string {
  return typeof item.text === 'string' ? item.text : fallback
}

/* ── kpi-strip ────────────────────────────────────────────── */

function renderKpiStrip(visual: InfographicVisual, theme: SvgTheme, palette: string[]): string {
  const items = (visual.data.items as Record<string, unknown>[]) ?? []
  const parts = items.map((item, i) => {
    const val = escapeHtml(itemValue(item).toLocaleString())
    const label = escapeHtml(itemLabel(item, ''))
    const unit = typeof item.unit === 'string' ? ` <span class="mv-visual-unit">${escapeHtml(item.unit)}</span>` : ''
    const delta = typeof item.delta === 'string' ? ` <span class="mv-visual-delta">${escapeHtml(item.delta)}</span>` : ''
    const color = palette[i % palette.length]
    return `<div class="mv-visual-kpi" style="border-top-color:${color}">
      <strong>${val}${unit}${delta}</strong>
      <span>${label}</span>
    </div>`
  }).join('\n')
  return visualCard('', `<div class="mv-visual-kpi-strip">${parts}</div>`, visual.caption)
}

/* ── metric-bars ──────────────────────────────────────────── */

function renderMetricBars(visual: InfographicVisual, theme: SvgTheme, palette: string[]): string {
  const items = (visual.data.items as Record<string, unknown>[]) ?? []
  const values = items.map(itemValue)
  const max = Math.max(...values, 1)
  const barH = 22
  const rowH = 50
  const labelW = 190
  const valueW = 78
  const barW = 300
  const w = labelW + barW + valueW + 24
  const h = items.length * rowH + 14
  const defs = palette.map((c, i) => `<linearGradient id="mg-${i}" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="${c}"/><stop offset="100%" stop-color="${c}" stop-opacity="0.6"/></linearGradient>`).join('')

  const bars = items.map((item, i) => {
    const y = 10 + i * rowH
    const v = values[i]
    const bw = (v / max) * barW
    const label = itemLabel(item, '')
    const val = escapeHtml(v.toLocaleString())
    const unit = typeof item.unit === 'string' ? ` ${escapeHtml(item.unit)}` : ''
    return `${svgTextBlock({ x: 0, y: y + 13, width: labelW - 12, text: label, fontSize: 11, fill: theme.labelColor, maxLines: 2 })}
      ${bar(labelW, y, bw, barH, `url(#mg-${i % palette.length})`, `${label}: ${val}${unit}`)}
      <text x="${labelW + barW + valueW}" y="${y + 15}" font-size="11" fill="${theme.labelColor}" text-anchor="end">${val}${unit}</text>`
  }).join('\n')

  const svg = svgFrame(w, h, theme.background, `<defs>${defs}</defs>${bars}`)
  return visualCard('', svg, visual.caption)
}

/* ── process-flow ─────────────────────────────────────────── */

function renderProcessFlow(visual: InfographicVisual, theme: SvgTheme, palette: string[]): string {
  const items = (visual.data.items as Record<string, unknown>[]) ?? []
  const nodes = items.map((item, i) => {
    const label = itemLabel(item, `Step ${i + 1}`)
    const text = itemText(item, '')
    const color = palette[i % palette.length]
    return `<article class="mv-visual-process-node" style="--node-color:${color}">
      <div class="mv-visual-process-head">
        <span>${i + 1}</span>
        <strong>${escapeHtml(label)}</strong>
      </div>
      <p>${escapeHtml(text)}</p>
    </article>`
  }).join('\n')

  return visualCard('', `<div class="mv-visual-process-grid">${nodes}</div>`, visual.caption)
}

/* ── concept-contrast ─────────────────────────────────────── */

function requireVisualCriteria(visual: InfographicVisual): string[] {
  const items = (visual.data.items as Record<string, unknown>[]) ?? []
  const criteria = extractCriteria(items)
  if (criteria.length === 0) {
    const example = { label: 'Option A', text: 'Description', dimension1: 'value1', dimension2: 'value2' }
    throw new Error(
      `concept-contrast visual requires at least one comparison dimension per item beyond 'label' and 'text'. ` +
      `Add shared keys (e.g., ${JSON.stringify(example)}) or use a different visual type.`
    )
  }
  return criteria
}

function renderConceptContrast(visual: InfographicVisual, theme: SvgTheme, palette: string[]): string {
  const items = (visual.data.items as Record<string, unknown>[]) ?? []
  const criteria = requireVisualCriteria(visual)
  const cols = items.length
  const colW = 240
  const rowH = 24
  const headerH = 30
  const rowCount = criteria.length
  const h = headerH + rowCount * rowH + 16
  const w = cols * colW + 60

  const headers = items.map((item, i) =>
    `<text x="${60 + i * colW + colW / 2}" y="20" text-anchor="middle" font-size="11" font-weight="600" fill="${palette[i % palette.length]}">${escapeHtml(itemLabel(item, `Item ${i + 1}`))}</text>`
  ).join('\n')

  const rows = criteria.map((criterion, ri) => {
    const y = headerH + ri * rowH + 15
    const label = `<text x="0" y="${y}" font-size="10" fill="${theme.labelColor}">${escapeHtml(criterion)}</text>`
    const cells = items.map((item, ci) => {
      const val = extractValue(item, criterion)
      const x = 60 + ci * colW + colW / 2
      return `<text x="${x}" y="${y}" text-anchor="middle" font-size="10" fill="${theme.axisColor}">${escapeHtml(val)}</text>`
    }).join('\n')
    return `${label}${cells}`
  }).join('\n')

  const svg = svgFrame(w, h, theme.background, headers + '\n' + rows)
  return visualCard('', svg, visual.caption)
}

function extractCriteria(items: Record<string, unknown>[]): string[] {
  const keys = new Set<string>()
  for (const item of items) {
    for (const key of Object.keys(item)) {
      if (key !== 'label' && key !== 'text') keys.add(key)
    }
  }
  return Array.from(keys).slice(0, 6)
}

function extractValue(item: Record<string, unknown>, key: string): string {
  const v = item[key]
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  if (v === true) return '✓'
  if (v === false) return '✗'
  return ''
}

/* ── timeline-path ────────────────────────────────────────── */

function renderTimelinePath(visual: InfographicVisual, theme: SvgTheme, palette: string[]): string {
  const items = (visual.data.items as Record<string, unknown>[]) ?? []
  const dotR = 6
  const rowH = 56
  const h = items.length * rowH + 30
  const lineX = 30

  let defs = `<marker id="tl-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="${theme.axisColor}"/></marker>`

  const nodes = items.map((item, i) => {
    const y = 15 + i * rowH
    const label = escapeHtml(itemLabel(item, ''))
    const text = escapeHtml(itemText(item, ''))
    const color = palette[i % palette.length]
    const line = i < items.length - 1 ? `<line x1="${lineX}" y1="${y + dotR * 2 + 4}" x2="${lineX}" y2="${y + rowH - 4}" stroke="${theme.axisColor}" stroke-width="1.5"/>` : ''
    return `<g>
      <circle cx="${lineX}" cy="${y + dotR}" r="${dotR}" fill="${color}"/>
      ${line}
      ${svgTextBlock({ x: lineX + 18, y: y + 4, width: 320, text: label, fontSize: 12, fontWeight: 600, fill: color, maxLines: 1 })}
      ${svgTextBlock({ x: lineX + 18, y: y + 20, width: 340, text, fontSize: 11, fill: theme.labelColor, maxLines: 2 })}
    </g>`
  }).join('\n')

  const svg = svgFrame(400, h, theme.background, `<defs>${defs}</defs>${nodes}`)
  return visualCard('', svg, visual.caption)
}

/* ── part-to-whole ────────────────────────────────────────── */

function renderPartToWhole(visual: InfographicVisual, theme: SvgTheme, palette: string[]): string {
  const items = (visual.data.items as Record<string, unknown>[]) ?? []
  const values = items.map(itemValue)
  const total = values.reduce((a, b) => a + b, 0) || 1
  const barH = 28
  const gap = 8
  const w = 400
  const h = items.length * (barH + gap) + 40

  const bars = items.map((item, i) => {
    const y = 20 + i * (barH + gap)
    const pct = (values[i] / total) * 100
    const bw = (pct / 100) * (w - 120)
    const color = palette[i % palette.length]
    const label = escapeHtml(itemLabel(item, ''))
    const val = escapeHtml(pct.toFixed(1))
    return `<g>
      <text x="0" y="${y + 18}" font-size="11" fill="${theme.labelColor}">${label}</text>
      ${bar(110, y, bw, barH, color, `${label}: ${val}%`)}
      <text x="${w - 8}" y="${y + 18}" font-size="11" fill="${theme.labelColor}" text-anchor="end" font-weight="600">${val}%</text>
    </g>`
  }).join('\n')

  const svg = svgFrame(w, h, theme.background, bars)
  return visualCard('', svg, visual.caption)
}

/* ── before-after ─────────────────────────────────────────── */

function renderBeforeAfter(visual: InfographicVisual, theme: SvgTheme, palette: string[]): string {
  const before = (visual.data.before as Record<string, unknown>[]) ?? []
  const after = (visual.data.after as Record<string, unknown>[]) ?? []
  const items = (visual.data.items as Record<string, unknown>[]) ?? (before.length > 0 ? before : [])
  const afterItems = after.length > 0 ? after : items

  const rows = Math.max(items.length, afterItems.length)
  const colW = 180
  const rowH = 28
  const h = 50 + rows * rowH
  const w = colW * 2 + 80
  const midX = colW + 40

  const beforeLabel = escapeHtml(visual.data.beforeLabel as string ?? 'Before')
  const afterLabel = escapeHtml(visual.data.afterLabel as string ?? 'After')

  const header = `<text x="${midX / 2}" y="22" text-anchor="middle" font-size="13" font-weight="700" fill="${palette[1]}">${beforeLabel}</text>
    <text x="${midX + colW / 2}" y="22" text-anchor="middle" font-size="13" font-weight="700" fill="${palette[0]}">${afterLabel}</text>
    <line x1="${midX - 40}" y1="30" x2="${midX + 40}" y2="30" stroke="${theme.axisColor}" stroke-width="1"/>
    <text x="${midX}" y="42" text-anchor="middle" font-size="10" fill="${theme.axisColor}">→</text>`

  const rowsSvg = Array.from({ length: rows }, (_, i) => {
    const y = 48 + i * rowH
    const bItem = items[i]
    const aItem = afterItems[i]
    const bVal = bItem ? escapeHtml(String(bItem.value ?? bItem.text ?? '')) : ''
    const aVal = aItem ? escapeHtml(String(aItem.value ?? aItem.text ?? '')) : ''
    const bLabel = bItem ? escapeHtml(itemLabel(bItem, '')) : ''
    const aLabel = aItem ? escapeHtml(itemLabel(aItem, '')) : ''
    return `<text x="${midX / 2}" y="${y + 14}" text-anchor="middle" font-size="11" fill="${theme.labelColor}">${bLabel}${bVal ? ` ${bVal}` : ''}</text>
      <text x="${midX + colW / 2}" y="${y + 14}" text-anchor="middle" font-size="11" fill="${theme.labelColor}">${aLabel}${aVal ? ` ${aVal}` : ''}</text>`
  }).join('\n')

  const svg = svgFrame(w, h, theme.background, header + '\n' + rowsSvg)
  return visualCard('', svg, visual.caption)
}

/* ── tradeoff-matrix ──────────────────────────────────────── */

function renderTradeoffMatrix(visual: InfographicVisual, theme: SvgTheme, palette: string[]): string {
  const items = (visual.data.items as Record<string, unknown>[]) ?? []
  const cellW = 170
  const cellH = 70
  const gap = 8
  const w = cellW * 2 + gap + 80
  const h = cellH * 2 + gap + 80

  const xLabel = escapeHtml(visual.data.xLabel as string ?? 'Low → High')
  const yLabel = escapeHtml(visual.data.yLabel as string ?? 'Low → High')

  const quads = [
    { col: 0, row: 0, color: palette[3], label: 'Avoid', opacity: '0.08' },
    { col: 1, row: 0, color: palette[1], label: 'Investigate', opacity: '0.08' },
    { col: 0, row: 1, color: palette[1], label: 'Monitor', opacity: '0.08' },
    { col: 1, row: 1, color: palette[0], label: 'Priority', opacity: '0.12' }
  ]

  const quadrants = quads.map((q, i) => {
    const px = 50 + q.col * (cellW + gap)
    const py = 50 + q.row * (cellH + gap)
    const item = items[i]
    const text = item ? escapeHtml(itemText(item, '')) : ''
    const detail = item && typeof (item as Record<string, unknown>).detail === 'string'
      ? escapeHtml((item as Record<string, unknown>).detail as string) : ''
    const itemTitle = item ? escapeHtml(itemLabel(item, q.label)) : q.label
    return `<g>
      <rect x="${px}" y="${py}" width="${cellW}" height="${cellH}" rx="4" fill="${q.color}" opacity="${q.opacity}" stroke="${q.color}" stroke-width="1"/>
      <text x="${px + cellW / 2}" y="${py + cellH / 2 - (detail ? 8 : 0)}" text-anchor="middle" font-size="12" font-weight="600" fill="${q.color}">${itemTitle}</text>
      ${text ? `<text x="${px + cellW / 2}" y="${py + cellH / 2 + 10}" text-anchor="middle" font-size="10" fill="${theme.labelColor}">${text}</text>` : ''}
      ${detail ? `<text x="${px + cellW / 2}" y="${py + cellH / 2 + 24}" text-anchor="middle" font-size="9" fill="${theme.labelColor}" opacity="0.7">${detail}</text>` : ''}
    </g>`
  }).join('\n')

  const axes = `<text x="50" y="38" font-size="10" fill="${theme.axisColor}">${yLabel}</text>
    <text x="${50 + cellW + gap - 5}" y="${h - 8}" text-anchor="end" font-size="10" fill="${theme.axisColor}">${xLabel}</text>`

  const svg = svgFrame(w, h, theme.background, axes + '\n' + quadrants)
  return visualCard('', svg, visual.caption)
}

/* ── ranked-list-chart ────────────────────────────────────── */

function renderRankedListChart(visual: InfographicVisual, theme: SvgTheme, palette: string[]): string {
  const items = (visual.data.items as Record<string, unknown>[]) ?? []
  const values = items.map(itemValue)
  const max = Math.max(...values, 1)

  const rows = items.map((item, i) => {
    const v = values[i]
    const pct = Math.max((v / max) * 100, 1)
    const color = palette[i % palette.length]
    const label = itemLabel(item, '')
    const val = escapeHtml(v.toLocaleString())
    const rank = i + 1
    return `<div class="mv-visual-ranked-row">
      <span class="mv-visual-ranked-rank">${rank}</span>
      <p>${escapeHtml(label)}</p>
      <div class="mv-visual-ranked-track"><span style="width:${pct.toFixed(2)}%;background:${color}"></span></div>
      <strong>${val}</strong>
    </div>`
  }).join('\n')

  return visualCard('', `<div class="mv-visual-ranked">${rows}</div>`, visual.caption)
}

/* ── system-diagram ───────────────────────────────────────── */

function renderSystemDiagram(visual: InfographicVisual, theme: SvgTheme, palette: string[]): string {
  const nodes = (visual.data.nodes as Record<string, unknown>[]) ?? []
  const edges = (visual.data.edges as Record<string, unknown>[]) ?? []
  const nodeW = 120
  const nodeH = 40
  const gap = 30
  const pad = 30
  const cols = 3
  const rows = Math.ceil(nodes.length / cols)
  const w = cols * (nodeW + gap) + pad
  const h = rows * (nodeH + gap) + pad + 30

  const defEdges = edges.map((edge, i) => {
    const from = Number(edge.from ?? 0)
    const to = Number(edge.to ?? 1)
    const fx = pad + (from % cols) * (nodeW + gap) + nodeW / 2
    const fy = pad + Math.floor(from / cols) * (nodeH + gap) + nodeH / 2
    const tx = pad + (to % cols) * (nodeW + gap) + nodeW / 2
    const ty = pad + Math.floor(to / cols) * (nodeH + gap) + nodeH / 2
    return `<line x1="${fx}" y1="${fy}" x2="${tx}" y2="${ty}" stroke="${theme.axisColor}" stroke-width="1.5" marker-end="url(#sd-arr)"/>`
  }).join('\n')

  let defs = `<marker id="sd-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="${theme.axisColor}"/></marker>`

  const defNodes = nodes.map((node, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = pad + col * (nodeW + gap)
    const y = pad + row * (nodeH + gap)
    const color = typeof node.color === 'string' ? node.color : palette[i % palette.length]
    const label = escapeHtml(itemLabel(node, `Node ${i + 1}`))
    const zone = typeof node.zone === 'string' ? node.zone : ''
    const zoneLabel = zone ? `<text x="${x + nodeW / 2}" y="${y - 6}" text-anchor="middle" font-size="9" fill="${theme.axisColor}" font-style="italic">${escapeHtml(zone)}</text>` : ''
    return `<g>
      ${zoneLabel}
      <rect x="${x}" y="${y}" width="${nodeW}" height="${nodeH}" rx="4" fill="${color}" opacity="0.12" stroke="${color}" stroke-width="1.5"/>
      <text x="${x + nodeW / 2}" y="${y + nodeH / 2 + 4}" text-anchor="middle" font-size="11" font-weight="600" fill="${color}">${label}</text>
    </g>`
  }).join('\n')

  const svg = svgFrame(w, h, theme.background, `<defs>${defs}</defs>${defEdges}\n${defNodes}`)
  return visualCard('', svg, visual.caption)
}

/* ── callout-diagram ─────────────────────────────────────── */

function renderCalloutDiagram(visual: InfographicVisual, theme: SvgTheme, palette: string[]): string {
  const items = (visual.data.items as Record<string, unknown>[]) ?? []
  const w = 400
  const rowH = 36
  const h = items.length * rowH + 30
  const calloutX = 20
  const lineX = 50
  const textX = 60
  const dotR = 4

  const defs = `<marker id="cd-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="${theme.axisColor}"/></marker>`

  const callouts = items.map((item, i) => {
    const y = 15 + i * rowH
    const color = palette[i % palette.length]
    const label = escapeHtml(itemLabel(item, ''))
    const text = escapeHtml(itemText(item, ''))
    const detail = item.detail ? escapeHtml(String(item.detail)) : ''
    return `<g>
      <circle cx="${calloutX}" cy="${y + 6}" r="${dotR}" fill="${color}"/>
      <line x1="${calloutX + dotR + 2}" y1="${y + 6}" x2="${lineX - 4}" y2="${y + 6}" stroke="${theme.axisColor}" stroke-width="1" marker-end="url(#cd-arr)"/>
      ${svgTextBlock({ x: textX, y: y + 4, width: 320, text: label, fontSize: 12, fontWeight: 600, fill: color, maxLines: 1 })}
      ${svgTextBlock({ x: textX, y: y + 18, width: 320, text: `${text}${detail ? ` - ${detail}` : ''}`, fontSize: 11, fill: theme.labelColor, maxLines: 2 })}
    </g>`
  }).join('\n')

  const svg = svgFrame(w, h, theme.background, `<defs>${defs}</defs>${callouts}`)
  return visualCard('', svg, visual.caption)
}

/* ── icon-cluster ─────────────────────────────────────────── */

function renderIconCluster(visual: InfographicVisual, theme: SvgTheme, palette: string[]): string {
  const items = (visual.data.items as Record<string, unknown>[]) ?? []
  const cols = 3
  const cellW = 110
  const cellH = 80
  const gap = 12
  const rows = Math.ceil(items.length / cols)
  const w = cols * (cellW + gap) + 20
  const h = rows * (cellH + gap) + 20
  const iconR = 18

  const grid = items.map((item, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const cx = 10 + col * (cellW + gap) + cellW / 2
    const cy = 10 + row * (cellH + gap) + 28
    const color = palette[i % palette.length]
    const label = escapeHtml(itemLabel(item, ''))
    const text = escapeHtml(itemText(item, ''))
    const initial = label.charAt(0).toUpperCase()
    return `<g>
      <circle cx="${cx}" cy="${cy}" r="${iconR}" fill="${color}" opacity="0.15" stroke="${color}" stroke-width="1.5"/>
      <text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="16" font-weight="700" fill="${color}">${initial}</text>
      ${svgTextBlock({ x: cx, y: cy + iconR + 14, width: cellW - 10, text: label, fontSize: 11, fontWeight: 600, fill: color, anchor: 'middle', maxLines: 1 })}
      ${svgTextBlock({ x: cx, y: cy + iconR + 30, width: cellW - 10, text, fontSize: 10, fill: theme.labelColor, anchor: 'middle', maxLines: 2 })}
    </g>`
  }).join('\n')

  const svg = svgFrame(w, h, theme.background, grid)
  return visualCard('', svg, visual.caption)
}
