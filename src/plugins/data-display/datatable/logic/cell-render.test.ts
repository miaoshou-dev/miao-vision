/**
 * DataTable Cell Rendering Logic - Unit Tests
 *
 * Tests for pure functions in cell-render.ts
 */

import { describe, it, expect } from 'vitest'
import {
  getCellValue,
  getCellStyle,
  getDataBarWidth,
  interpolateColor,
  getColorScaleBackground,
  getIconForValue
} from './cell-render'
import type { ColumnDef } from '../types'

// ============================================================================
// Test Fixtures
// ============================================================================

const basicColumn: ColumnDef = {
  name: 'value',
  label: 'Value'
}

const numericColumn: ColumnDef = {
  name: 'amount',
  label: 'Amount',
  format: 'number'
}

const conditionalColumn: ColumnDef = {
  name: 'score',
  label: 'Score',
  conditionalFormat: [
    { condition: 'greater_than', value: 80, backgroundColor: '#22C55E', textColor: '#FFFFFF' },
    { condition: 'less_than', value: 50, backgroundColor: '#EF4444', textColor: '#FFFFFF' },
    { condition: 'between', value: 50, value2: 80, backgroundColor: '#EAB308' }
  ]
}

const dataBarColumn: ColumnDef = {
  name: 'sales',
  label: 'Sales',
  showDataBar: true
}

const colorScaleColumn: ColumnDef = {
  name: 'revenue',
  label: 'Revenue',
  colorScale: { type: 'red-green' }
}

const iconSetColumn: ColumnDef = {
  name: 'rating',
  label: 'Rating',
  iconSet: { type: 'arrows' }
}

// ============================================================================
// getCellValue
// ============================================================================

describe('getCellValue', () => {
  it('returns formatted string value', () => {
    const row = { value: 'Hello' }

    const result = getCellValue(row, basicColumn)

    expect(result).toBe('Hello')
  })

  it('returns formatted number value', () => {
    const row = { amount: 1234.5678 }

    const result = getCellValue(row, numericColumn)

    expect(result).toContain('1,234')
  })

  it('handles null values', () => {
    const row = { value: null }

    const result = getCellValue(row, basicColumn)

    expect(result).toBe('')
  })

  it('handles undefined values', () => {
    const row = { other: 'value' }

    const result = getCellValue(row, basicColumn)

    expect(result).toBe('')
  })
})

// ============================================================================
// getCellStyle
// ============================================================================

describe('getCellStyle', () => {
  it('returns empty string when no conditional format', () => {
    const row = { score: 75 }

    const result = getCellStyle(row, basicColumn)

    expect(result).toBe('')
  })

  it('returns empty string for non-numeric values', () => {
    const row = { score: 'abc' }

    const result = getCellStyle(row, conditionalColumn)

    expect(result).toBe('')
  })

  it('applies greater_than condition', () => {
    const row = { score: 85 }

    const result = getCellStyle(row, conditionalColumn)

    expect(result).toContain('background-color: #22C55E')
    expect(result).toContain('color: #FFFFFF')
  })

  it('applies less_than condition', () => {
    const row = { score: 40 }

    const result = getCellStyle(row, conditionalColumn)

    expect(result).toContain('background-color: #EF4444')
  })

  it('applies between condition', () => {
    const row = { score: 65 }

    const result = getCellStyle(row, conditionalColumn)

    expect(result).toContain('background-color: #EAB308')
  })

  it('returns empty string when no condition matches', () => {
    const column: ColumnDef = {
      name: 'score',
      label: 'Score',
      conditionalFormat: [
        { condition: 'equals', value: 100, backgroundColor: '#00FF00' }
      ]
    }
    const row = { score: 75 }

    const result = getCellStyle(row, column)

    expect(result).toBe('')
  })

  it('applies equals condition', () => {
    const column: ColumnDef = {
      name: 'score',
      label: 'Score',
      conditionalFormat: [
        { condition: 'equals', value: 100, backgroundColor: '#00FF00' }
      ]
    }
    const row = { score: 100 }

    const result = getCellStyle(row, column)

    expect(result).toContain('background-color: #00FF00')
  })
})

// ============================================================================
// getDataBarWidth
// ============================================================================

describe('getDataBarWidth', () => {
  it('returns 0 when showDataBar is false', () => {
    const row = { sales: 50 }
    const allRows = [{ sales: 0 }, { sales: 100 }]

    const result = getDataBarWidth(row, basicColumn, allRows)

    expect(result).toBe(0)
  })

  it('returns 0 for non-numeric value', () => {
    const row = { sales: 'abc' }
    const allRows = [{ sales: 0 }, { sales: 100 }]

    const result = getDataBarWidth(row, dataBarColumn, allRows)

    expect(result).toBe(0)
  })

  it('calculates percentage correctly', () => {
    const row = { sales: 50 }
    const allRows = [{ sales: 0 }, { sales: 50 }, { sales: 100 }]

    const result = getDataBarWidth(row, dataBarColumn, allRows)

    expect(result).toBe(50)
  })

  it('returns 100 for max value', () => {
    const row = { sales: 100 }
    const allRows = [{ sales: 0 }, { sales: 100 }]

    const result = getDataBarWidth(row, dataBarColumn, allRows)

    expect(result).toBe(100)
  })

  it('returns 0 for min value', () => {
    const row = { sales: 0 }
    const allRows = [{ sales: 0 }, { sales: 100 }]

    const result = getDataBarWidth(row, dataBarColumn, allRows)

    expect(result).toBe(0)
  })

  it('returns 100 when all values are equal', () => {
    const row = { sales: 50 }
    const allRows = [{ sales: 50 }, { sales: 50 }, { sales: 50 }]

    const result = getDataBarWidth(row, dataBarColumn, allRows)

    expect(result).toBe(100)
  })

  it('returns 0 for empty rows', () => {
    const row = { sales: 50 }

    const result = getDataBarWidth(row, dataBarColumn, [])

    expect(result).toBe(0)
  })
})

// ============================================================================
// interpolateColor
// ============================================================================

describe('interpolateColor', () => {
  it('returns first color at factor 0', () => {
    const result = interpolateColor('#FF0000', '#00FF00', 0)

    expect(result.toLowerCase()).toBe('#ff0000')
  })

  it('returns second color at factor 1', () => {
    const result = interpolateColor('#FF0000', '#00FF00', 1)

    expect(result.toLowerCase()).toBe('#00ff00')
  })

  it('returns midpoint color at factor 0.5', () => {
    const result = interpolateColor('#FF0000', '#00FF00', 0.5)

    // Midpoint between red and green should be around #808000 (olive)
    expect(result.toLowerCase()).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('handles black to white', () => {
    const result = interpolateColor('#000000', '#FFFFFF', 0.5)

    // Midpoint should be gray (#808080)
    expect(result.toLowerCase()).toBe('#808080')
  })
})

// ============================================================================
// getColorScaleBackground
// ============================================================================

describe('getColorScaleBackground', () => {
  it('returns empty string when no color scale', () => {
    const row = { revenue: 500 }
    const allRows = [{ revenue: 0 }, { revenue: 1000 }]

    const result = getColorScaleBackground(row, basicColumn, allRows)

    expect(result).toBe('')
  })

  it('returns empty string for non-numeric value', () => {
    const row = { revenue: 'abc' }
    const allRows = [{ revenue: 0 }, { revenue: 1000 }]

    const result = getColorScaleBackground(row, colorScaleColumn, allRows)

    expect(result).toBe('')
  })

  it('returns empty string when all values are equal', () => {
    const row = { revenue: 100 }
    const allRows = [{ revenue: 100 }, { revenue: 100 }]

    const result = getColorScaleBackground(row, colorScaleColumn, allRows)

    expect(result).toBe('')
  })

  it('returns empty string for empty rows', () => {
    const row = { revenue: 100 }

    const result = getColorScaleBackground(row, colorScaleColumn, [])

    expect(result).toBe('')
  })

  it('returns color for valid value', () => {
    const row = { revenue: 500 }
    const allRows = [{ revenue: 0 }, { revenue: 500 }, { revenue: 1000 }]

    const result = getColorScaleBackground(row, colorScaleColumn, allRows)

    expect(result).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })

  it('respects custom min/max in colorScale config', () => {
    const column: ColumnDef = {
      name: 'revenue',
      label: 'Revenue',
      colorScale: { type: 'red-green', min: 0, max: 100 }
    }
    const row = { revenue: 50 }
    const allRows = [{ revenue: 50 }] // Only one value, but min/max are set

    const result = getColorScaleBackground(row, column, allRows)

    expect(result).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })
})

// ============================================================================
// getIconForValue
// ============================================================================

describe('getIconForValue', () => {
  it('returns null when no icon set', () => {
    const row = { rating: 50 }
    const allRows = [{ rating: 0 }, { rating: 100 }]

    const result = getIconForValue(row, basicColumn, allRows)

    expect(result).toBeNull()
  })

  it('returns null for non-numeric value', () => {
    const row = { rating: 'abc' }
    const allRows = [{ rating: 0 }, { rating: 100 }]

    const result = getIconForValue(row, iconSetColumn, allRows)

    expect(result).toBeNull()
  })

  it('returns null for empty rows', () => {
    const row = { rating: 50 }

    const result = getIconForValue(row, iconSetColumn, [])

    expect(result).toBeNull()
  })

  it('returns low icon for low values', () => {
    const row = { rating: 10 }
    const allRows = [
      { rating: 10 }, { rating: 20 }, { rating: 30 },
      { rating: 40 }, { rating: 50 }, { rating: 60 },
      { rating: 70 }, { rating: 80 }, { rating: 90 }
    ]

    const result = getIconForValue(row, iconSetColumn, allRows)

    expect(result).not.toBeNull()
    expect(result!.icon).toBe('↓')
    expect(result!.color).toBe('#EF4444')
  })

  it('returns high icon for high values', () => {
    const row = { rating: 90 }
    const allRows = [
      { rating: 10 }, { rating: 20 }, { rating: 30 },
      { rating: 40 }, { rating: 50 }, { rating: 60 },
      { rating: 70 }, { rating: 80 }, { rating: 90 }
    ]

    const result = getIconForValue(row, iconSetColumn, allRows)

    expect(result).not.toBeNull()
    expect(result!.icon).toBe('↑')
    expect(result!.color).toBe('#22C55E')
  })

  it('returns middle icon for middle values', () => {
    const row = { rating: 50 }
    const allRows = [
      { rating: 10 }, { rating: 20 }, { rating: 30 },
      { rating: 40 }, { rating: 50 }, { rating: 60 },
      { rating: 70 }, { rating: 80 }, { rating: 90 }
    ]

    const result = getIconForValue(row, iconSetColumn, allRows)

    expect(result).not.toBeNull()
    expect(result!.icon).toBe('→')
    expect(result!.color).toBe('#9CA3AF')
  })

  it('uses custom thresholds', () => {
    const column: ColumnDef = {
      name: 'rating',
      label: 'Rating',
      iconSet: { type: 'arrows', thresholds: [25, 75] }
    }
    const row = { rating: 30 }
    const allRows = [
      { rating: 10 }, { rating: 30 }, { rating: 50 },
      { rating: 70 }, { rating: 90 }
    ]

    const result = getIconForValue(row, column, allRows)

    expect(result).not.toBeNull()
    expect(result!.icon).toBe('→') // Middle, since 30 is between 25th and 75th percentile
  })

  it('uses flags icon set', () => {
    const column: ColumnDef = {
      name: 'rating',
      label: 'Rating',
      iconSet: { type: 'flags' }
    }
    const row = { rating: 90 }
    const allRows = [
      { rating: 10 }, { rating: 50 }, { rating: 90 }
    ]

    const result = getIconForValue(row, column, allRows)

    expect(result).not.toBeNull()
    expect(result!.icon).toBe('🟢')
  })
})
