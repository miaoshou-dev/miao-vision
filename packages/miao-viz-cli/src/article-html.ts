import { escapeHtml } from './svg-renderer'
import type { InfographicSection, InfographicSpec, InfographicStyle } from './article-infographic'
import { renderSectionVisual } from './infographic-visuals'

export function renderInfographicHtml(spec: InfographicSpec): string {
  let sectionIndex = 0
  const renderedSections = spec.sections.map(section => {
    if (section.visual) {
      sectionIndex++
      return renderVisualSection(section, sectionIndex, spec.style)
    }
    if (section.type === 'hero' || section.type === 'quote') {
      return section.type === 'hero' ? renderHero(section) : renderQuote(section)
    }
    sectionIndex++
    return renderSection(section, sectionIndex)
  }).join('\n')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(spec.title)}</title>
  <meta name="generator" content="Miao Vision article infographic" />
  ${spec.source ? `<meta name="source" content="${escapeHtml(spec.source)}" />` : ''}
  <style>${buildCss(spec.style)}</style>
</head>
<body>
  <main class="mv-infographic mv-infographic-${spec.style}">
    ${renderedSections}
  </main>
  <script type="application/json" id="miao-infographic-spec">${escapeHtml(JSON.stringify(spec, null, 2))}</script>
</body>
</html>`
}

function sectionNumber(index: number): string {
  return String(index).padStart(2, '0')
}

function renderSection(section: InfographicSection, index: number): string {
  if (section.type === 'facts') return renderFacts(section, index)
  if (section.type === 'timeline') return renderTimeline(section, index)
  if (section.type === 'comparison') return renderComparison(section, index)
  if (section.type === 'process') return renderProcess(section, index)
  if (section.type === 'pros-cons') return renderProsCons(section, index)
  if (section.type === 'stat-grid') return renderStatGrid(section, index)
  if (section.type === 'risk-matrix') return renderRiskMatrix(section, index)
  if (section.type === 'checklist') return renderChecklist(section, index)
  return renderTakeaways(section, index)
}

function renderHero(section: InfographicSection): string {
  const lead = section.emphasis ?? section.items[0]?.text ?? ''
  return `<section class="mv-hero">
    <p class="mv-eyebrow">Miao Vision Infographic</p>
    <h1>${escapeHtml(section.title)}</h1>
    <p class="mv-lead">${escapeHtml(lead)}</p>
  </section>`
}

function renderFacts(section: InfographicSection, index: number): string {
  return `<section class="mv-section mv-facts">
    <div class="mv-section-head"><span>${sectionNumber(index)}</span><h2>${escapeHtml(section.title)}</h2></div>
    <div class="mv-fact-grid">
      ${section.items.map(item => `<article class="mv-fact">
        ${item.value ? `<strong>${escapeHtml(item.value)}</strong>` : ''}
        <p>${escapeHtml(item.text)}</p>
      </article>`).join('\n')}
    </div>
  </section>`
}

function renderTimeline(section: InfographicSection, index: number): string {
  return `<section class="mv-section mv-timeline">
    <div class="mv-section-head"><span>${sectionNumber(index)}</span><h2>${escapeHtml(section.title)}</h2></div>
    <ol>
      ${section.items.map(item => `<li><time>${escapeHtml(item.label ?? '')}</time><p>${escapeHtml(item.text)}</p></li>`).join('\n')}
    </ol>
  </section>`
}

function renderComparison(section: InfographicSection, index: number): string {
  return `<section class="mv-section mv-comparison">
    <div class="mv-section-head"><span>${sectionNumber(index)}</span><h2>${escapeHtml(section.title)}</h2></div>
    <div class="mv-comparison-grid">
      ${section.items.map(item => `<article>
        ${item.label ? `<h3>${escapeHtml(item.label)}</h3>` : ''}
        <p>${escapeHtml(item.text)}</p>
      </article>`).join('\n')}
    </div>
  </section>`
}

function renderQuote(section: InfographicSection): string {
  const quote = section.emphasis ?? section.items[0]?.text ?? ''
  return `<section class="mv-section mv-quote">
    <blockquote>${escapeHtml(quote)}</blockquote>
  </section>`
}

function renderTakeaways(section: InfographicSection, index: number): string {
  return `<section class="mv-section mv-takeaways">
    <div class="mv-section-head"><span>${sectionNumber(index)}</span><h2>${escapeHtml(section.title)}</h2></div>
    <ul>
      ${section.items.map(item => `<li>${escapeHtml(item.text)}</li>`).join('\n')}
    </ul>
  </section>`
}

function renderProcess(section: InfographicSection, index: number): string {
  return `<section class="mv-section mv-process">
    <div class="mv-section-head"><span>${sectionNumber(index)}</span><h2>${escapeHtml(section.title)}</h2></div>
    <ol class="mv-process-steps">
      ${section.items.map((item, i) => `<li>
        <span class="mv-step-num">${i + 1}</span>
        <div>
          ${item.label ? `<strong>${escapeHtml(item.label)}</strong>` : ''}
          <p>${escapeHtml(item.text)}</p>
        </div>
      </li>`).join('\n')}
    </ol>
  </section>`
}

function renderProsCons(section: InfographicSection, index: number): string {
  const pros = section.items.filter(item => item.label?.toLowerCase() === 'pro' || item.label?.toLowerCase() === 'pros')
  const cons = section.items.filter(item => item.label?.toLowerCase() === 'con' || item.label?.toLowerCase() === 'cons')
  const unlabeled = section.items.filter(item => !item.label)
  return `<section class="mv-section mv-pros-cons">
    <div class="mv-section-head"><span>${sectionNumber(index)}</span><h2>${escapeHtml(section.title)}</h2></div>
    <div class="mv-pros-cons-grid">
      <div class="mv-pros-col">
        <h3>Pros</h3>
        <ul>${[...pros, ...unlabeled].map(item => `<li>${escapeHtml(item.text)}</li>`).join('\n')}</ul>
      </div>
      <div class="mv-cons-col">
        <h3>Cons</h3>
        <ul>${cons.map(item => `<li>${escapeHtml(item.text)}</li>`).join('\n')}</ul>
        ${cons.length === 0 ? '<p class="mv-muted">No cons listed</p>' : ''}
      </div>
    </div>
  </section>`
}

function renderStatGrid(section: InfographicSection, index: number): string {
  return `<section class="mv-section mv-stat-grid">
    <div class="mv-section-head"><span>${sectionNumber(index)}</span><h2>${escapeHtml(section.title)}</h2></div>
    <div class="mv-stat-grid-items">
      ${section.items.map(item => `<article class="mv-stat-card">
        ${item.value ? `<strong>${escapeHtml(item.value)}</strong>` : ''}
        <p>${escapeHtml(item.text)}</p>
      </article>`).join('\n')}
    </div>
  </section>`
}

function renderRiskMatrix(section: InfographicSection, index: number): string {
  const quadrants = section.items.slice(0, 4)
  return `<section class="mv-section mv-risk-matrix">
    <div class="mv-section-head"><span>${sectionNumber(index)}</span><h2>${escapeHtml(section.title)}</h2></div>
    <div class="mv-risk-matrix-grid">
      <div class="mv-risk-header mv-risk-hl">Low Likelihood / High Impact</div>
      <div class="mv-risk-header mv-risk-hh">High Likelihood / High Impact</div>
      <div class="mv-risk-header mv-risk-ll">Low Likelihood / Low Impact</div>
      <div class="mv-risk-header mv-risk-lh">High Likelihood / Low Impact</div>
      ${quadrants.map(item => `<article class="mv-risk-cell">
        ${item.label ? `<h3>${escapeHtml(item.label)}</h3>` : ''}
        <p>${escapeHtml(item.text)}</p>
        ${item.detail ? `<p class="mv-risk-detail">${escapeHtml(item.detail)}</p>` : ''}
      </article>`).join('\n')}
    </div>
  </section>`
}

function renderChecklist(section: InfographicSection, index: number): string {
  return `<section class="mv-section mv-checklist">
    <div class="mv-section-head"><span>${sectionNumber(index)}</span><h2>${escapeHtml(section.title)}</h2></div>
    <ul class="mv-checklist-items">
      ${section.items.map(item => `<li>
        <span class="mv-check-icon">${item.label === 'done' ? '&#10003;' : '&#9744;'}</span>
        <span>${escapeHtml(item.text)}</span>
      </li>`).join('\n')}
    </ul>
  </section>`
}

function renderVisualSection(section: InfographicSection, index: number, style: InfographicStyle): string {
  const visualHtml = renderSectionVisual(section.visual!, style)
  const notes = section.notes
    ? Array.isArray(section.notes)
      ? section.notes.map(n => `<li>${escapeHtml(n)}</li>`).join('')
      : `<li>${escapeHtml(section.notes)}</li>`
    : ''
  const notesBlock = notes ? `<ul class="mv-visual-notes">${notes}</ul>` : ''
  const safeItems = section.items ?? []
  const items = safeItems.length > 0
    ? `<div class="mv-section-head" style="margin-top:12px"><span>${sectionNumber(index)}</span><h2>${escapeHtml(section.title)}</h2></div>
       <ul class="mv-visual-support-items">${safeItems.map(item => `<li>${escapeHtml(item.text)}</li>`).join('\n')}</ul>`
    : ''
  return `<section class="mv-section mv-visual-section">${visualHtml}${notesBlock}${items}</section>`
}

function buildCss(style: InfographicStyle): string {
  const palette = style === 'minimal'
    ? { bg: '#ffffff', ink: '#161616', muted: '#666666', card: '#ffffff', accent: '#111111', line: '#d8d8d8' }
    : style === 'executive'
      ? { bg: '#f4f0e8', ink: '#18212f', muted: '#667085', card: '#ffffff', accent: '#1f5d8c', line: '#d7c9b8' }
      : { bg: '#f7efe2', ink: '#241b16', muted: '#75695d', card: '#fffaf2', accent: '#b64f2a', line: '#dfcdb7' }

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
    .mv-visual-svg { margin: 0 0 4px; }
    .mv-visual-caption { margin: 4px 0 0; font-size: 12px; color: var(--muted); font-style: italic; }
    .mv-visual-notes { margin: 8px 0 0; padding-left: 18px; font-size: 13px; color: var(--muted); line-height: 1.5; }
    .mv-visual-support-items { margin: 8px 0 0; padding-left: 18px; font-size: 14px; color: var(--muted); line-height: 1.55; }
    .mv-visual-kpi-strip { display: flex; gap: 14px; flex-wrap: wrap; }
    .mv-visual-kpi { flex: 1; min-width: 140px; background: var(--card); border: 1px solid var(--line); border-top: 3px solid; border-radius: 6px; padding: 14px 16px; }
    .mv-visual-kpi strong { display: block; font-size: 26px; line-height: 1.1; color: var(--ink); }
    .mv-visual-kpi span { display: block; margin-top: 4px; font-size: 12px; color: var(--muted); }
    .mv-visual-unit { font-size: 14px; font-weight: 400; color: var(--muted); }
    .mv-visual-delta { font-size: 13px; font-weight: 600; }
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
      h1 { font-size: 38px; word-break: break-word; }
      .mv-lead { font-size: 18px; }
      .mv-timeline li { grid-template-columns: 1fr; gap: 6px; }
      .mv-pros-cons-grid, .mv-risk-matrix-grid { grid-template-columns: 1fr; }
      .mv-quote blockquote { font-size: 25px; word-break: break-word; }
    }
  `
}
