/**
 * DataTable Grouping Logic - Unit Tests
 *
 * Tests for pure functions in grouping.ts
 */

import { describe, it, expect } from 'vitest'
import {
  groupData,
  toggleGroup,
  isGroupCollapsed,
  getVisibleGroupedRows
} from './grouping'
import type { ColumnDef } from '../types'

// ============================================================================
// Test Fixtures
// ============================================================================

const sampleData = [
  { id: 1, category: 'A', name: 'Item 1', value: 100 },
  { id: 2, category: 'B', name: 'Item 2', value: 200 },
  { id: 3, category: 'A', name: 'Item 3', value: 150 },
  { id: 4, category: 'B', name: 'Item 4', value: 300 },
  { id: 5, category: 'A', name: 'Item 5', value: 50 },
  { id: 6, category: 'C', name: 'Item 6', value: 250 }
]

const columns: ColumnDef[] = [
  { name: 'id', label: 'ID' },
  { name: 'category', label: 'Category' },
  { name: 'name', label: 'Name' },
  { name: 'value', label: 'Value', summary: 'sum', format: 'number' }
]

// ============================================================================
// groupData
// ============================================================================

describe('groupData', () => {
  it('groups data by specified column', () => {
    const result = groupData(sampleData, 'category', columns, false)

    expect(result).toHaveLength(3) // A, B, C

    const groupA = result.find(g => g.groupKey === 'A')
    expect(groupA?.rows).toHaveLength(3)

    const groupB = result.find(g => g.groupKey === 'B')
    expect(groupB?.rows).toHaveLength(2)

    const groupC = result.find(g => g.groupKey === 'C')
    expect(groupC?.rows).toHaveLength(1)
  })

  it('returns empty array when no groupBy column', () => {
    const result = groupData(sampleData, '', columns, false)

    expect(result).toHaveLength(0)
  })

  it('preserves group value in groupData', () => {
    const result = groupData(sampleData, 'category', columns, false)

    const groupA = result.find(g => g.groupKey === 'A')
    expect(groupA?.groupValue).toBe('A')
  })

  it('calculates subtotals when enabled', () => {
    const result = groupData(sampleData, 'category', columns, true)

    const groupA = result.find(g => g.groupKey === 'A')
    expect(groupA?.subtotals).toBeDefined()
    expect(groupA?.subtotals?.['value']).toBeDefined()
    // Sum of A: 100 + 150 + 50 = 300
  })

  it('does not calculate subtotals when disabled', () => {
    const result = groupData(sampleData, 'category', columns, false)

    const groupA = result.find(g => g.groupKey === 'A')
    expect(groupA?.subtotals).toBeUndefined()
  })

  it('handles null/undefined group values', () => {
    const dataWithNull = [
      { id: 1, category: null, name: 'Item 1', value: 100 },
      { id: 2, category: 'A', name: 'Item 2', value: 200 }
    ]

    const result = groupData(dataWithNull, 'category', columns, false)

    expect(result).toHaveLength(2)
    const nullGroup = result.find(g => g.groupKey === 'null')
    expect(nullGroup).toBeDefined()
  })
})

// ============================================================================
// toggleGroup
// ============================================================================

describe('toggleGroup', () => {
  it('adds group to collapsed set', () => {
    const collapsed = new Set<string>()

    const result = toggleGroup(collapsed, 'groupA')

    expect(result.has('groupA')).toBe(true)
    expect(result.size).toBe(1)
  })

  it('removes group from collapsed set', () => {
    const collapsed = new Set<string>(['groupA', 'groupB'])

    const result = toggleGroup(collapsed, 'groupA')

    expect(result.has('groupA')).toBe(false)
    expect(result.has('groupB')).toBe(true)
    expect(result.size).toBe(1)
  })

  it('does not mutate original set', () => {
    const collapsed = new Set<string>(['groupA'])

    toggleGroup(collapsed, 'groupA')

    expect(collapsed.has('groupA')).toBe(true)
    expect(collapsed.size).toBe(1)
  })
})

// ============================================================================
// isGroupCollapsed
// ============================================================================

describe('isGroupCollapsed', () => {
  it('returns true for collapsed group', () => {
    const collapsed = new Set<string>(['groupA', 'groupB'])

    expect(isGroupCollapsed(collapsed, 'groupA')).toBe(true)
  })

  it('returns false for expanded group', () => {
    const collapsed = new Set<string>(['groupA'])

    expect(isGroupCollapsed(collapsed, 'groupB')).toBe(false)
  })

  it('returns false for empty set', () => {
    const collapsed = new Set<string>()

    expect(isGroupCollapsed(collapsed, 'anyGroup')).toBe(false)
  })
})

// ============================================================================
// getVisibleGroupedRows
// ============================================================================

describe('getVisibleGroupedRows', () => {
  const groupedData = [
    {
      groupKey: 'A',
      groupValue: 'A',
      rows: [
        { id: 1, name: 'A1' },
        { id: 2, name: 'A2' }
      ]
    },
    {
      groupKey: 'B',
      groupValue: 'B',
      rows: [
        { id: 3, name: 'B1' },
        { id: 4, name: 'B2' },
        { id: 5, name: 'B3' }
      ]
    },
    {
      groupKey: 'C',
      groupValue: 'C',
      rows: [
        { id: 6, name: 'C1' }
      ]
    }
  ]

  it('returns all rows when no groups collapsed', () => {
    const collapsed = new Set<string>()

    const result = getVisibleGroupedRows(groupedData, collapsed)

    expect(result).toHaveLength(6)
  })

  it('hides rows of collapsed groups', () => {
    const collapsed = new Set<string>(['B'])

    const result = getVisibleGroupedRows(groupedData, collapsed)

    expect(result).toHaveLength(3) // A: 2, C: 1
    expect(result.every(r => r.name !== 'B1' && r.name !== 'B2' && r.name !== 'B3')).toBe(true)
  })

  it('hides rows of multiple collapsed groups', () => {
    const collapsed = new Set<string>(['A', 'C'])

    const result = getVisibleGroupedRows(groupedData, collapsed)

    expect(result).toHaveLength(3) // B only
    expect(result.every(r => r.name.startsWith('B'))).toBe(true)
  })

  it('returns empty array when all groups collapsed', () => {
    const collapsed = new Set<string>(['A', 'B', 'C'])

    const result = getVisibleGroupedRows(groupedData, collapsed)

    expect(result).toHaveLength(0)
  })
})
