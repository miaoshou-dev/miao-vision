import { renderChartSvg, escapeHtml } from './svg-renderer'
import type { AgentReportSpec, DataProfile } from './types'

export function renderStaticHtml(
  spec: AgentReportSpec,
  profile: DataProfile,
  rows: Record<string, unknown>[]
): string {
  const title = spec.title ?? 'Miao Vision Report'
  const charts = spec.charts.map((chart, index) => {
    const chartTitle = chart.title ?? `${chart.type} chart ${index + 1}`
    return `<section class="chart-block">
      <h2>${escapeHtml(chartTitle)}</h2>
      ${renderChartSvg(chart, rows)}
    </section>`
  }).join('\n')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${styles()}</style>
</head>
<body>
  <main class="miao-viz-report">
    <header>
      <p class="eyebrow">Miao Vision</p>
      <h1>${escapeHtml(title)}</h1>
      ${spec.description ? `<p class="description">${escapeHtml(spec.description)}</p>` : ''}
      <p class="meta">${escapeHtml(profile.file)} · ${profile.rows} rows · generated ${new Date().toISOString()}</p>
    </header>
    ${charts}
  </main>
  <script type="application/json" id="miao-viz-spec">${escapeHtml(JSON.stringify(spec, null, 2))}</script>
  <script type="application/json" id="miao-viz-profile">${escapeHtml(JSON.stringify(profile, null, 2))}</script>
</body>
</html>`
}

function styles(): string {
  return `
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #f8fafc; color: #0f172a; }
    .miao-viz-report { max-width: 1120px; margin: 0 auto; padding: 40px 24px 56px; }
    header { margin-bottom: 28px; }
    h1 { margin: 0; font-size: 32px; font-weight: 760; letter-spacing: 0; }
    h2 { margin: 0 0 18px; font-size: 20px; font-weight: 700; letter-spacing: 0; }
    .eyebrow { margin: 0 0 8px; color: #2563eb; font-size: 13px; font-weight: 700; text-transform: uppercase; }
    .description { max-width: 760px; color: #475569; line-height: 1.6; }
    .meta { color: #64748b; font-size: 13px; }
    .chart-block { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 22px; margin: 18px 0; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04); }
    .miao-chart-svg { display: block; max-width: 100%; overflow: visible; }
    svg text { font-size: 12px; fill: #475569; }
    .miao-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .miao-table caption { text-align: left; font-weight: 700; margin-bottom: 12px; }
    .miao-table th, .miao-table td { border-bottom: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
    .miao-bigvalue { border: 1px solid #dbeafe; background: #eff6ff; border-radius: 8px; padding: 24px; }
    .miao-bigvalue-label { color: #1d4ed8; font-weight: 700; }
    .miao-bigvalue-number { margin-top: 8px; font-size: 42px; font-weight: 780; }
    .miao-unsupported { padding: 18px; border-radius: 8px; background: #fff7ed; color: #9a3412; }
    @media (max-width: 720px) { .miao-viz-report { padding: 24px 14px 36px; } h1 { font-size: 26px; } .chart-block { padding: 16px; } }
  `
}
