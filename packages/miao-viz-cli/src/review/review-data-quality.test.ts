import { describe, expect, it } from 'vitest'
import { summarizeDataQuality } from './review-data-quality'

describe('review data quality summary', () => {
  it('keeps only safe, compact quality signals', () => {
    const summary = summarizeDataQuality({
      file: '/private/data.csv', rows: 20,
      columns: [{ name: 'Revenue', type: 'number', total: 20, nonNullCount: 18, nullCount: 2, nullRate: 0.1, fillRate: 0.9, uniqueRate: 1, samples: [], distinctCount: 18, outlierCount: 2, qualityFlags: ['sparse values'] }],
      quality: { completeness: 0.9, nullRate: 0.1, avgUniqueRate: 1, highNullColumns: ['Revenue'], likelyIdColumns: [], duplicateProneDimensions: [] }
    })
    expect(summary).toEqual({
      rows: 20, columnCount: 1, completeness: 0.9, nullRate: 0.1,
      highNullColumns: ['Revenue'], flags: ['Revenue: sparse values'], outlierColumns: ['Revenue (2)']
    })
  })
})
