import type { InfographicSpec, InfographicStyle } from '../../article-infographic'
import { renderVisual } from '../structures/index'

export const explainerMapStyles = `
.mv-explainer-map { display: grid; gap: 24px; }
.mv-explainer-header { border-bottom: 1px solid var(--line); padding-bottom: 24px; }
.mv-explainer-header h1 { margin: 0; font-size: 42px; line-height: 1.08; }
.mv-explainer-header p { margin: 14px 0 0; color: var(--muted); font-size: 18px; line-height: 1.5; }
.mv-explainer-main { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 18px; }
.mv-explainer-panels { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
.mv-explainer-panel { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 16px; }
.mv-explainer-panel h2 { margin: 0 0 10px; font-size: 18px; }
.mv-explainer-panel p { margin: 0; color: var(--muted); line-height: 1.5; }
@media (max-width: 720px) { .mv-explainer-header h1 { font-size: 34px; } }
`

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function renderExplainerMap(spec: InfographicSpec, style: InfographicStyle): string {
  const main = spec.sections.find(s => ['system-diagram', 'callout-diagram', 'process-flow'].includes(s.visual?.type ?? ''))
    ?? spec.sections.find(s => s.visual)
  const panels = spec.sections
    .filter(s => s.type !== 'hero' && s !== main)
    .slice(0, 6)

  return `<section class="mv-explainer-map">
    <header class="mv-explainer-header">
      <p class="mv-eyebrow">Explainer Map</p>
      <h1>${escapeHtml(spec.title)}</h1>
      ${spec.summary ? `<p>${escapeHtml(spec.summary)}</p>` : ''}
    </header>
    ${main?.visual ? `<div class="mv-explainer-main">${renderVisual(main.visual as never, style)}</div>` : ''}
    <div class="mv-explainer-panels">
      ${panels.map(section => `<article class="mv-explainer-panel">
        <h2>${escapeHtml(section.title)}</h2>
        <p>${escapeHtml(section.items[0]?.text ?? section.emphasis ?? '')}</p>
      </article>`).join('\n')}
    </div>
  </section>`
}
