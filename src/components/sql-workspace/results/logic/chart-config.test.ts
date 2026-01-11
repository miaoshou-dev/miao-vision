/**
 * Chart Configuration Logic - Unit Tests
 *
 * Tests for pure functions in chart-config.ts
 */

import { describe, it, expect } from 'vitest'
import {
  CHART_TYPES,
  AGGREGATIONS,
  CHART_COLORS,
  DEFAULT_CHART_DIMENSIONS,
  getChartColor,
  getResultHash,
  getConfigHash,
  isVgplotSupported
} from './chart-config'
import type { QueryResult } from '@/types/database'
import type { ResultsChartConfig } from '../types'

// ============================================================================
// Constants
// ============================================================================

describe('CHART_TYPES', () => {
  it('contains expected chart types', () => {
    const types = CHART_TYPES.map(t => t.value)

    expect(types).toContain('bar')
    expect(types).toContain('line')
    expect(types).toContain('pie')
    expect(types).toContain('scatter')
    expect(types).toContain('histogram')
  })

  it('has labels and icons for all types', () => {
    CHART_TYPES.forEach(t => {
      expect(t.label).toBeTruthy()
      expect(t.icon).toBeTruthy()
    })
  })
})

describe('AGGREGATIONS', () => {
  it('contains expected aggregation types', () => {
    const aggs = AGGREGATIONS.map(a => a.value)

    expect(aggs).toContain('none')
    expect(aggs).toContain('sum')
    expect(aggs).toContain('avg')
    expect(aggs).toContain('count')
    expect(aggs).toContain('min')
    expect(aggs).toContain('max')
  })
})

describe('CHART_COLORS', () => {
  it('contains valid hex colors', () => {
    CHART_COLORS.forEach(color => {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })
  })

  it('has at least 5 colors', () => {
    expect(CHART_COLORS.length).toBeGreaterThanOrEqual(5)
  })
})

describe('DEFAULT_CHART_DIMENSIONS', () => {
  it('has width, height, and dataLimit', () => {
    expect(DEFAULT_CHART_DIMENSIONS.width).toBeGreaterThan(0)
    expect(DEFAULT_CHART_DIMENSIONS.height).toBeGreaterThan(0)
    expect(DEFAULT_CHART_DIMENSIONS.dataLimit).toBeGreaterThan(0)
  })
})

// ============================================================================
// getChartColor
// ============================================================================

describe('getChartColor', () => {
  it('returns first color for index 0', () => {
    const result = getChartColor(0)

    expect(result).toBe(CHART_COLORS[0])
  })

  it('returns correct color for valid index', () => {
    const result = getChartColor(2)

    expect(result).toBe(CHART_COLORS[2])
  })

  it('wraps around for index exceeding array length', () => {
    const result = getChartColor(CHART_COLORS.length)

    expect(result).toBe(CHART_COLORS[0])
  })

  it('handles large indices', () => {
    const index = 100
    const expectedIndex = index % CHART_COLORS.length

    const result = getChartColor(index)

    expect(result).toBe(CHART_COLORS[expectedIndex])
  })
})

// ============================================================================
// getResultHash
// ============================================================================

describe('getResultHash', () => {
  it('generates hash from result properties', () => {
    const result: QueryResult = {
      data: [{ a: 1 }, { a: 2 }],
      columns: ['a', 'b', 'c'],
      rowCount: 2
    }

    const hash = getResultHash(result)

    expect(hash).toBe('2_a_b_c_2')
  })

  it('generates different hashes for different results', () => {
    const result1: QueryResult = {
      data: [{ a: 1 }],
      columns: ['a'],
      rowCount: 1
    }
    const result2: QueryResult = {
      data: [{ a: 1 }, { a: 2 }],
      columns: ['a'],
      rowCount: 2
    }

    expect(getResultHash(result1)).not.toBe(getResultHash(result2))
  })

  it('generates same hash for same content', () => {
    const result1: QueryResult = {
      data: [{ a: 1 }],
      columns: ['x', 'y'],
      rowCount: 1
    }
    const result2: QueryResult = {
      data: [{ b: 2 }], // Different data but same length
      columns: ['x', 'y'],
      rowCount: 1
    }

    expect(getResultHash(result1)).toBe(getResultHash(result2))
  })

  it('handles empty result', () => {
    const result: QueryResult = {
      data: [],
      columns: [],
      rowCount: 0
    }

    const hash = getResultHash(result)

    expect(hash).toBe('0__0')
  })
})

// ============================================================================
// getConfigHash
// ============================================================================

describe('getConfigHash', () => {
  const baseConfig: ResultsChartConfig = {
    type: 'bar',
    xColumn: 'category',
    yColumns: ['sales', 'quantity'],
    aggregation: 'sum',
    groupBy: null
  }

  const baseDimensions = {
    width: 700,
    height: 400,
    title: 'Test Chart',
    xLabel: 'X Axis',
    yLabel: 'Y Axis',
    sort: 'none'
  }

  it('generates consistent hash for same config', () => {
    const hash1 = getConfigHash(baseConfig, baseDimensions)
    const hash2 = getConfigHash(baseConfig, baseDimensions)

    expect(hash1).toBe(hash2)
  })

  it('generates different hash when config changes', () => {
    const hash1 = getConfigHash(baseConfig, baseDimensions)
    const hash2 = getConfigHash(
      { ...baseConfig, type: 'line' },
      baseDimensions
    )

    expect(hash1).not.toBe(hash2)
  })

  it('generates different hash when dimensions change', () => {
    const hash1 = getConfigHash(baseConfig, baseDimensions)
    const hash2 = getConfigHash(baseConfig, {
      ...baseDimensions,
      width: 800
    })

    expect(hash1).not.toBe(hash2)
  })

  it('includes all relevant properties', () => {
    const hash = getConfigHash(baseConfig, baseDimensions)
    const parsed = JSON.parse(hash)

    expect(parsed.type).toBe('bar')
    expect(parsed.xColumn).toBe('category')
    expect(parsed.yColumns).toEqual(['sales', 'quantity'])
    expect(parsed.aggregation).toBe('sum')
    expect(parsed.width).toBe(700)
    expect(parsed.height).toBe(400)
  })
})

// ============================================================================
// isVgplotSupported
// ============================================================================

describe('isVgplotSupported', () => {
  it('returns true for bar chart', () => {
    expect(isVgplotSupported('bar')).toBe(true)
  })

  it('returns true for line chart', () => {
    expect(isVgplotSupported('line')).toBe(true)
  })

  it('returns true for scatter chart', () => {
    expect(isVgplotSupported('scatter')).toBe(true)
  })

  it('returns true for histogram', () => {
    expect(isVgplotSupported('histogram')).toBe(true)
  })

  it('returns false for pie chart', () => {
    expect(isVgplotSupported('pie')).toBe(false)
  })

  it('returns false for unknown type', () => {
    expect(isVgplotSupported('unknown')).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isVgplotSupported(undefined)).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isVgplotSupported('')).toBe(false)
  })
})
