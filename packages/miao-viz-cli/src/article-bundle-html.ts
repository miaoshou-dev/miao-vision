import { escapeHtml } from './svg-renderer'
import type { InfographicBundleBlock, InfographicBundleSpec } from './article-bundle'
import { renderVisual } from './infographic/structures/index'
import { getInfographicTokens } from './infographic/primitives/theme'

export function renderInfographicBundleHtml(spec: InfographicBundleSpec): string {
  const style = spec.style
  const blocks = [...spec.blocks].sort((a, b) => a.order - b.order)

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(spec.title)}</title>
  <meta name="generator" content="Miao Vision atomic bundle infographic" />
  ${spec.source ? `<meta name="source" content="${escapeHtml(spec.source)}" />` : ''}
  <style>${buildBundleCss(style)}</style>
</head>
<body>
  <main class="mv-bundle mv-bundle-${style} mv-bundle-layout-${spec.layout}" data-infographic-kind="atomic-bundle">
    <header class="mv-bundle-hero">
      <p class="mv-bundle-eyebrow">Miao Vision Atomic Bundle</p>
      <h1>${escapeHtml(spec.title)}</h1>
      <p>${escapeHtml(spec.summary)}</p>
    </header>
    <div class="mv-atomic-blocks">
      ${blocks.map(block => renderBlock(block, style)).join('\n')}
    </div>
  </main>
  <script type="application/json" id="miao-infographic-bundle-spec">${escapeHtml(JSON.stringify(spec, null, 2))}</script>
</body>
</html>`
}

function renderBlock(block: InfographicBundleBlock, style: InfographicBundleSpec['style']): string {
  const visualHtml = renderVisual(block.visual as never, style)
  const notes = block.notes
    ? Array.isArray(block.notes)
      ? block.notes
      : [block.notes]
    : []
  const evidence = block.evidenceIds?.length
    ? `<p class="mv-atomic-evidence">Evidence: ${block.evidenceIds.map(escapeHtml).join(', ')}</p>`
    : ''
  const notesHtml = notes.length
    ? `<ul class="mv-atomic-notes">${notes.map(note => `<li>${escapeHtml(note)}</li>`).join('\n')}</ul>`
    : ''

  return `<section class="mv-atomic-block" id="${escapeHtml(block.id)}" data-block-id="${escapeHtml(block.id)}">
    <header class="mv-atomic-head">
      <span>FIG ${String(block.order).padStart(2, '0')}</span>
      <h2>${escapeHtml(block.title)}</h2>
    </header>
    <p class="mv-atomic-claim">${escapeHtml(block.claim)}</p>
    <div class="mv-atomic-visual">${visualHtml}</div>
    <p class="mv-atomic-explanation">${escapeHtml(block.explanation)}</p>
    ${notesHtml}
    ${evidence}
  </section>`
}

function buildBundleCss(style: InfographicBundleSpec['style']): string {
  const palette = getInfographicTokens(style)

  return `
    :root { color-scheme: light; --bg:${palette.bg}; --ink:${palette.ink}; --muted:${palette.muted}; --card:${palette.card}; --accent:${palette.accent}; --line:${palette.line}; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--ink); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .mv-bundle { width: min(1120px, calc(100% - 32px)); margin: 0 auto; padding: 48px 0 64px; }
    .mv-bundle-hero { border-bottom: 1px solid var(--line); padding: 10px 0 34px; margin-bottom: 28px; }
    .mv-bundle-eyebrow { margin: 0 0 14px; color: var(--accent); font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.14em; }
    .mv-bundle h1 { max-width: 900px; margin: 0; font-size: 52px; line-height: 1.04; letter-spacing: 0; }
    .mv-bundle-hero p:last-child { max-width: 780px; margin: 18px 0 0; color: var(--muted); font-size: 19px; line-height: 1.55; }
    .mv-atomic-blocks { display: grid; gap: 22px; }
    .mv-bundle-layout-grid .mv-atomic-blocks { grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); align-items: start; }
    .mv-atomic-block { scroll-margin-top: 18px; background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 22px; }
    .mv-atomic-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 12px; }
    .mv-atomic-head span { flex: 0 0 auto; color: var(--accent); font-size: 12px; font-weight: 850; letter-spacing: 0.08em; }
    .mv-atomic-head h2 { margin: 0; font-size: 24px; line-height: 1.18; letter-spacing: 0; overflow-wrap: anywhere; }
    .mv-atomic-claim { margin: 0 0 16px; max-width: 820px; color: var(--ink); font-size: 17px; font-weight: 700; line-height: 1.45; overflow-wrap: anywhere; }
    .mv-atomic-visual { margin: 0 0 14px; }
    .mv-atomic-explanation { margin: 0; color: var(--muted); line-height: 1.58; overflow-wrap: anywhere; }
    .mv-atomic-notes { margin: 12px 0 0; padding-left: 20px; color: var(--muted); line-height: 1.5; font-size: 14px; }
    .mv-atomic-evidence { margin: 12px 0 0; padding-top: 10px; border-top: 1px solid var(--line); color: color-mix(in srgb, var(--muted) 78%, var(--ink)); font-size: 12px; line-height: 1.4; overflow-wrap: anywhere; }
    .mv-visual-card { margin-bottom: 8px; }
    .mv-visual-label { margin: 0 0 8px; font-size: 14px; color: var(--muted); font-weight: 600; }
    .mv-visual-svg { margin: 0 0 4px; max-width: 100%; }
    .mv-visual-caption { margin: 4px 0 0; font-size: 12px; color: var(--muted); font-style: italic; }
    .mv-visual-kpi-strip { display: flex; gap: 14px; flex-wrap: wrap; }
    .mv-visual-kpi { flex: 1; min-width: 140px; background: var(--card); border: 1px solid var(--line); border-top: 3px solid; border-radius: 6px; padding: 14px 16px; }
    .mv-visual-kpi strong { display: block; font-size: 42px; font-family: Charter, Georgia, "Times New Roman", serif; font-variant-numeric: tabular-nums; line-height: 1; color: var(--ink); }
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
    @media (max-width: 720px) {
      .mv-bundle { width: min(100% - 24px, 1120px); padding-top: 28px; }
      .mv-bundle h1 { font-size: 36px; word-break: break-word; }
      .mv-bundle-layout-grid .mv-atomic-blocks { grid-template-columns: 1fr; }
      .mv-atomic-block { padding: 16px; }
      .mv-atomic-head { align-items: flex-start; }
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
