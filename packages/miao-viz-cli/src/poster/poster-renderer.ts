import type { AgentChartSpec, AgentPosterSpec, AgentReportSpec, DataProfile } from '../types'
import { prepareChartData } from '../data-transform'
import { renderChartSvg } from '../svg-renderer'
import { escapeHtml, svgFrame } from '../svg-renderer-utils'
import { getPosterTheme, type PosterTheme } from './poster-theme'
import { normalizePosterSlots } from './poster-composition'
import { getPosterRenderMode } from './poster-render-dispatch'
import { normalizePosterTimelineRows } from './poster-timeline-input'

const DEFAULT_WIDTH = 1080
const DEFAULT_HEIGHT = 1350

export function renderPosterHtml(
  spec: AgentReportSpec,
  profile: DataProfile,
  rows: Record<string, unknown>[],
  themeOverride?: string
): string {
  const poster = spec.poster!
  const width = poster.canvas?.width ?? DEFAULT_WIDTH
  const height = poster.canvas?.height ?? DEFAULT_HEIGHT
  const theme = getPosterTheme(poster.theme ?? themeOverride, poster.themeOverride)
  const chart = spec.charts.find(item => item.id === poster.chartId)!
  const secondaryChart = poster.secondaryChartId ? spec.charts.find(item => item.id === poster.secondaryChartId) : undefined
  const chartWidth = secondaryChart ? (width - 146) / 2 : width - 128
  const chartSvg = renderPosterChart(chart, poster, rows, chartWidth, 670, theme)
  const secondaryChartSvg = secondaryChart ? renderPosterChart(secondaryChart, poster, rows, chartWidth, 670, theme) : ''
  const slots = normalizePosterSlots(poster.slots, poster.chartId, poster.composition)
  const density = poster.themeOverride?.density ?? 'balanced'
  const callouts = (poster.callouts ?? []).map(callout => {
    if (callout.type === 'note') return `<p class="poster-note">${escapeHtml(callout.text)}</p>`
    return `<aside class="poster-callout"><strong>${escapeHtml(callout.title)}</strong><span>${escapeHtml(callout.body)}</span></aside>`
  }).join('')
  const title = poster.hero.title || spec.title || 'Miao Vision Poster'
  const slotMarkup = slots.filter(slot => slot.role !== 'hero' && slot.role !== 'footer').map(slot => {
    if (slot.role === 'ranking' && slot.block === 'chart') return secondaryChart
      ? `<section class="poster-chart poster-comparison" aria-label="${escapeHtml(chart.title ?? 'Comparison chart')}"><div>${chartSvg}<h3>${escapeHtml(chart.title ?? 'Measure A')}</h3></div><div>${secondaryChartSvg}<h3>${escapeHtml(secondaryChart.title ?? 'Measure B')}</h3></div></section>`
      : `<section class="poster-chart" aria-label="${escapeHtml(chart.title ?? 'Ranking chart')}">${chartSvg}</section>`
    if (slot.role === 'insight' && slot.block === 'callout') return callouts ? `<section class="poster-callouts">${callouts}</section>` : ''
    if (slot.role === 'primary-visual' && slot.block === 'decorative') return '<div class="poster-primary-visual" aria-hidden="true"></div>'
    return ''
  }).join('')
  return `<!doctype html>
<html lang="${spec.locale ?? 'en'}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(title)}</title>
<style>${buildPosterCss(width, height, theme)}</style></head>
<body><main class="mv-poster poster-density-${density}" data-layout="poster" data-poster-theme="${escapeHtml(poster.theme ?? themeOverride ?? 'editorial-light')}" data-poster-composition="${escapeHtml(poster.composition ?? 'ranked-story')}">
  <header class="poster-hero">
    ${poster.hero.eyebrow ? `<p class="poster-eyebrow">${escapeHtml(poster.hero.eyebrow)}</p>` : ''}
    <h1>${escapeHtml(title)}</h1>
    ${poster.hero.subtitle ? `<p class="poster-subtitle">${escapeHtml(poster.hero.subtitle)}</p>` : ''}
  </header>
  ${slotMarkup}
  <footer class="poster-footer"><span>${escapeHtml(poster.footer.source)}</span>${poster.footer.date ? `<span>${escapeHtml(poster.footer.date)}</span>` : ''}</footer>
</main><script>document.documentElement.dataset.miaoRenderReady='true'</script>
<script type="application/json" id="miao-viz-spec">${jsonScript(spec)}</script>
<script type="application/json" id="miao-viz-profile">${jsonScript(profile)}</script></body></html>`
}

function renderPosterChart(chart: AgentChartSpec, poster: AgentPosterSpec, rows: Record<string, unknown>[], width: number, height: number, theme: PosterTheme): string {
  const mode = getPosterRenderMode(poster)
  if (mode === 'flow') {
    return renderChartSvg(chart, rows, { palette: [theme.accent, theme.ink, theme.muted], background: theme.background, axisColor: theme.grid, labelColor: theme.ink }, { chartId: poster.chartId })
  }
  if (mode === 'share') return renderPosterShareChart(chart, poster, rows, width, height, theme)
  if (mode === 'timeline') return renderPosterTimelineChart(chart, poster, rows, width, height, theme)
  if (mode === 'trend') return renderChartSvg(chart, rows, { palette: [theme.accent, theme.ink, theme.muted], background: theme.background, axisColor: theme.grid, labelColor: theme.ink }, { chartId: poster.chartId })
  if (mode === 'comparison') return renderPosterComparisonChart(chart, poster, rows, width, height, theme)
  if (mode === 'geo-ranking') return renderPosterGeoRankingChart(chart, poster, rows, width, height, theme)
  return renderPosterRankingChart(chart, poster, rows, width, height, theme)
}

function renderPosterTimelineChart(_chart: AgentChartSpec, poster: AgentPosterSpec, rows: Record<string, unknown>[], width: number, height: number, theme: PosterTheme): string {
  const roles = poster.timeline?.roles
  if (!roles) return svgFrame(width, height, theme.background, '')
  const events = normalizePosterTimelineRows(rows, roles).slice(0, poster.chart?.maxItems ?? 10)
  const x = width / 2
  const top = 50
  const gap = events.length > 1 ? (height - 100) / (events.length - 1) : 0
  const path = events.length > 1 ? `<path d="M ${x} ${top} ${events.map((_, i) => `L ${x + (i % 2 ? 150 : -150)} ${top + i * gap} L ${x} ${top + i * gap}`).join(' ')}" fill="none" stroke="${theme.accent}" stroke-width="4" stroke-dasharray="8 8"/>` : ''
  const nodes = events.map((event, index) => {
    const y = top + index * gap
    const side = index % 2 ? 1 : -1
    const anchor = side > 0 ? 'start' : 'end'
    const tx = x + side * 28
    const media = event.mediaPath ? `<text x="${tx}" y="${y + 52}" text-anchor="${anchor}" fill="${theme.muted}" font-size="11">${escapeHtml(event.mediaPath)}</text>` : ''
    return `<g data-timeline-order="${event.order}"><circle cx="${x}" cy="${y}" r="14" fill="${theme.accent}"/><text x="${tx}" y="${y - 12}" text-anchor="${anchor}" fill="${theme.accent}" font-size="13" font-weight="700">${escapeHtml(event.timeLabel)}</text><text x="${tx}" y="${y + 8}" text-anchor="${anchor}" fill="${theme.ink}" font-size="17" font-weight="800">${escapeHtml(event.title)}</text><text x="${tx}" y="${y + 28}" text-anchor="${anchor}" fill="${theme.muted}" font-size="12">${escapeHtml(event.description.slice(0, 42))}</text>${media}</g>`
  }).join('')
  return svgFrame(width, height, theme.background, `${path}${nodes}`)
}

function renderPosterShareChart(chart: AgentChartSpec, poster: AgentPosterSpec, rows: Record<string, unknown>[], width: number, height: number, theme: PosterTheme): string {
  const categoryField = poster.share?.categoryField ?? chart.encoding?.x?.field ?? ''
  const seriesField = poster.share?.seriesField ?? chart.encoding?.color?.field ?? ''
  const valueField = poster.share?.valueField ?? chart.encoding?.y?.field ?? ''
  const groups = new Map<string, Map<string, number>>()
  for (const row of rows) {
    const category = String(row[categoryField] ?? '')
    const series = String(row[seriesField] ?? '')
    const value = Number(row[valueField])
    if (!category || !series || !Number.isFinite(value) || value < 0) continue
    const values = groups.get(category) ?? new Map<string, number>()
    values.set(series, (values.get(series) ?? 0) + value)
    groups.set(category, values)
  }
  const categories = [...groups.keys()].slice(0, poster.chart?.maxItems ?? 10)
  const series = [...new Set(categories.flatMap(category => [...(groups.get(category)?.keys() ?? [])]))]
  const colors = [theme.accent, '#b53d72', '#6e86ad', '#d5664f', '#8a7040', '#7d8595']
  const margin = { top: 54, right: 24, bottom: 44, left: 130 }
  const rowHeight = Math.max(34, Math.min(58, (height - margin.top - margin.bottom) / Math.max(categories.length, 1) - 10))
  const chartWidth = width - margin.left - margin.right
  const bars = categories.map((category, rowIndex) => {
    const values = groups.get(category)!
    const total = [...values.values()].reduce((sum, value) => sum + value, 0)
    let cursor = margin.left
    const segments = series.map((name, index) => {
      const share = total > 0 ? (values.get(name) ?? 0) / total : 0
      const segmentWidth = chartWidth * share
      const x = cursor
      cursor += segmentWidth
      const label = share >= 0.08 ? `<text x="${(x + segmentWidth / 2).toFixed(1)}" y="${(margin.top + rowIndex * (rowHeight + 10) + rowHeight / 2 + 6).toFixed(1)}" text-anchor="middle" fill="#fff" font-size="14" font-weight="700">${(share * 100).toFixed(0)}%</text>` : ''
      return `<rect x="${x.toFixed(1)}" y="${(margin.top + rowIndex * (rowHeight + 10)).toFixed(1)}" width="${Math.max(segmentWidth, 0).toFixed(1)}" height="${rowHeight.toFixed(1)}" fill="${colors[index % colors.length]}" data-raw-total="${total}" data-normalized-share="${share.toFixed(6)}"/>${label}`
    }).join('')
    return `<text x="${margin.left - 14}" y="${(margin.top + rowIndex * (rowHeight + 10) + rowHeight / 2 + 5).toFixed(1)}" text-anchor="end" fill="${theme.ink}" font-size="15">${escapeHtml(category)}</text>${segments}`
  }).join('')
  const legend = series.map((name, index) => `<g><rect x="${margin.left + index * 130}" y="18" width="12" height="12" fill="${colors[index % colors.length]}"/><text x="${margin.left + index * 130 + 18}" y="29" fill="${theme.muted}" font-size="13">${escapeHtml(name)}</text></g>`).join('')
  return svgFrame(width, height, theme.background, `${legend}${bars}`)
}

function renderPosterComparisonChart(chart: AgentChartSpec, poster: AgentPosterSpec, rows: Record<string, unknown>[], width: number, height: number, theme: PosterTheme): string {
  return renderPosterRankingChart(chart, poster, rows, width, height, theme)
}

function renderPosterGeoRankingChart(chart: AgentChartSpec, poster: AgentPosterSpec, rows: Record<string, unknown>[], width: number, height: number, theme: PosterTheme): string {
  return renderPosterRankingChart(chart, poster, rows, width, height, theme)
}

function renderPosterRankingChart(chart: AgentChartSpec, poster: AgentPosterSpec, rows: Record<string, unknown>[], width: number, height: number, theme: PosterTheme): string {
  const xField = chart.encoding?.x?.field ?? ''
  const yField = chart.encoding?.y?.field ?? ''
  const prepared = prepareChartData(rows, chart)
    .map((row, index) => ({ label: String(row[xField] ?? ''), value: Number(row[yField]), index }))
    .filter(item => item.label && Number.isFinite(item.value))
    .sort((a, b) => poster.chart?.sort === 'asc' ? a.value - b.value : b.value - a.value)
    .slice(0, poster.chart?.maxItems ?? 10)
  const margin = { top: 44, right: 24, bottom: 82, left: 70 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom
  const configuredDomain = poster.chart?.yDomain
  const min = configuredDomain?.[0] ?? 0
  const max = configuredDomain?.[1] ?? Math.max(...prepared.map(item => item.value), 1)
  const y = (value: number) => margin.top + chartHeight - ((value - min) / Math.max(max - min, 1)) * chartHeight
  const ticks = Array.from({ length: 6 }, (_, index) => min + ((max - min) * index) / 5)
  const grid = ticks.map(value => `<line x1="${margin.left}" y1="${y(value).toFixed(1)}" x2="${(margin.left + chartWidth).toFixed(1)}" y2="${y(value).toFixed(1)}" stroke="${theme.grid}" stroke-width="1"/><text x="${margin.left - 12}" y="${(y(value) + 5).toFixed(1)}" text-anchor="end" fill="${theme.muted}" font-size="14">${formatValue(value, poster.chart?.valueFormat)}</text>`).join('')
  const gap = 12
  const barWidth = Math.max(18, (chartWidth - gap * Math.max(prepared.length - 1, 0)) / Math.max(prepared.length, 1))
  const bars = prepared.map((item, index) => {
    const x = margin.left + index * (barWidth + gap)
    const top = Math.min(y(item.value), y(min))
    const barHeight = Math.max(0, y(min) - top)
    const labelY = Math.max(22, top - 12)
    return `<g><rect x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" rx="2" fill="${theme.accent}"/><text x="${(x + barWidth / 2).toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" fill="${theme.accent}" font-size="18" font-weight="800">${escapeHtml(formatValue(item.value, poster.chart?.valueFormat))}</text><text x="${(x + barWidth / 2).toFixed(1)}" y="${(margin.top + chartHeight + 28).toFixed(1)}" text-anchor="middle" fill="${theme.ink}" font-size="15">${escapeHtml(item.label)}</text></g>`
  }).join('')
  return svgFrame(width, height, theme.background, `${grid}<line x1="${margin.left}" y1="${(margin.top + chartHeight).toFixed(1)}" x2="${margin.left + chartWidth}" y2="${(margin.top + chartHeight).toFixed(1)}" stroke="${theme.ink}" stroke-width="2"/>${bars}`)
}

function formatValue(value: number, format?: string): string {
  if (format?.includes('%')) return `${value.toFixed(format.includes('0.0') ? 1 : 0)}%`
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1)
}

function buildPosterCss(width: number, height: number, theme: PosterTheme): string {
  return `@page{size:${width}px ${height}px;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:${theme.background};color:${theme.ink};font-family:${theme.font}}body{width:${width}px;min-height:${height}px}.mv-poster{width:${width}px;height:${height}px;overflow:hidden;padding:58px 64px 42px;background:${theme.background};display:flex;flex-direction:column}.poster-density-compact{padding:42px 48px 30px}.poster-density-airy{padding:76px 72px 52px}.poster-hero{flex:0 0 auto}.poster-eyebrow{margin:0 0 12px;font-family:${theme.displayFont};font-size:31px;font-style:italic;letter-spacing:.02em}.poster-hero h1{max-width:940px;margin:0;color:${theme.accent};font-family:${theme.displayFont};font-size:59px;line-height:.98;letter-spacing:.01em}.poster-subtitle{max-width:800px;margin:18px 0 0;color:${theme.muted};font-size:20px;line-height:1.4}.poster-callouts{display:flex;gap:18px;align-items:stretch;margin:28px 0 8px;min-height:92px}.poster-density-compact .poster-callouts{margin:18px 0 6px;min-height:76px}.poster-density-airy .poster-callouts{margin:38px 0 12px;min-height:110px}.poster-callout{flex:1;padding:16px 20px;border:1px solid ${theme.grid};border-radius:12px;background:${theme.paper};display:flex;flex-direction:column;justify-content:center}.poster-callout strong{font-size:18px;color:${theme.accent};margin-bottom:6px}.poster-callout span,.poster-note{font-size:16px;line-height:1.4;color:${theme.muted}}.poster-note{flex:1;margin:0;padding:18px 0}.poster-chart{flex:1;display:flex;align-items:center;justify-content:center;margin-top:8px}.poster-chart svg{width:100%;height:auto;display:block}.poster-comparison{gap:18px;align-items:stretch}.poster-comparison>div{flex:1;min-width:0}.poster-comparison h3{margin:4px 0 0;text-align:center;color:${theme.muted};font-size:15px}.poster-footer{display:flex;justify-content:space-between;gap:20px;margin-top:12px;padding-top:14px;border-top:1px solid ${theme.grid};font-size:13px;color:${theme.muted}}`
}

function jsonScript(value: unknown): string { return JSON.stringify(value).replace(/<\//g, '<\\u002f') }
