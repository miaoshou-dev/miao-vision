import { renderChartSvg, escapeHtml } from './svg-renderer'
import { getTheme } from './themes/index'
import { renderInteractiveAssets, shouldEnableInteractiveRuntime, type InteractiveHtmlOptions } from './interactive-runtime'
import { normalizeInsights } from './insight-utils'
import { buildEvidenceViewModel, type EvidenceViewModel } from './evidence-view-model'
import type { AnalyzeContext } from './context-schema'
import type { ProvenanceCoverage } from './provenance-validator'
import type { ThemeName, ReportTheme } from './themes/types'
import type { AgentChartSpec, AgentInsight, AgentReportSpec, DataProfile } from './types'
import type { ExposureManifest, ShareSafetyCheck } from './trusted-artifact'
import { renderProjectReportHtml } from './project-report-html'
import { normalizeProjectSnapshot } from './project-snapshot'
import { isAgentError } from './errors'
import { renderPosterHtml } from './poster/poster-renderer'

export interface ReportHtmlOptions extends InteractiveHtmlOptions {
  context?: AnalyzeContext
  coverage?: ProvenanceCoverage
  exposureManifest?: ExposureManifest
  shareSafetyChecks?: ShareSafetyCheck[]
}

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
  .evidence-trigger { margin: 6px 0 0; border: 0; background: transparent; color: var(--mv-brand, #2563eb); font: inherit; font-size: 11px; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
  .evidence-status { margin: 0 0 18px; padding: 9px 12px; border-left: 3px solid #b45309; background: #fffbeb; font-size: 12px; }
  .evidence-drawer[hidden] { display: none; }
  .evidence-drawer { position: fixed; inset: 0; z-index: 999; display: flex; justify-content: flex-end; background: rgba(15,23,42,.38); }
  .evidence-panel { width: min(520px, 100%); height: 100%; overflow: auto; padding: 24px; background: var(--mv-surface, #fff); color: inherit; box-shadow: -12px 0 32px rgba(15,23,42,.18); }
  .evidence-panel-header { display: flex; justify-content: space-between; gap: 16px; align-items: start; }
  .evidence-close { border: 1px solid rgba(128,128,128,.3); border-radius: 4px; padding: 6px 10px; background: transparent; color: inherit; cursor: pointer; }
  .evidence-meta { display: grid; grid-template-columns: 110px 1fr; gap: 8px 12px; margin-top: 18px; font-size: 13px; }
  .evidence-meta dt { opacity: .55; }
  .evidence-meta dd { margin: 0; overflow-wrap: anywhere; }
  .evidence-summary { margin: 18px 0; padding: 14px 16px; border-left: 3px solid var(--mv-brand, #2563eb); background: rgba(37,99,235,.06); }
  .evidence-summary p { margin: 5px 0; line-height: 1.45; }
  .evidence-verified { font-weight: 650; color: #166534; }
  .evidence-technical { margin-top: 18px; font-size: 12px; }
  .evidence-technical summary { cursor: pointer; opacity: .72; }
  .evidence-current { margin-top: 18px; padding: 10px 12px; background: rgba(128,128,128,.08); font-size: 12px; }
  .evidence-appendix { margin-top: 32px; padding-top: 18px; border-top: 1px solid rgba(128,128,128,.25); }
  .evidence-appendix li { margin: 8px 0; font-size: 11px; }
  .layout-narrative { display: block; }
  @media (max-width: 720px) { .report-grid { display: block; } .report-grid > .chart-block { margin-bottom: 18px; } .evidence-drawer { align-items: flex-end; } .evidence-panel { width: 100%; height: min(82vh, 760px); } }
`

export function renderStaticHtml(
  spec: AgentReportSpec,
  profile: DataProfile,
  rows: Record<string, unknown>[],
  themeOverride?: ThemeName,
  interactiveOptions: ReportHtmlOptions = {}
): string {
  const project = interactiveOptions.context?.evidence.find(item => item.recipe?.project)?.recipe?.project
  if (project && spec.charts.some(chart => chart.id === 'project-schedule')) {
    const snapshot = normalizeProjectSnapshot(rows, project.config, project.period, profile.columns.map(column => column.name))
    if (isAgentError(snapshot)) throw new Error(`${snapshot.code}: ${snapshot.message}`)
    return renderProjectReportHtml(snapshot, undefined, [], interactiveOptions.context?.evidence)
  }
  if (spec.layout?.preset === 'poster') {
    return renderPosterHtml(spec, profile, rows, themeOverride)
  }
  const theme = getTheme(themeOverride ?? spec.theme)
  const title = spec.title ?? 'Miao Vision Report'
  const interactive = shouldEnableInteractiveRuntime(spec, interactiveOptions)
  const evidenceModel = buildEvidenceViewModel(spec, interactiveOptions.context, interactiveOptions.coverage)

  const header = theme.layout === 'editorial'
    ? renderEditorialHeader(title, spec.description, profile)
    : renderDefaultHeader(title, spec.description, profile)

  const insights = spec.insights && spec.insights.length > 0
    ? renderInsights(spec.insights, evidenceModel)
    : ''

  let charts: string
  if (spec.layout) {
    charts = `<div class="report-grid layout-${spec.layout.preset}">${spec.charts.map((chart, index) => {
      const chartId = chartIdFor(chart, index)
      const svg = renderChartSvg(chart, rows, theme.svg, { chartId })
      const span = chart.placement?.span ?? (spec.layout?.preset === 'narrative' ? 12 : 6)
      const emphasis = chart.placement?.emphasis === 'primary' ? ' emphasis-primary' : ''
      return `<section class="chart-block${emphasis}" style="--mv-span:${span}" data-miao-chart="${escapeHtml(chartId)}"><h2>${escapeHtml(chart.title ?? `${chart.type} chart ${index + 1}`)}</h2>${renderEvidenceTrigger(evidenceModel, `charts[${index}]`)}${renderQualityBadge(chart, profile)}<div class="miao-render-slot">${svg}</div></section>`
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
        sections.push(renderKpiGroup(group, rows, theme, evidenceModel, i - group.length))
      } else {
        const chart = spec.charts[i]
        const chartId = chartIdFor(chart, i)
        const svg = renderChartSvg(chart, rows, theme.svg, { chartId })
        sections.push(renderEditorialCard(chart, i, svg, chartId, renderQualityBadge(chart, profile), renderEvidenceTrigger(evidenceModel, `charts[${i}]`)))
        i++
      }
    }
    charts = sections.join('\n')
  } else {
    charts = spec.charts.map((chart, index) => {
      const chartId = chartIdFor(chart, index)
      const svg = renderChartSvg(chart, rows, theme.svg, { chartId })
      return renderDefaultCard(chart, index, svg, chartId, renderQualityBadge(chart, profile), renderEvidenceTrigger(evidenceModel, `charts[${index}]`))
    }).join('\n')
  }

  return `<!doctype html>
<html lang="${spec.locale ?? 'en'}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${theme.css}${INSIGHTS_CSS}</style>
</head>
<body>
  <main class="miao-viz-report">
    ${evidenceModel.verified || !interactiveOptions.context ? '' : '<p class="evidence-status" role="status">This preview has not passed complete evidence verification.</p>'}
    ${header}
    ${renderExposureManifest(interactiveOptions.exposureManifest, interactiveOptions.shareSafetyChecks, spec.locale)}
    ${insights}
    ${charts}
    ${renderEvidenceAppendix(evidenceModel)}
  </main>
  ${renderEvidenceDrawer(evidenceModel)}
  <script type="application/json" id="miao-viz-spec">${jsonScript(spec)}</script>
  <script type="application/json" id="miao-viz-profile">${jsonScript(profile)}</script>
  ${interactive ? renderInteractiveAssets(rows, theme.svg) : ''}
  ${evidenceModel.items.length ? evidenceScript(evidenceModel) : ''}
  <script>Promise.resolve(document.fonts && document.fonts.ready).then(function(){document.documentElement.dataset.miaoRenderReady='true';});</script>
</body>
</html>`
}

function renderExposureManifest(manifest: ExposureManifest | undefined, checks: ShareSafetyCheck[] | undefined, locale: AgentReportSpec['locale']): string {
  if (!manifest) return ''
  const zh = locale === 'zh-CN'
  const label = zh ? '嵌入数据详情' : 'Embedded data details'
  const fields = manifest.embeddedFields.map(escapeHtml).join(', ')
  const risks = (checks ?? []).flatMap(check => check.issues).map(item => `<li>${escapeHtml(item.code)}: ${escapeHtml(item.message)}</li>`).join('')
  return `<details class="miao-exposure" data-share-status="${manifest.status}">
    <summary>${label}: ${manifest.status}</summary>
    <dl><dt>${zh ? '策略' : 'Policy'}</dt><dd>${manifest.policy}</dd><dt>${zh ? '行数' : 'Rows'}</dt><dd>${manifest.embeddedRows}</dd><dt>${zh ? '字段' : 'Fields'}</dt><dd>${fields}</dd><dt>${zh ? '数据字节' : 'Data bytes'}</dt><dd>${manifest.embeddedBytes}</dd></dl>
    ${risks ? `<ul>${risks}</ul>` : ''}
  </details>`
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

function renderDefaultCard(chart: AgentChartSpec, index: number, svg: string, chartId: string, qualityBadge = '', evidence = ''): string {
  const chartTitle = chart.title ?? `${chart.type} chart ${index + 1}`
  return `<section class="chart-block" data-miao-chart="${escapeHtml(chartId)}">
    <h2>${escapeHtml(chartTitle)}</h2>
    ${evidence}${qualityBadge}<div class="miao-render-slot">${svg}</div>
  </section>`
}

function renderKpiGroup(
  charts: AgentChartSpec[],
  rows: Record<string, unknown>[],
  theme: ReportTheme,
  evidenceModel: EvidenceViewModel,
  startIndex: number
): string {
  const items = charts.map((chart, index) => {
    const chartId = chartIdFor(chart, index)
    return `<div data-miao-chart="${escapeHtml(chartId)}"><div class="miao-render-slot">${renderChartSvg(chart, rows, theme.svg, { chartId })}</div>${renderEvidenceTrigger(evidenceModel, `charts[${startIndex + index}]`)}</div>`
  }).join('\n')
  return `<section class="chart-card kpi-group">
    <div class="chart-label">KEY METRICS</div>
    <div class="kpi-grid">${items}</div>
  </section>`
}

function renderEditorialCard(chart: AgentChartSpec, index: number, svg: string, chartId: string, qualityBadge = '', evidence = ''): string {
  const chartTitle = chart.title ?? `${chart.type} chart ${index + 1}`
  const caption = buildCaption(chart)
  return `<section class="chart-card" data-miao-chart="${escapeHtml(chartId)}">
    <div class="chart-label">${escapeHtml(chart.type.toUpperCase())} CHART</div>
    <h2>${escapeHtml(chartTitle)}</h2>
    ${evidence}${qualityBadge}<div class="miao-render-slot">${svg}</div>
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

function renderInsights(insights: AgentInsight[], evidenceModel: EvidenceViewModel): string {
  const items = normalizeInsights(insights).map((insight, index) => {
    const className = insight.severity === 'warning' ? ' class="insight-warning"' : ''
    const caveat = insight.caveat
      ? `<span class="insight-caveat">${escapeHtml(insight.caveat)}</span>`
      : ''
    return `<li${className}>${escapeHtml(insight.text)}${caveat}${renderEvidenceTrigger(evidenceModel, `insights[${index}]`)}</li>`
  }).join('\n      ')
  return `<section class="report-insights">
    <p class="insights-label">Key Observations</p>
    <ul class="insights-list">
      ${items}
    </ul>
  </section>`
}

function renderEvidenceTrigger(model: EvidenceViewModel, objectPath: string): string {
  const item = model.items.find(candidate => candidate.objectPath === objectPath)
  if (!item) return ''
  return `<button type="button" class="evidence-trigger" data-evidence-key="${escapeHtml(item.key)}" aria-haspopup="dialog">View evidence</button>`
}

function renderEvidenceDrawer(model: EvidenceViewModel): string {
  if (!model.items.length) return ''
  return `<aside class="evidence-drawer" id="miao-evidence-drawer" role="dialog" aria-modal="true" aria-labelledby="miao-evidence-title" hidden>
    <div class="evidence-panel">
      <div class="evidence-panel-header">
        <div><p class="insights-label">Why you can trust this</p><h2 id="miao-evidence-title">How this result was calculated</h2></div>
        <button type="button" class="evidence-close" aria-label="Close evidence">Close</button>
      </div>
      <div id="miao-evidence-content"></div>
    </div>
  </aside>`
}

function renderEvidenceAppendix(model: EvidenceViewModel): string {
  if (!model.appendix.length) return ''
  const items = model.appendix.map(item =>
    `<li><b>E${item.number} · ${escapeHtml(item.evidenceId)}</b> — ${escapeHtml(item.query)}${item.fields.length ? ` · fields: ${escapeHtml(item.fields.join(', '))}` : ''}${item.sampleSize ? ` · sample: ${item.sampleSize}` : ''}</li>`
  ).join('')
  return `<section class="evidence-appendix"><h2>Evidence Appendix</h2><ol>${items}</ol></section>`
}

function evidenceScript(model: EvidenceViewModel): string {
  return `<script>(function(){
    var items=${jsonScript(Object.fromEntries(model.items.map(item => [item.key, item])))};
    var drawer=document.getElementById('miao-evidence-drawer');
    var content=document.getElementById('miao-evidence-content');
    var previous=null;
    function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
    function row(label,value){if(!value||Array.isArray(value)&&!value.length)return '';return '<dt>'+esc(label)+'</dt><dd>'+esc(Array.isArray(value)?value.join(', '):value)+'</dd>';}
    function openEvidence(key,trigger){
      var item=items[key]; if(!item)return; previous=trigger;
      var view=document.getElementById('miao-view-state');
      var container=trigger.closest('[data-miao-chart]');
      var currentValue=container&&container.querySelector('.miao-bigvalue-number');
      var viewText=view?Array.from(view.children).map(function(node){return node.textContent.trim();}).filter(Boolean).join(' · '):'';
      var current=(currentValue?'Displayed value: '+currentValue.textContent+'. ':'')+
        (view ? viewText+(container?'':' — filter not applied to this published claim.') : 'Published evidence; no active runtime filters.');
      content.innerHTML='<h3>'+esc(item.label)+'</h3><div class="evidence-summary"><p>'+esc(item.explanation)+'</p><p>'+esc(item.scope)+'</p><p class="evidence-verified">'+esc(item.verification)+'</p></div><div class="evidence-current"><b>Current view</b><br>'+esc(current)+'</div><details class="evidence-technical"><summary>Technical details</summary><dl class="evidence-meta">'+row('Evidence ID',item.evidenceIds)+row('Original query',item.query)+row('Source fields',item.fields)+row('Applied filters',item.filters)+row('Result count',item.sampleSize)+row('Validation rule',item.check)+row('Data path',item.derivedFrom)+'</dl></details>';
      drawer.hidden=false; drawer.querySelector('.evidence-close').focus();
    }
    document.addEventListener('click',function(event){var trigger=event.target.closest('[data-evidence-key]');if(trigger)openEvidence(trigger.dataset.evidenceKey,trigger);});
    function close(){drawer.hidden=true;if(previous)previous.focus();}
    drawer.querySelector('.evidence-close').onclick=close;
    drawer.addEventListener('click',function(event){if(event.target===drawer)close();});
    document.addEventListener('keydown',function(event){if(event.key==='Escape'&&!drawer.hidden)close();});
  }());</script>`
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
  return JSON.stringify(value, null, 2)
    .replace(/<\//g, '<\\u002f')
    .replace(/\$evidence:/g, '\\u0024evidence:')
}
