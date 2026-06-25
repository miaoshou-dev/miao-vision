import { escapeHtml } from './svg-renderer'
import type { InfographicSection, InfographicSpec, InfographicStyle } from './article-infographic'

export function renderInfographicHtml(spec: InfographicSpec): string {
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
    ${spec.sections.map(renderSection).join('\n')}
  </main>
  <script type="application/json" id="miao-infographic-spec">${escapeHtml(JSON.stringify(spec, null, 2))}</script>
</body>
</html>`
}

function renderSection(section: InfographicSection): string {
  if (section.type === 'hero') return renderHero(section)
  if (section.type === 'facts') return renderFacts(section)
  if (section.type === 'timeline') return renderTimeline(section)
  if (section.type === 'comparison') return renderComparison(section)
  if (section.type === 'quote') return renderQuote(section)
  return renderTakeaways(section)
}

function renderHero(section: InfographicSection): string {
  const lead = section.emphasis ?? section.items[0]?.text ?? ''
  return `<section class="mv-hero">
    <p class="mv-eyebrow">Miao Vision Infographic</p>
    <h1>${escapeHtml(section.title)}</h1>
    <p class="mv-lead">${escapeHtml(lead)}</p>
  </section>`
}

function renderFacts(section: InfographicSection): string {
  return `<section class="mv-section mv-facts">
    <div class="mv-section-head"><span>01</span><h2>${escapeHtml(section.title)}</h2></div>
    <div class="mv-fact-grid">
      ${section.items.map(item => `<article class="mv-fact">
        ${item.value ? `<strong>${escapeHtml(item.value)}</strong>` : ''}
        <p>${escapeHtml(item.text)}</p>
      </article>`).join('\n')}
    </div>
  </section>`
}

function renderTimeline(section: InfographicSection): string {
  return `<section class="mv-section mv-timeline">
    <div class="mv-section-head"><span>02</span><h2>${escapeHtml(section.title)}</h2></div>
    <ol>
      ${section.items.map(item => `<li><time>${escapeHtml(item.label ?? '')}</time><p>${escapeHtml(item.text)}</p></li>`).join('\n')}
    </ol>
  </section>`
}

function renderComparison(section: InfographicSection): string {
  return `<section class="mv-section mv-comparison">
    <div class="mv-section-head"><span>03</span><h2>${escapeHtml(section.title)}</h2></div>
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

function renderTakeaways(section: InfographicSection): string {
  return `<section class="mv-section mv-takeaways">
    <div class="mv-section-head"><span>04</span><h2>${escapeHtml(section.title)}</h2></div>
    <ul>
      ${section.items.map(item => `<li>${escapeHtml(item.text)}</li>`).join('\n')}
    </ul>
  </section>`
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
    .mv-fact strong { display: block; color: var(--accent); font-size: 30px; line-height: 1; margin-bottom: 12px; }
    .mv-fact p, .mv-comparison p, .mv-timeline p { margin: 0; color: var(--muted); line-height: 1.5; }
    .mv-comparison h3 { margin: 0 0 8px; font-size: 16px; }
    .mv-timeline ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
    .mv-timeline li { display: grid; grid-template-columns: 150px 1fr; gap: 18px; align-items: start; background: var(--card); border: 1px solid var(--line); border-radius: 6px; padding: 16px; }
    .mv-timeline time { color: var(--accent); font-weight: 800; }
    .mv-quote blockquote { margin: 0; max-width: 900px; color: var(--ink); font-size: 34px; line-height: 1.25; font-weight: 750; }
    .mv-takeaways ul { margin: 0; padding-left: 22px; display: grid; gap: 10px; color: var(--muted); line-height: 1.55; }
    @media (max-width: 720px) {
      .mv-infographic { width: min(100% - 24px, 1120px); padding-top: 28px; }
      h1 { font-size: 38px; }
      .mv-lead { font-size: 18px; }
      .mv-timeline li { grid-template-columns: 1fr; gap: 6px; }
      .mv-quote blockquote { font-size: 25px; }
    }
  `
}
