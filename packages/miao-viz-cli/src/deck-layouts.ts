import { prepareChartData } from './data-transform'
import { renderChartSvg, escapeHtml } from './svg-renderer'
import type { AgentChartSpec } from './types'
import type { SvgTheme } from './themes/types'
import type { SlideMetric, SlideSpec } from './deck-types'

// ── Helpers ────────────────────────────────────────────────────────────────

function withSize(chart: AgentChartSpec, width: number, height: number): AgentChartSpec {
  return { ...chart, style: { ...chart.style, width, height } }
}

export function formatMetricValue(num: number, fmt: string): string {
  const hasCurrency = fmt.includes('$')
  const hasPercent = fmt.includes('%')
  const hasThousands = fmt.includes(',')
  const hasSiPrefix = fmt.includes('s')

  const precisionMatch = fmt.match(/\.(\d+)/)
  let precision = precisionMatch ? parseInt(precisionMatch[1], 10) : undefined

  let value = num
  let suffix = ''

  if (hasPercent) {
    value = num < 2 ? num * 100 : num
    suffix = '%'
    if (precision === undefined) precision = 1
  }

  if (hasSiPrefix) {
    const abs = Math.abs(value)
    if (abs >= 1e9) { value /= 1e9; suffix = 'B' + suffix }
    else if (abs >= 1e6) { value /= 1e6; suffix = 'M' + suffix }
    else if (abs >= 1e3) { value /= 1e3; suffix = 'K' + suffix }
    if (precision === undefined) precision = 0
  }

  if (precision === undefined && hasThousands) precision = 0

  const fixed = precision !== undefined ? value.toFixed(precision) : Math.round(value).toString()
  const [intPart, decPart] = fixed.split('.')

  const formattedInt = hasThousands
    ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    : intPart

  const formatted = decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt
  const prefix = hasCurrency ? '$' : ''
  return prefix + formatted + suffix
}

function resolveMetricValue(metric: SlideMetric, rows: Record<string, unknown>[]): string {
  let raw: unknown = metric.value
  if (raw === undefined && metric.data?.transform?.length) {
    const fake: AgentChartSpec = { type: 'bigvalue', encoding: {}, data: { transform: metric.data.transform } }
    const result = prepareChartData(rows, fake)
    raw = result[0] ? Object.values(result[0])[0] : undefined
  }
  const num = Number(raw)
  if (!Number.isFinite(num)) return String(raw ?? '—')
  return formatMetricValue(num, metric.format ?? '')
}

function renderEyebrow(text: string): string {
  return `<div class="slide-eyebrow">${escapeHtml(text)}</div>`
}

function renderBullets(items: string[]): string {
  const lis = items.map(b => `<li>${escapeHtml(b)}</li>`).join('')
  return `<ul class="slide-pts">${lis}</ul>`
}

function renderMetricsRow(metrics: SlideMetric[], rows: Record<string, unknown>[], slideIndex: number): string {
  const items = metrics.map((m, metricIndex) => `
    <div class="slide-metric" data-miao-metric="true" data-slide-index="${slideIndex}" data-metric-index="${metricIndex}">
      <div class="v">${escapeHtml(resolveMetricValue(m, rows))}</div>
      <div class="l">${escapeHtml(m.label)}</div>
    </div>`).join('')
  return `<div class="slide-metrics">${items}</div>`
}

function renderCallout(text: string): string {
  return `<div class="slide-callout">${escapeHtml(text)}</div>`
}

function renderRecommendation(slide: SlideSpec): string {
  if (!slide.recommendation) return ''
  return `<div class="slide-recommendation">${escapeHtml(slide.recommendation.text)}</div>`
}

function renderCaveat(slide: SlideSpec): string {
  if (!slide.caveat) return ''
  return `<div class="slide-caveat">${escapeHtml(slide.caveat)}</div>`
}

function pageFooter(index: number, _total: number, mark?: string): string {
  return `
    <div class="slide-footer-mark">${escapeHtml(mark ?? 'miao-vision')}</div>
    <div class="slide-page-num">${String(index + 1).padStart(2, '0')}</div>`
}

const COVER_DECO = `<svg viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg" style="width:260px;opacity:0.9">
  <circle cx="160" cy="160" r="140" fill="none" stroke="var(--mv-border, #e5e3d8)" stroke-width="1"/>
  <circle cx="160" cy="160" r="100" fill="none" stroke="var(--mv-border, #e5e3d8)" stroke-width="1"/>
  <circle cx="160" cy="160" r="60" fill="var(--mv-surface, #eef2f7)" stroke="var(--mv-brand, #1b365d)" stroke-width="1.2"/>
  <path d="M160 20 A140 140 0 0 1 300 160" fill="none" stroke="var(--mv-brand, #1b365d)" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M300 160 A140 140 0 0 1 160 300" fill="none" stroke="var(--mv-muted, #6b6a64)" stroke-width="1" stroke-linecap="round"/>
  <path d="M160 300 A140 140 0 0 1 20 160" fill="none" stroke="var(--mv-muted, #6b6a64)" stroke-width="1" stroke-linecap="round"/>
  <path d="M20 160 A140 140 0 0 1 160 20" fill="none" stroke="var(--mv-muted, #6b6a64)" stroke-width="1" stroke-linecap="round"/>
</svg>`

// ── Layout renderers ────────────────────────────────────────────────────────

export function renderCoverSlide(slide: SlideSpec, _rows: Record<string, unknown>[], _svg: SvgTheme, index: number, total: number, deckDescription?: string): string {
  const subtitle = slide.claim ?? deckDescription
  return `<div class="slide">
  <div class="slide-cover">
    <div class="slide-cover-left">
      <div class="slide-mark">miao-vision</div>
      <h1>${escapeHtml(slide.title ?? 'Presentation')}</h1>
      ${subtitle ? `<div class="sub">${escapeHtml(subtitle)}</div>` : ''}
      <div class="line"></div>
      <div class="meta">${escapeHtml(slide.eyebrow ?? new Date().toISOString().slice(0, 10))}</div>
    </div>
    <div class="slide-cover-right">${COVER_DECO}</div>
  </div>
  ${renderRecommendation(slide)}
  ${renderCaveat(slide)}
  ${pageFooter(index, total)}
</div>`
}

export function renderTitleOnlySlide(slide: SlideSpec, _rows: Record<string, unknown>[], _svg: SvgTheme, index: number, total: number): string {
  return `<div class="slide slide-title-only">
  ${slide.eyebrow ? renderEyebrow(slide.eyebrow) : ''}
  <div class="slide-title" style="font-size:64px">${escapeHtml(slide.title ?? '')}</div>
  ${slide.claim ? `<div class="slide-claim">${escapeHtml(slide.claim)}</div>` : ''}
  ${renderRecommendation(slide)}
  ${renderCaveat(slide)}
  ${pageFooter(index, total)}
</div>`
}

export function renderTextPointsSlide(slide: SlideSpec, _rows: Record<string, unknown>[], _svg: SvgTheme, index: number, total: number): string {
  return `<div class="slide">
  ${slide.eyebrow ? renderEyebrow(slide.eyebrow) : ''}
  <div class="slide-title">${escapeHtml(slide.title ?? '')}</div>
  ${slide.claim ? `<div class="slide-claim">${escapeHtml(slide.claim)}</div>` : ''}
  ${slide.bullets?.length ? renderBullets(slide.bullets) : ''}
  ${slide.callout ? renderCallout(slide.callout) : ''}
  ${renderRecommendation(slide)}
  ${renderCaveat(slide)}
  ${pageFooter(index, total)}
</div>`
}

export function renderTextChartSlide(slide: SlideSpec, rows: Record<string, unknown>[], svg: SvgTheme, index: number, total: number): string {
  const chart = slide.charts?.[0]
  const chartId = chart?.id ?? `slide-${index}-chart`
  const chartHtml = chart ? renderChartSvg(withSize(chart, 540, 400), rows, svg, { chartId }) : ''
  return `<div class="slide">
  ${slide.eyebrow ? renderEyebrow(slide.eyebrow) : ''}
  <div class="slide-title">${escapeHtml(slide.title ?? '')}</div>
  <div class="slide-body-grid" style="flex:1">
    <div>
      ${slide.annotation ? `<div class="slide-annotation">${escapeHtml(slide.annotation)}</div>` : ''}
      ${slide.bullets?.length ? renderBullets(slide.bullets) : ''}
      ${slide.callout ? renderCallout(slide.callout) : ''}
    </div>
    <div class="slide-chart-full" data-miao-chart="${escapeHtml(chartId)}" data-slide-index="${index}" data-chart-index="0"><div class="miao-render-slot">${chartHtml}</div></div>
  </div>
  ${renderRecommendation(slide)}
  ${renderCaveat(slide)}
  ${pageFooter(index, total)}
</div>`
}

export function renderMetricsChartSlide(slide: SlideSpec, rows: Record<string, unknown>[], svg: SvgTheme, index: number, total: number): string {
  const chart = slide.charts?.[0]
  const chartId = chart?.id ?? `slide-${index}-chart`
  const chartHtml = chart ? renderChartSvg(withSize(chart, 1100, 310), rows, svg, { chartId }) : ''
  return `<div class="slide">
  ${slide.eyebrow ? renderEyebrow(slide.eyebrow) : ''}
  <div class="slide-title" style="margin-bottom:16px">${escapeHtml(slide.title ?? '')}</div>
  ${slide.metrics?.length ? renderMetricsRow(slide.metrics, rows, index) : ''}
  <div class="slide-chart-full" style="flex:1" data-miao-chart="${escapeHtml(chartId)}" data-slide-index="${index}" data-chart-index="0"><div class="miao-render-slot">${chartHtml}</div></div>
  ${renderRecommendation(slide)}
  ${renderCaveat(slide)}
  ${pageFooter(index, total)}
</div>`
}

export function renderChartFullSlide(slide: SlideSpec, rows: Record<string, unknown>[], svg: SvgTheme, index: number, total: number): string {
  const chart = slide.charts?.[0]
  const chartId = chart?.id ?? `slide-${index}-chart`
  const chartHtml = chart ? renderChartSvg(withSize(chart, 1100, 460), rows, svg, { chartId }) : ''
  return `<div class="slide">
  ${slide.eyebrow ? renderEyebrow(slide.eyebrow) : ''}
  <div class="slide-title" style="margin-bottom:16px">${escapeHtml(slide.title ?? '')}</div>
  <div class="slide-chart-full" style="flex:1" data-miao-chart="${escapeHtml(chartId)}" data-slide-index="${index}" data-chart-index="0"><div class="miao-render-slot">${chartHtml}</div></div>
  ${renderRecommendation(slide)}
  ${renderCaveat(slide)}
  ${pageFooter(index, total)}
</div>`
}

export function renderTableFullSlide(slide: SlideSpec, rows: Record<string, unknown>[], svg: SvgTheme, index: number, total: number): string {
  const chart = slide.charts?.[0] ?? { type: 'table' as const, encoding: {} }
  const chartId = chart?.id ?? `slide-${index}-chart`
  const tableHtml = renderChartSvg(chart, rows, svg, { chartId })
  return `<div class="slide">
  ${slide.eyebrow ? renderEyebrow(slide.eyebrow) : ''}
  <div class="slide-title" style="margin-bottom:16px">${escapeHtml(slide.title ?? '')}</div>
  <div style="flex:1;overflow:hidden" data-miao-chart="${escapeHtml(chartId)}" data-slide-index="${index}" data-chart-index="0"><div class="miao-render-slot">${tableHtml}</div></div>
  ${renderRecommendation(slide)}
  ${renderCaveat(slide)}
  ${pageFooter(index, total)}
</div>`
}

export function renderEndingSlide(slide: SlideSpec, _rows: Record<string, unknown>[], _svg: SvgTheme, index: number, total: number): string {
  return `<div class="slide slide-ending">
  <h2>${escapeHtml(slide.title ?? 'Thank you')}</h2>
  <div class="line"></div>
  ${slide.claim ? `<div class="sub">${escapeHtml(slide.claim)}</div>` : ''}
  ${renderRecommendation(slide)}
  ${renderCaveat(slide)}
  ${pageFooter(index, total)}
</div>`
}
