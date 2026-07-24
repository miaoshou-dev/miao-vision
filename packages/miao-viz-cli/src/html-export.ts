import { renderChartSvg, escapeHtml } from './svg-renderer'
import { getTheme } from './themes/index'
import { renderInteractiveAssets, shouldEnableInteractiveRuntime, type InteractiveHtmlOptions } from './interactive-runtime'
import { normalizeInsights } from './insight-utils'
import type { ThemeName, ReportTheme } from './themes/types'
import type { AgentChartSpec, AgentInsight, AgentReportSpec, DataProfile } from './types'

const INSIGHTS_CSS = `
  .report-insights { margin: 0 0 32px; padding: 16px 20px 14px; border-radius: 4px; border: 1px solid rgba(128,128,128,0.18); background: rgba(128,128,128,0.04); }
  .insights-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.45; margin: 0 0 8px; }
  .insights-list { margin: 0; padding: 0 0 0 18px; }
  .insights-list li { margin: 5px 0; font-size: 13px; line-height: 1.55; opacity: 0.75; }
  .insight-warning { color: #8a4b00; }
  .insight-caveat { display: block; margin-top: 2px; font-size: 11px; opacity: 0.58; }
  .miao-render-slot > svg { max-width: 100%; height: auto; }
  @media print {
    @page { margin: 12mm; }
    .chart-block, .chart-card, .miao-facet-svg, h1, h2 { break-inside: avoid; page-break-inside: avoid; }
    .miao-render-slot { overflow: visible; }
    .miao-viz-report button, .miao-view-state, [role="tooltip"], .evidence-drawer { display: none !important; }
    table thead { display: table-header-group; }
    a[href]::after { content: none !important; }
    * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  }
  .report-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 20px; align-items: start; }
  .report-grid > .chart-block { margin: 0; grid-column: span var(--mv-span, 12); }
  .report-grid > .emphasis-primary { border-top: 3px solid var(--mv-brand, #2563eb); }
  .data-quality-badge { display: inline-block; margin: 0 0 8px; padding: 3px 8px; border: 1px solid #c2410c; border-radius: 999px; color: #9a3412; background: #fff7ed; font-size: 10px; font-weight: 700; }
  .layout-narrative { display: block; }
  @media (max-width: 720px) { .report-grid { display: block; } .report-grid > .chart-block { margin-bottom: 18px; } }
`

export function renderStaticHtml(
  spec: AgentReportSpec,
  profile: DataProfile,
  rows: Record<string, unknown>[],
  themeOverride?: ThemeName,
  interactiveOptions: InteractiveHtmlOptions = {}
): string {
  const theme = getTheme(themeOverride ?? spec.theme)
  const title = spec.title ?? 'Miao Vision Report'
  const interactive = shouldEnableInteractiveRuntime(spec, interactiveOptions)

  const header = theme.layout === 'editorial'
    ? renderEditorialHeader(title, spec.description, profile)
    : renderDefaultHeader(title, spec.description, profile)

  const insights = spec.insights && spec.insights.length > 0
    ? renderInsights(spec.insights)
    : ''

  let charts: string
  if (spec.layout) {
    charts = `<div class="report-grid layout-${spec.layout.preset}">${spec.charts.map((chart, index) => {
      const chartId = chartIdFor(chart, index)
      const svg = renderChartSvg(chart, rows, theme.svg, { chartId })
      const span = chart.placement?.span ?? (spec.layout?.preset === 'narrative' ? 12 : 6)
      const emphasis = chart.placement?.emphasis === 'primary' ? ' emphasis-primary' : ''
      return `<section class="chart-block${emphasis}" style="--mv-span:${span}" data-miao-chart="${escapeHtml(chartId)}"><h2>${escapeHtml(chart.title ?? `${chart.type} chart ${index + 1}`)}</h2>${renderQualityBadge(chart, profile)}<div class="miao-render-slot">${svg}</div></section>`
    }).join('\n')}</div>`
  } else if (theme.layout === 'editorial') {
    const sections: string[] = []
    let i = 0
    while (i < spec.charts.length) {
      if (spec.charts[i].type === 'bigvalue') {
        const group: AgentChartSpec[] = []
        while (i < spec.charts.length && spec.charts[i].type === 'bigvalue') {
          group.push(spec.charts[i++])
        }
        sections.push(renderKpiGroup(group, rows, theme))
      } else {
        const chart = spec.charts[i]
        const chartId = chartIdFor(chart, i)
        const svg = renderChartSvg(chart, rows, theme.svg, { chartId })
        sections.push(renderEditorialCard(chart, i, svg, chartId, renderQualityBadge(chart, profile)))
        i++
      }
    }
    charts = sections.join('\n')
  } else {
    charts = spec.charts.map((chart, index) => {
      const chartId = chartIdFor(chart, index)
      const svg = renderChartSvg(chart, rows, theme.svg, { chartId })
      return renderDefaultCard(chart, index, svg, chartId, renderQualityBadge(chart, profile))
    }).join('\n')
  }

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${theme.css}${INSIGHTS_CSS}</style>
</head>
<body>
  <main class="miao-viz-report">
    ${header}
    ${insights}
    ${charts}
  </main>
  <script type="application/json" id="miao-viz-spec">${jsonScript(spec)}</script>
  <script type="application/json" id="miao-viz-profile">${jsonScript(profile)}</script>
  ${interactive ? renderInteractiveAssets(rows, theme.svg) : ''}
  <script>Promise.resolve(document.fonts && document.fonts.ready).then(function(){document.documentElement.dataset.miaoRenderReady='true';});</script>
</body>
</html>`
}

function renderDefaultHeader(title: string, description: string | undefined, profile: DataProfile): string {
  return `<header>
    <p class="eyebrow">Miao Vision</p>
    <h1>${escapeHtml(title)}</h1>
    ${description ? `<p class="description">${escapeHtml(description)}</p>` : ''}
    <p class="meta">${escapeHtml(profile.file)} · ${profile.rows} rows · generated ${new Date().toISOString()}</p>
  </header>`
}

function renderEditorialHeader(title: string, description: string | undefined, profile: DataProfile): string {
  const date = new Date().toISOString().slice(0, 10)
  return `<header class="report-hero">
    <div class="report-eyebrow">
      <span>Miao Vision Report</span>
      <span>Generated ${escapeHtml(date)}</span>
    </div>
    <h1>${escapeHtml(title)}</h1>
    ${description ? `<p class="report-description">${escapeHtml(description)}</p>` : ''}
    <div class="report-tokens">
      <span><b>Rows</b>${profile.rows}</span>
      <span><b>Columns</b>${profile.columns.length}</span>
      <span><b>Source</b>${escapeHtml(profile.file)}</span>
    </div>
  </header>`
}

function renderDefaultCard(chart: AgentChartSpec, index: number, svg: string, chartId: string, qualityBadge = ''): string {
  const chartTitle = chart.title ?? `${chart.type} chart ${index + 1}`
  return `<section class="chart-block" data-miao-chart="${escapeHtml(chartId)}">
    <h2>${escapeHtml(chartTitle)}</h2>
    ${qualityBadge}<div class="miao-render-slot">${svg}</div>
  </section>`
}

function renderKpiGroup(charts: AgentChartSpec[], rows: Record<string, unknown>[], theme: ReportTheme): string {
  const items = charts.map((chart, index) => {
    const chartId = chartIdFor(chart, index)
    return `<div data-miao-chart="${escapeHtml(chartId)}"><div class="miao-render-slot">${renderChartSvg(chart, rows, theme.svg, { chartId })}</div></div>`
  }).join('\n')
  return `<section class="chart-card kpi-group">
    <div class="chart-label">KEY METRICS</div>
    <div class="kpi-grid">${items}</div>
  </section>`
}

function renderEditorialCard(chart: AgentChartSpec, index: number, svg: string, chartId: string, qualityBadge = ''): string {
  const chartTitle = chart.title ?? `${chart.type} chart ${index + 1}`
  const caption = buildCaption(chart)
  return `<section class="chart-card" data-miao-chart="${escapeHtml(chartId)}">
    <div class="chart-label">${escapeHtml(chart.type.toUpperCase())} CHART</div>
    <h2>${escapeHtml(chartTitle)}</h2>
    ${qualityBadge}<div class="miao-render-slot">${svg}</div>
    ${caption ? `<p class="chart-caption">${escapeHtml(caption)}</p>` : ''}
  </section>`
}

function renderQualityBadge(chart: AgentChartSpec, profile: DataProfile): string {
  const threshold = chart.quality?.missingRateThreshold ?? 0.2
  const fields = Object.values(chart.encoding ?? {}).map(encoding => encoding?.field).filter((field): field is string => Boolean(field))
  const risky = profile.columns.filter(column => fields.includes(column.name) && column.nullRate >= threshold)
  return risky.length ? `<span class="data-quality-badge">DATA QUALITY · ${escapeHtml(risky.map(column => `${column.name} ${(column.nullRate * 100).toFixed(0)}% missing`).join(', '))}</span>` : ''
}

function chartIdFor(chart: AgentChartSpec, index: number): string {
  return chart.id ?? `chart-${index + 1}`
}

function renderInsights(insights: AgentInsight[]): string {
  const items = normalizeInsights(insights).map(insight => {
    const className = insight.severity === 'warning' ? ' class="insight-warning"' : ''
    const caveat = insight.caveat
      ? `<span class="insight-caveat">${escapeHtml(insight.caveat)}</span>`
      : ''
    return `<li${className}>${escapeHtml(insight.text)}${caveat}</li>`
  }).join('\n      ')
  return `<section class="report-insights">
    <p class="insights-label">Key Observations</p>
    <ul class="insights-list">
      ${items}
    </ul>
  </section>`
}

function buildCaption(chart: AgentChartSpec): string {
  const parts: string[] = []
  if (chart.encoding?.x?.field) parts.push(`x: ${chart.encoding.x.field}`)
  if (chart.encoding?.y?.field) parts.push(`y: ${chart.encoding.y.field}`)
  if (chart.encoding?.value?.field) parts.push(`value: ${chart.encoding.value.field}`)

  const transforms = chart.data?.transform ?? []
  const agg = transforms.find(t => t.type === 'aggregate')
  if (agg?.groupBy?.length) parts.push(`grouped by ${agg.groupBy.join(', ')}`)

  const sorted = transforms.find(t => t.type === 'sort')
  if (sorted?.field) parts.push(`sorted by ${sorted.field}${sorted.order ? ` ${sorted.order}` : ''}`)

  const limited = transforms.find(t => t.type === 'limit')
  if (typeof limited?.value === 'number') parts.push(`top ${limited.value}`)

  return parts.join(' · ')
}

function jsonScript(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(/<\//g, '<\\u002f')
}
