import { describe, expect, it } from 'vitest'
import { executeClaimCheck } from './claim-check'
import type { AnalyzeEvidence } from './context-schema'

const evidence: AnalyzeEvidence[] = [
  { id: 'total', query: 'totals', values: { value: 120, benchmark: 100, numerator: 30, denominator: 120 } },
  { id: 'ranked', query: 'ranked', rows: [{ name: 'A', value: 10 }, { name: 'B', value: 10 }, { name: 'C', value: 5 }] },
  { id: 'series', query: 'series', rows: [{ value: 80 }, { value: 100 }, { value: 120 }] }
]

describe('executeClaimCheck', () => {
  it('checks values with relative tolerance', () => {
    expect(executeClaimCheck('value_match', { value: '$evidence:total.values.value', expected: 120.00001, tolerance: 1e-5 }, evidence).ok).toBe(true)
  })

  it('checks absolute and percent deltas', () => {
    expect(executeClaimCheck('delta_formula', { from: '$evidence:series.rows[1].value', to: '$evidence:series.rows[2].value', mode: 'percent', expected: 0.2 }, evidence).ok).toBe(true)
    expect(executeClaimCheck('delta_formula', { from: '$evidence:series.rows[0].value', to: '$evidence:series.rows[2].value', mode: 'absolute', expected: 40 }, evidence).ok).toBe(true)
  })

  it('rejects zero denominators', () => {
    const result = executeClaimCheck('share_formula', { numerator: '$evidence:total.values.numerator', denominator: '$evidence:ranked.rows[2].missing', expected: 0 }, evidence)
    expect(result.ok).toBe(false)
  })

  it('uses competition ranking for ties', () => {
    const result = executeClaimCheck('rank_position', { rows: '$evidence:ranked.rows', subjectField: 'name', valueField: 'value', subject: 'B', expectedRank: 1, order: 'desc' }, evidence)
    expect(result).toMatchObject({ ok: true, actual: 1 })
  })

  it('checks trend period count and direction', () => {
    expect(executeClaimCheck('trend_periods', { series: '$evidence:series.rows', valueField: 'value', minimumPeriods: 3, direction: 'up' }, evidence).ok).toBe(true)
  })
})
