/**
 * DataTable Filtering Logic - Unit Tests
 *
 * Tests for pure functions in filtering.ts
 */

import { describe, it, expect } from 'vitest'
import {
  applyFilters,
  matchesFilter,
  addOrUpdateFilter,
  removeFilter,
  getActiveFilter
} from './filtering'
import type { ColumnFilter, FilterState } from '../types'

// ============================================================================
// Test Fixtures
// ============================================================================

const sampleData = [
  { id: 1, name: 'Alice', age: 30, city: 'New York', revenue: 1000 },
  { id: 2, name: 'Bob', age: 25, city: 'Los Angeles', revenue: 2000 },
  { id: 3, name: 'Charlie', age: 35, city: 'Chicago', revenue: 1500 },
  { id: 4, name: 'Diana', age: 28, city: 'New York', revenue: 3000 },
  { id: 5, name: 'Eve', age: 32, city: 'Boston', revenue: 500 }
]

// ============================================================================
// matchesFilter
// ============================================================================

describe('matchesFilter', () => {
  it('matches "contains" operator case-insensitively', () => {
    const filter: ColumnFilter = { column: 'name', operator: 'contains', value: 'ali' }

    expect(matchesFilter(sampleData[0], filter)).toBe(true) // Alice contains 'ali'
    expect(matchesFilter(sampleData[1], filter)).toBe(false) // Bob
    expect(matchesFilter(sampleData[2], filter)).toBe(false) // Charlie does not contain 'ali'
  })

  it('matches "not_contains" operator', () => {
    const filter: ColumnFilter = { column: 'city', operator: 'not_contains', value: 'york' }

    expect(matchesFilter(sampleData[0], filter)).toBe(false) // New York
    expect(matchesFilter(sampleData[1], filter)).toBe(true) // Los Angeles
    expect(matchesFilter(sampleData[4], filter)).toBe(true) // Boston
  })

  it('matches "equals" operator case-insensitively', () => {
    const filter: ColumnFilter = { column: 'city', operator: 'equals', value: 'new york' }

    expect(matchesFilter(sampleData[0], filter)).toBe(true)
    expect(matchesFilter(sampleData[1], filter)).toBe(false)
    expect(matchesFilter(sampleData[3], filter)).toBe(true)
  })

  it('matches "not_equals" operator', () => {
    const filter: ColumnFilter = { column: 'city', operator: 'not_equals', value: 'new york' }

    expect(matchesFilter(sampleData[0], filter)).toBe(false)
    expect(matchesFilter(sampleData[1], filter)).toBe(true)
  })

  it('matches "greater_than" operator for numbers', () => {
    const filter: ColumnFilter = { column: 'age', operator: 'greater_than', value: '30' }

    expect(matchesFilter(sampleData[0], filter)).toBe(false) // 30
    expect(matchesFilter(sampleData[2], filter)).toBe(true)  // 35
    expect(matchesFilter(sampleData[4], filter)).toBe(true)  // 32
  })

  it('matches "less_than" operator for numbers', () => {
    const filter: ColumnFilter = { column: 'revenue', operator: 'less_than', value: '1500' }

    expect(matchesFilter(sampleData[0], filter)).toBe(true)  // 1000
    expect(matchesFilter(sampleData[2], filter)).toBe(false) // 1500
    expect(matchesFilter(sampleData[4], filter)).toBe(true)  // 500
  })

  it('matches "between" operator', () => {
    const filter: ColumnFilter = { column: 'age', operator: 'between', value: '25', value2: '30' }

    expect(matchesFilter(sampleData[0], filter)).toBe(true)  // 30
    expect(matchesFilter(sampleData[1], filter)).toBe(true)  // 25
    expect(matchesFilter(sampleData[2], filter)).toBe(false) // 35
    expect(matchesFilter(sampleData[3], filter)).toBe(true)  // 28
  })

  it('returns false for null/undefined values', () => {
    const filter: ColumnFilter = { column: 'name', operator: 'contains', value: 'test' }
    const rowWithNull = { name: null }
    const rowWithUndefined = { name: undefined }

    expect(matchesFilter(rowWithNull, filter)).toBe(false)
    expect(matchesFilter(rowWithUndefined, filter)).toBe(false)
  })

  it('matches date "after" operator', () => {
    const filter: ColumnFilter = { column: 'date', operator: 'after', value: '2024-01-15' }
    const row1 = { date: '2024-01-20' }
    const row2 = { date: '2024-01-10' }

    expect(matchesFilter(row1, filter)).toBe(true)
    expect(matchesFilter(row2, filter)).toBe(false)
  })

  it('matches date "before" operator', () => {
    const filter: ColumnFilter = { column: 'date', operator: 'before', value: '2024-01-15' }
    const row1 = { date: '2024-01-10' }
    const row2 = { date: '2024-01-20' }

    expect(matchesFilter(row1, filter)).toBe(true)
    expect(matchesFilter(row2, filter)).toBe(false)
  })

  it('matches date "date_between" operator', () => {
    const filter: ColumnFilter = {
      column: 'date',
      operator: 'date_between',
      value: '2024-01-10',
      value2: '2024-01-20'
    }
    const row1 = { date: '2024-01-15' }
    const row2 = { date: '2024-01-25' }
    const row3 = { date: '2024-01-10' }

    expect(matchesFilter(row1, filter)).toBe(true)
    expect(matchesFilter(row2, filter)).toBe(false)
    expect(matchesFilter(row3, filter)).toBe(true)
  })
})

// ============================================================================
// applyFilters
// ============================================================================

describe('applyFilters', () => {
  it('returns all rows when no filters', () => {
    const result = applyFilters(sampleData, [])
    expect(result).toHaveLength(5)
  })

  it('applies single filter correctly', () => {
    const filters: FilterState = [
      { column: 'city', operator: 'equals', value: 'new york' }
    ]

    const result = applyFilters(sampleData, filters)

    expect(result).toHaveLength(2)
    expect(result.every(r => r.city === 'New York')).toBe(true)
  })

  it('applies multiple filters with AND logic', () => {
    const filters: FilterState = [
      { column: 'city', operator: 'equals', value: 'new york' },
      { column: 'age', operator: 'greater_than', value: '29' }
    ]

    const result = applyFilters(sampleData, filters)

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Alice')
  })

  it('returns empty array when no rows match', () => {
    const filters: FilterState = [
      { column: 'age', operator: 'greater_than', value: '100' }
    ]

    const result = applyFilters(sampleData, filters)

    expect(result).toHaveLength(0)
  })
})

// ============================================================================
// addOrUpdateFilter
// ============================================================================

describe('addOrUpdateFilter', () => {
  it('adds new filter to empty state', () => {
    const filter: ColumnFilter = { column: 'name', operator: 'contains', value: 'test' }

    const result = addOrUpdateFilter([], filter)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(filter)
  })

  it('adds new filter to existing state', () => {
    const existing: FilterState = [
      { column: 'city', operator: 'equals', value: 'NYC' }
    ]
    const newFilter: ColumnFilter = { column: 'name', operator: 'contains', value: 'test' }

    const result = addOrUpdateFilter(existing, newFilter)

    expect(result).toHaveLength(2)
    expect(result[1]).toEqual(newFilter)
  })

  it('updates existing filter for same column', () => {
    const existing: FilterState = [
      { column: 'city', operator: 'equals', value: 'NYC' }
    ]
    const updatedFilter: ColumnFilter = { column: 'city', operator: 'contains', value: 'York' }

    const result = addOrUpdateFilter(existing, updatedFilter)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(updatedFilter)
  })

  it('does not mutate original array', () => {
    const existing: FilterState = [
      { column: 'city', operator: 'equals', value: 'NYC' }
    ]
    const filter: ColumnFilter = { column: 'name', operator: 'contains', value: 'test' }

    addOrUpdateFilter(existing, filter)

    expect(existing).toHaveLength(1)
  })
})

// ============================================================================
// removeFilter
// ============================================================================

describe('removeFilter', () => {
  it('removes filter by column name', () => {
    const filters: FilterState = [
      { column: 'city', operator: 'equals', value: 'NYC' },
      { column: 'name', operator: 'contains', value: 'test' }
    ]

    const result = removeFilter(filters, 'city')

    expect(result).toHaveLength(1)
    expect(result[0].column).toBe('name')
  })

  it('returns same array when column not found', () => {
    const filters: FilterState = [
      { column: 'city', operator: 'equals', value: 'NYC' }
    ]

    const result = removeFilter(filters, 'nonexistent')

    expect(result).toHaveLength(1)
  })

  it('returns empty array when removing last filter', () => {
    const filters: FilterState = [
      { column: 'city', operator: 'equals', value: 'NYC' }
    ]

    const result = removeFilter(filters, 'city')

    expect(result).toHaveLength(0)
  })
})

// ============================================================================
// getActiveFilter
// ============================================================================

describe('getActiveFilter', () => {
  it('returns filter for specified column', () => {
    const filters: FilterState = [
      { column: 'city', operator: 'equals', value: 'NYC' },
      { column: 'name', operator: 'contains', value: 'test' }
    ]

    const result = getActiveFilter(filters, 'name')

    expect(result).toEqual({ column: 'name', operator: 'contains', value: 'test' })
  })

  it('returns undefined when column not found', () => {
    const filters: FilterState = [
      { column: 'city', operator: 'equals', value: 'NYC' }
    ]

    const result = getActiveFilter(filters, 'nonexistent')

    expect(result).toBeUndefined()
  })

  it('returns undefined for empty state', () => {
    const result = getActiveFilter([], 'city')

    expect(result).toBeUndefined()
  })
})
