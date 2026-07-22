import type { AgentChartSpec } from './types'
import type { SvgTheme } from './themes/types'
import { escapeHtml, markAttrs, numberStyle, renderUnsupported, svgFrame } from './svg-renderer-utils'

interface RenderOptions { chartId?: string }

function numeric(row: Record<string, unknown>, field: string): number | null {
  const value = Number(row[field])
  return Number.isFinite(value) ? value : null
}

export function renderDotChart(chart: AgentChartSpec, rows: Record<string, unknown>[], theme: SvgTheme, options: RenderOptions): string {
  const category = chart.encoding?.x?.field ?? ''
  const value = chart.encoding?.y?.field ?? chart.encoding?.value?.field ?? ''
  const start = chart.encoding?.start?.field ?? ''
  const end = chart.encoding?.end?.field ?? ''
  const variant = chart.variant ?? 'standard'
  const width = numberStyle(chart, 'width', 720)
  const height = numberStyle(chart, 'height', 420)
  const margin = { top: 28, right: 56, bottom: 52, left: 120 }
  const plotW = width - margin.left - margin.right
  const plotH = height - margin.top - margin.bottom
  const fields = variant === 'dumbbell' ? [start, end] : [value]
  const values = rows.flatMap(row => fields.map(field => numeric(row, field))).filter((v): v is number => v !== null)
  if (!category || values.length === 0) return renderUnsupported(chart)
  const min = Math.min(0, ...values)
  const max = Math.max(...values, min + 1)
  const span = Math.max(max - min, 1)
  const x = (v: number) => margin.left + ((v - min) / span) * plotW
  const step = plotH / Math.max(rows.length, 1)
  const marks = rows.slice(0, 30).map((row, index) => {
    const y = margin.top + step * (index + 0.5)
    const label = String(row[category] ?? '—')
    if (variant === 'dumbbell') {
      const a = numeric(row, start); const b = numeric(row, end)
      if (a === null || b === null) return ''
      return `<g ${markAttrs(options.chartId, category, row[category], index, `${label}: ${a} → ${b}`)}>
        <line x1="${x(a)}" y1="${y}" x2="${x(b)}" y2="${y}" stroke="${theme.axisColor}" stroke-width="3" />
        <circle cx="${x(a)}" cy="${y}" r="6" fill="${theme.palette[1] ?? theme.palette[0]}" />
        <circle cx="${x(b)}" cy="${y}" r="6" fill="${theme.palette[0]}" />
        <text x="${margin.left - 8}" y="${y + 4}" text-anchor="end" fill="${theme.labelColor}" font-size="11">${escapeHtml(label)}</text>
      </g>`
    }
    const v = numeric(row, value)
    if (v === null) return ''
    const stem = variant === 'lollipop' ? `<line x1="${x(0)}" y1="${y}" x2="${x(v)}" y2="${y}" stroke="${theme.axisColor}" stroke-width="2" />` : ''
    return `<g ${markAttrs(options.chartId, category, row[category], index, `${label}: ${v}`)}>${stem}
      <circle cx="${x(v)}" cy="${y}" r="6" fill="${theme.palette[0]}" />
      <text x="${margin.left - 8}" y="${y + 4}" text-anchor="end" fill="${theme.labelColor}" font-size="11">${escapeHtml(label)}</text>
    </g>`
  }).join('')
  return svgFrame(width, height, theme.background, `<line x1="${x(0)}" y1="${margin.top}" x2="${x(0)}" y2="${margin.top + plotH}" stroke="${theme.axisColor}" />${marks}`)
}

export function renderBulletChart(chart: AgentChartSpec, rows: Record<string, unknown>[], theme: SvgTheme, options: RenderOptions): string {
  const valueField = chart.encoding?.value?.field ?? ''
  const targetField = chart.encoding?.target?.field ?? ''
  const rangeFields = ['range1', 'range2', 'range3'].map(key => chart.encoding?.[key]?.field).filter((field): field is string => Boolean(field))
  const row = rows[0]
  const value = row ? numeric(row, valueField) : null
  const target = row ? numeric(row, targetField) : null
  if (value === null || target === null) return renderUnsupported(chart)
  const ranges = rangeFields.map(field => numeric(row, field)).filter((v): v is number => v !== null).sort((a, b) => b - a)
  const max = Math.max(value, target, ...ranges, 1)
  const width = numberStyle(chart, 'width', 720); const height = numberStyle(chart, 'height', 170)
  const left = 54; const right = width - 40; const plotW = right - left; const scale = (v: number) => left + Math.max(0, v / max) * plotW
  const rangeColors = ['#e2e8f0', '#cbd5e1', '#94a3b8']
  const bands = ranges.map((range, i) => `<rect x="${left}" y="52" width="${scale(range) - left}" height="48" fill="${rangeColors[i] ?? rangeColors[2]}" />`).join('')
  return svgFrame(width, height, theme.background, `${bands}
    <rect ${markAttrs(options.chartId, valueField, value, 0, `${valueField}: ${value}`)} x="${left}" y="66" width="${Math.max(0, scale(value) - left)}" height="20" fill="${theme.palette[0]}" />
    <line x1="${scale(target)}" y1="45" x2="${scale(target)}" y2="107" stroke="${theme.labelColor}" stroke-width="4" />
    <text x="${left}" y="132" fill="${theme.labelColor}" font-size="12">${escapeHtml(chart.title ?? valueField)}: ${value} / ${target}</text>`)
}

export function renderRangeChart(chart: AgentChartSpec, rows: Record<string, unknown>[], theme: SvgTheme, options: RenderOptions): string {
  const xField = chart.encoding?.x?.field ?? ''
  const lowerField = chart.encoding?.lower?.field ?? ''
  const upperField = chart.encoding?.upper?.field ?? ''
  const points = rows.map((row, index) => ({ row, index, lower: numeric(row, lowerField), upper: numeric(row, upperField) }))
    .filter((p): p is typeof p & { lower: number; upper: number } => p.lower !== null && p.upper !== null && p.lower <= p.upper)
  if (!xField || points.length === 0) return renderUnsupported(chart)
  const width = numberStyle(chart, 'width', 720); const height = numberStyle(chart, 'height', 420)
  const margin = { top: 28, right: 36, bottom: 56, left: 72 }; const plotW = width - margin.left - margin.right; const plotH = height - margin.top - margin.bottom
  const min = Math.min(...points.map(p => p.lower)); const max = Math.max(...points.map(p => p.upper)); const span = Math.max(max - min, 1)
  const x = (i: number) => margin.left + (i / Math.max(points.length - 1, 1)) * plotW
  const y = (v: number) => margin.top + plotH - ((v - min) / span) * plotH
  const upper = points.map((p, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(p.upper)}`).join(' ')
  const lower = [...points].reverse().map((p, reverseIndex) => `L ${x(points.length - 1 - reverseIndex)} ${y(p.lower)}`).join(' ')
  const marks = points.map((p, i) => `<circle ${markAttrs(options.chartId, xField, p.row[xField], p.index, `${String(p.row[xField])}: ${p.lower}–${p.upper}`)} cx="${x(i)}" cy="${y((p.lower + p.upper) / 2)}" r="3" fill="${theme.palette[0]}" />`).join('')
  return svgFrame(width, height, theme.background, `<path d="${upper} ${lower} Z" fill="${theme.palette[0]}" fill-opacity="0.2" stroke="${theme.palette[0]}" stroke-width="1.5" />${marks}`)
}

export function renderDivergingBarChart(chart: AgentChartSpec, rows: Record<string, unknown>[], theme: SvgTheme, options: RenderOptions): string {
  const category = chart.encoding?.x?.field ?? ''; const measure = chart.encoding?.y?.field ?? ''
  const data = rows.map((row, index) => ({ row, index, value: numeric(row, measure) })).filter((item): item is typeof item & { value: number } => item.value !== null)
  if (!category || data.length === 0) return renderUnsupported(chart)
  const width = numberStyle(chart, 'width', 720); const height = numberStyle(chart, 'height', 420)
  const margin = { top: 28, right: 40, bottom: 52, left: 120 }; const plotW = width - margin.left - margin.right; const plotH = height - margin.top - margin.bottom
  const bound = Math.max(...data.map(item => Math.abs(item.value)), 1); const zero = margin.left + plotW / 2; const scale = (v: number) => zero + (v / bound) * plotW / 2
  const step = plotH / data.length; const bars = data.map((item, i) => {
    const end = scale(item.value); const x = Math.min(zero, end); const y = margin.top + i * step + step * 0.16
    return `<g ${markAttrs(options.chartId, category, item.row[category], item.index, `${String(item.row[category])}: ${item.value}`)}><rect x="${x}" y="${y}" width="${Math.abs(end - zero)}" height="${step * 0.68}" fill="${item.value >= 0 ? theme.palette[0] : '#dc2626'}" /><text x="${margin.left - 8}" y="${y + step * 0.43}" text-anchor="end" fill="${theme.labelColor}" font-size="11">${escapeHtml(String(item.row[category] ?? '—'))}</text></g>`
  }).join('')
  return svgFrame(width, height, theme.background, `<line x1="${zero}" y1="${margin.top}" x2="${zero}" y2="${margin.top + plotH}" stroke="${theme.labelColor}" />${bars}`)
}

export function renderHorizontalBarChart(chart: AgentChartSpec, rows: Record<string, unknown>[], theme: SvgTheme, options: RenderOptions): string {
  const category = chart.encoding?.x?.field ?? ''; const measure = chart.encoding?.y?.field ?? ''
  const data = rows.map((row, index) => ({ row, index, value: numeric(row, measure) })).filter((item): item is typeof item & { value: number } => item.value !== null)
  if (!category || data.length === 0) return renderUnsupported(chart)
  const width = numberStyle(chart, 'width', 720); const height = numberStyle(chart, 'height', 420)
  const margin = { top: 28, right: 48, bottom: 44, left: 120 }; const plotW = width - margin.left - margin.right; const plotH = height - margin.top - margin.bottom
  const min = Math.min(0, ...data.map(item => item.value)); const max = Math.max(1, ...data.map(item => item.value)); const span = Math.max(max - min, 1)
  const scale = (value: number) => margin.left + ((value - min) / span) * plotW; const zero = scale(0); const step = plotH / data.length
  const bars = data.map((item, i) => {
    const end = scale(item.value); const y = margin.top + i * step + step * 0.16; const label = String(item.row[category] ?? '—')
    return `<g ${markAttrs(options.chartId, category, item.row[category], item.index, `${label}: ${item.value}`)}><rect x="${Math.min(zero, end)}" y="${y}" width="${Math.abs(end - zero)}" height="${step * 0.68}" rx="3" fill="${theme.palette[i % theme.palette.length]}"/><text x="${margin.left - 8}" y="${y + step * 0.43}" text-anchor="end" fill="${theme.labelColor}" font-size="11">${escapeHtml(label)}</text></g>`
  }).join('')
  return svgFrame(width, height, theme.background, `<line x1="${zero}" y1="${margin.top}" x2="${zero}" y2="${margin.top + plotH}" stroke="${theme.axisColor}"/>${bars}`)
}
