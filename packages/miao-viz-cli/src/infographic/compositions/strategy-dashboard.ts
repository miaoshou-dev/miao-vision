import type { InfographicSpec, InfographicStyle } from '../../article-infographic'
import { renderVisual } from '../structures/index'

export const strategyDashboardStyles = `
.mv-strategy-dashboard { display: grid; gap: 22px; }
.mv-dashboard-header { border-bottom: 1px solid var(--line); padding-bottom: 24px; }
.mv-dashboard-header h1 { margin: 0; font-size: 42px; line-height: 1.08; }
.mv-dashboard-header p { margin: 14px 0 0; color: var(--muted); font-size: 18px; line-height: 1.5; }
.mv-dashboard-grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr); gap: 20px; align-items: start; }
.mv-dashboard-panel { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 18px; }
.mv-dashboard-panel h2 { margin: 0 0 12px; font-size: 20px; }
.mv-dashboard-list { margin: 0; padding-left: 18px; display: grid; gap: 9px; color: var(--muted); line-height: 1.5; }
.mv-dashboard-visuals { display: grid; gap: 16px; }
@media (max-width: 820px) { .mv-dashboard-grid { grid-template-columns: 1fr; } .mv-dashboard-header h1 { font-size: 34px; } }
`

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function sectionItems(section: InfographicSpec['sections'][number] | undefined): string {
  const items = section?.items ?? []
  if (items.length === 0) return '<p class="mv-muted">No items provided.</p>'
  return `<ul class="mv-dashboard-list">${items.map(item => `<li>${escapeHtml(item.text)}</li>`).join('\n')}</ul>`
}

export function renderStrategyDashboard(spec: InfographicSpec, style: InfographicStyle): string {
  const kpi = spec.sections.find(s => s.visual?.type === 'kpi-strip') ?? spec.sections.find(s => s.visual?.type === 'metric-bars')
  const risk = spec.sections.find(s => s.type === 'risk-matrix')
  const actions = spec.sections.find(s => s.type === 'checklist') ?? spec.sections.find(s => s.type === 'takeaways')
  const supporting = spec.sections.filter(s => s.visual && s !== kpi).slice(0, 3)

  return `<section class="mv-strategy-dashboard">
    <header class="mv-dashboard-header">
      <p class="mv-eyebrow">Strategy Dashboard</p>
      <h1>${escapeHtml(spec.title)}</h1>
      ${spec.summary ? `<p>${escapeHtml(spec.summary)}</p>` : ''}
    </header>
    ${kpi?.visual ? `<div>${renderVisual(kpi.visual as never, style)}</div>` : ''}
    <div class="mv-dashboard-grid">
      <article class="mv-dashboard-panel">
        <h2>${escapeHtml(actions?.title ?? 'Recommended Actions')}</h2>
        ${sectionItems(actions)}
      </article>
      <article class="mv-dashboard-panel">
        <h2>${escapeHtml(risk?.title ?? 'Risks And Watchpoints')}</h2>
        ${sectionItems(risk)}
      </article>
    </div>
    ${supporting.length > 0 ? `<div class="mv-dashboard-visuals">${supporting.map(section => renderVisual(section.visual as never, style)).join('\n')}</div>` : ''}
  </section>`
}
