import { describe, expect, it } from 'vitest'
import { inferFieldSemantics } from './field-semantics'

function infer(name: string, type: 'number' | 'string', values: unknown[]) {
  return inferFieldSemantics({
    name,
    type,
    nonNullCount: values.length,
    nullRate: 0,
    uniqueRate: new Set(values).size / values.length,
    distinctCount: new Set(values).size,
    samples: values.slice(0, 5)
  })
}

describe('field semantic inference', () => {
  const uniqueNumbers = Array.from({ length: 42 }, (_, index) => 100 + index)

  it('keeps fully unique numeric business values as measures', () => {
    const result = infer('revenue_amount', 'number', uniqueNumbers)

    expect(result.role).toBe('measure')
    expect(result.qualityFlags).toContain('high_unique_rate')
    expect(result.chartUsage.asMeasure).toBe('recommended')
  })

  it('keeps fully unique named scores as scores', () => {
    const result = infer('quality_score', 'number', uniqueNumbers)

    expect(result.role).toBe('score')
    expect(result.qualityFlags).toContain('high_unique_rate')
  })

  it('recognizes identifiers from the column name', () => {
    const result = infer('order_id', 'number', uniqueNumbers)

    expect(result.role).toBe('id')
    expect(result.chartUsage.asMeasure).toBe('forbidden')
  })

  it('does not infer an identifier from uniqueness alone', () => {
    const references = Array.from({ length: 42 }, (_, index) => `ref-${index + 1}`)
    const result = infer('reference', 'string', references)

    expect(result.role).not.toBe('id')
    expect(result.qualityFlags).toContain('high_unique_rate')
  })
})
