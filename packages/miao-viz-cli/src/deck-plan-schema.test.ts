import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { deckPlanSchema } from './deck-plan-schema'

const FIXTURES = [
  'executive-brief.json',
  'business-review.json',
  'two-period.json',
  'sample-warning.json'
]

function readFixture(name: string): unknown {
  return JSON.parse(readFileSync(`test_data/deck-plans/${name}`, 'utf8'))
}

describe('deckPlanSchema', () => {
  for (const fixture of FIXTURES) {
    it(`accepts ${fixture}`, () => {
      expect(deckPlanSchema.safeParse(readFixture(fixture)).success).toBe(true)
    })
  }

  it('does not use a trend slide for the two-period fixture', () => {
    const parsed = deckPlanSchema.parse(readFixture('two-period.json'))
    expect(parsed.deckPlan.slideOutline.some(slide => slide.role === 'trend-overview-slide')).toBe(false)
    expect(parsed.deckPlan.blockedClaims.some(claim => claim.reasonCode === 'time_periods_lt_3')).toBe(true)
  })

  it('carries warning references for a sample warning', () => {
    const parsed = deckPlanSchema.parse(readFixture('sample-warning.json'))
    expect(parsed.deckPlan.warningRefs).toContain('small_sample')
    expect(parsed.deckPlan.slideOutline.some(slide => slide.role === 'data-quality-slide')).toBe(true)
  })
})
