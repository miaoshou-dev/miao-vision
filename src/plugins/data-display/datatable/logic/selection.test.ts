/**
 * DataTable Selection Logic - Unit Tests
 *
 * Tests for pure functions in selection.ts
 */

import { describe, it, expect } from 'vitest'
import {
  createSelectionState,
  toggleRowSelection,
  selectRow,
  deselectRow,
  toggleSelectAll,
  selectAll,
  clearSelection,
  isAllSelected,
  isSomeSelected,
  isRowSelected,
  getSelectedIndices,
  getSelectedRows,
  selectRange,
  invertSelection
} from './selection'

// ============================================================================
// createSelectionState
// ============================================================================

describe('createSelectionState', () => {
  it('creates empty selection state', () => {
    const state = createSelectionState()

    expect(state.selectedRows.size).toBe(0)
  })
})

// ============================================================================
// toggleRowSelection
// ============================================================================

describe('toggleRowSelection', () => {
  it('adds row when not selected', () => {
    const selected = new Set<number>([1, 2])

    const result = toggleRowSelection(selected, 3)

    expect(result.has(3)).toBe(true)
    expect(result.size).toBe(3)
  })

  it('removes row when already selected', () => {
    const selected = new Set<number>([1, 2, 3])

    const result = toggleRowSelection(selected, 2)

    expect(result.has(2)).toBe(false)
    expect(result.size).toBe(2)
  })

  it('does not mutate original set', () => {
    const selected = new Set<number>([1, 2])

    toggleRowSelection(selected, 3)

    expect(selected.size).toBe(2)
    expect(selected.has(3)).toBe(false)
  })
})

// ============================================================================
// selectRow
// ============================================================================

describe('selectRow', () => {
  it('creates set with single row', () => {
    const result = selectRow(5)

    expect(result.size).toBe(1)
    expect(result.has(5)).toBe(true)
  })
})

// ============================================================================
// deselectRow
// ============================================================================

describe('deselectRow', () => {
  it('removes row from selection', () => {
    const selected = new Set<number>([1, 2, 3])

    const result = deselectRow(selected, 2)

    expect(result.has(2)).toBe(false)
    expect(result.size).toBe(2)
  })

  it('handles deselecting non-existent row', () => {
    const selected = new Set<number>([1, 2])

    const result = deselectRow(selected, 5)

    expect(result.size).toBe(2)
  })
})

// ============================================================================
// toggleSelectAll
// ============================================================================

describe('toggleSelectAll', () => {
  it('selects all when none selected', () => {
    const selected = new Set<number>()

    const result = toggleSelectAll(selected, 5)

    expect(result.size).toBe(5)
    expect(result.has(0)).toBe(true)
    expect(result.has(4)).toBe(true)
  })

  it('selects all when some selected', () => {
    const selected = new Set<number>([1, 3])

    const result = toggleSelectAll(selected, 5)

    expect(result.size).toBe(5)
  })

  it('deselects all when all selected', () => {
    const selected = new Set<number>([0, 1, 2, 3, 4])

    const result = toggleSelectAll(selected, 5)

    expect(result.size).toBe(0)
  })
})

// ============================================================================
// selectAll
// ============================================================================

describe('selectAll', () => {
  it('creates set with all indices', () => {
    const result = selectAll(5)

    expect(result.size).toBe(5)
    expect(Array.from(result)).toEqual([0, 1, 2, 3, 4])
  })

  it('returns empty set for 0 rows', () => {
    const result = selectAll(0)

    expect(result.size).toBe(0)
  })
})

// ============================================================================
// clearSelection
// ============================================================================

describe('clearSelection', () => {
  it('returns empty set', () => {
    const result = clearSelection()

    expect(result.size).toBe(0)
  })
})

// ============================================================================
// isAllSelected
// ============================================================================

describe('isAllSelected', () => {
  it('returns true when all rows selected', () => {
    const selected = new Set<number>([0, 1, 2, 3, 4])

    expect(isAllSelected(selected, 5)).toBe(true)
  })

  it('returns false when some rows selected', () => {
    const selected = new Set<number>([1, 3])

    expect(isAllSelected(selected, 5)).toBe(false)
  })

  it('returns false when none selected', () => {
    const selected = new Set<number>()

    expect(isAllSelected(selected, 5)).toBe(false)
  })

  it('returns false for empty data', () => {
    const selected = new Set<number>()

    expect(isAllSelected(selected, 0)).toBe(false)
  })
})

// ============================================================================
// isSomeSelected
// ============================================================================

describe('isSomeSelected', () => {
  it('returns true when some (but not all) selected', () => {
    const selected = new Set<number>([1, 3])

    expect(isSomeSelected(selected, 5)).toBe(true)
  })

  it('returns false when all selected', () => {
    const selected = new Set<number>([0, 1, 2, 3, 4])

    expect(isSomeSelected(selected, 5)).toBe(false)
  })

  it('returns false when none selected', () => {
    const selected = new Set<number>()

    expect(isSomeSelected(selected, 5)).toBe(false)
  })
})

// ============================================================================
// isRowSelected
// ============================================================================

describe('isRowSelected', () => {
  it('returns true for selected row', () => {
    const selected = new Set<number>([1, 3, 5])

    expect(isRowSelected(selected, 3)).toBe(true)
  })

  it('returns false for unselected row', () => {
    const selected = new Set<number>([1, 3, 5])

    expect(isRowSelected(selected, 2)).toBe(false)
  })
})

// ============================================================================
// getSelectedIndices
// ============================================================================

describe('getSelectedIndices', () => {
  it('returns sorted array of indices', () => {
    const selected = new Set<number>([5, 1, 3])

    const result = getSelectedIndices(selected)

    expect(result).toEqual([1, 3, 5])
  })

  it('returns empty array for empty selection', () => {
    const selected = new Set<number>()

    const result = getSelectedIndices(selected)

    expect(result).toEqual([])
  })
})

// ============================================================================
// getSelectedRows
// ============================================================================

describe('getSelectedRows', () => {
  const testData = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
    { id: 3, name: 'Charlie' },
    { id: 4, name: 'Diana' }
  ]

  it('returns selected rows in sorted order', () => {
    const selected = new Set<number>([2, 0])

    const result = getSelectedRows(testData, selected)

    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Alice')
    expect(result[1].name).toBe('Charlie')
  })

  it('returns empty array for empty selection', () => {
    const selected = new Set<number>()

    const result = getSelectedRows(testData, selected)

    expect(result).toEqual([])
  })

  it('filters out invalid indices', () => {
    const selected = new Set<number>([1, 10]) // 10 is out of bounds

    const result = getSelectedRows(testData, selected)

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Bob')
  })
})

// ============================================================================
// selectRange
// ============================================================================

describe('selectRange', () => {
  it('selects range from start to end', () => {
    const selected = new Set<number>([0])

    const result = selectRange(selected, 2, 5)

    expect(result.has(0)).toBe(true) // Original
    expect(result.has(2)).toBe(true)
    expect(result.has(3)).toBe(true)
    expect(result.has(4)).toBe(true)
    expect(result.has(5)).toBe(true)
    expect(result.size).toBe(5)
  })

  it('handles reverse range (end < start)', () => {
    const selected = new Set<number>()

    const result = selectRange(selected, 5, 2)

    expect(result.has(2)).toBe(true)
    expect(result.has(3)).toBe(true)
    expect(result.has(4)).toBe(true)
    expect(result.has(5)).toBe(true)
    expect(result.size).toBe(4)
  })

  it('adds to existing selection', () => {
    const selected = new Set<number>([0, 10])

    const result = selectRange(selected, 3, 5)

    expect(result.size).toBe(5) // 0, 3, 4, 5, 10
  })
})

// ============================================================================
// invertSelection
// ============================================================================

describe('invertSelection', () => {
  it('inverts selection', () => {
    const selected = new Set<number>([1, 3])

    const result = invertSelection(selected, 5)

    expect(result.has(0)).toBe(true)
    expect(result.has(1)).toBe(false)
    expect(result.has(2)).toBe(true)
    expect(result.has(3)).toBe(false)
    expect(result.has(4)).toBe(true)
    expect(result.size).toBe(3)
  })

  it('selects all when none selected', () => {
    const selected = new Set<number>()

    const result = invertSelection(selected, 5)

    expect(result.size).toBe(5)
  })

  it('deselects all when all selected', () => {
    const selected = new Set<number>([0, 1, 2, 3, 4])

    const result = invertSelection(selected, 5)

    expect(result.size).toBe(0)
  })
})
