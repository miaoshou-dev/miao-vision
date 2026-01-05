/**
 * SequenceSnake Layout Tests
 *
 * Unit tests for snake/serpentine layout calculation functions.
 */

import { describe, it, expect } from 'vitest'
import {
  calculateRowCount,
  getItemPosition,
  calculateItemX,
  calculateItemY,
  generateConnectionPath,
  calculateSnakeLayout,
  findItemAtPoint,
  getItemsInRow,
  isRowEnd
} from './layout'
import type { SnakeItem, SnakeItemLayout } from './types'

// Test fixtures
const simpleItems: SnakeItem[] = [
  { id: '1', label: 'Step 1' },
  { id: '2', label: 'Step 2' },
  { id: '3', label: 'Step 3' },
  { id: '4', label: 'Step 4' }
]

const eightItems: SnakeItem[] = Array.from({ length: 8 }, (_, i) => ({
  id: String(i + 1),
  label: `Step ${i + 1}`
}))

const nineItems: SnakeItem[] = Array.from({ length: 9 }, (_, i) => ({
  id: String(i + 1),
  label: `Step ${i + 1}`
}))

const baseColors = {
  colorPrimary: '#6366f1',
  colorPrimaryBg: '#1a1a2e',
  colorPrimaryText: '#ffffff',
  colorText: '#ffffff',
  colorTextSecondary: '#a0a0b0',
  colorWhite: '#ffffff',
  colorBg: '#1a1a2e',
  colorBgElevated: '#2a2a4a',
  isDarkMode: true
}

describe('calculateRowCount', () => {
  it('should return 1 for items fitting in one row', () => {
    expect(calculateRowCount(3, 4)).toBe(1)
  })

  it('should return 2 for items spanning two rows', () => {
    expect(calculateRowCount(5, 4)).toBe(2)
  })

  it('should handle exact fit', () => {
    expect(calculateRowCount(8, 4)).toBe(2)
  })

  it('should return 0 for no items', () => {
    expect(calculateRowCount(0, 4)).toBe(0)
  })

  it('should handle single item per row', () => {
    expect(calculateRowCount(5, 1)).toBe(5)
  })
})

describe('getItemPosition', () => {
  const itemsPerRow = 3

  it('should position first item at row 0, column 0', () => {
    const pos = getItemPosition(0, itemsPerRow)
    expect(pos.row).toBe(0)
    expect(pos.column).toBe(0)
    expect(pos.isReversed).toBe(false)
  })

  it('should position item 2 at row 0, column 2', () => {
    const pos = getItemPosition(2, itemsPerRow)
    expect(pos.row).toBe(0)
    expect(pos.column).toBe(2)
    expect(pos.isReversed).toBe(false)
  })

  it('should reverse second row', () => {
    // Item 3 (index 3) should be at row 1, but column should be reversed
    // In a 3-item row: position 0 in row becomes column 2
    const pos = getItemPosition(3, itemsPerRow)
    expect(pos.row).toBe(1)
    expect(pos.column).toBe(2) // Reversed: first position in row 1 goes to last column
    expect(pos.isReversed).toBe(true)
  })

  it('should position item 5 at row 1, column 0 (reversed row end)', () => {
    const pos = getItemPosition(5, itemsPerRow)
    expect(pos.row).toBe(1)
    expect(pos.column).toBe(0) // Reversed: last position in row 1 goes to first column
    expect(pos.isReversed).toBe(true)
  })

  it('should not reverse third row', () => {
    const pos = getItemPosition(6, itemsPerRow)
    expect(pos.row).toBe(2)
    expect(pos.column).toBe(0)
    expect(pos.isReversed).toBe(false)
  })
})

describe('calculateItemX', () => {
  it('should return 0 for first column', () => {
    expect(calculateItemX(0, 100, 20)).toBe(0)
  })

  it('should include gap for subsequent columns', () => {
    expect(calculateItemX(1, 100, 20)).toBe(120) // 100 + 20
  })

  it('should calculate correctly for third column', () => {
    expect(calculateItemX(2, 100, 20)).toBe(240) // 2 * (100 + 20)
  })
})

describe('calculateItemY', () => {
  it('should return 0 for first row', () => {
    expect(calculateItemY(0, 80, 40)).toBe(0)
  })

  it('should include gap for subsequent rows', () => {
    expect(calculateItemY(1, 80, 40)).toBe(120) // 80 + 40
  })

  it('should calculate correctly for third row', () => {
    expect(calculateItemY(2, 80, 40)).toBe(240) // 2 * (80 + 40)
  })
})

describe('generateConnectionPath', () => {
  const createMockLayout = (
    x: number,
    y: number,
    row: number,
    column: number
  ): SnakeItemLayout => ({
    item: { id: 'test', label: 'Test' },
    index: 0,
    x,
    y,
    width: 100,
    height: 50,
    row,
    column,
    isReversed: row % 2 === 1,
    themeColors: baseColors
  })

  it('should generate horizontal connection for same row', () => {
    const from = createMockLayout(0, 0, 0, 0)
    const to = createMockLayout(120, 0, 0, 1)
    const { type } = generateConnectionPath(from, to, 'straight')
    expect(type).toBe('horizontal')
  })

  it('should generate turn connection between rows with different columns', () => {
    // Turn happens when items are on different rows AND different columns
    const from = createMockLayout(240, 0, 0, 2)
    const to = createMockLayout(120, 90, 1, 1)
    const { type } = generateConnectionPath(from, to, 'straight')
    expect(type).toBe('turn')
  })

  it('should generate vertical connection for same column different row', () => {
    const from = createMockLayout(240, 0, 0, 2)
    const to = createMockLayout(240, 90, 1, 2)
    const { type } = generateConnectionPath(from, to, 'straight')
    expect(type).toBe('vertical')
  })

  it('should generate straight path', () => {
    const from = createMockLayout(0, 0, 0, 0)
    const to = createMockLayout(120, 0, 0, 1)
    const { pathData } = generateConnectionPath(from, to, 'straight')
    expect(pathData).toContain('M')
    expect(pathData).toContain('L')
    expect(pathData).not.toContain('C')
  })

  it('should generate curved path', () => {
    const from = createMockLayout(0, 0, 0, 0)
    const to = createMockLayout(120, 0, 0, 1)
    const { pathData } = generateConnectionPath(from, to, 'curved')
    expect(pathData).toContain('M')
    expect(pathData).toContain('C')
  })
})

describe('calculateSnakeLayout', () => {
  it('should create layouts for all items', () => {
    const layout = calculateSnakeLayout(simpleItems, {
      itemsPerRow: 2,
      baseColors
    })
    expect(layout.items.length).toBe(4)
  })

  it('should calculate correct row count', () => {
    const layout = calculateSnakeLayout(eightItems, {
      itemsPerRow: 4,
      baseColors
    })
    expect(layout.rowCount).toBe(2)
  })

  it('should create connections between items', () => {
    const layout = calculateSnakeLayout(simpleItems, {
      itemsPerRow: 2,
      showConnections: true,
      baseColors
    })
    expect(layout.connections.length).toBe(3) // 4 items = 3 connections
  })

  it('should not create connections when disabled', () => {
    const layout = calculateSnakeLayout(simpleItems, {
      itemsPerRow: 2,
      showConnections: false,
      baseColors
    })
    expect(layout.connections.length).toBe(0)
  })

  it('should assign theme colors to items', () => {
    const layout = calculateSnakeLayout(simpleItems, { baseColors })
    layout.items.forEach((item) => {
      expect(item.themeColors).toBeDefined()
      expect(item.themeColors.colorPrimary).toBeDefined()
    })
  })

  it('should generate gradient IDs when enabled', () => {
    const layout = calculateSnakeLayout(simpleItems, {
      baseColors,
      gradientsEnabled: true,
      instanceId: 'test'
    })
    layout.items.forEach((item, index) => {
      expect(item.gradientId).toBe(`grad-test-${index}`)
    })
  })

  it('should calculate total dimensions correctly', () => {
    const layout = calculateSnakeLayout(simpleItems, {
      itemsPerRow: 2,
      itemWidth: 100,
      itemHeight: 50,
      horizontalGap: 20,
      verticalGap: 30,
      baseColors
    })
    expect(layout.totalWidth).toBe(220) // 2 * 100 + 1 * 20
    expect(layout.totalHeight).toBe(130) // 2 * 50 + 1 * 30
  })

  it('should handle single item', () => {
    const layout = calculateSnakeLayout([simpleItems[0]], { baseColors })
    expect(layout.items.length).toBe(1)
    expect(layout.connections.length).toBe(0)
  })

  it('should position items in snake pattern', () => {
    const layout = calculateSnakeLayout(nineItems, {
      itemsPerRow: 3,
      baseColors
    })

    // First row: left to right (columns 0, 1, 2)
    expect(layout.items[0].column).toBe(0)
    expect(layout.items[1].column).toBe(1)
    expect(layout.items[2].column).toBe(2)

    // Second row: right to left (columns 2, 1, 0 due to reversal)
    expect(layout.items[3].column).toBe(2)
    expect(layout.items[4].column).toBe(1)
    expect(layout.items[5].column).toBe(0)

    // Third row: left to right again
    expect(layout.items[6].column).toBe(0)
    expect(layout.items[7].column).toBe(1)
    expect(layout.items[8].column).toBe(2)
  })
})

describe('findItemAtPoint', () => {
  const layout = calculateSnakeLayout(simpleItems, {
    itemsPerRow: 2,
    itemWidth: 100,
    itemHeight: 50,
    horizontalGap: 20,
    verticalGap: 30,
    baseColors
  })

  it('should find item when point is inside', () => {
    const result = findItemAtPoint(50, 25, layout)
    expect(result).toBe(0)
  })

  it('should return -1 when point is in gap', () => {
    const result = findItemAtPoint(110, 25, layout)
    expect(result).toBe(-1)
  })

  it('should return -1 when point is outside', () => {
    const result = findItemAtPoint(500, 500, layout)
    expect(result).toBe(-1)
  })

  it('should find correct item in second row', () => {
    const result = findItemAtPoint(50, 100, layout)
    expect(result).toBeGreaterThanOrEqual(2)
  })
})

describe('getItemsInRow', () => {
  const layout = calculateSnakeLayout(nineItems, {
    itemsPerRow: 3,
    baseColors
  })

  it('should return items from first row', () => {
    const rowItems = getItemsInRow(layout, 0)
    expect(rowItems.length).toBe(3)
  })

  it('should return items in column order', () => {
    const rowItems = getItemsInRow(layout, 0)
    expect(rowItems[0].column).toBe(0)
    expect(rowItems[1].column).toBe(1)
    expect(rowItems[2].column).toBe(2)
  })

  it('should return empty array for non-existent row', () => {
    const rowItems = getItemsInRow(layout, 10)
    expect(rowItems.length).toBe(0)
  })
})

describe('isRowEnd', () => {
  it('should return true at end of first row', () => {
    expect(isRowEnd(2, 3, 9)).toBe(true)
  })

  it('should return false in middle of row', () => {
    expect(isRowEnd(1, 3, 9)).toBe(false)
  })

  it('should return false for last item', () => {
    expect(isRowEnd(8, 3, 9)).toBe(false)
  })

  it('should return true at end of second row', () => {
    // With 7 items and 3 per row:
    // Row 0: items 0, 1, 2 (item 2 is row end)
    // Row 1: items 3, 4, 5 (item 5 is row end)
    // Row 2: item 6 (no row end, it's last item)
    expect(isRowEnd(5, 3, 7)).toBe(true) // End of second row
  })
})
