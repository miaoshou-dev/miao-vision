/**
 * Table Utilities Tests
 */

import { describe, it, expect } from 'vitest'
import {
  getPaginationInfo,
  paginateData,
  getPageNumbers,
  inferAlignment,
  formatCellValue,
  inferColumns,
  formatColumnLabel,
  toCSV,
  toJSON,
  toTSV,
  createSelectionState,
  toggleSelection,
  selectRange,
  selectAll,
  clearSelection,
  isSelected,
  getSelectedItems
} from './index'

// ============================================================================
// Pagination Tests
// ============================================================================

describe('getPaginationInfo', () => {
  it('calculates correct pagination info', () => {
    const info = getPaginationInfo({ page: 2, pageSize: 10, totalRows: 35 })

    expect(info.totalPages).toBe(4)
    expect(info.startRow).toBe(11)
    expect(info.endRow).toBe(20)
    expect(info.hasNext).toBe(true)
    expect(info.hasPrev).toBe(true)
  })

  it('handles first page', () => {
    const info = getPaginationInfo({ page: 1, pageSize: 10, totalRows: 35 })

    expect(info.hasPrev).toBe(false)
    expect(info.hasNext).toBe(true)
    expect(info.startRow).toBe(1)
    expect(info.endRow).toBe(10)
  })

  it('handles last page', () => {
    const info = getPaginationInfo({ page: 4, pageSize: 10, totalRows: 35 })

    expect(info.hasPrev).toBe(true)
    expect(info.hasNext).toBe(false)
    expect(info.startRow).toBe(31)
    expect(info.endRow).toBe(35)
  })

  it('handles empty data', () => {
    const info = getPaginationInfo({ page: 1, pageSize: 10, totalRows: 0 })

    expect(info.totalPages).toBe(1)
    expect(info.startRow).toBe(1)
    expect(info.endRow).toBe(0)
  })

  it('clamps page to valid range', () => {
    const info = getPaginationInfo({ page: 100, pageSize: 10, totalRows: 35 })

    expect(info.page).toBe(4) // Clamped to last page
  })
})

describe('paginateData', () => {
  const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  it('returns correct slice for page 1', () => {
    expect(paginateData(data, 1, 3)).toEqual([1, 2, 3])
  })

  it('returns correct slice for middle page', () => {
    expect(paginateData(data, 2, 3)).toEqual([4, 5, 6])
  })

  it('returns correct slice for last page', () => {
    expect(paginateData(data, 4, 3)).toEqual([10])
  })
})

describe('getPageNumbers', () => {
  it('returns all pages when total is small', () => {
    expect(getPageNumbers(1, 3, 5)).toEqual([1, 2, 3])
  })

  it('shows ellipsis for large page counts', () => {
    const result = getPageNumbers(5, 10, 5)
    expect(result).toContain(1)
    expect(result).toContain(10)
    expect(result).toContain('...')
  })

  it('includes current page in result', () => {
    const result = getPageNumbers(5, 10, 5)
    expect(result).toContain(5)
  })
})

// ============================================================================
// Column Formatting Tests
// ============================================================================

describe('inferAlignment', () => {
  it('returns right for numbers', () => {
    expect(inferAlignment(123)).toBe('right')
  })

  it('returns center for booleans', () => {
    expect(inferAlignment(true)).toBe('center')
  })

  it('returns left for strings', () => {
    expect(inferAlignment('text')).toBe('left')
  })
})

describe('formatCellValue', () => {
  it('formats null as empty string', () => {
    expect(formatCellValue(null)).toBe('')
    expect(formatCellValue(undefined)).toBe('')
  })

  it('formats booleans', () => {
    expect(formatCellValue(true)).toBe('Yes')
    expect(formatCellValue(false)).toBe('No')
  })

  it('uses custom formatter', () => {
    const formatter = (v: unknown) => `$${v}`
    expect(formatCellValue(100, formatter)).toBe('$100')
  })
})

describe('inferColumns', () => {
  it('infers columns from data', () => {
    const data = [{ name: 'Alice', age: 30 }]
    const columns = inferColumns(data)

    expect(columns).toHaveLength(2)
    expect(columns[0].key).toBe('name')
    expect(columns[0].align).toBe('left')
    expect(columns[1].key).toBe('age')
    expect(columns[1].align).toBe('right')
  })

  it('excludes specified keys', () => {
    const data = [{ id: 1, name: 'Alice', age: 30 }]
    const columns = inferColumns(data, { excludeKeys: ['id'] })

    expect(columns).toHaveLength(2)
    expect(columns.find(c => c.key === 'id')).toBeUndefined()
  })

  it('returns empty for empty data', () => {
    expect(inferColumns([])).toEqual([])
  })
})

describe('formatColumnLabel', () => {
  it('converts snake_case', () => {
    expect(formatColumnLabel('first_name')).toBe('First Name')
  })

  it('converts camelCase', () => {
    expect(formatColumnLabel('firstName')).toBe('First Name')
  })

  it('handles single word', () => {
    expect(formatColumnLabel('name')).toBe('Name')
  })
})

// ============================================================================
// Export Tests
// ============================================================================

describe('toCSV', () => {
  const data = [
    { name: 'Alice', age: 30 },
    { name: 'Bob', age: 25 }
  ]

  it('generates CSV with headers', () => {
    const csv = toCSV(data)
    const lines = csv.split('\n')

    expect(lines[0]).toBe('Name,Age')
    expect(lines[1]).toBe('Alice,30')
    expect(lines[2]).toBe('Bob,25')
  })

  it('generates CSV without headers', () => {
    const csv = toCSV(data, { includeHeaders: false })
    const lines = csv.split('\n')

    expect(lines[0]).toBe('Alice,30')
  })

  it('escapes values with commas', () => {
    const csvData = [{ name: 'Doe, John', age: 30 }]
    const csv = toCSV(csvData)

    expect(csv).toContain('"Doe, John"')
  })

  it('escapes values with quotes', () => {
    const csvData = [{ name: 'Say "Hello"', age: 30 }]
    const csv = toCSV(csvData)

    expect(csv).toContain('"Say ""Hello"""')
  })

  it('exports only specified columns', () => {
    const csv = toCSV(data, { columns: ['name'] })
    const lines = csv.split('\n')

    expect(lines[0]).toBe('Name')
    expect(lines[1]).toBe('Alice')
  })
})

describe('toJSON', () => {
  const data = [
    { name: 'Alice', age: 30 },
    { name: 'Bob', age: 25 }
  ]

  it('generates valid JSON', () => {
    const json = toJSON(data)
    const parsed = JSON.parse(json)

    expect(parsed).toEqual(data)
  })

  it('exports only specified columns', () => {
    const json = toJSON(data, { columns: ['name'] })
    const parsed = JSON.parse(json)

    expect(parsed[0]).toEqual({ name: 'Alice' })
  })
})

describe('toTSV', () => {
  it('uses tab as delimiter', () => {
    const data = [{ name: 'Alice', age: 30 }]
    const tsv = toTSV(data)

    expect(tsv).toContain('\t')
  })
})

// ============================================================================
// Selection Tests
// ============================================================================

describe('selection utilities', () => {
  const items = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
    { id: 3, name: 'Charlie' }
  ]

  it('creates empty selection state', () => {
    const state = createSelectionState()
    expect(state.selectedIds.size).toBe(0)
    expect(state.lastSelectedId).toBeNull()
  })

  it('toggles selection in multiple mode', () => {
    let state = createSelectionState()

    state = toggleSelection(state, 1, 'multiple')
    expect(isSelected(state, 1)).toBe(true)

    state = toggleSelection(state, 2, 'multiple')
    expect(isSelected(state, 1)).toBe(true)
    expect(isSelected(state, 2)).toBe(true)

    state = toggleSelection(state, 1, 'multiple')
    expect(isSelected(state, 1)).toBe(false)
    expect(isSelected(state, 2)).toBe(true)
  })

  it('toggles selection in single mode', () => {
    let state = createSelectionState()

    state = toggleSelection(state, 1, 'single')
    expect(isSelected(state, 1)).toBe(true)

    state = toggleSelection(state, 2, 'single')
    expect(isSelected(state, 1)).toBe(false)
    expect(isSelected(state, 2)).toBe(true)
  })

  it('selects range', () => {
    let state = createSelectionState()
    state = toggleSelection(state, 1, 'multiple')
    state = selectRange(state, items, 3)

    expect(isSelected(state, 1)).toBe(true)
    expect(isSelected(state, 2)).toBe(true)
    expect(isSelected(state, 3)).toBe(true)
  })

  it('selects all', () => {
    const state = selectAll(items)

    expect(state.selectedIds.size).toBe(3)
    expect(isSelected(state, 1)).toBe(true)
    expect(isSelected(state, 2)).toBe(true)
    expect(isSelected(state, 3)).toBe(true)
  })

  it('clears selection', () => {
    let state = selectAll(items)
    state = clearSelection()

    expect(state.selectedIds.size).toBe(0)
  })

  it('gets selected items', () => {
    let state = createSelectionState()
    state = toggleSelection(state, 1, 'multiple')
    state = toggleSelection(state, 3, 'multiple')

    const selected = getSelectedItems(state, items)
    expect(selected).toHaveLength(2)
    expect(selected.map(i => i.name)).toEqual(['Alice', 'Charlie'])
  })
})
