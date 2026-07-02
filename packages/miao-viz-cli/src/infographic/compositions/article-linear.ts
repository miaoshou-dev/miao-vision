import type { InfographicSpec, InfographicStyle } from '../../article-infographic'
import { renderVisual } from '../structures/index'

function sectionNumber(index: number): string {
  return String(index).padStart(2, '0')
}

export function renderArticleLinear(spec: InfographicSpec, style: InfographicStyle): string {
  let sectionIndex = 0
  return spec.sections.map(section => {
    if (section.visual) {
      sectionIndex++
      return renderVisualSection(section, sectionIndex, style)
    }
    if (section.type === 'hero') return renderHero(section)
    if (section.type === 'quote') return renderQuote(section)
    sectionIndex++
    return renderLinearSection(section, sectionIndex, style)
  }).join('\n')
}

function renderHero(section: InfographicSpec['sections'][number]): string {
  const lead = section.emphasis ?? section.items[0]?.text ?? ''
  return `<section class="mv-hero">
    <p class="mv-eyebrow">Miao Vision Infographic</p>
    <h1>${escapeHtml(section.title)}</h1>
    <p class="mv-lead">${escapeHtml(lead)}</p>
  </section>`
}

function renderQuote(section: InfographicSpec['sections'][number]): string {
  const quote = section.emphasis ?? section.items[0]?.text ?? ''
  return `<section class="mv-section mv-quote">
    <blockquote>${escapeHtml(quote)}</blockquote>
  </section>`
}

function renderLinearSection(section: InfographicSpec['sections'][number], index: number, style: InfographicStyle): string {
  if (section.visual) return renderVisualSection(section, index, style)

  switch (section.type) {
    case 'facts': return renderFacts(section, index)
    case 'timeline': return renderTimeline(section, index)
    case 'comparison': return renderComparison(section, index)
    case 'process': return renderProcess(section, index)
    case 'pros-cons': return renderProsCons(section, index)
    case 'stat-grid': return renderStatGrid(section, index)
    case 'risk-matrix': return renderRiskMatrix(section, index)
    case 'checklist': return renderChecklist(section, index)
    default: return renderTakeaways(section, index)
  }
}

function renderFacts(section: InfographicSpec['sections'][number], index: number): string {
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

function renderTimeline(section: InfographicSpec['sections'][number], index: number): string {
  return `<section class="mv-section mv-timeline">
    <div class="mv-section-head"><span>${sectionNumber(index)}</span><h2>${escapeHtml(section.title)}</h2></div>
    <ol>
      ${section.items.map(item => `<li><time>${escapeHtml(item.label ?? '')}</time><p>${escapeHtml(item.text)}</p></li>`).join('\n')}
    </ol>
  </section>`
}

function renderComparison(section: InfographicSpec['sections'][number], index: number): string {
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

function renderTakeaways(section: InfographicSpec['sections'][number], index: number): string {
  return `<section class="mv-section mv-takeaways">
    <div class="mv-section-head"><span>${sectionNumber(index)}</span><h2>${escapeHtml(section.title)}</h2></div>
    <ul>
      ${section.items.map(item => `<li>${escapeHtml(item.text)}</li>`).join('\n')}
    </ul>
  </section>`
}

function renderProcess(section: InfographicSpec['sections'][number], index: number): string {
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

function renderProsCons(section: InfographicSpec['sections'][number], index: number): string {
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

function renderStatGrid(section: InfographicSpec['sections'][number], index: number): string {
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

function renderRiskMatrix(section: InfographicSpec['sections'][number], index: number): string {
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

function renderChecklist(section: InfographicSpec['sections'][number], index: number): string {
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

function renderVisualSection(section: InfographicSpec['sections'][number], index: number, style: InfographicStyle): string {
  const visualHtml = renderVisual(section.visual as never, style)
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
