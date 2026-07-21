import type { AgentChartSpec } from './types'
import type { SvgTheme } from './themes/types'
import {
  escapeHtml, svgFrame, markAttrs, numberStyle,
  buildAxis, describeArc, polarToCartesian
} from './svg-renderer-utils'

export function renderBarChart(chart: AgentChartSpec, rows: Record<string, unknown>[], theme: SvgTheme, options: { chartId?: string }): string {
  const xField = chart.encoding?.x?.field ?? ''
  const yField = chart.encoding?.y?.field ?? ''
  const colorField = chart.encoding?.color?.field ?? ''
  const hasSeries = Boolean(colorField)
  const width = numberStyle(chart, 'width', hasSeries ? 900 : 720)
  const height = numberStyle(chart, 'height', hasSeries ? 460 : 420)
  const margin = hasSeries
    ? { top: 24, right: 140, bottom: 88, left: 72 }
    : { top: 24, right: 24, bottom: 48, left: 72 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom
  const values = rows.map(row => Number(row[yField])).filter(Number.isFinite)
  const yMax = Math.max(...values, 1)
  const yMin = 0
  const barGap = 8

  if (!colorField) {
    const barWidth = Math.max(8, (chartWidth - barGap * Math.max(rows.length - 1, 0)) / Math.max(rows.length, 1))
    const bars = rows.map((row, index) => {
      const value = Number(row[yField]) || 0
      const barHeight = (value / yMax) * chartHeight
      const x = margin.left + index * (barWidth + barGap)
      const y = margin.top + chartHeight - barHeight
      const color = theme.palette[index % theme.palette.length]
      const label = String(row[xField] ?? '')
      const tooltip = `${label}: ${value}`
      return `<g>
        <rect ${markAttrs(options.chartId, xField, row[xField], index, tooltip)} x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" rx="3" fill="${color}" />
        <text x="${(x + barWidth / 2).toFixed(1)}" y="${(margin.top + chartHeight + 18).toFixed(1)}" text-anchor="middle" fill="${theme.labelColor}" font-size="11">${escapeHtml(label)}</text>
      </g>`
    }).join('')
    return svgFrame(width, height, theme.background, `
      ${buildAxis(margin, chartWidth, chartHeight, xField, yField, yMin, yMax, theme)}
      ${bars}
    `)
  }

  const colorValues = [...new Set(rows.map(r => String(r[colorField] ?? '')))]
  const xValues = [...new Set(rows.map(r => String(r[xField] ?? '')))]
  const rowMap = new Map<string, number>()
  for (const row of rows) {
    rowMap.set(`${row[xField]}|${row[colorField]}`, Number(row[yField]) || 0)
  }

  const barMode = chart.style?.barMode
  const stackColors = colorValues.map((_, ci) => theme.palette[ci % theme.palette.length])

  if (barMode === 'stacked') {
    const xBarWidth = Math.max(8, (chartWidth - barGap * Math.max(xValues.length - 1, 0)) / Math.max(xValues.length, 1))
    const bars = xValues.map((xVal, xi) => {
      let accumY = 0
      return colorValues.map((cVal, ci) => {
        const raw = rowMap.get(`${xVal}|${cVal}`) ?? 0
        const barHeight = (raw / yMax) * chartHeight
        const x = margin.left + xi * (xBarWidth + barGap)
        const y = margin.top + chartHeight - accumY - barHeight
        const tooltip = `${xVal}, ${cVal}: ${raw}`
        accumY += barHeight
        return `<rect ${markAttrs(options.chartId, xField, xVal, xi * colorValues.length + ci, tooltip)} x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${xBarWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" rx="1" fill="${stackColors[ci]}" />`
      }).join('')
    }).join('')

    const xLabels = xValues.map((val, xi) => {
      const x = margin.left + xi * (xBarWidth + barGap) + xBarWidth / 2
      return renderBarAxisLabel(val, x, margin.top + chartHeight + 34, theme, true)
    }).join('')

    return svgFrame(width, height, theme.background, `
      ${buildAxis(margin, chartWidth, chartHeight, xField, yField, yMin, yMax, theme)}
      ${bars}
      ${xLabels}
      ${renderLegend(width, margin, colorValues, stackColors, theme)}
    `)
  }

  const groupWidth = (chartWidth - barGap * Math.max(xValues.length - 1, 0)) / Math.max(xValues.length, 1)
  const barWidth = Math.max(4, (groupWidth - barGap * Math.max(colorValues.length - 1, 0)) / Math.max(colorValues.length, 1))
  const groupStartX = (groupWidth - (barWidth * colorValues.length + barGap * Math.max(colorValues.length - 1, 0))) / 2
  const xLabels: string[] = []

  const bars = xValues.flatMap((xVal, xi) => {
    const baseX = margin.left + xi * (groupWidth + barGap) + groupStartX
    xLabels.push(renderBarAxisLabel(xVal, baseX + groupWidth / 2 - barGap / 2, margin.top + chartHeight + 34, theme, true))
    return colorValues.map((cVal, ci) => {
      const raw = rowMap.get(`${xVal}|${cVal}`) ?? 0
      const barHeight = (raw / yMax) * chartHeight
      const x = baseX + ci * (barWidth + barGap)
      const y = margin.top + chartHeight - barHeight
      const tooltip = `${xVal}, ${cVal}: ${raw}`
      return `<rect ${markAttrs(options.chartId, xField, xVal, xi * colorValues.length + ci, tooltip)} x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" rx="2" fill="${stackColors[ci]}" />`
    }).join('')
  }).join('')

  return svgFrame(width, height, theme.background, `
    ${buildAxis(margin, chartWidth, chartHeight, xField, yField, yMin, yMax, theme)}
    ${bars}
    ${xLabels.join('')}
    ${renderLegend(width, margin, colorValues, stackColors, theme)}
  `)
}

export function renderLineChart(chart: AgentChartSpec, rows: Record<string, unknown>[], theme: SvgTheme, options: { chartId?: string }): string {
  const xField = chart.encoding?.x?.field ?? ''
  const yField = chart.encoding?.y?.field ?? ''
  const colorField = chart.encoding?.color?.field ?? ''
  const width = numberStyle(chart, 'width', 720)
  const height = numberStyle(chart, 'height', 420)
  const margin = { top: 24, right: 24, bottom: 64, left: 72 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom
  const values = rows.map(row => Number(row[yField])).filter(Number.isFinite)
  const yMax = Math.max(...values, 1)
  const yMin = Math.min(...values, 0)
  const span = Math.max(yMax - yMin, 1)

  if (!colorField) {
    const lineColor = theme.palette[0]
    const points = rows.map((row, index) => {
      const x = margin.left + (index / Math.max(rows.length - 1, 1)) * chartWidth
      const y = margin.top + chartHeight - (((Number(row[yField]) || 0) - yMin) / span) * chartHeight
      return { x, y, label: String(row[xField] ?? ''), value: Number(row[yField]) || 0 }
    })
    const isArea = chart.type === 'area'
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
    const areaFill = isArea ? `<path d="${path} L ${points[points.length - 1].x.toFixed(1)} ${(margin.top + chartHeight).toFixed(1)} L ${points[0].x.toFixed(1)} ${(margin.top + chartHeight).toFixed(1)} Z" fill="${lineColor}" fill-opacity="0.18" />` : ''
    const dots = points.map(p =>
      `<circle ${markAttrs(options.chartId, xField, p.label, 0, `${p.label}: ${p.value}`)} cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${isArea ? 2 : 4}" fill="${lineColor}"><title>${escapeHtml(p.label)}: ${p.value}</title></circle>`
    ).join('')
    const labels = points.map((p, i) => {
      if (i % Math.ceil(points.length / 8) !== 0) return ''
      return `<text x="${p.x.toFixed(1)}" y="${height - 20}" text-anchor="middle" fill="${theme.labelColor}">${escapeHtml(p.label)}</text>`
    }).join('')
    return svgFrame(width, height, theme.background, `
      ${buildAxis(margin, chartWidth, chartHeight, xField, yField, yMin, yMax, theme)}
      ${areaFill}
      <path d="${path}" fill="none" stroke="${lineColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      ${dots}
      ${labels}
    `)
  }

  const colorValues = [...new Set(rows.map(r => String(r[colorField] ?? '')))]
  const xValuesSet = new Set<string>()
  const seriesMap = new Map<string, { label: string; value: number }[]>()
  for (const cv of colorValues) seriesMap.set(cv, [])
  for (const row of rows) {
    const label = String(row[xField] ?? '')
    xValuesSet.add(label)
    const cv = String(row[colorField] ?? '')
    const line = seriesMap.get(cv)
    if (line) line.push({ label, value: Number(row[yField]) || 0 })
  }
  const xIndex = [...xValuesSet]

  for (const [, line] of seriesMap) {
    line.sort((a, b) => xIndex.indexOf(a.label) - xIndex.indexOf(b.label))
  }

  const isArea = chart.type === 'area'
  const baseline = margin.top + chartHeight

  if (isArea) {
    const rowMap = new Map<string, number>()
    for (const row of rows) {
      rowMap.set(`${row[xField]}|${row[colorField]}`, Number(row[yField]) || 0)
    }
    const xPositions = xIndex.map((label, i) => ({
      label,
      x: margin.left + (xIndex.length > 1 ? (i / Math.max(xIndex.length - 1, 1)) * chartWidth : chartWidth / 2)
    }))

    const stacks = xPositions.map(xp => {
      let acc = 0
      return colorValues.map(cv => {
        const raw = rowMap.get(`${xp.label}|${cv}`) ?? 0
        const h = raw > 0 ? (raw / span) * chartHeight : 0
        const bottom = acc
        acc += h
        return { top: acc, bottom, h }
      })
    })

    const areas = colorValues.map((_cv, si) => {
      const color = theme.palette[si % theme.palette.length]
      const topPath = stacks.map((s, i) => {
        const y = baseline - s[si].top
        return `${i === 0 ? 'M' : 'L'} ${xPositions[i].x.toFixed(1)} ${y.toFixed(1)}`
      }).join(' ')
      const bottomPath = [...xPositions].reverse().map(xp => {
        const i = xIndex.indexOf(xp.label)
        const y = baseline - stacks[i][si].bottom
        return `L ${xp.x.toFixed(1)} ${y.toFixed(1)}`
      }).join(' ')
      return `<path d="${topPath} ${bottomPath} Z" fill="${color}" fill-opacity="0.25" stroke="${color}" stroke-width="1" />`
    }).join('')

    const labels = xIndex.filter((_, i) => i % Math.ceil(xIndex.length / 8) === 0)
      .map(label => {
        const i = xIndex.indexOf(label)
        return `<text x="${xPositions[i].x.toFixed(1)}" y="${height - 20}" text-anchor="middle" fill="${theme.labelColor}" font-size="11">${escapeHtml(label)}</text>`
      }).join('')

    const legendColors = colorValues.map((_, i) => theme.palette[i % theme.palette.length])
    return svgFrame(width, height, theme.background, `
      ${buildAxis(margin, chartWidth, chartHeight, xField, yField, yMin, yMax, theme)}
      ${areas}
      ${labels}
      ${renderLegend(width, margin, colorValues, legendColors, theme)}
    `)
  }

  const seriesPoints = new Map<string, { x: number; y: number }[]>()
  for (const [cv, line] of seriesMap) {
    const pts = line.map((p, i) => {
      const x = margin.left + (xIndex.length > 1 ? (i / Math.max(xIndex.length - 1, 1)) * chartWidth : chartWidth / 2)
      const y = margin.top + chartHeight - ((p.value - yMin) / span) * chartHeight
      return { x, y }
    })
    seriesPoints.set(cv, pts)
  }

  const paths = [...seriesPoints.entries()].map(([_cv, pts], si) => {
    const color = theme.palette[si % theme.palette.length]
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />`
  }).join('')

  const dots = [...seriesPoints.entries()].map(([cv, pts], si) => {
    const color = theme.palette[si % theme.palette.length]
    return pts.map((p, i) =>
      `<circle ${markAttrs(options.chartId, xField, xIndex[i], si, `${xIndex[i]}, ${cv}: ${seriesMap.get(cv)?.[i].value ?? ''}`)} cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="${color}" />`
    ).join('')
  }).join('')

  const labels = xIndex.filter((_, i) => i % Math.ceil(xIndex.length / 8) === 0)
    .map(label => {
      const i = xIndex.indexOf(label)
      const pts = seriesPoints.get(colorValues[0])
      const x = pts ? pts[i].x : margin.left + (i / Math.max(xIndex.length - 1, 1)) * chartWidth
      return `<text x="${x.toFixed(1)}" y="${height - 20}" text-anchor="middle" fill="${theme.labelColor}" font-size="11">${escapeHtml(label)}</text>`
    }).join('')

  const legendColors = colorValues.map((_, i) => theme.palette[i % theme.palette.length])
  return svgFrame(width, height, theme.background, `
    ${buildAxis(margin, chartWidth, chartHeight, xField, yField, yMin, yMax, theme)}
    ${paths}
    ${dots}
    ${labels}
    ${renderLegend(width, margin, colorValues, legendColors, theme)}
  `)
}

export function renderPieChart(chart: AgentChartSpec, rows: Record<string, unknown>[], theme: SvgTheme, options: { chartId?: string }): string {
  const labelField = chart.encoding?.label?.field ?? ''
  const valueField = chart.encoding?.value?.field ?? ''
  const width = numberStyle(chart, 'width', 720)
  const height = numberStyle(chart, 'height', 420)
  const cx = width / 2 - 80
  const cy = height / 2
  const outerR = Math.min(width, height) * 0.34
  const innerR = (typeof chart.style?.innerRadius === 'number' ? chart.style.innerRadius : 0) * outerR
  const values = rows.map(row => Math.max(0, Number(row[valueField]) || 0))
  const total = values.reduce((sum, value) => sum + value, 0) || 1
  let angle = -Math.PI / 2

  const slices = rows.map((row, index) => {
    const value = values[index]
    const nextAngle = angle + (value / total) * Math.PI * 2
    const path = innerR > 0
      ? describeDonutArc(cx, cy, innerR, outerR, angle, nextAngle)
      : describeArc(cx, cy, outerR, angle, nextAngle)
    const color = theme.palette[index % theme.palette.length]
    const label = String(row[labelField] ?? '')
    const tooltip = `${label}: ${value}`
    angle = nextAngle
    return `<path ${markAttrs(options.chartId, labelField, row[labelField], index, tooltip)} d="${path}" fill="${color}" stroke="${theme.background}" stroke-width="2" />`
  }).join('')

  const legend = rows.map((row, index) => {
    const y = 72 + index * 24
    return `<g>
      <rect x="${width - 210}" y="${y - 10}" width="10" height="10" fill="${theme.palette[index % theme.palette.length]}" />
      <text x="${width - 192}" y="${y}" fill="${theme.labelColor}" font-size="12">${escapeHtml(String(row[labelField] ?? ''))}</text>
    </g>`
  }).join('')

  return svgFrame(width, height, theme.background, `${slices}${legend}`)
}

export function renderLegend(
  svgWidth: number,
  margin: { top: number; right?: number },
  colorValues: string[],
  colors: string[],
  theme: SvgTheme
): string {
  const hasReservedLegendArea = (margin.right ?? 0) >= 120
  const legendX = hasReservedLegendArea ? svgWidth - (margin.right ?? 0) + 16 : svgWidth - 200
  return colorValues.map((val, i) => {
    const y = margin.top + i * 20
    return `<g>
      <rect x="${legendX}" y="${y - 8}" width="10" height="10" rx="2" fill="${colors[i]}" />
      <text x="${legendX + 16}" y="${y}" fill="${theme.labelColor}" font-size="11">${escapeHtml(val.substring(0, 16))}</text>
    </g>`
  }).join('')
}

function renderBarAxisLabel(value: string, x: number, y: number, theme: SvgTheme, rotate = false): string {
  const label = truncateAxisLabel(value, rotate ? 18 : 12)
  if (!rotate) {
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" fill="${theme.labelColor}" font-size="11">${escapeHtml(label)}</text>`
  }
  return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="end" transform="rotate(-35 ${x.toFixed(1)} ${y.toFixed(1)})" fill="${theme.labelColor}" font-size="11">${escapeHtml(label)}</text>`
}

function truncateAxisLabel(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value
}

function describeDonutArc(
  cx: number, cy: number, innerR: number, outerR: number,
  startAngle: number, endAngle: number
): string {
  const outerS = polarToCartesian(cx, cy, outerR, startAngle)
  const outerE = polarToCartesian(cx, cy, outerR, endAngle)
  const innerS = polarToCartesian(cx, cy, innerR, endAngle)
  const innerE = polarToCartesian(cx, cy, innerR, startAngle)
  const largeArc = endAngle - startAngle <= Math.PI ? '0' : '1'
  return [
    `M ${outerS.x.toFixed(1)} ${outerS.y.toFixed(1)}`,
    `A ${outerR.toFixed(1)} ${outerR.toFixed(1)} 0 ${largeArc} 0 ${outerE.x.toFixed(1)} ${outerE.y.toFixed(1)}`,
    `L ${innerS.x.toFixed(1)} ${innerS.y.toFixed(1)}`,
    `A ${innerR.toFixed(1)} ${innerR.toFixed(1)} 0 ${largeArc} 1 ${innerE.x.toFixed(1)} ${innerE.y.toFixed(1)}`,
    'Z'
  ].join(' ')
}
