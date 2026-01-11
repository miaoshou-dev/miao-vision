/**
 * Chart Utilities Tests
 */

import { describe, it, expect } from 'vitest'
import {
  CHART_COLORS,
  getChartColor,
  generateColorScale,
  hexToRgb,
  rgbToHex,
  adjustBrightness,
  getContrastColor,
  createLinearScale,
  niceExtent,
  niceStep,
  generateTicks,
  prepareChartData,
  calculatePercentages,
  linePath,
  areaPath,
  sectorPath,
  polarToCartesian,
  calculatePieAngles
} from './index'

// ============================================================================
// Color Tests
// ============================================================================

describe('getChartColor', () => {
  it('returns colors from palette', () => {
    expect(getChartColor(0)).toBe(CHART_COLORS[0])
    expect(getChartColor(1)).toBe(CHART_COLORS[1])
  })

  it('wraps around for large indices', () => {
    expect(getChartColor(CHART_COLORS.length)).toBe(CHART_COLORS[0])
    expect(getChartColor(CHART_COLORS.length + 1)).toBe(CHART_COLORS[1])
  })
})

describe('generateColorScale', () => {
  it('returns single color for count of 1', () => {
    const scale = generateColorScale(1, '#FF0000', '#0000FF')
    expect(scale).toEqual(['#FF0000'])
  })

  it('generates gradient colors', () => {
    const scale = generateColorScale(3, '#FF0000', '#0000FF')
    expect(scale).toHaveLength(3)
    expect(scale[0]).toBe('#ff0000') // Start
    expect(scale[2]).toBe('#0000ff') // End
  })
})

describe('hexToRgb', () => {
  it('converts hex to RGB', () => {
    expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 })
    expect(hexToRgb('#00FF00')).toEqual({ r: 0, g: 255, b: 0 })
    expect(hexToRgb('#0000FF')).toEqual({ r: 0, g: 0, b: 255 })
  })

  it('handles hex without #', () => {
    expect(hexToRgb('FF0000')).toEqual({ r: 255, g: 0, b: 0 })
  })

  it('returns null for invalid hex', () => {
    expect(hexToRgb('invalid')).toBeNull()
  })
})

describe('rgbToHex', () => {
  it('converts RGB to hex', () => {
    expect(rgbToHex(255, 0, 0)).toBe('#ff0000')
    expect(rgbToHex(0, 255, 0)).toBe('#00ff00')
    expect(rgbToHex(0, 0, 255)).toBe('#0000ff')
  })
})

describe('adjustBrightness', () => {
  it('brightens color with positive percent', () => {
    const brighter = adjustBrightness('#808080', 50)
    expect(hexToRgb(brighter)?.r).toBeGreaterThan(128)
  })

  it('darkens color with negative percent', () => {
    const darker = adjustBrightness('#808080', -50)
    expect(hexToRgb(darker)?.r).toBeLessThan(128)
  })

  it('clamps values to valid range', () => {
    const result = adjustBrightness('#FFFFFF', 100)
    const rgb = hexToRgb(result)
    expect(rgb?.r).toBeLessThanOrEqual(255)
  })
})

describe('getContrastColor', () => {
  it('returns black for light colors', () => {
    expect(getContrastColor('#FFFFFF')).toBe('#000000')
    expect(getContrastColor('#FFFF00')).toBe('#000000')
  })

  it('returns white for dark colors', () => {
    expect(getContrastColor('#000000')).toBe('#FFFFFF')
    expect(getContrastColor('#0000FF')).toBe('#FFFFFF')
  })
})

// ============================================================================
// Scale Tests
// ============================================================================

describe('createLinearScale', () => {
  it('maps domain to range', () => {
    const scale = createLinearScale([0, 100], [0, 200])

    expect(scale(0)).toBe(0)
    expect(scale(50)).toBe(100)
    expect(scale(100)).toBe(200)
  })

  it('handles negative values', () => {
    const scale = createLinearScale([-100, 100], [0, 200])

    expect(scale(-100)).toBe(0)
    expect(scale(0)).toBe(100)
    expect(scale(100)).toBe(200)
  })

  it('provides invert function', () => {
    const scale = createLinearScale([0, 100], [0, 200])

    expect(scale.invert(0)).toBe(0)
    expect(scale.invert(100)).toBe(50)
    expect(scale.invert(200)).toBe(100)
  })

  it('provides domain and range accessors', () => {
    const scale = createLinearScale([0, 100], [0, 200])

    expect(scale.domain()).toEqual([0, 100])
    expect(scale.range()).toEqual([0, 200])
  })
})

describe('niceExtent', () => {
  it('rounds to nice values', () => {
    const [min, max] = niceExtent(0.3, 97.8, 5)

    expect(min).toBe(0)
    expect(max).toBe(100)
  })

  it('handles negative ranges', () => {
    const [min, max] = niceExtent(-47, 53, 5)

    expect(min).toBeLessThanOrEqual(-47)
    expect(max).toBeGreaterThanOrEqual(53)
  })
})

describe('niceStep', () => {
  it('returns nice step values', () => {
    expect(niceStep(0.3)).toBe(0.5)
    expect(niceStep(3)).toBe(5)
    expect(niceStep(7)).toBe(10)
    expect(niceStep(17)).toBe(20)
    expect(niceStep(40)).toBe(50)
  })
})

describe('generateTicks', () => {
  it('generates tick values', () => {
    const ticks = generateTicks(0, 100, 5)

    expect(ticks.length).toBeGreaterThan(0)
    expect(ticks[0]).toBeLessThanOrEqual(0)
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(100)
  })

  it('generates reasonable number of ticks', () => {
    const ticks = generateTicks(0, 1000, 5)

    expect(ticks.length).toBeGreaterThanOrEqual(4)
    expect(ticks.length).toBeLessThanOrEqual(8)
  })
})

// ============================================================================
// Data Preparation Tests
// ============================================================================

describe('prepareChartData', () => {
  const rawData = [
    { category: 'A', value: 30 },
    { category: 'B', value: 50 },
    { category: 'C', value: 20 }
  ]

  it('prepares data with x and y values', () => {
    const prepared = prepareChartData(rawData, 'category', 'value')

    expect(prepared.data).toHaveLength(3)
    expect(prepared.data[0].x).toBe('A')
    expect(prepared.data[0].y).toBe(30)
  })

  it('calculates y extent', () => {
    const prepared = prepareChartData(rawData, 'category', 'value')

    expect(prepared.yExtent[0]).toBe(0) // Min includes 0
    expect(prepared.yExtent[1]).toBe(50) // Max is 50
  })

  it('calculates total value', () => {
    const prepared = prepareChartData(rawData, 'category', 'value')

    expect(prepared.totalValue).toBe(100)
  })

  it('sorts by y value descending', () => {
    const prepared = prepareChartData(rawData, 'category', 'value', {
      sortBy: 'y',
      sortDirection: 'desc'
    })

    expect(prepared.data[0].y).toBe(50)
    expect(prepared.data[1].y).toBe(30)
    expect(prepared.data[2].y).toBe(20)
  })

  it('limits data', () => {
    const prepared = prepareChartData(rawData, 'category', 'value', {
      limit: 2
    })

    expect(prepared.data).toHaveLength(2)
  })

  it('assigns colors to data points', () => {
    const prepared = prepareChartData(rawData, 'category', 'value')

    expect(prepared.data[0].color).toBeDefined()
    expect(prepared.data[1].color).toBeDefined()
  })
})

describe('calculatePercentages', () => {
  it('converts values to percentages', () => {
    const data = [
      { x: 'A', y: 50, label: 'A' },
      { x: 'B', y: 50, label: 'B' }
    ]

    const result = calculatePercentages(data)

    expect(result[0].y).toBe(50)
    expect(result[1].y).toBe(50)
  })

  it('handles zero total', () => {
    const data = [
      { x: 'A', y: 0, label: 'A' },
      { x: 'B', y: 0, label: 'B' }
    ]

    const result = calculatePercentages(data)

    expect(result[0].y).toBe(0)
    expect(result[1].y).toBe(0)
  })
})

// ============================================================================
// SVG Path Tests
// ============================================================================

describe('linePath', () => {
  it('generates line path', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 50, y: 50 },
      { x: 100, y: 25 }
    ]

    const path = linePath(points)

    expect(path).toBe('M 0 0 L 50 50 L 100 25')
  })

  it('returns empty string for no points', () => {
    expect(linePath([])).toBe('')
  })
})

describe('areaPath', () => {
  it('generates closed area path', () => {
    const points = [
      { x: 0, y: 50 },
      { x: 100, y: 25 }
    ]

    const path = areaPath(points, 100)

    expect(path).toContain('M 0 50')
    expect(path).toContain('L 100 25')
    expect(path).toContain('L 100 100') // To baseline
    expect(path).toContain('L 0 100') // Back to start
    expect(path).toContain('Z') // Close path
  })
})

describe('polarToCartesian', () => {
  it('converts polar to cartesian', () => {
    // 0 degrees (top)
    const top = polarToCartesian(100, 100, 50, 0)
    expect(top.x).toBe(100)
    expect(Math.round(top.y)).toBe(50)

    // 90 degrees (right)
    const right = polarToCartesian(100, 100, 50, 90)
    expect(Math.round(right.x)).toBe(150)
    expect(Math.round(right.y)).toBe(100)
  })
})

describe('sectorPath', () => {
  it('generates pie sector path', () => {
    const path = sectorPath(100, 100, 50, 0, 90)

    expect(path).toContain('M 100 100') // Start at center
    expect(path).toContain('A 50 50') // Arc with radius 50
    expect(path).toContain('Z') // Close path
  })
})

describe('calculatePieAngles', () => {
  it('calculates angles for pie slices', () => {
    const data = [
      { x: 'A', y: 50, label: 'A' },
      { x: 'B', y: 50, label: 'B' }
    ]

    const angles = calculatePieAngles(data)

    expect(angles).toHaveLength(2)
    expect(angles[0].startAngle).toBe(0)
    expect(angles[0].endAngle).toBe(180)
    expect(angles[1].startAngle).toBe(180)
    expect(angles[1].endAngle).toBe(360)
  })

  it('handles zero total', () => {
    const data = [
      { x: 'A', y: 0, label: 'A' },
      { x: 'B', y: 0, label: 'B' }
    ]

    const angles = calculatePieAngles(data)

    expect(angles[0].startAngle).toBe(0)
    expect(angles[0].endAngle).toBe(0)
  })
})
