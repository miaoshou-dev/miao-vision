/**
 * ListSector Layout Tests
 *
 * Unit tests for radial sector layout calculation functions.
 */

import { describe, it, expect } from 'vitest'
import {
  degreesToRadians,
  radiansToDegrees,
  calculateTotalValue,
  calculateItemAngle,
  generateSectorPath,
  calculateLabelPosition,
  calculateSectorLayout,
  findSectorAtPoint,
  calculatePercentage
} from './layout'
import type { SectorItem } from './types'

// Test fixtures
const simpleItems: SectorItem[] = [
  { id: '1', label: 'A', value: 25 },
  { id: '2', label: 'B', value: 25 },
  { id: '3', label: 'C', value: 25 },
  { id: '4', label: 'D', value: 25 }
]

const unevenItems: SectorItem[] = [
  { id: '1', label: 'A', value: 50 },
  { id: '2', label: 'B', value: 30 },
  { id: '3', label: 'C', value: 20 }
]

const noValueItems: SectorItem[] = [
  { id: '1', label: 'A' },
  { id: '2', label: 'B' },
  { id: '3', label: 'C' }
]

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

describe('degreesToRadians', () => {
  it('should convert 0 degrees to 0 radians', () => {
    expect(degreesToRadians(0)).toBe(0)
  })

  it('should convert 90 degrees to PI/2 radians', () => {
    expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2)
  })

  it('should convert 180 degrees to PI radians', () => {
    expect(degreesToRadians(180)).toBeCloseTo(Math.PI)
  })

  it('should convert 360 degrees to 2*PI radians', () => {
    expect(degreesToRadians(360)).toBeCloseTo(2 * Math.PI)
  })
})

describe('radiansToDegrees', () => {
  it('should convert 0 radians to 0 degrees', () => {
    expect(radiansToDegrees(0)).toBe(0)
  })

  it('should convert PI/2 radians to 90 degrees', () => {
    expect(radiansToDegrees(Math.PI / 2)).toBeCloseTo(90)
  })

  it('should convert PI radians to 180 degrees', () => {
    expect(radiansToDegrees(Math.PI)).toBeCloseTo(180)
  })

  it('should convert 2*PI radians to 360 degrees', () => {
    expect(radiansToDegrees(2 * Math.PI)).toBeCloseTo(360)
  })
})

describe('calculateTotalValue', () => {
  it('should return 0 for empty array', () => {
    expect(calculateTotalValue([])).toBe(0)
  })

  it('should sum all values', () => {
    expect(calculateTotalValue(simpleItems)).toBe(100)
  })

  it('should handle uneven values', () => {
    expect(calculateTotalValue(unevenItems)).toBe(100)
  })

  it('should use 1 for items without value', () => {
    expect(calculateTotalValue(noValueItems)).toBe(3)
  })
})

describe('calculateItemAngle', () => {
  const fullCircle = 2 * Math.PI

  it('should divide equally when not proportional', () => {
    const angle = calculateItemAngle(
      simpleItems[0],
      100,
      fullCircle,
      false,
      4
    )
    expect(angle).toBeCloseTo(fullCircle / 4)
  })

  it('should use value proportion when proportional', () => {
    // 50 out of 100 = 50% = PI radians
    const angle = calculateItemAngle(
      unevenItems[0], // value: 50
      100,
      fullCircle,
      true,
      3
    )
    expect(angle).toBeCloseTo(Math.PI)
  })

  it('should handle zero total value', () => {
    const angle = calculateItemAngle(
      simpleItems[0],
      0,
      fullCircle,
      true,
      4
    )
    expect(angle).toBeCloseTo(fullCircle / 4)
  })
})

describe('generateSectorPath', () => {
  it('should generate path with M, L, A, Z commands for pie sector', () => {
    const path = generateSectorPath(100, 100, 0, 50, 0, Math.PI / 2)
    expect(path).toContain('M')
    expect(path).toContain('L')
    expect(path).toContain('A')
    expect(path).toContain('Z')
  })

  it('should generate path with two arcs for donut sector', () => {
    const path = generateSectorPath(100, 100, 25, 50, 0, Math.PI / 2)
    // Donut sector has two arc commands
    const arcCount = (path.match(/A /g) || []).length
    expect(arcCount).toBe(2)
  })

  it('should start from center for full pie (innerRadius = 0)', () => {
    const path = generateSectorPath(100, 100, 0, 50, 0, Math.PI / 2)
    expect(path).toContain('M 100 100') // Center point
  })
})

describe('calculateLabelPosition', () => {
  const centerX = 200
  const centerY = 200
  const innerRadius = 50
  const outerRadius = 100

  it('should position inside label between radii', () => {
    const pos = calculateLabelPosition(
      centerX, centerY,
      0, // top
      innerRadius, outerRadius,
      'inside'
    )
    const distance = Math.sqrt(
      Math.pow(pos.x - centerX, 2) + Math.pow(pos.y - centerY, 2)
    )
    expect(distance).toBeGreaterThan(innerRadius)
    expect(distance).toBeLessThan(outerRadius)
  })

  it('should position outside label beyond outer radius', () => {
    const pos = calculateLabelPosition(
      centerX, centerY,
      0,
      innerRadius, outerRadius,
      'outside'
    )
    const distance = Math.sqrt(
      Math.pow(pos.x - centerX, 2) + Math.pow(pos.y - centerY, 2)
    )
    expect(distance).toBeGreaterThan(outerRadius)
  })

  it('should position center label at 65% of radius', () => {
    const pos = calculateLabelPosition(
      centerX, centerY,
      0,
      innerRadius, outerRadius,
      'center'
    )
    const distance = Math.sqrt(
      Math.pow(pos.x - centerX, 2) + Math.pow(pos.y - centerY, 2)
    )
    const expectedRadius = innerRadius + (outerRadius - innerRadius) * 0.65
    expect(distance).toBeCloseTo(expectedRadius, 0)
  })
})

describe('calculateSectorLayout', () => {
  it('should create sectors for all items', () => {
    const layout = calculateSectorLayout(simpleItems, { baseColors })
    expect(layout.sectors.length).toBe(4)
  })

  it('should position center correctly', () => {
    const layout = calculateSectorLayout(simpleItems, {
      width: 400,
      height: 400,
      baseColors
    })
    expect(layout.centerX).toBe(200)
    expect(layout.centerY).toBe(200)
  })

  it('should calculate total value', () => {
    const layout = calculateSectorLayout(simpleItems, { baseColors })
    expect(layout.totalValue).toBe(100)
  })

  it('should assign theme colors to sectors', () => {
    const layout = calculateSectorLayout(simpleItems, { baseColors })
    layout.sectors.forEach((sector) => {
      expect(sector.themeColors).toBeDefined()
      expect(sector.themeColors.colorPrimary).toBeDefined()
    })
  })

  it('should generate valid path data for each sector', () => {
    const layout = calculateSectorLayout(simpleItems, { baseColors })
    layout.sectors.forEach((sector) => {
      expect(sector.pathData).toContain('M')
      expect(sector.pathData).toContain('Z')
    })
  })

  it('should handle single item', () => {
    const singleItem: SectorItem[] = [{ id: '1', label: 'A', value: 100 }]
    const layout = calculateSectorLayout(singleItem, { baseColors })
    expect(layout.sectors.length).toBe(1)
    // Single item should span nearly full circle
    const sector = layout.sectors[0]
    const angleSpan = sector.endAngle - sector.startAngle
    expect(angleSpan).toBeCloseTo(2 * Math.PI, 1)
  })

  it('should generate gradient IDs when enabled', () => {
    const layout = calculateSectorLayout(simpleItems, {
      baseColors,
      gradientsEnabled: true,
      instanceId: 'test'
    })
    layout.sectors.forEach((sector, index) => {
      expect(sector.gradientId).toBe(`grad-test-${index}`)
    })
  })

  it('should handle inner radius for donut', () => {
    const layout = calculateSectorLayout(simpleItems, {
      baseColors,
      innerRadius: 0.5
    })
    expect(layout.innerRadius).toBeGreaterThan(0)
  })
})

describe('findSectorAtPoint', () => {
  const layout = calculateSectorLayout(simpleItems, {
    width: 400,
    height: 400,
    baseColors
  })

  const donutLayout = calculateSectorLayout(simpleItems, {
    width: 400,
    height: 400,
    innerRadius: 0.5,
    baseColors
  })

  it('should return -1 for point at center of donut (inside inner radius)', () => {
    // For donut chart, center is inside the hole
    const result = findSectorAtPoint(200, 200, donutLayout)
    expect(result).toBe(-1)
  })

  it('should return -1 for point outside outer radius', () => {
    const result = findSectorAtPoint(400, 400, layout)
    expect(result).toBe(-1)
  })

  it('should find correct sector for point in sector', () => {
    // Point at top (12 o'clock) should be in first sector
    const result = findSectorAtPoint(200, 150, layout)
    expect(result).toBeGreaterThanOrEqual(0)
  })
})

describe('calculatePercentage', () => {
  it('should return 0 for zero total', () => {
    expect(calculatePercentage(50, 0)).toBe(0)
  })

  it('should calculate correct percentage', () => {
    expect(calculatePercentage(25, 100)).toBe(25)
  })

  it('should handle 100%', () => {
    expect(calculatePercentage(100, 100)).toBe(100)
  })

  it('should handle fractions', () => {
    expect(calculatePercentage(33, 100)).toBe(33)
  })

  it('should handle values greater than total', () => {
    expect(calculatePercentage(150, 100)).toBe(150)
  })
})
