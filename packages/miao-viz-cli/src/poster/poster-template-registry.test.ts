import { describe, expect, it } from 'vitest'
import { analyzeDataset } from '../analyzer'
import type { BlockMatchContext } from '../report-block-registry'
import type { LoadedDataset } from '../types'
import { POSTER_TEMPLATE_REGISTRY, resolvePosterTemplateById } from './poster-template-registry'

function context(rows: Record<string, unknown>[]): BlockMatchContext {
  const dataset: LoadedDataset = { file: 'poster-template.csv', columns: Object.keys(rows[0] ?? {}), rows }
  const analyzed = analyzeDataset(dataset, { intent: 'compare category performance' })
  return {
    fields: analyzed.fields,
    evidence: analyzed.evidence,
    catalog: analyzed.catalog,
    sampleWarnings: analyzed.sampleWarnings,
    intent: analyzed.intent,
    userBrief: 'compare category performance'
  }
}

describe('poster template registry', () => {
  it('registers the existing poster template families plus share, timeline, and trend', () => {
    expect(POSTER_TEMPLATE_REGISTRY.map(template => template.id)).toEqual([
      'data-poster-trend',
      'content-poster-timeline',
      'data-poster-share',
      'data-poster-ranking',
      'data-poster-comparison',
      'data-poster-flow',
      'data-poster-geo'
    ])
  })

  it('returns a structured error for an unknown poster template', () => {
    expect(resolvePosterTemplateById('missing-poster')).toMatchObject({
      ok: false,
      code: 'POSTER_TEMPLATE_UNKNOWN',
      templateId: 'missing-poster'
    })
  })

  it('keeps fixtures outside runtime registry entries', () => {
    expect(POSTER_TEMPLATE_REGISTRY.every(template => !('fixtures' in template))).toBe(true)
  })

  it('instantiates valid ranking and comparison poster specs', () => {
    const ctx = context([
      { category: 'A', primary_value: 10, secondary_value: 8 },
      { category: 'B', primary_value: 20, secondary_value: 16 },
      { category: 'C', primary_value: 30, secondary_value: 24 }
    ])
    const ranking = resolvePosterTemplateById('data-poster-ranking')
    const comparison = resolvePosterTemplateById('data-poster-comparison')
    expect(ranking.ok && ranking.value.instantiate(ctx).poster).toMatchObject({ template: 'data-poster-ranking', composition: 'ranked-story' })
    expect(comparison.ok && comparison.value.instantiate(ctx).poster).toMatchObject({ composition: 'comparison-story', secondaryChartId: 'comparison-chart' })
  })
})
