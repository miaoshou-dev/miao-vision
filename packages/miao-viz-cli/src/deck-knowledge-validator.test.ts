import { describe, expect, it } from 'vitest'
import { collectDeckKnowledgeIssues, deckKnowledgeErrors } from './deck-knowledge-validator'
import { renderDeckHtml } from './deck-renderer'
import type { AnalyzeContext } from './context-schema'
import type { DeckSpec } from './deck-types'

function context(overrides: Partial<AnalyzeContext> = {}): AnalyzeContext {
  return {
    intent: { raw: 'executive review', coverage: 'full', assumptions: [] },
    fields: [
      { name: 'month', role: 'time', type: 'date', timePeriods: 3 },
      { name: 'revenue', role: 'measure', type: 'number' }
    ],
    evidence: [
      { id: 'total', query: 'total revenue', values: { revenue: 300 } },
      {
        id: 'by_time',
        query: 'revenue by month',
        rows: [
          { month: '2026-01', revenue: 80 },
          { month: '2026-02', revenue: 100 },
          { month: '2026-03', revenue: 120 }
        ]
      },
      { id: 'target', query: 'revenue target', values: { revenue: 110 } }
    ],
    catalog: { charts: ['bigvalue', 'line'], blockedCharts: [], recommendedPlan: [] },
    sampleWarnings: [],
    promptRules: [],
    ...overrides
  }
}

const GROUNDED_DECK: DeckSpec = {
  intent: 'executive-brief',
  slides: [{
    layout: 'title-only',
    slideRole: 'cover-claim',
    title: 'Revenue increased by 20%',
    claim: 'Revenue increased from February to March.',
    claimType: 'delta',
    evidence: ['by_time'],
    derivedFrom: [
      '$evidence:by_time.rows[1].revenue',
      '$evidence:by_time.rows[2].revenue'
    ],
    check: 'delta_formula'
  }]
}

describe('collectDeckKnowledgeIssues', () => {
  it('accepts a grounded factual claim', () => {
    expect(collectDeckKnowledgeIssues(GROUNDED_DECK, context(), true)).toEqual([])
  })

  it('rejects missing evidence ids and paths', () => {
    const spec: DeckSpec = {
      slides: [{
        layout: 'title-only',
        claim: 'Revenue was 300.',
        claimType: 'descriptive',
        evidence: ['missing'],
        derivedFrom: ['$evidence:total.values.missing'],
        check: 'value_match'
      }]
    }
    const issues = collectDeckKnowledgeIssues(spec, context())
    expect(issues.map(item => item.code)).toContain('DECK_SLIDE_EVIDENCE_NOT_FOUND')
    expect(issues.map(item => item.code)).toContain('DECK_CLAIM_EVIDENCE_PATH_NOT_FOUND')
    expect(deckKnowledgeErrors(issues)).toHaveLength(2)
  })

  it('upgrades ungrounded numeric claims in strict mode', () => {
    const spec: DeckSpec = { slides: [{ layout: 'title-only', title: 'Revenue increased 20%' }] }
    const normal = collectDeckKnowledgeIssues(spec, context())
    const strict = collectDeckKnowledgeIssues(spec, context(), true)
    expect(normal.find(item => item.code === 'DECK_NUMERIC_CLAIM_UNGROUNDED')?.severity).toBe('warning')
    expect(strict.find(item => item.code === 'DECK_NUMERIC_CLAIM_UNGROUNDED')?.severity).toBe('error')
  })

  it('blocks trend claims when fewer than three periods exist', () => {
    const twoPeriodContext = context({
      fields: [
        { name: 'month', role: 'time', type: 'date', timePeriods: 2 },
        { name: 'revenue', role: 'measure', type: 'number' }
      ]
    })
    const spec: DeckSpec = {
      slides: [{
        layout: 'title-only',
        claim: 'Revenue trended upward.',
        claimType: 'trend',
        evidence: ['by_time'],
        derivedFrom: ['$evidence:by_time.rows[0].revenue'],
        check: 'trend_periods'
      }]
    }
    expect(collectDeckKnowledgeIssues(spec, twoPeriodContext, true).map(item => item.code))
      .toContain('DECK_TREND_REQUIRES_TIME_PERIODS')
  })

  it('requires benchmark evidence for evaluative claims', () => {
    const spec: DeckSpec = {
      slides: [{
        layout: 'title-only',
        claim: 'Performance was strong.',
        claimType: 'evaluative',
        evidence: ['total'],
        derivedFrom: ['$evidence:total.values.revenue'],
        check: 'benchmark_present'
      }]
    }
    expect(collectDeckKnowledgeIssues(spec, context(), true).map(item => item.code))
      .toContain('DECK_EVALUATIVE_CLAIM_NEEDS_BENCHMARK')
  })

  it('blocks causal and predictive claim types in strict mode', () => {
    const spec: DeckSpec = {
      slides: [
        { layout: 'title-only', claim: 'Campaign caused growth.', claimType: 'causal' },
        { layout: 'title-only', claim: 'Revenue will grow.', claimType: 'predictive' }
      ]
    }
    const codes = collectDeckKnowledgeIssues(spec, context(), true).map(item => item.code)
    expect(codes).toContain('DECK_CAUSAL_CLAIM_UNSUPPORTED')
    expect(codes).toContain('DECK_PREDICTIVE_CLAIM_UNSUPPORTED')
  })

  it('requires exact warning references for caveat coverage', () => {
    const warningContext = context({
      sampleWarnings: [{ code: 'small_sample', message: 'Only 12 rows.' }]
    })
    const missing = collectDeckKnowledgeIssues({ slides: [{ layout: 'title-only' }] }, warningContext, true)
    expect(missing.map(item => item.code)).toContain('DECK_MISSING_CAVEAT')

    const covered: DeckSpec = {
      caveats: [{ text: 'Only 12 rows are available.', warningRefs: ['small_sample'] }],
      slides: [{ layout: 'title-only' }]
    }
    expect(collectDeckKnowledgeIssues(covered, warningContext, true)).toEqual([])
  })

  it('rejects unknown warning references', () => {
    const spec: DeckSpec = {
      caveats: [{ text: 'Limited sample.', warningRefs: ['missing_warning'] }],
      slides: [{ layout: 'title-only' }]
    }
    expect(collectDeckKnowledgeIssues(spec, context()).map(item => item.code))
      .toContain('DECK_WARNING_REF_NOT_FOUND')
  })
})

describe('deck caveat rendering', () => {
  it('renders and escapes slide caveats while preserving metadata', () => {
    const spec: DeckSpec = {
      slides: [{ layout: 'title-only', title: 'Result', caveat: 'Sample < 20 rows.' }]
    }
    const html = renderDeckHtml(spec, [])
    expect(html).toContain('class="slide-caveat">Sample &lt; 20 rows.')
    expect(html).toContain('"caveat":"Sample \\u003c 20 rows."')
  })

  it('renders deck caveats on a data-quality slide', () => {
    const spec: DeckSpec = {
      caveats: [{ text: 'Limited sample.', warningRefs: ['small_sample'] }],
      slides: [
        { layout: 'title-only', title: 'Result' },
        { layout: 'text-points', slideRole: 'data-quality-slide', title: 'Data quality' },
        { layout: 'ending', title: 'Done' }
      ]
    }
    const html = renderDeckHtml(spec, [])
    const qualitySlide = html.slice(html.indexOf('Data quality'), html.indexOf('Done'))
    expect(qualitySlide).toContain('Limited sample.')
  })
})
