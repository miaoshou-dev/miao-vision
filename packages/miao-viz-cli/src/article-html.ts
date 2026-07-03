import { escapeHtml } from './svg-renderer'
import type { InfographicSpec, InfographicStyle } from './article-infographic'
import { getInfographicTokens } from './infographic/primitives/theme'
import { renderInfographicComposition } from './infographic/compositions/index'
import { lifecycleCurveStyles } from './infographic/compositions/lifecycle-curve'
import { strategyDashboardStyles } from './infographic/compositions/strategy-dashboard'
import { explainerMapStyles } from './infographic/compositions/explainer-map'
import { comparisonMatrixStyles } from './infographic/compositions/comparison-matrix'

const COMPOSITION_STYLES: Record<string, string> = {
  'article-linear': '',
  'lifecycle-curve': lifecycleCurveStyles,
  'strategy-dashboard': strategyDashboardStyles,
  'explainer-map': explainerMapStyles,
  'comparison-matrix': comparisonMatrixStyles,
}

export function renderInfographicHtml(spec: InfographicSpec): string {
  const style = spec.style
  const compositionType = spec.composition?.type ?? 'article-linear'
  const compositionHtml = renderInfographicComposition(spec, style)
  const extraCss = COMPOSITION_STYLES[compositionType] ?? ''

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(spec.title)}</title>
  <meta name="generator" content="Miao Vision article infographic" />
  ${spec.source ? `<meta name="source" content="${escapeHtml(spec.source)}" />` : ''}
  <style>${buildCss(style)}${extraCss}</style>
</head>
<body>
  <main class="mv-infographic mv-infographic-${style}" data-composition-type="${compositionType}">
    ${compositionHtml}
  </main>
  <script type="application/json" id="miao-infographic-spec">${escapeHtml(JSON.stringify(spec, null, 2))}</script>
</body>
</html>`
}

function buildCss(style: InfographicStyle): string {
  const palette = getInfographicTokens(style)

  return `
    :root { color-scheme: light; --bg:${palette.bg}; --ink:${palette.ink}; --muted:${palette.muted}; --card:${palette.card}; --accent:${palette.accent}; --line:${palette.line}; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--ink); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .mv-infographic { width: min(1120px, calc(100% - 32px)); margin: 0 auto; padding: 48px 0 64px; }
    .mv-hero { min-height: 42vh; display: grid; align-content: center; border-bottom: 1px solid var(--line); padding: 28px 0 44px; }
    .mv-eyebrow { margin: 0 0 18px; color: var(--accent); font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.14em; }
    h1 { max-width: 860px; margin: 0; font-size: 58px; line-height: 1.02; letter-spacing: 0; }
    .mv-lead { max-width: 760px; margin: 22px 0 0; color: var(--muted); font-size: 21px; line-height: 1.55; }
    .mv-section { padding: 34px 0; border-bottom: 1px solid var(--line); }
    .mv-section-head { display: flex; align-items: baseline; gap: 14px; margin-bottom: 20px; }
    .mv-section-head span { color: var(--accent); font-weight: 800; font-size: 12px; }
    h2 { margin: 0; font-size: 28px; line-height: 1.15; letter-spacing: 0; }
    .mv-fact-grid, .mv-comparison-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
    .mv-fact, .mv-comparison article { background: var(--card); border: 1px solid var(--line); border-radius: 6px; padding: 18px; }
    .mv-fact strong { display: block; color: var(--accent); font-size: 30px; line-height: 1; margin-bottom: 12px; overflow-wrap: break-word; word-break: break-word; }
    .mv-fact p, .mv-comparison p, .mv-timeline p { margin: 0; color: var(--muted); line-height: 1.5; overflow-wrap: break-word; word-break: break-word; }
    .mv-comparison h3 { margin: 0 0 8px; font-size: 16px; overflow-wrap: break-word; word-break: break-word; }
    .mv-timeline ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
    .mv-timeline li { display: grid; grid-template-columns: 150px 1fr; gap: 18px; align-items: start; background: var(--card); border: 1px solid var(--line); border-radius: 6px; padding: 16px; }
    .mv-timeline time { color: var(--accent); font-weight: 800; }
    .mv-quote blockquote { margin: 0; max-width: 900px; color: var(--ink); font-size: 34px; line-height: 1.25; font-weight: 750; }
    .mv-takeaways ul { margin: 0; padding-left: 22px; display: grid; gap: 10px; color: var(--muted); line-height: 1.55; }
    .mv-visual-section { padding: 34px 0; border-bottom: 1px solid var(--line); }
    .mv-visual-card { margin-bottom: 8px; }
    .mv-visual-label { margin: 0 0 8px; font-size: 14px; color: var(--muted); font-weight: 600; }
    .mv-visual-svg { margin: 0 0 4px; max-width: 100%; }
    .mv-visual-caption { margin: 4px 0 0; font-size: 12px; color: var(--muted); font-style: italic; }
    .mv-visual-notes { margin: 8px 0 0; padding-left: 18px; font-size: 13px; color: var(--muted); line-height: 1.5; }
    .mv-visual-support-items { margin: 8px 0 0; padding-left: 18px; font-size: 14px; color: var(--muted); line-height: 1.55; }
    .mv-visual-kpi-strip { display: flex; gap: 14px; flex-wrap: wrap; }
    .mv-visual-kpi { flex: 1; min-width: 140px; background: var(--card); border: 1px solid var(--line); border-top: 3px solid; border-radius: 6px; padding: 14px 16px; }
    .mv-visual-kpi strong { display: block; font-size: 48px; font-family: Charter, Georgia, "Times New Roman", serif; font-variant-numeric: tabular-nums; line-height: 1; color: var(--ink); }
    .mv-visual-kpi span { display: block; margin-top: 4px; font-size: 12px; color: var(--muted); }
    .mv-visual-unit { font-size: 14px; font-weight: 400; color: var(--muted); }
    .mv-visual-delta { font-size: 13px; font-weight: 600; }
    .mv-visual-process-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; background: rgba(255,255,255,0.62); padding: 16px; }
    .mv-visual-process-node { min-width: 0; border: 1px solid color-mix(in srgb, var(--node-color) 45%, var(--line)); background: color-mix(in srgb, var(--node-color) 10%, var(--card)); border-radius: 6px; padding: 14px; }
    .mv-visual-process-head { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .mv-visual-process-head span { flex: 0 0 auto; width: 24px; height: 24px; display: grid; place-items: center; border-radius: 50%; background: color-mix(in srgb, var(--node-color) 16%, transparent); color: var(--node-color); font-size: 12px; font-weight: 800; }
    .mv-visual-process-head strong { min-width: 0; color: var(--node-color); font-size: 15px; line-height: 1.2; overflow-wrap: break-word; }
    .mv-visual-process-node p { margin: 12px 0 0; color: var(--muted); font-size: 14px; line-height: 1.45; overflow-wrap: break-word; }
    .mv-visual-ranked { display: grid; gap: 10px; background: rgba(255,255,255,0.62); padding: 16px; }
    .mv-visual-ranked-row { display: grid; grid-template-columns: 34px minmax(180px, 1.2fr) minmax(140px, 0.8fr) 64px; gap: 14px; align-items: center; min-width: 0; }
    .mv-visual-ranked-rank { color: color-mix(in srgb, var(--muted) 35%, transparent); font-size: 24px; font-weight: 800; line-height: 1; }
    .mv-visual-ranked-row p { margin: 0; color: var(--muted); font-size: 15px; line-height: 1.35; overflow-wrap: break-word; }
    .mv-visual-ranked-track { height: 18px; background: color-mix(in srgb, var(--line) 55%, transparent); border-radius: 3px; overflow: hidden; }
    .mv-visual-ranked-track span { display: block; height: 100%; min-width: 2px; border-radius: inherit; }
    .mv-visual-ranked-row strong { color: var(--muted); font-size: 15px; text-align: right; }
    .mv-process-steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 16px; }
    .mv-process-steps li { display: flex; gap: 14px; align-items: flex-start; background: var(--card); border: 1px solid var(--line); border-radius: 6px; padding: 16px; }
    .mv-step-num { flex-shrink: 0; width: 28px; height: 28px; display: grid; place-items: center; background: var(--accent); color: #fff; border-radius: 50%; font-size: 13px; font-weight: 800; }
    .mv-process-steps li strong { display: block; margin-bottom: 4px; font-size: 16px; }
    .mv-process-steps li p { margin: 0; color: var(--muted); line-height: 1.5; }
    .mv-pros-cons-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    .mv-pros-cons-grid h3 { margin: 0 0 10px; font-size: 18px; }
    .mv-pros-cons-grid ul { margin: 0; padding-left: 18px; display: grid; gap: 8px; color: var(--muted); line-height: 1.55; }
    .mv-pros-col h3 { color: #1a7d3a; }
    .mv-cons-col h3 { color: #c42e2e; }
    .mv-muted { color: var(--muted); font-style: italic; }
    .mv-stat-grid-items { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
    .mv-stat-card { background: var(--card); border: 1px solid var(--line); border-radius: 6px; padding: 20px; text-align: center; }
    .mv-stat-card strong { display: block; color: var(--accent); font-size: 32px; line-height: 1; margin-bottom: 10px; overflow-wrap: break-word; word-break: break-word; }
    .mv-stat-card p { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.4; }
    .mv-risk-matrix-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .mv-risk-header { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; padding: 8px 10px; border-radius: 4px; }
    .mv-risk-hh { background: #fde8e8; color: #9b1c1c; }
    .mv-risk-hl { background: #fef3cd; color: #856404; }
    .mv-risk-lh { background: #e2f0d9; color: #2d6a2d; }
    .mv-risk-ll { background: #e8f0fe; color: #1a56db; }
    .mv-risk-cell { background: var(--card); border: 1px solid var(--line); border-radius: 6px; padding: 14px; }
    .mv-risk-cell h3 { margin: 0 0 6px; font-size: 15px; }
    .mv-risk-cell p { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.5; }
    .mv-risk-detail { margin-top: 8px !important; font-size: 13px !important; opacity: 0.75; }
    .mv-checklist-items { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
    .mv-checklist-items li { display: flex; gap: 10px; align-items: flex-start; color: var(--muted); line-height: 1.55; }
    .mv-check-icon { flex-shrink: 0; width: 20px; text-align: center; color: var(--accent); font-size: 16px; }
    @media (max-width: 720px) {
      .mv-infographic { width: min(100% - 24px, 1120px); padding-top: 28px; }
      .mv-hero { min-height: auto; padding: 24px 0 36px; }
      h1 { font-size: 38px; word-break: break-word; }
      .mv-lead { font-size: 18px; }
      .mv-timeline li { grid-template-columns: 1fr; gap: 6px; }
      .mv-pros-cons-grid, .mv-risk-matrix-grid { grid-template-columns: 1fr; }
      .mv-quote blockquote { font-size: 25px; word-break: break-word; }
      .mv-section-head { align-items: flex-start; }
      .mv-visual-svg { overflow-x: auto; -webkit-overflow-scrolling: touch; }
      .mv-visual-svg svg { min-width: 640px; }
      .mv-visual-process-grid, .mv-visual-ranked { padding: 10px; }
      .mv-visual-ranked-row { grid-template-columns: 26px 1fr 44px; gap: 10px; align-items: start; }
      .mv-visual-ranked-track { grid-column: 2 / -1; height: 12px; }
      .mv-visual-ranked-row p { font-size: 13px; }
      .mv-visual-ranked-rank { font-size: 18px; }
      .mv-visual-ranked-row strong { grid-column: 3; grid-row: 1; font-size: 13px; }
    }
  `
}
