import type { InfographicSpec, InfographicStyle } from '../../article-infographic'
import { renderVisual } from '../structures/index'

export const comparisonMatrixStyles = `
.mv-composition-comparison { display: grid; gap: 24px; }
.mv-comparison-header { border-bottom: 1px solid var(--line); padding-bottom: 24px; }
.mv-comparison-header h1 { margin: 0; font-size: 42px; line-height: 1.08; }
.mv-comparison-header p { margin: 14px 0 0; color: var(--muted); font-size: 18px; line-height: 1.5; }
.mv-composition-comparison-main { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 18px; }
.mv-comparison-options { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
.mv-comparison-option { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 16px; }
.mv-comparison-option h2 { margin: 0 0 10px; font-size: 19px; }
.mv-comparison-option p { margin: 0; color: var(--muted); line-height: 1.5; }
.mv-comparison-verdict { background: var(--card); border: 1px solid var(--line); border-left: 3px solid var(--accent); border-radius: 8px; padding: 18px; color: var(--muted); line-height: 1.55; }
@media (max-width: 720px) { .mv-comparison-header h1 { font-size: 34px; } }
`

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function renderComparisonMatrix(spec: InfographicSpec, style: InfographicStyle): string {
  const main = spec.sections.find(s => ['concept-contrast', 'tradeoff-matrix', 'before-after'].includes(s.visual?.type ?? ''))
    ?? spec.sections.find(s => s.type === 'comparison' && s.visual)
  const comparison = spec.sections.find(s => s.type === 'comparison') ?? spec.sections.find(s => s.items.length >= 2)
  const verdict = spec.sections.find(s => s.type === 'takeaways') ?? spec.sections.find(s => s.type === 'quote')

  return `<section class="mv-composition-comparison">
    <header class="mv-comparison-header">
      <p class="mv-eyebrow">Comparison Matrix</p>
      <h1>${escapeHtml(spec.title)}</h1>
      ${spec.summary ? `<p>${escapeHtml(spec.summary)}</p>` : ''}
    </header>
    ${main?.visual ? `<div class="mv-composition-comparison-main">${renderVisual(main.visual as never, style)}</div>` : ''}
    <div class="mv-comparison-options">
      ${(comparison?.items ?? []).slice(0, 4).map((item, i) => `<article class="mv-comparison-option">
        <h2>${escapeHtml(item.label ?? `Option ${i + 1}`)}</h2>
        <p>${escapeHtml(item.text)}</p>
      </article>`).join('\n')}
    </div>
    ${verdict ? `<div class="mv-comparison-verdict">${escapeHtml(verdict.items[0]?.text ?? verdict.emphasis ?? '')}</div>` : ''}
  </section>`
}
