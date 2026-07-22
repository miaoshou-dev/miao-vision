import type { AgentChartAnnotation, AgentChartSpec, AgentReferenceLayer } from './types'
import type { SvgTheme } from './themes/types'
import { escapeHtml, numberStyle } from './svg-renderer-utils'

type BaseRenderer = (chart: AgentChartSpec, rows: Record<string, unknown>[]) => string

function stripOuterSvg(svg: string): string {
  return svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
}

export function renderFacetedChart(chart: AgentChartSpec, rows: Record<string, unknown>[], renderBase: BaseRenderer, theme: SvgTheme): string {
  const facet = chart.facet
  const field = facet?.row?.field ?? facet?.column?.field
  if (!facet || !field) return renderBase({ ...chart, facet: undefined }, rows)
  const values = [...new Set(rows.map(row => String(row[field] ?? '—')))].slice(0, facet.maxPanels ?? 8)
  const columns = facet.row ? 1 : Math.min(values.length, 3)
  const panelW = numberStyle(chart, 'width', 720)
  const panelH = numberStyle(chart, 'height', 420)
  const rowsCount = Math.ceil(values.length / columns)
  const yField = chart.encoding?.y?.field ?? chart.encoding?.value?.field
  const xField = chart.encoding?.x?.field
  const yValues = yField ? rows.map(row => Number(row[yField])).filter(Number.isFinite) : []
  const xValues = xField ? rows.map(row => Number(row[xField])).filter(Number.isFinite) : []
  const sharedDomains = facet.scales !== 'independent' ? {
    ...(yValues.length ? { yDomainMin: Math.min(0, ...yValues), yDomainMax: Math.max(1, ...yValues) } : {}),
    ...(xValues.length === rows.length ? { xDomainMin: Math.min(...xValues), xDomainMax: Math.max(...xValues) } : {})
  } : {}
  const content = values.map((value, index) => {
    const subset = rows.filter(row => String(row[field] ?? '—') === value)
    const child = renderBase({ ...chart, facet: undefined, style: { ...chart.style, ...sharedDomains, width: panelW, height: panelH } }, subset)
    const x = (index % columns) * panelW; const y = Math.floor(index / columns) * (panelH + 28)
    return `<g transform="translate(${x} ${y})"><text x="12" y="18" fill="${theme.labelColor}" font-size="13" font-weight="600">${escapeHtml(value)}</text><g transform="translate(0 24)">${stripOuterSvg(child)}</g></g>`
  }).join('')
  return `<svg class="miao-facet-svg" data-facet-scales="${facet.scales ?? 'shared'}" width="${panelW * columns}" height="${rowsCount * (panelH + 28)}" viewBox="0 0 ${panelW * columns} ${rowsCount * (panelH + 28)}" role="img" xmlns="http://www.w3.org/2000/svg">${content}</svg>`
}

function resolveReferenceValue(reference: AgentReferenceLayer, rows: Record<string, unknown>[], key: 'value' | 'from' | 'to'): number | null {
  const direct = reference[key]
  if (typeof direct === 'number') return direct
  if (!reference.field) return typeof direct === 'string' && Number.isFinite(Number(direct)) ? Number(direct) : null
  const values = rows.map(row => Number(row[reference.field!])).filter(Number.isFinite)
  if (values.length === 0) return null
  if (reference.aggregate === 'sum') return values.reduce((sum, value) => sum + value, 0)
  if (reference.aggregate === 'min') return Math.min(...values)
  if (reference.aggregate === 'max') return Math.max(...values)
  if (reference.aggregate === 'count') return values.length
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function selectAnnotation(annotation: AgentChartAnnotation, rows: Record<string, unknown>[]): Record<string, unknown> | null {
  const selector = annotation.selector
  if (rows.length === 0) return null
  if (selector.op === 'first' || selector.op === 'last') {
    const sorted = selector.orderBy ? [...rows].sort((a, b) => String(a[selector.orderBy!]).localeCompare(String(b[selector.orderBy!]))) : rows
    return selector.op === 'first' ? sorted[0] : sorted[sorted.length - 1]
  }
  if (selector.op === 'max' || selector.op === 'min') return [...rows].sort((a, b) => (Number(a[selector.field]) - Number(b[selector.field])) * (selector.op === 'max' ? -1 : 1))[0]
  if (selector.op === 'value') return rows.find(row => row[selector.field] === selector.value || String(row[selector.field]) === String(selector.value)) ?? null
  if (selector.op === 'threshold') return rows.find(row => {
    const value = Number(row[selector.field]); if (!Number.isFinite(value)) return false
    return selector.comparison === 'gt' ? value > selector.value : selector.comparison === 'gte' ? value >= selector.value : selector.comparison === 'lt' ? value < selector.value : value <= selector.value
  }) ?? null
  if (selector.op !== 'max-change') return null
  if (selector.mode === 'between-fields') return [...rows].sort((a, b) => Math.abs(Number(b[selector.endField]) - Number(b[selector.startField])) - Math.abs(Number(a[selector.endField]) - Number(a[selector.startField])))[0]
  const sorted = [...rows].sort((a, b) => String(a[selector.orderBy]).localeCompare(String(b[selector.orderBy])))
  let best = sorted[1] ?? sorted[0]; let delta = -Infinity
  for (let i = 1; i < sorted.length; i++) { const next = Math.abs(Number(sorted[i][selector.field]) - Number(sorted[i - 1][selector.field])); if (next > delta) { delta = next; best = sorted[i] } }
  return best
}

export function applyChartLayers(svg: string, chart: AgentChartSpec, rows: Record<string, unknown>[], theme: SvgTheme): string {
  if ((!chart.references?.length && !chart.annotations?.length && !chart.quality) || !svg.endsWith('</svg>')) return svg
  const width = numberStyle(chart, 'width', 720); const height = numberStyle(chart, 'height', 420)
  const left = 72; const right = width - 28; const top = 24; const bottom = height - 56
  const yField = chart.encoding?.y?.field ?? chart.encoding?.value?.field ?? ''
  const xField = chart.encoding?.x?.field ?? ''
  const yValues = rows.map(row => Number(row[yField])).filter(Number.isFinite)
  const xValues = rows.map(row => Number(row[xField])).filter(Number.isFinite)
  const references = chart.references ?? []
  const allY = [...yValues, ...references.flatMap(ref => ref.axis === 'y' ? [resolveReferenceValue(ref, rows, 'value'), resolveReferenceValue(ref, rows, 'from'), resolveReferenceValue(ref, rows, 'to')] : []).filter((v): v is number => v !== null)]
  const allX = [...xValues, ...references.flatMap(ref => ref.axis === 'x' ? [resolveReferenceValue(ref, rows, 'value'), resolveReferenceValue(ref, rows, 'from'), resolveReferenceValue(ref, rows, 'to')] : []).filter((v): v is number => v !== null)]
  const configuredYMin = Number(chart.style?.yDomainMin); const configuredYMax = Number(chart.style?.yDomainMax)
  const configuredXMin = Number(chart.style?.xDomainMin); const configuredXMax = Number(chart.style?.xDomainMax)
  const yMin = Number.isFinite(configuredYMin) ? configuredYMin : Math.min(0, ...allY); const yMax = Number.isFinite(configuredYMax) ? configuredYMax : Math.max(1, ...allY)
  const xMin = Number.isFinite(configuredXMin) ? configuredXMin : Math.min(0, ...allX); const xMax = Number.isFinite(configuredXMax) ? configuredXMax : Math.max(1, ...allX)
  const y = (value: number) => bottom - ((value - yMin) / Math.max(yMax - yMin, 1)) * (bottom - top)
  const x = (value: number) => left + ((value - xMin) / Math.max(xMax - xMin, 1)) * (right - left)
  const layerSvg = references.map(reference => {
    const from = resolveReferenceValue(reference, rows, 'from'); const to = resolveReferenceValue(reference, rows, 'to'); const value = resolveReferenceValue(reference, rows, 'value')
    if (reference.type === 'band' && from !== null && to !== null) return reference.axis === 'y'
      ? `<rect x="${left}" y="${y(to)}" width="${right - left}" height="${Math.abs(y(from) - y(to))}" fill="${theme.palette[1] ?? theme.palette[0]}" fill-opacity="0.12"><title>${escapeHtml(reference.label ?? 'Reference band')}</title></rect>`
      : `<rect x="${x(from)}" y="${top}" width="${Math.abs(x(to) - x(from))}" height="${bottom - top}" fill="${theme.palette[1] ?? theme.palette[0]}" fill-opacity="0.12"><title>${escapeHtml(reference.label ?? 'Reference band')}</title></rect>`
    if (value === null) return ''
    return reference.axis === 'y'
      ? `<g><line x1="${left}" y1="${y(value)}" x2="${right}" y2="${y(value)}" stroke="${theme.labelColor}" stroke-dasharray="6 4"/><text x="${right}" y="${y(value) - 5}" text-anchor="end" fill="${theme.labelColor}" font-size="11">${escapeHtml(reference.label ?? String(value))}</text></g>`
      : `<g><line x1="${x(value)}" y1="${top}" x2="${x(value)}" y2="${bottom}" stroke="${theme.labelColor}" stroke-dasharray="6 4"/><text x="${x(value) + 5}" y="${top + 12}" fill="${theme.labelColor}" font-size="11">${escapeHtml(reference.label ?? String(value))}</text></g>`
  }).join('')
  const annotations = [...(chart.annotations ?? [])].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)).slice(0, 5).map((annotation, index) => {
    const row = selectAnnotation(annotation, rows); if (!row) return ''
    const px = xValues.length ? x(Number(row[xField])) : left + 18 + index * 26; const py = yValues.length ? y(Number(row[yField])) : top + 30 + index * 24
    return `<g><circle cx="${px}" cy="${py}" r="5" fill="${theme.palette[0]}" stroke="white" stroke-width="2"/><text x="${px + 8}" y="${Math.max(top + 12, py - 8 - index * 2)}" fill="${theme.labelColor}" font-size="11" font-weight="600">${escapeHtml(annotation.text)}</text></g>`
  }).join('')
  const quality = chart.quality
  let qualityLayer = ''
  if (quality) {
    const low = quality.sampleSizeField ? rows.filter(row => Number(row[quality.sampleSizeField!]) < (quality.lowSampleThreshold ?? 10)).length : 0
    const estimated = quality.estimatedField ? rows.filter(row => Boolean(row[quality.estimatedField!])).length : 0
    const incomplete = quality.incompleteField ? rows.filter(row => Boolean(row[quality.incompleteField!])).length : 0
    const labels = [low ? `${low} low-sample` : '', estimated ? `${estimated} estimated` : '', incomplete ? `${incomplete} incomplete` : ''].filter(Boolean)
    if (labels.length) qualityLayer = `<g class="miao-quality-badge"><rect x="${left}" y="4" width="${Math.min(300, labels.join(' · ').length * 7 + 16)}" height="20" rx="10" fill="#fff7ed" stroke="#c2410c"/><text x="${left + 8}" y="18" fill="#9a3412" font-size="10">⚠ ${escapeHtml(labels.join(' · '))}</text></g>`
  }
  return svg.replace(/<\/svg>\s*$/, `${layerSvg}${annotations}${qualityLayer}</svg>`)
}
