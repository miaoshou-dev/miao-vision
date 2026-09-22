import { describe, expect, it } from 'vitest'
import { normalizePosterSpec } from './poster-normalizer'
import type { AgentReportSpec } from '../types'
import { profileDataset } from '../data-profiler'
import { validateReportSpec } from '../spec-validator'

const base: AgentReportSpec = {
  layout: { preset: 'poster' },
  poster: { chartId: 'chart', hero: { title: 'Poster' }, footer: { source: 'local' } },
  charts: [{ id: 'chart', type: 'bar', encoding: { x: { field: 'category' }, y: { field: 'value' } } }]
}

describe('poster spec normalization', () => {
  it('fills legacy defaults without changing the public spec version', () => {
    const normalized = normalizePosterSpec(base)
    expect(normalized.specVersion).toBeUndefined()
    expect(normalized.poster).toMatchObject({ template: 'data-poster-ranking', composition: 'ranked-story' })
    expect(normalized.poster?.slots?.map(slot => slot.role)).toEqual(['hero', 'insight', 'ranking', 'footer'])
  })

  it('maps existing compositions to controlled template ids', () => {
    expect(normalizePosterSpec({ ...base, poster: { ...base.poster!, composition: 'comparison-story' } }).poster?.template).toBe('data-poster-comparison')
    expect(normalizePosterSpec({ ...base, poster: { ...base.poster!, composition: 'flow-story' } }).poster?.template).toBe('data-poster-flow')
    expect(normalizePosterSpec({ ...base, poster: { ...base.poster!, composition: 'geo-ranking-story' } }).poster?.template).toBe('data-poster-geo')
  })

  it('reports an unknown template with a stable path and repair hint', () => {
    const result = validateReportSpec({ ...base, poster: { ...base.poster!, template: 'poster-made-up' as never } }, profileDataset({ file: 'x.csv', columns: ['category', 'value'], rows: [{ category: 'A', value: 1 }, { category: 'B', value: 2 }, { category: 'C', value: 3 }] }))
    expect(result).toMatchObject({ ok: false, code: 'POSTER_TEMPLATE_UNKNOWN', path: 'poster.template', repairHint: 'Use a registered poster template id.' })
  })
})
