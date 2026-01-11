/**
 * Chart Data Processing Logic - Unit Tests
 *
 * Tests for pure functions in chart-data.ts
 */

import { describe, it, expect } from 'vitest'
import {
  prepareChartData,
  hasXColumnDuplicates,
  getSmartAggregation
} from './chart-data'
import type { ResultsChartConfig } from '../types'

// ============================================================================
// Test Fixtures
// ============================================================================

const sampleData = [
  { category: 'A', product: 'Widget', sales: 100, quantity: 10 },
  { category: 'B', product: 'Gadget', sales: 200, quantity: 20 },
  { category: 'A', product: 'Gizmo', sales: 150, quantity: 15 },
  { category: 'B', product: 'Doohickey', sales: 300, quantity: 30 },
  { category: 'C', product: 'Thing', sales: 250, quantity: 25 }
]

const uniqueData = [
  { id: 1, name: 'Alice', value: 100 },
  { id: 2, name: 'Bob', value: 200 },
  { id: 3, name: 'Charlie', value: 150 }
]

const baseConfig: ResultsChartConfig = {
  type: 'bar',
  xColumn: 'category',
  yColumns: ['sales']
}

// ============================================================================
// prepareChartData
// ============================================================================

describe('prepareChartData', () => {
  it('returns null when xColumn is not set', () => {
    const config: ResultsChartConfig = {
      type: 'bar',
      xColumn: null,
      yColumns: ['sales']
    }

    const result = prepareChartData(sampleData, config)

    expect(result).toBeNull()
  })

  it('returns null when yColumns is empty', () => {
    const config: ResultsChartConfig = {
      type: 'bar',
      xColumn: 'category',
      yColumns: []
    }

    const result = prepareChartData(sampleData, config)

    expect(result).toBeNull()
  })

  it('prepares raw data without aggregation', () => {
    const config: ResultsChartConfig = {
      ...baseConfig,
      aggregation: 'none'
    }

    const result = prepareChartData(uniqueData, {
      type: 'bar',
      xColumn: 'name',
      yColumns: ['value'],
      aggregation: 'none'
    })

    expect(result).not.toBeNull()
    expect(result!.labels).toEqual(['Alice', 'Bob', 'Charlie'])
    expect(result!.datasets[0].values).toEqual([100, 200, 150])
    expect(result!.totalCount).toBe(3)
  })

  it('sorts data in descending order', () => {
    const result = prepareChartData(uniqueData, {
      type: 'bar',
      xColumn: 'name',
      yColumns: ['value'],
      aggregation: 'none'
    }, { sort: 'desc' })

    expect(result!.labels).toEqual(['Bob', 'Charlie', 'Alice'])
    expect(result!.datasets[0].values).toEqual([200, 150, 100])
  })

  it('sorts data in ascending order', () => {
    const result = prepareChartData(uniqueData, {
      type: 'bar',
      xColumn: 'name',
      yColumns: ['value'],
      aggregation: 'none'
    }, { sort: 'asc' })

    expect(result!.labels).toEqual(['Alice', 'Charlie', 'Bob'])
    expect(result!.datasets[0].values).toEqual([100, 150, 200])
  })

  it('limits data points', () => {
    const result = prepareChartData(uniqueData, {
      type: 'bar',
      xColumn: 'name',
      yColumns: ['value'],
      aggregation: 'none'
    }, { limit: 2 })

    expect(result!.labels).toHaveLength(2)
    expect(result!.totalCount).toBe(3)
    expect(result!.limitedCount).toBe(2)
  })

  it('aggregates data with sum', () => {
    const result = prepareChartData(sampleData, {
      ...baseConfig,
      aggregation: 'sum'
    })

    expect(result!.labels).toHaveLength(3) // A, B, C

    // A: 100 + 150 = 250
    const aIndex = result!.labels.indexOf('A')
    expect(result!.datasets[0].values[aIndex]).toBe(250)

    // B: 200 + 300 = 500
    const bIndex = result!.labels.indexOf('B')
    expect(result!.datasets[0].values[bIndex]).toBe(500)

    // C: 250
    const cIndex = result!.labels.indexOf('C')
    expect(result!.datasets[0].values[cIndex]).toBe(250)
  })

  it('aggregates data with avg', () => {
    const result = prepareChartData(sampleData, {
      ...baseConfig,
      aggregation: 'avg'
    })

    // A: (100 + 150) / 2 = 125
    const aIndex = result!.labels.indexOf('A')
    expect(result!.datasets[0].values[aIndex]).toBe(125)

    // B: (200 + 300) / 2 = 250
    const bIndex = result!.labels.indexOf('B')
    expect(result!.datasets[0].values[bIndex]).toBe(250)
  })

  it('aggregates data with count', () => {
    const result = prepareChartData(sampleData, {
      ...baseConfig,
      aggregation: 'count'
    })

    // A: 2, B: 2, C: 1
    const aIndex = result!.labels.indexOf('A')
    expect(result!.datasets[0].values[aIndex]).toBe(2)

    const cIndex = result!.labels.indexOf('C')
    expect(result!.datasets[0].values[cIndex]).toBe(1)
  })

  it('aggregates data with max', () => {
    const result = prepareChartData(sampleData, {
      ...baseConfig,
      aggregation: 'max'
    })

    // A: max(100, 150) = 150
    const aIndex = result!.labels.indexOf('A')
    expect(result!.datasets[0].values[aIndex]).toBe(150)

    // B: max(200, 300) = 300
    const bIndex = result!.labels.indexOf('B')
    expect(result!.datasets[0].values[bIndex]).toBe(300)
  })

  it('aggregates data with min', () => {
    const result = prepareChartData(sampleData, {
      ...baseConfig,
      aggregation: 'min'
    })

    // A: min(100, 150) = 100
    const aIndex = result!.labels.indexOf('A')
    expect(result!.datasets[0].values[aIndex]).toBe(100)

    // B: min(200, 300) = 200
    const bIndex = result!.labels.indexOf('B')
    expect(result!.datasets[0].values[bIndex]).toBe(200)
  })

  it('handles multiple Y columns', () => {
    const result = prepareChartData(sampleData, {
      type: 'bar',
      xColumn: 'category',
      yColumns: ['sales', 'quantity'],
      aggregation: 'sum'
    })

    expect(result!.datasets).toHaveLength(2)
    expect(result!.datasets[0].label).toBe('sales')
    expect(result!.datasets[1].label).toBe('quantity')
  })

  it('handles null values in data', () => {
    const dataWithNull = [
      { category: 'A', value: 100 },
      { category: null, value: 200 },
      { category: 'B', value: 150 }
    ]

    const result = prepareChartData(dataWithNull, {
      type: 'bar',
      xColumn: 'category',
      yColumns: ['value'],
      aggregation: 'none'
    })

    expect(result!.labels).toContain('null')
  })

  it('handles non-numeric Y values', () => {
    const dataWithStrings = [
      { category: 'A', value: 'abc' },
      { category: 'B', value: 100 }
    ]

    const result = prepareChartData(dataWithStrings, {
      type: 'bar',
      xColumn: 'category',
      yColumns: ['value'],
      aggregation: 'none'
    })

    // 'abc' should become 0
    expect(result!.datasets[0].values).toEqual([0, 100])
  })
})

// ============================================================================
// hasXColumnDuplicates
// ============================================================================

describe('hasXColumnDuplicates', () => {
  it('returns true when duplicates exist', () => {
    const result = hasXColumnDuplicates(sampleData, 'category')

    expect(result).toBe(true) // A and B appear twice
  })

  it('returns false when no duplicates', () => {
    const result = hasXColumnDuplicates(uniqueData, 'name')

    expect(result).toBe(false)
  })

  it('returns false for empty data', () => {
    const result = hasXColumnDuplicates([], 'category')

    expect(result).toBe(false)
  })

  it('returns false for empty column name', () => {
    const result = hasXColumnDuplicates(sampleData, '')

    expect(result).toBe(false)
  })

  it('handles single row', () => {
    const result = hasXColumnDuplicates([{ category: 'A' }], 'category')

    expect(result).toBe(false)
  })
})

// ============================================================================
// getSmartAggregation
// ============================================================================

describe('getSmartAggregation', () => {
  it('returns "sum" when duplicates exist', () => {
    const result = getSmartAggregation(sampleData, 'category')

    expect(result).toBe('sum')
  })

  it('returns "none" when no duplicates', () => {
    const result = getSmartAggregation(uniqueData, 'name')

    expect(result).toBe('none')
  })

  it('returns "none" for null xColumn', () => {
    const result = getSmartAggregation(sampleData, null)

    expect(result).toBe('none')
  })

  it('returns "none" for empty data', () => {
    const result = getSmartAggregation([], 'category')

    expect(result).toBe('none')
  })
})
