import type { AgentChartSpec } from './types'
import type { SvgTheme } from './themes/types'
import { escapeHtml, numberStyle, markAttrs, svgFrame, buildAxis } from './svg-renderer-utils'

interface RenderOptions {
  chartId?: string
}

export function renderProgressChart(chart: AgentChartSpec, rows: Record<string, unknown>[]): string {
  const valueField = chart.encoding?.value?.field ?? ''
  const raw = rows[0]?.[valueField]
  const value = Number(raw)
  const max = numberStyle(chart, 'max', 100)
  const pct = Math.min(Math.max((Number.isFinite(value) ? value : 0) / max, 0), 1)
  const display = chart.title ?? valueField
  const barW = 200
  const barH = 22
  const fillW = Math.round(pct * barW)
  const fillColor = pct >= 1 ? '#16a34a' : pct >= 0.5 ? '#2563eb' : '#f97316'
  return `<div class="miao-progress" style="display:flex;align-items:center;gap:10px;max-width:320px">
    <svg width="${barW}" height="${barH}" role="img" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${barW}" height="${barH}" rx="4" fill="#e2e8f0" />
      <rect x="0" y="0" width="${fillW}" height="${barH}" rx="4" fill="${fillColor}" />
    </svg>
    <span style="font-size:14px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap">${escapeHtml(display)} ${(pct * 100).toFixed(0)}%</span>
  </div>`
}

export function renderSparklineChart(chart: AgentChartSpec, rows: Record<string, unknown>[], theme: SvgTheme): string {
  const yField = chart.encoding?.y?.field ?? ''
  const width = numberStyle(chart, 'width', 160)
  const height = numberStyle(chart, 'height', 40)
  const values = rows.map(row => Number(row[yField])).filter(Number.isFinite)
  if (values.length < 2) return `<svg width="${width}" height="${height}" role="img" xmlns="http://www.w3.org/2000/svg"><text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="${theme.labelColor}">—</text></svg>`
  const min = Math.min(...values)
  const span = Math.max(Math.max(...values) - min, 1)
  const points = rows.filter((_, i) => Number.isFinite(Number(rows[i][yField]))).map((row, i) => ({
    x: (i / Math.max(rows.length - 1, 1)) * (width - 2) + 1,
    y: (1 - (Number(row[yField]) - min) / span) * (height - 2) + 1
  }))
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const trend = values[values.length - 1] >= values[0] ? theme.palette[0] : '#dc2626'
  return `<svg width="${width}" height="${height}" role="img" xmlns="http://www.w3.org/2000/svg">
    <path d="${d}" fill="none" stroke="${trend}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
  </svg>`
}

export function renderDeltaChart(chart: AgentChartSpec, rows: Record<string, unknown>[]): string {
  const valueField = chart.encoding?.value?.field ?? ''
  const raw = rows[0]?.[valueField]
  const value = Number.isFinite(Number(raw)) ? Number(raw) : (raw ?? '—')
  const change = chart.style?.change !== undefined ? Number(chart.style.change) : undefined
  const label = chart.title ?? valueField
  const arrow = change === undefined ? '' : (change >= 0 ? '▲' : '▼')
  const arrowColor = change === undefined ? '' : (change >= 0 ? '#16a34a' : '#dc2626')
  const changeStr = change === undefined ? '' : (change >= 0 ? '+' : '') + change.toFixed(1) + '%'
  return `<div class="miao-delta" style="display:flex;flex-direction:column;gap:2px">
    <div style="font-size:12px;opacity:0.56;text-transform:uppercase;letter-spacing:0.06em">${escapeHtml(label)}</div>
    <div style="display:flex;align-items:baseline;gap:8px">
      <span style="font-size:28px;font-weight:500;font-variant-numeric:tabular-nums">${escapeHtml(String(value))}</span>
      ${change !== undefined ? `<span style="font-size:15px;font-weight:600;color:${arrowColor}">${arrow} ${changeStr}</span>` : ''}
    </div>
  </div>`
}

export function renderFunnelChart(chart: AgentChartSpec, rows: Record<string, unknown>[], theme: SvgTheme): string {
  const xField = chart.encoding?.x?.field ?? ''
  const yField = chart.encoding?.y?.field ?? ''
  const width = numberStyle(chart, 'width', 540)
  const height = numberStyle(chart, 'height', 360)
  const margin = { top: 20, right: 20, bottom: 20, left: 120 }
  const chartW = width - margin.left - margin.right
  const chartH = height - margin.top - margin.bottom
  const values = rows.map(row => Number(row[yField])).filter(Number.isFinite)
  if (values.length === 0) return ''
  const maxV = Math.max(...values, 1)
  const barH = Math.max(20, chartH / rows.length - 6)
  const bars = rows.map((row, i) => {
    const val = Number(row[yField]) || 0
    const ratio = val / maxV
    const halfW = (chartW / 2) * ratio
    const y = margin.top + i * (barH + 6)
    const nextRatio = i < rows.length - 1 ? (Number(rows[i + 1][yField]) || 0) / maxV : 0
    const nextHalfW = (chartW / 2) * nextRatio
    const cx = margin.left + chartW / 2
    const label = String(row[xField] ?? '')
    const color = theme.palette[i % theme.palette.length]
    const points = [
      `${cx - halfW},${y}`, `${cx + halfW},${y}`,
      `${cx + Math.max(halfW, nextHalfW)},${y + barH}`,
      `${cx - Math.max(halfW, nextHalfW)},${y + barH}`
    ]
    return `<g>
      <polygon points="${points.join(' ')}" fill="${color}" fill-opacity="0.72" stroke="${color}" stroke-width="1" />
      <text x="${cx - halfW - 6}" y="${y + barH / 2}" text-anchor="end" dominant-baseline="middle" fill="${theme.labelColor}" font-size="11">${escapeHtml(label)}</text>
      <text x="${cx + halfW + 6}" y="${y + barH / 2}" text-anchor="start" dominant-baseline="middle" fill="${theme.labelColor}" font-size="11">${val}</text>
    </g>`
  }).join('')
  return svgFrame(width, height, theme.background, bars)
}

export function renderGaugeChart(chart: AgentChartSpec, rows: Record<string, unknown>[]): string {
  const valueField = chart.encoding?.value?.field ?? ''
  const raw = rows[0]?.[valueField]
  const value = Number.isFinite(Number(raw)) ? Number(raw) : 0
  const max = numberStyle(chart, 'max', 100)
  const pct = Math.min(Math.max(value / max, 0), 1)
  const cx = 120; const cy = 100; const r = 70
  const startA = -Math.PI * 0.75; const endA = Math.PI * 0.75; const span = endA - startA
  const needleA = startA + pct * span
  const needleX = cx + Math.cos(needleA) * (r - 12)
  const needleY = cy + Math.sin(needleA) * (r - 12)

  function arcPath(arcCx: number, arcCy: number, arcR: number, a1: number, a2: number): string {
    const s = { x: arcCx + arcR * Math.cos(a1), y: arcCy + arcR * Math.sin(a1) }
    const e = { x: arcCx + arcR * Math.cos(a2), y: arcCy + arcR * Math.sin(a2) }
    const large = a2 - a1 > Math.PI ? 1 : 0
    return `M ${s.x.toFixed(1)} ${s.y.toFixed(1)} A ${arcR} ${arcR} 0 ${large} 1 ${e.x.toFixed(1)} ${e.y.toFixed(1)}`
  }

  const color = pct >= 0.8 ? '#16a34a' : pct >= 0.4 ? '#2563eb' : '#f97316'
  return `<svg width="240" height="140" role="img" xmlns="http://www.w3.org/2000/svg">
    <path d="${arcPath(cx, cy, r, startA, endA)}" fill="none" stroke="#e2e8f0" stroke-width="14" stroke-linecap="round" />
    <path d="${arcPath(cx, cy, r, startA, startA + pct * span)}" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round" />
    <line x1="${cx}" y1="${cy}" x2="${needleX}" y2="${needleY}" stroke="#1a1a19" stroke-width="2.5" stroke-linecap="round" />
    <circle cx="${cx}" cy="${cy}" r="5" fill="#1a1a19" />
    <text x="${cx}" y="${cy + r + 20}" text-anchor="middle" fill="#475569" font-size="18" font-weight="600">${escapeHtml(String(value))}</text>
  </svg>`
}

export function renderBubbleChart(chart: AgentChartSpec, rows: Record<string, unknown>[], theme: SvgTheme, options: RenderOptions): string {
  const xField = chart.encoding?.x?.field ?? ''
  const yField = chart.encoding?.y?.field ?? ''
  const sizeField = chart.encoding?.size?.field ?? ''
  const labelField = chart.encoding?.label?.field ?? ''
  const width = numberStyle(chart, 'width', 540)
  const height = numberStyle(chart, 'height', 400)
  const margin = { top: 24, right: 24, bottom: 48, left: 72 }
  const chartW = width - margin.left - margin.right
  const chartH = height - margin.top - margin.bottom

  const pts = rows.map(row => ({
    x: Number(row[xField]), y: Number(row[yField]), s: Number(row[sizeField]) || 1,
    label: String(row[labelField] ?? '')
  })).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y))
  if (pts.length === 0) return ''

  const xMin = Math.min(...pts.map(p => p.x)); const xMax = Math.max(...pts.map(p => p.x))
  const yMin = Math.min(...pts.map(p => p.y)); const yMax = Math.max(...pts.map(p => p.y))
  const sMin = Math.min(...pts.map(p => p.s)); const sMax = Math.max(...pts.map(p => p.s))
  const xSpan = Math.max(xMax - xMin, 1); const ySpan = Math.max(yMax - yMin, 1)
  const maxR = Math.min(chartW, chartH) / (4 + Math.sqrt(pts.length) * 0.6)

  const circles = pts.map((p, i) => {
    const cx = margin.left + ((p.x - xMin) / xSpan) * chartW
    const cy = margin.top + chartH - ((p.y - yMin) / ySpan) * chartH
    const r = Math.max(4, (sMax > sMin ? ((p.s - sMin) / (sMax - sMin)) : 0.5) * maxR)
    const color = theme.palette[i % theme.palette.length]
    const tooltip = p.label ? `${p.label}: (${p.x}, ${p.y}, size=${p.s})` : `(${p.x}, ${p.y}, size=${p.s})`
    return `<circle ${markAttrs(options.chartId, xField, p.x, i, tooltip)} cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" fill-opacity="0.55" stroke="${color}" stroke-width="1" />`
  }).join('')

  return svgFrame(width, height, theme.background, `
    ${buildAxis(margin, chartW, chartH, xField, yField, yMin, yMax, theme)}
    ${circles}
  `)
}

function computeQuartiles(values: number[]): { min: number; q1: number; median: number; q3: number; max: number } {
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  const q = (k: number) => {
    const idx = k * (n - 1)
    const lo = Math.floor(idx)
    const hi = Math.ceil(idx)
    return lo === hi ? sorted[lo] : sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo])
  }
  return { min: sorted[0], q1: q(0.25), median: q(0.5), q3: q(0.75), max: sorted[n - 1] }
}

export function renderBoxplotChart(chart: AgentChartSpec, rows: Record<string, unknown>[], theme: SvgTheme, options: RenderOptions): string {
  const xField = chart.encoding?.x?.field ?? ''
  const yField = chart.encoding?.y?.field ?? ''
  const width = numberStyle(chart, 'width', 540)
  const height = numberStyle(chart, 'height', 400)
  const margin = { top: 24, right: 24, bottom: 48, left: 72 }
  const chartW = width - margin.left - margin.right
  const chartH = height - margin.top - margin.bottom

  type Group = { label: string; values: number[] }
  const groups: Group[] = xField
    ? rows.reduce<Group[]>((acc, row) => {
        const label = String(row[xField] ?? '—')
        let g = acc.find(g => g.label === label)
        if (!g) { g = { label, values: [] }; acc.push(g) }
        const v = Number(row[yField])
        if (Number.isFinite(v)) g.values.push(v)
        return acc
      }, [])
    : [{ label: yField, values: rows.map(r => Number(r[yField])).filter(Number.isFinite) }]

  if (groups.length === 0) return ''
  const stats = groups.map(g => ({ label: g.label, ...computeQuartiles(g.values) }))
  const globalMin = Math.min(...stats.map(s => s.min))
  const globalMax = Math.max(...stats.map(s => s.max))
  const span = Math.max(globalMax - globalMin, 1)
  const bandW = groups.length > 1 ? Math.min(chartW / groups.length * 0.6, 80) : Math.min(chartW * 0.4, 80)
  const x0 = margin.left

  const boxes = stats.map((s, i) => {
    const x = x0 + (i / Math.max(groups.length - 1, 1)) * chartW - bandW / 2
    const yScale = (v: number) => margin.top + chartH - ((v - globalMin) / span) * chartH
    const yQ1 = yScale(s.q1); const yQ3 = yScale(s.q3); const yMed = yScale(s.median)
    const yMin = yScale(s.min); const yMax = yScale(s.max)
    const bw = bandW * 0.6; const lw = bandW * 0.3
    const color = theme.palette[i % theme.palette.length]
    const tooltip = `${s.label}: min=${s.min}, Q1=${s.q1}, med=${s.median}, Q3=${s.q3}, max=${s.max}`
    return `<g>
      <line x1="${(x + bandW / 2).toFixed(1)}" y1="${yMin.toFixed(1)}" x2="${(x + bandW / 2).toFixed(1)}" y2="${yMax.toFixed(1)}" stroke="${theme.labelColor}" stroke-width="1.2" />
      <line x1="${(x + bandW / 2 - lw / 2).toFixed(1)}" y1="${yMin.toFixed(1)}" x2="${(x + bandW / 2 + lw / 2).toFixed(1)}" y2="${yMin.toFixed(1)}" stroke="${theme.labelColor}" stroke-width="1.2" />
      <line x1="${(x + bandW / 2 - lw / 2).toFixed(1)}" y1="${yMax.toFixed(1)}" x2="${(x + bandW / 2 + lw / 2).toFixed(1)}" y2="${yMax.toFixed(1)}" stroke="${theme.labelColor}" stroke-width="1.2" />
      <rect ${markAttrs(options.chartId, xField, s.label, i, tooltip)} x="${(x + (bandW - bw) / 2).toFixed(1)}" y="${yQ1.toFixed(1)}" width="${bw.toFixed(1)}" height="${(yQ3 - yQ1).toFixed(1)}" fill="${color}" fill-opacity="0.25" stroke="${color}" stroke-width="1.5" />
      <line x1="${(x + (bandW - bw) / 2).toFixed(1)}" y1="${yMed.toFixed(1)}" x2="${(x + (bandW + bw) / 2).toFixed(1)}" y2="${yMed.toFixed(1)}" stroke="${color}" stroke-width="2" />
      ${groups.length > 1 ? `<text x="${(x + bandW / 2).toFixed(1)}" y="${height - 10}" text-anchor="middle" fill="${theme.labelColor}" font-size="10">${escapeHtml(s.label)}</text>` : ''}
    </g>`
  }).join('')

  return svgFrame(width, height, theme.background, boxes)
}

export function renderWaterfallChart(chart: AgentChartSpec, rows: Record<string, unknown>[], theme: SvgTheme, options: RenderOptions): string {
  const xField = chart.encoding?.x?.field ?? ''
  const yField = chart.encoding?.y?.field ?? ''
  const width = numberStyle(chart, 'width', 600)
  const height = numberStyle(chart, 'height', 420)
  const margin = { top: 24, right: 24, bottom: 56, left: 72 }
  const chartW = width - margin.left - margin.right
  const chartH = height - margin.top - margin.bottom
  const values = rows.map(row => Number(row[yField]) || 0)
  if (values.length === 0) return ''
  const total = values.reduce((s, v) => s + v, 0)
  const yMax = Math.max(...values, total); const yMin = Math.min(0, ...values)
  const ySpan = Math.max(yMax - yMin, 1)
  const barW = Math.max(8, chartW / rows.length * 0.6)
  const gap = chartW / rows.length * 0.4
  let running = 0
  const bars = rows.map((row, i) => {
    const val = values[i]
    const isLast = i === rows.length - 1
    const barH = Math.abs(val) / ySpan * chartH
    const x = margin.left + i * (barW + gap)
    const float = isLast ? 0 : Math.min(running, running + val)
    const yFloat = margin.top + chartH - ((float - yMin) / ySpan) * chartH
    const color = isLast ? theme.palette[0] : (val >= 0 ? '#16a34a' : '#dc2626')
    if (!isLast) running += val
    return `<rect ${markAttrs(options.chartId, xField, row[xField], i, `${String(row[xField] ?? '')}: ${val}`)} x="${x.toFixed(1)}" y="${yFloat.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="${color}" fill-opacity="0.75" />
      <text x="${(x + barW / 2).toFixed(1)}" y="${(yFloat + (val >= 0 ? -6 : barH + 16)).toFixed(1)}" text-anchor="middle" fill="${theme.labelColor}" font-size="10">${val}</text>`
  }).join('')
  return svgFrame(width, height, theme.background, `
    ${buildAxis(margin, (rows.length - 1) * (barW + gap) + barW, chartH, xField, yField, yMin, yMax, theme)}
    ${bars}
  `)
}

export function renderRadarChart(chart: AgentChartSpec, rows: Record<string, unknown>[], theme: SvgTheme): string {
  const xField = chart.encoding?.x?.field ?? ''
  const yField = chart.encoding?.y?.field ?? ''
  const width = numberStyle(chart, 'width', 400)
  const height = numberStyle(chart, 'height', 400)
  const cx = width / 2; const cy = height / 2; const r = Math.min(width, height) * 0.35
  const n = rows.length
  if (n < 3) return ''
  const values = rows.map(row => Number(row[yField])).filter(Number.isFinite)
  if (values.length < 3) return ''
  const maxV = Math.max(...values, 1)
  const angle = (i: number) => -Math.PI / 2 + (i / n) * Math.PI * 2
  const point = (v: number, i: number) => ({
    x: cx + (v / maxV) * r * Math.cos(angle(i)),
    y: cy + (v / maxV) * r * Math.sin(angle(i))
  })
  const polygon = values.map((v, i) => {
    const p = point(v, i); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
  }).join(' ')
  const axes = Array.from({ length: n }, (_, i) => {
    const ep = point(maxV, i); const lp = point(maxV * 1.15, i)
    return `<line x1="${cx}" y1="${cy}" x2="${ep.x.toFixed(1)}" y2="${ep.y.toFixed(1)}" stroke="${theme.axisColor}" stroke-opacity="0.35" stroke-dasharray="3 2" />
      <text x="${lp.x.toFixed(1)}" y="${lp.y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" fill="${theme.labelColor}" font-size="10">${escapeHtml(String(rows[i][xField] ?? ''))}</text>`
  }).join('')
  return svgFrame(width, height, theme.background, `
    ${axes}
    <polygon points="${polygon}" fill="${theme.palette[0]}" fill-opacity="0.2" stroke="${theme.palette[0]}" stroke-width="2" />
    ${values.map((v, i) => {
      const p = point(v, i)
      return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="${theme.palette[0]}" />`
    }).join('')}
  `)
}

export function renderCalendarChart(chart: AgentChartSpec, rows: Record<string, unknown>[], theme: SvgTheme, options: RenderOptions): string {
  const xField = chart.encoding?.x?.field ?? ''
  const valueField = chart.encoding?.value?.field ?? ''
  const width = numberStyle(chart, 'width', 700)
  const height = numberStyle(chart, 'height', 150)
  const cellS = 16; const gap = 2
  const dates = rows.map(r => ({ d: new Date(String(r[xField])), v: Number(r[valueField]) || 0 }))
    .filter(d => Number.isFinite(d.d.getTime()))
  if (dates.length === 0) return ''
  const minV = Math.min(...dates.map(d => d.v)); const maxV = Math.max(...dates.map(d => d.v)); const spanV = Math.max(maxV - minV, 1)
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const grids = dates.map(d => {
    const day = (d.d.getDay() + 6) % 7
    const month = d.d.getMonth()
    // compute a simple week-of-month position; group by week offset
    const firstDay = new Date(d.d.getFullYear(), month, 1)
    const weekOffset = Math.floor((d.d.getDate() - 1 + firstDay.getDay()) / 7)
    const cellX = day * (cellS + gap)
    const cellY = weekOffset * (cellS + gap) + 20
    const opacity = 0.15 + ((d.v - minV) / spanV) * 0.75
    const color = theme.palette[0]
    const tooltip = `${d.d.toISOString().slice(0, 10)}: ${d.v}`
    return `<rect ${markAttrs(options.chartId, xField, d.d.toISOString().slice(0, 10), 0, tooltip)} x="${cellX}" y="${cellY}" width="${cellS}" height="${cellS}" fill="${color}" fill-opacity="${opacity.toFixed(2)}" rx="2" />`
  }).join('')
  const dayHeaders = dayLabels.map((l, i) =>
    `<text x="${i * (cellS + gap) + cellS / 2}" y="12" text-anchor="middle" fill="${theme.labelColor}" font-size="9">${l}</text>`
  ).join('')
  return `<svg width="${width}" height="${height}" role="img" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${width}" height="${height}" fill="${theme.background}" />
    ${dayHeaders}
    ${grids}
  </svg>`
}

export function renderTreemapChart(chart: AgentChartSpec, rows: Record<string, unknown>[]): string {
  const labelField = chart.encoding?.label?.field ?? ''
  const valueField = chart.encoding?.value?.field ?? ''
  const width = numberStyle(chart, 'width', 500)
  const height = numberStyle(chart, 'height', 360)
  const items = rows.map(r => ({ label: String(r[labelField] ?? ''), value: Number(r[valueField]) || 0 })).filter(i => i.value > 0)
  if (items.length === 0) return ''
  const total = items.reduce((s, i) => s + i.value, 0)
  let x = 0; let y = 0; let cw = width; let ch = height; let horizontal = true
  const rects = items.map(i => {
    const area = (i.value / total) * width * height
    if (horizontal) {
      const w = Math.min(cw, Math.ceil(area / ch) || 1)
      const r = { label: i.label, x, y, w, h: ch }
      x += w; cw -= w
      if (cw <= 0) { x = 0; horizontal = false; cw = width; ch -= ch; y += ch }
      return r
    } else {
      const h = Math.min(ch, Math.ceil(area / cw) || 1)
      const r = { label: i.label, x, y, w: cw, h }
      y += h; ch -= h
      if (ch <= 0) { y = 0; horizontal = true; ch = height; cw -= cw; x += cw }
      return r
    }
  })
  return `<svg width="${width}" height="${height}" role="img" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${width}" height="${height}" fill="#f8f9fa" />
    ${rects.map((r, i) => {
      const color = `hsl(${(i * 37 + 210) % 360}, 55%, ${55 + (i % 3) * 8}%)`
      return `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${color}" stroke="#fff" stroke-width="1" />
        ${r.w > 40 && r.h > 20 ? `<text x="${(r.x + r.w / 2)}" y="${(r.y + r.h / 2)}" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="10" font-weight="600">${escapeHtml(r.label)}</text>` : ''}`
    }).join('')}
  </svg>`
}

export function renderPivotChart(chart: AgentChartSpec, rows: Record<string, unknown>[]): string {
  const rowField = chart.encoding?.x?.field ?? ''
  const colField = chart.encoding?.y?.field ?? ''
  const valueField = chart.encoding?.value?.field ?? ''
  if (!rowField || !colField || !valueField) return ''
  const rowVals = [...new Set(rows.map(r => String(r[rowField] ?? '')))]
  const colVals = [...new Set(rows.map(r => String(r[colField] ?? '')))]
  const map = new Map<string, unknown>()
  rows.forEach(r => { map.set(`${r[rowField]}|${r[colField]}`, r[valueField]) })
  const thead = `<thead><tr><th></th>${colVals.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>`
  const tbody = `<tbody>${rowVals.map(rv =>
    `<tr><td><strong>${escapeHtml(rv)}</strong></td>${colVals.map(cv => {
      const v = map.get(`${rv}|${cv}`) ?? '—'
      return `<td>${escapeHtml(String(v))}</td>`
    }).join('')}</tr>`
  ).join('')}</tbody>`
  return `<div class="miao-table-wrap"><table class="miao-table"><caption>${escapeHtml(chart.title ?? 'Pivot')}</caption>${thead}${tbody}</table></div>`
}

export function renderSankeyChart(chart: AgentChartSpec, rows: Record<string, unknown>[], theme: SvgTheme): string {
  const sourceField = chart.encoding?.x?.field ?? ''
  const targetField = chart.encoding?.y?.field ?? ''
  const valueField = chart.encoding?.value?.field ?? ''
  const width = numberStyle(chart, 'width', 600)
  const height = numberStyle(chart, 'height', 360)
  const links = rows.map(r => ({ s: String(r[sourceField] ?? ''), t: String(r[targetField] ?? ''), v: Number(r[valueField]) || 0 }))
    .filter(l => l.s && l.t && l.v > 0)
  if (links.length === 0) return ''
  const nodes = [...new Set([...links.map(l => l.s), ...links.map(l => l.t)])]
  const nodeIdx = new Map(nodes.map((n, i) => [n, i]))
  const maxV = Math.max(...links.map(l => l.v), 1)
  const ny = 20; const stepY = Math.max(20, (height - 40) / Math.max(nodes.length, 1))
  const x1 = 40; const x2 = width - 40
  const paths = links.map(l => {
    const si = nodeIdx.get(l.s)!; const ti = nodeIdx.get(l.t)!
    const y1 = ny + si * stepY; const y2 = ny + ti * stepY
    const sw = Math.max(2, (l.v / maxV) * 36)
    const d = `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`
    return `<path d="${d}" fill="none" stroke="${theme.palette[si % theme.palette.length]}" stroke-width="${sw.toFixed(1)}" stroke-opacity="0.45" />`
  }).join('')
  const labels = nodes.map((n, i) => `<text x="${x1 - 6}" y="${ny + i * stepY + 4}" text-anchor="end" fill="${theme.labelColor}" font-size="10">${escapeHtml(n)}</text>`).join('')
  return svgFrame(width, height, theme.background, `${paths}${labels}`)
}

export function renderInfographicKpi(chart: AgentChartSpec, rows: Record<string, unknown>[]): string {
  const valueField = chart.encoding?.value?.field ?? ''
  const raw = rows[0]?.[valueField]
  const value = Number.isFinite(Number(raw)) ? Number(raw) : (raw ?? '—')
  const label = chart.title ?? valueField
  return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;border:1px solid rgba(128,128,128,0.18);border-radius:8px;background:linear-gradient(135deg,#f8f9fa,#fff);text-align:center">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#6b6a64;margin-bottom:8px">${escapeHtml(label)}</div>
    <div style="font-size:42px;font-weight:600;color:#1a1a19;font-variant-numeric:tabular-nums">${escapeHtml(String(value))}</div>
  </div>`
}

export function renderInfographicList(chart: AgentChartSpec, rows: Record<string, unknown>[]): string {
  const labelField = chart.encoding?.x?.field ?? ''
  const valueField = chart.encoding?.y?.field ?? ''
  const items = rows.slice(0, 20).map((r, i) => ({ rank: i + 1, label: String(r[labelField] ?? ''), value: String(r[valueField] ?? '') }))
  return `<div style="font-family:system-ui,sans-serif">${items.map(i =>
    `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid rgba(128,128,128,0.1)">
      <span style="width:24px;height:24px;border-radius:50%;background:#2563eb;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600">${i.rank}</span>
      <span style="flex:1;font-size:14px">${escapeHtml(i.label)}</span>
      <span style="font-size:14px;font-weight:600;font-variant-numeric:tabular-nums">${escapeHtml(i.value)}</span>
    </div>`).join('')}</div>`
}

export function renderInfographicFlow(chart: AgentChartSpec, rows: Record<string, unknown>[]): string {
  const labelField = chart.encoding?.x?.field ?? ''
  const valueField = chart.encoding?.y?.field ?? ''
  const items = rows.slice(0, 10).map(r => ({ label: String(r[labelField] ?? ''), value: String(r[valueField] ?? '') }))
  return `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:20px">${items.map((i, idx) =>
    `<div style="display:flex;align-items:center;gap:8px">
      <div style="padding:10px 16px;border:1px solid rgba(37,99,235,0.3);border-radius:6px;text-align:center">
        <div style="font-size:13px;font-weight:600">${escapeHtml(i.label)}</div>
        <div style="font-size:11px;color:#6b6a64">${escapeHtml(i.value)}</div>
      </div>
      ${idx < items.length - 1 ? `<span style="color:#2563eb;font-size:18px">→</span>` : ''}
    </div>`).join('')}</div>`
}

export function renderInfographicHierarchy(chart: AgentChartSpec, rows: Record<string, unknown>[]): string {
  const labelField = chart.encoding?.label?.field ?? ''
  const valueField = chart.encoding?.value?.field ?? ''
  const items = rows.slice(0, 30).map(r => ({ label: String(r[labelField] ?? ''), value: String(r[valueField] ?? '') }))
  const mid = Math.ceil(items.length / 2)
  return `<div style="display:grid;grid-template-columns:1fr auto 1fr;gap:8px;padding:20px;align-items:start">
    <div style="display:flex;flex-direction:column;gap:4px">${items.slice(0, mid).map(i =>
      `<div style="padding:8px 14px;border:1px solid rgba(128,128,128,0.18);border-radius:4px;font-size:12px;text-align:right">
        <div style="font-weight:600">${escapeHtml(i.label)}</div>
        <div style="color:#6b6a64">${escapeHtml(i.value)}</div>
      </div>`).join('')}</div>
    <div style="width:2px;height:100%;background:#2563eb;align-self:stretch;margin:0 8px"></div>
    <div style="display:flex;flex-direction:column;gap:4px">${items.slice(mid).map(i =>
      `<div style="padding:8px 14px;border:1px solid rgba(128,128,128,0.18);border-radius:4px;font-size:12px">
        <div style="font-weight:600">${escapeHtml(i.label)}</div>
        <div style="color:#6b6a64">${escapeHtml(i.value)}</div>
      </div>`).join('')}</div>
  </div>`
}

export function renderInfographicComparison(chart: AgentChartSpec, rows: Record<string, unknown>[]): string {
  const labelField = chart.encoding?.x?.field ?? ''
  const valueField = chart.encoding?.y?.field ?? ''
  const items = rows.slice(0, 6).map(r => ({ label: String(r[labelField] ?? ''), value: String(r[valueField] ?? '') }))
  const cols = Math.ceil(items.length / 2)
  return `<div style="display:grid;grid-template-columns:repeat(${Math.min(cols, 3)},1fr);gap:12px;padding:20px">${items.map(i =>
    `<div style="padding:16px;border:1px solid rgba(128,128,128,0.18);border-radius:8px;text-align:center;background:#f8f9fa">
      <div style="font-size:24px;font-weight:600;color:#2563eb;font-variant-numeric:tabular-nums">${escapeHtml(i.value)}</div>
      <div style="font-size:11px;color:#6b6a64;margin-top:4px">${escapeHtml(i.label)}</div>
    </div>`).join('')}</div>`
}