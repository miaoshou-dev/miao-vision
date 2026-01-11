/**
 * DataTable Summary Logic - Unit Tests
 *
 * Tests for pure functions in summary.ts
 */

import { describe, it, expect } from 'vitest'
import {
  calculateColumnSummary,
  calculateSummaryRow,
  hasSummaryColumns,
  getSummaryColumns,
  getSummaryLabel
} from './summary'
import type { ColumnDef, SummaryType } from '../types'

// ============================================================================
// Test Fixtures
// ============================================================================

const sampleData = [
  { id: 1, name: 'Alice', age: 30, salary: 50000 },
  { id: 2, name: 'Bob', age: 25, salary: 60000 },
  { id: 3, name: 'Charlie', age: 35, salary: 45000 },
  { id: 4, name: 'Diana', age: 28, salary: 70000 },
  { id: 5, name: 'Eve', age: 32, salary: 55000 }
]

const columnsWithSummary: ColumnDef[] = [
  { name: 'id', label: 'ID' },
  { name: 'name', label: 'Name' },
  { name: 'age', label: 'Age', summary: 'avg', format: 'number' },
  { name: 'salary', label: 'Salary', summary: 'sum', format: 'number' }
]

const columnsNoSummary: ColumnDef[] = [
  { name: 'id', label: 'ID' },
  { name: 'name', label: 'Name' }
]

// ============================================================================
// calculateColumnSummary
// ============================================================================

describe('calculateColumnSummary', () => {
  it('calculates sum correctly', () => {
    const column: ColumnDef = { name: 'salary', label: 'Salary', summary: 'sum', format: 'number' }

    const result = calculateColumnSummary(sampleData, column)

    // 50000 + 60000 + 45000 + 70000 + 55000 = 280000
    expect(result).toContain('280')
  })

  it('calculates avg correctly', () => {
    const column: ColumnDef = { name: 'age', label: 'Age', summary: 'avg', format: 'number' }

    const result = calculateColumnSummary(sampleData, column)

    // (30 + 25 + 35 + 28 + 32) / 5 = 30
    expect(result).toContain('30')
  })

  it('calculates count correctly', () => {
    const column: ColumnDef = { name: 'name', label: 'Name', summary: 'count' }

    const result = calculateColumnSummary(sampleData, column)

    expect(result).toBe('5')
  })

  it('calculates min correctly', () => {
    const column: ColumnDef = { name: 'age', label: 'Age', summary: 'min', format: 'number' }

    const result = calculateColumnSummary(sampleData, column)

    expect(result).toContain('25')
  })

  it('calculates max correctly', () => {
    const column: ColumnDef = { name: 'salary', label: 'Salary', summary: 'max', format: 'number' }

    const result = calculateColumnSummary(sampleData, column)

    expect(result).toContain('70')
  })

  it('returns empty string for no summary', () => {
    const column: ColumnDef = { name: 'name', label: 'Name' }

    const result = calculateColumnSummary(sampleData, column)

    expect(result).toBe('')
  })

  it('returns empty string for "none" summary', () => {
    const column: ColumnDef = { name: 'name', label: 'Name', summary: 'none' }

    const result = calculateColumnSummary(sampleData, column)

    expect(result).toBe('')
  })

  it('returns empty string for empty data', () => {
    const column: ColumnDef = { name: 'salary', label: 'Salary', summary: 'sum' }

    const result = calculateColumnSummary([], column)

    expect(result).toBe('')
  })

  it('handles null/undefined values', () => {
    const dataWithNulls = [
      { value: 10 },
      { value: null },
      { value: 20 },
      { value: undefined },
      { value: 30 }
    ]
    const column: ColumnDef = { name: 'value', label: 'Value', summary: 'sum', format: 'number' }

    const result = calculateColumnSummary(dataWithNulls, column)

    // 10 + 20 + 30 = 60
    expect(result).toContain('60')
  })

  it('handles non-numeric values for numeric operations', () => {
    const dataWithStrings = [
      { value: 'abc' },
      { value: 10 },
      { value: 'xyz' },
      { value: 20 }
    ]
    const column: ColumnDef = { name: 'value', label: 'Value', summary: 'sum', format: 'number' }

    const result = calculateColumnSummary(dataWithStrings, column)

    // Only 10 + 20 = 30
    expect(result).toContain('30')
  })

  it('returns empty string for avg with no valid numbers', () => {
    const dataWithStrings = [
      { value: 'abc' },
      { value: 'xyz' }
    ]
    const column: ColumnDef = { name: 'value', label: 'Value', summary: 'avg', format: 'number' }

    const result = calculateColumnSummary(dataWithStrings, column)

    expect(result).toBe('')
  })
})

// ============================================================================
// calculateSummaryRow
// ============================================================================

describe('calculateSummaryRow', () => {
  it('calculates summary for all columns', () => {
    const result = calculateSummaryRow(sampleData, columnsWithSummary)

    expect(result['age']).toBeDefined()
    expect(result['salary']).toBeDefined()
  })

  it('returns empty string for columns without summary', () => {
    const result = calculateSummaryRow(sampleData, columnsWithSummary)

    expect(result['id']).toBe('')
    expect(result['name']).toBe('')
  })

  it('returns empty object for empty data', () => {
    const result = calculateSummaryRow([], columnsWithSummary)

    expect(Object.values(result).every(v => v === '')).toBe(true)
  })
})

// ============================================================================
// hasSummaryColumns
// ============================================================================

describe('hasSummaryColumns', () => {
  it('returns true when columns have summary', () => {
    const result = hasSummaryColumns(columnsWithSummary)

    expect(result).toBe(true)
  })

  it('returns false when no columns have summary', () => {
    const result = hasSummaryColumns(columnsNoSummary)

    expect(result).toBe(false)
  })

  it('returns false for empty columns array', () => {
    const result = hasSummaryColumns([])

    expect(result).toBe(false)
  })

  it('ignores columns with summary = "none"', () => {
    const columnsWithNone: ColumnDef[] = [
      { name: 'id', label: 'ID', summary: 'none' }
    ]

    const result = hasSummaryColumns(columnsWithNone)

    expect(result).toBe(false)
  })
})

// ============================================================================
// getSummaryColumns
// ============================================================================

describe('getSummaryColumns', () => {
  it('returns only columns with summary', () => {
    const result = getSummaryColumns(columnsWithSummary)

    expect(result).toHaveLength(2)
    expect(result.map(c => c.name)).toEqual(['age', 'salary'])
  })

  it('returns empty array when no summary columns', () => {
    const result = getSummaryColumns(columnsNoSummary)

    expect(result).toHaveLength(0)
  })

  it('excludes columns with summary = "none"', () => {
    const mixed: ColumnDef[] = [
      { name: 'a', label: 'A', summary: 'sum' },
      { name: 'b', label: 'B', summary: 'none' },
      { name: 'c', label: 'C', summary: 'avg' }
    ]

    const result = getSummaryColumns(mixed)

    expect(result).toHaveLength(2)
    expect(result.map(c => c.name)).toEqual(['a', 'c'])
  })
})

// ============================================================================
// getSummaryLabel
// ============================================================================

describe('getSummaryLabel', () => {
  it('returns "Sum" for sum', () => {
    expect(getSummaryLabel('sum')).toBe('Sum')
  })

  it('returns "Average" for avg', () => {
    expect(getSummaryLabel('avg')).toBe('Average')
  })

  it('returns "Count" for count', () => {
    expect(getSummaryLabel('count')).toBe('Count')
  })

  it('returns "Min" for min', () => {
    expect(getSummaryLabel('min')).toBe('Min')
  })

  it('returns "Max" for max', () => {
    expect(getSummaryLabel('max')).toBe('Max')
  })

  it('returns empty string for none', () => {
    expect(getSummaryLabel('none')).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(getSummaryLabel(undefined as unknown as SummaryType)).toBe('')
  })
})
