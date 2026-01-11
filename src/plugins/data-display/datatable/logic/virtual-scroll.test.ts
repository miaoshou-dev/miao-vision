/**
 * DataTable Virtual Scroll Logic - Unit Tests
 *
 * Tests for pure functions in virtual-scroll.ts
 */

import { describe, it, expect } from 'vitest'
import {
  calculateRowHeight,
  calculateOverscan,
  calculateVisibleRange,
  calculateTotalHeight,
  calculateOffsetY,
  getVisibleRows
} from './virtual-scroll'
import type { ColumnDef } from '../types'

// ============================================================================
// Test Fixtures
// ============================================================================

const basicColumns: ColumnDef[] = [
  { name: 'id', label: 'ID' },
  { name: 'name', label: 'Name' }
]

const columnsWithImage: ColumnDef[] = [
  { name: 'id', label: 'ID' },
  { name: 'avatar', label: 'Avatar', contentType: 'image', imageConfig: { height: 80 } }
]

const columnsWithFrozen: ColumnDef[] = [
  { name: 'id', label: 'ID', frozen: true },
  { name: 'name', label: 'Name' }
]

const columnsWithImageAndFrozen: ColumnDef[] = [
  { name: 'id', label: 'ID', frozen: true },
  { name: 'avatar', label: 'Avatar', contentType: 'image', imageConfig: { height: 60 } }
]

// ============================================================================
// calculateRowHeight
// ============================================================================

describe('calculateRowHeight', () => {
  it('returns configured height when provided', () => {
    const result = calculateRowHeight(basicColumns, 50)
    expect(result).toBe(50)
  })

  it('returns default height for basic columns', () => {
    const result = calculateRowHeight(basicColumns)
    expect(result).toBe(36)
  })

  it('returns image height + padding for image columns', () => {
    const result = calculateRowHeight(columnsWithImage)
    // 80 (image height) + 16 (padding)
    expect(result).toBe(96)
  })

  it('uses max image height when multiple image columns exist', () => {
    const multiImageColumns: ColumnDef[] = [
      { name: 'small', label: 'Small', contentType: 'image', imageConfig: { height: 40 } },
      { name: 'large', label: 'Large', contentType: 'image', imageConfig: { height: 100 } }
    ]

    const result = calculateRowHeight(multiImageColumns)
    // 100 (max height) + 16 (padding)
    expect(result).toBe(116)
  })

  it('uses default image height when not specified', () => {
    const imageNoHeight: ColumnDef[] = [
      { name: 'avatar', label: 'Avatar', contentType: 'image' }
    ]

    const result = calculateRowHeight(imageNoHeight)
    // 50 (default) + 16 (padding)
    expect(result).toBe(66)
  })
})

// ============================================================================
// calculateOverscan
// ============================================================================

describe('calculateOverscan', () => {
  it('returns default overscan for basic columns', () => {
    const result = calculateOverscan(basicColumns)
    expect(result).toBe(5)
  })

  it('returns moderate overscan for image columns', () => {
    const result = calculateOverscan(columnsWithImage)
    expect(result).toBe(10)
  })

  it('returns high overscan for frozen + image columns', () => {
    const result = calculateOverscan(columnsWithImageAndFrozen)
    expect(result).toBe(20)
  })

  it('returns default overscan for frozen columns without images', () => {
    const result = calculateOverscan(columnsWithFrozen)
    expect(result).toBe(5)
  })
})

// ============================================================================
// calculateVisibleRange
// ============================================================================

describe('calculateVisibleRange', () => {
  it('calculates visible range from top', () => {
    const result = calculateVisibleRange(
      0,      // scrollTop
      100,    // totalRows
      36,     // rowHeight
      400,    // maxHeight
      5       // overscan
    )

    expect(result.start).toBe(0)
    // (400 - 40) / 36 + 10 overscan ≈ 20
    expect(result.end).toBeLessThanOrEqual(100)
  })

  it('calculates visible range when scrolled', () => {
    const result = calculateVisibleRange(
      360,    // scrollTop (10 rows down)
      100,    // totalRows
      36,     // rowHeight
      400,    // maxHeight
      5       // overscan
    )

    // Math.floor(360/36) - 5 = 5
    expect(result.start).toBe(5)
    expect(result.end).toBeGreaterThan(result.start)
  })

  it('clamps start to 0', () => {
    const result = calculateVisibleRange(
      50,     // scrollTop
      100,    // totalRows
      36,     // rowHeight
      400,    // maxHeight
      5       // overscan
    )

    expect(result.start).toBeGreaterThanOrEqual(0)
  })

  it('clamps end to totalRows', () => {
    const result = calculateVisibleRange(
      3500,   // scrollTop (near end)
      100,    // totalRows
      36,     // rowHeight
      400,    // maxHeight
      5       // overscan
    )

    expect(result.end).toBeLessThanOrEqual(100)
  })

  it('handles empty data', () => {
    const result = calculateVisibleRange(0, 0, 36, 400, 5)

    expect(result.start).toBe(0)
    expect(result.end).toBe(0)
  })
})

// ============================================================================
// calculateTotalHeight
// ============================================================================

describe('calculateTotalHeight', () => {
  it('calculates total height correctly', () => {
    const result = calculateTotalHeight(100, 36)
    expect(result).toBe(3600)
  })

  it('returns 0 for empty data', () => {
    const result = calculateTotalHeight(0, 36)
    expect(result).toBe(0)
  })

  it('handles custom row heights', () => {
    const result = calculateTotalHeight(50, 100)
    expect(result).toBe(5000)
  })
})

// ============================================================================
// calculateOffsetY
// ============================================================================

describe('calculateOffsetY', () => {
  it('calculates Y offset from start index', () => {
    const result = calculateOffsetY(10, 36)
    expect(result).toBe(360)
  })

  it('returns 0 for start index 0', () => {
    const result = calculateOffsetY(0, 36)
    expect(result).toBe(0)
  })
})

// ============================================================================
// getVisibleRows
// ============================================================================

describe('getVisibleRows', () => {
  const testData = [
    { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 },
    { id: 6 }, { id: 7 }, { id: 8 }, { id: 9 }, { id: 10 }
  ]

  it('returns slice of data for visible range', () => {
    const result = getVisibleRows(testData, { start: 2, end: 5 })

    expect(result).toHaveLength(3)
    expect(result[0].id).toBe(3)
    expect(result[2].id).toBe(5)
  })

  it('returns all data when range covers entire array', () => {
    const result = getVisibleRows(testData, { start: 0, end: 10 })

    expect(result).toHaveLength(10)
  })

  it('returns empty array for empty range', () => {
    const result = getVisibleRows(testData, { start: 5, end: 5 })

    expect(result).toHaveLength(0)
  })

  it('handles range beyond array bounds', () => {
    const result = getVisibleRows(testData, { start: 8, end: 15 })

    expect(result).toHaveLength(2) // Only rows 9 and 10
  })
})
