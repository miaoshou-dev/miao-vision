/**
 * CompareSwot Layout Tests
 *
 * Unit tests for SWOT layout calculation functions.
 */

import { describe, it, expect } from 'vitest'
import {
  getTotalItemCount,
  getQuadrantItemCount,
  getMaxQuadrantItemCount,
  getQuadrantItems,
  calculateQuadrantPosition,
  calculateSwotLayout,
  calculateItemPositions,
  getQuadrantAtPosition,
  sortItemsByPriority,
  filterItemsByPriority,
  getQuadrantConfig,
  isValidSwotData
} from './layout'
import type { SwotData, SwotItem } from './types'

// Test fixtures
const emptySwot: SwotData = {
  strengths: [],
  weaknesses: [],
  opportunities: [],
  threats: []
}

const simpleSwot: SwotData = {
  strengths: [{ id: 's1', label: 'Strong brand' }],
  weaknesses: [{ id: 'w1', label: 'Limited resources' }],
  opportunities: [{ id: 'o1', label: 'Market expansion' }],
  threats: [{ id: 't1', label: 'Competition' }]
}

const unevenSwot: SwotData = {
  strengths: [
    { id: 's1', label: 'S1' },
    { id: 's2', label: 'S2' },
    { id: 's3', label: 'S3' }
  ],
  weaknesses: [{ id: 'w1', label: 'W1' }],
  opportunities: [
    { id: 'o1', label: 'O1' },
    { id: 'o2', label: 'O2' }
  ],
  threats: []
}

const prioritizedItems: SwotItem[] = [
  { id: '1', label: 'Low', priority: 3 },
  { id: '2', label: 'High', priority: 1 },
  { id: '3', label: 'Medium', priority: 2 },
  { id: '4', label: 'No priority' }
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

describe('getTotalItemCount', () => {
  it('should return 0 for empty SWOT', () => {
    expect(getTotalItemCount(emptySwot)).toBe(0)
  })

  it('should return 4 for simple SWOT', () => {
    expect(getTotalItemCount(simpleSwot)).toBe(4)
  })

  it('should return correct count for uneven SWOT', () => {
    expect(getTotalItemCount(unevenSwot)).toBe(6)
  })
})

describe('getQuadrantItemCount', () => {
  it('should return 0 for empty quadrant', () => {
    expect(getQuadrantItemCount(emptySwot, 'strengths')).toBe(0)
  })

  it('should return 1 for single item quadrant', () => {
    expect(getQuadrantItemCount(simpleSwot, 'strengths')).toBe(1)
  })

  it('should return correct count for each quadrant', () => {
    expect(getQuadrantItemCount(unevenSwot, 'strengths')).toBe(3)
    expect(getQuadrantItemCount(unevenSwot, 'weaknesses')).toBe(1)
    expect(getQuadrantItemCount(unevenSwot, 'opportunities')).toBe(2)
    expect(getQuadrantItemCount(unevenSwot, 'threats')).toBe(0)
  })
})

describe('getMaxQuadrantItemCount', () => {
  it('should return 0 for empty SWOT', () => {
    expect(getMaxQuadrantItemCount(emptySwot)).toBe(0)
  })

  it('should return 1 for simple SWOT', () => {
    expect(getMaxQuadrantItemCount(simpleSwot)).toBe(1)
  })

  it('should return 3 for uneven SWOT', () => {
    expect(getMaxQuadrantItemCount(unevenSwot)).toBe(3)
  })
})

describe('getQuadrantItems', () => {
  it('should return empty array for empty quadrant', () => {
    expect(getQuadrantItems(emptySwot, 'strengths')).toEqual([])
  })

  it('should return items for populated quadrant', () => {
    const items = getQuadrantItems(unevenSwot, 'strengths')
    expect(items.length).toBe(3)
    expect(items[0].id).toBe('s1')
  })
})

describe('calculateQuadrantPosition', () => {
  const width = 800
  const height = 600
  const gap = 10

  it('should position strengths in top-left', () => {
    const pos = calculateQuadrantPosition('strengths', width, height, gap)
    expect(pos.x).toBe(0)
    expect(pos.y).toBe(0)
  })

  it('should position weaknesses in top-right', () => {
    const pos = calculateQuadrantPosition('weaknesses', width, height, gap)
    expect(pos.x).toBeGreaterThan(0)
    expect(pos.y).toBe(0)
  })

  it('should position opportunities in bottom-left', () => {
    const pos = calculateQuadrantPosition('opportunities', width, height, gap)
    expect(pos.x).toBe(0)
    expect(pos.y).toBeGreaterThan(0)
  })

  it('should position threats in bottom-right', () => {
    const pos = calculateQuadrantPosition('threats', width, height, gap)
    expect(pos.x).toBeGreaterThan(0)
    expect(pos.y).toBeGreaterThan(0)
  })

  it('should calculate correct quadrant dimensions', () => {
    const pos = calculateQuadrantPosition('strengths', width, height, gap)
    expect(pos.width).toBe((width - gap) / 2)
    expect(pos.height).toBe((height - gap) / 2)
  })
})

describe('calculateSwotLayout', () => {
  it('should create 4 quadrant layouts', () => {
    const layout = calculateSwotLayout(simpleSwot, { baseColors })
    expect(layout.quadrants.length).toBe(4)
  })

  it('should include all quadrant types', () => {
    const layout = calculateSwotLayout(simpleSwot, { baseColors })
    const quadrantTypes = layout.quadrants.map((q) => q.quadrant)
    expect(quadrantTypes).toContain('strengths')
    expect(quadrantTypes).toContain('weaknesses')
    expect(quadrantTypes).toContain('opportunities')
    expect(quadrantTypes).toContain('threats')
  })

  it('should use default dimensions', () => {
    const layout = calculateSwotLayout(simpleSwot, { baseColors })
    expect(layout.totalWidth).toBe(800)
    expect(layout.totalHeight).toBe(600)
  })

  it('should use custom dimensions', () => {
    const layout = calculateSwotLayout(simpleSwot, {
      width: 1000,
      height: 800,
      baseColors
    })
    expect(layout.totalWidth).toBe(1000)
    expect(layout.totalHeight).toBe(800)
  })

  it('should assign theme colors to quadrants', () => {
    const layout = calculateSwotLayout(simpleSwot, { baseColors })
    layout.quadrants.forEach((quadrant) => {
      expect(quadrant.themeColors).toBeDefined()
      expect(quadrant.themeColors.colorPrimary).toBeDefined()
    })
  })

  it('should include items in each quadrant', () => {
    const layout = calculateSwotLayout(unevenSwot, { baseColors })
    const strengthsQuadrant = layout.quadrants.find((q) => q.quadrant === 'strengths')
    expect(strengthsQuadrant?.items.length).toBe(3)
  })

  it('should use custom titles', () => {
    const layout = calculateSwotLayout(simpleSwot, {
      baseColors,
      titles: { strengths: 'Custom Strengths' }
    })
    const strengthsQuadrant = layout.quadrants.find((q) => q.quadrant === 'strengths')
    expect(strengthsQuadrant?.config.title).toBe('Custom Strengths')
  })

  it('should generate gradient IDs when enabled', () => {
    const layout = calculateSwotLayout(simpleSwot, {
      baseColors,
      gradientsEnabled: true,
      instanceId: 'test'
    })
    layout.quadrants.forEach((quadrant) => {
      expect(quadrant.gradientId).toContain('grad-test-')
    })
  })
})

describe('calculateItemPositions', () => {
  it('should return empty array for no items', () => {
    const positions = calculateItemPositions([], 400, 300)
    expect(positions).toEqual([])
  })

  it('should calculate positions for single item', () => {
    const items: SwotItem[] = [{ id: '1', label: 'Item' }]
    const positions = calculateItemPositions(items, 400, 300)
    expect(positions.length).toBe(1)
    expect(positions[0].x).toBeGreaterThan(0)
    expect(positions[0].y).toBeGreaterThan(0)
  })

  it('should position items vertically', () => {
    const items: SwotItem[] = [
      { id: '1', label: 'A' },
      { id: '2', label: 'B' }
    ]
    const positions = calculateItemPositions(items, 400, 300)
    expect(positions[1].y).toBeGreaterThan(positions[0].y)
  })

  it('should have consistent width', () => {
    const items: SwotItem[] = [
      { id: '1', label: 'A' },
      { id: '2', label: 'B' }
    ]
    const positions = calculateItemPositions(items, 400, 300)
    expect(positions[0].width).toBe(positions[1].width)
  })
})

describe('getQuadrantAtPosition', () => {
  const width = 800
  const height = 600
  const gap = 10

  it('should return strengths for top-left', () => {
    expect(getQuadrantAtPosition(100, 100, width, height, gap)).toBe('strengths')
  })

  it('should return weaknesses for top-right', () => {
    expect(getQuadrantAtPosition(600, 100, width, height, gap)).toBe('weaknesses')
  })

  it('should return opportunities for bottom-left', () => {
    expect(getQuadrantAtPosition(100, 400, width, height, gap)).toBe('opportunities')
  })

  it('should return threats for bottom-right', () => {
    expect(getQuadrantAtPosition(600, 400, width, height, gap)).toBe('threats')
  })

  it('should return null for center gap', () => {
    expect(getQuadrantAtPosition(400, 300, width, height, gap)).toBe(null)
  })
})

describe('sortItemsByPriority', () => {
  it('should sort by priority (high to low)', () => {
    const sorted = sortItemsByPriority(prioritizedItems)
    expect(sorted[0].priority).toBe(1)
    expect(sorted[1].priority).toBe(2)
    expect(sorted[2].priority).toBe(3)
  })

  it('should put items without priority last', () => {
    const sorted = sortItemsByPriority(prioritizedItems)
    expect(sorted[3].priority).toBeUndefined()
  })

  it('should not mutate original array', () => {
    const original = [...prioritizedItems]
    sortItemsByPriority(prioritizedItems)
    expect(prioritizedItems).toEqual(original)
  })
})

describe('filterItemsByPriority', () => {
  it('should filter to high priority only (plus items without priority)', () => {
    const filtered = filterItemsByPriority(prioritizedItems, 1)
    // Includes priority=1 AND items without priority
    expect(filtered.length).toBe(2)
    expect(filtered.some((i) => i.priority === 1)).toBe(true)
    expect(filtered.some((i) => i.priority === undefined)).toBe(true)
  })

  it('should filter to high and medium priority (plus items without priority)', () => {
    const filtered = filterItemsByPriority(prioritizedItems, 2)
    // Includes priority=1, priority=2, AND items without priority
    expect(filtered.length).toBe(3)
  })

  it('should include all items at level 3', () => {
    const filtered = filterItemsByPriority(prioritizedItems, 3)
    // Includes all items (1, 2, 3, and undefined priority)
    expect(filtered.length).toBe(4)
  })
})

describe('getQuadrantConfig', () => {
  it('should return strengths config', () => {
    const config = getQuadrantConfig('strengths')
    expect(config.title).toBe('Strengths')
    expect(config.color).toBe('#22c55e')
  })

  it('should return weaknesses config', () => {
    const config = getQuadrantConfig('weaknesses')
    expect(config.title).toBe('Weaknesses')
    expect(config.color).toBe('#f59e0b')
  })

  it('should return opportunities config', () => {
    const config = getQuadrantConfig('opportunities')
    expect(config.title).toBe('Opportunities')
    expect(config.color).toBe('#3b82f6')
  })

  it('should return threats config', () => {
    const config = getQuadrantConfig('threats')
    expect(config.title).toBe('Threats')
    expect(config.color).toBe('#ef4444')
  })
})

describe('isValidSwotData', () => {
  it('should return true for valid SWOT data', () => {
    expect(isValidSwotData(simpleSwot)).toBe(true)
  })

  it('should return true for empty SWOT data', () => {
    expect(isValidSwotData(emptySwot)).toBe(true)
  })

  it('should return false for null', () => {
    expect(isValidSwotData(null)).toBe(false)
  })

  it('should return false for undefined', () => {
    expect(isValidSwotData(undefined)).toBe(false)
  })

  it('should return false for non-object', () => {
    expect(isValidSwotData('string')).toBe(false)
  })

  it('should return false for missing quadrants', () => {
    expect(isValidSwotData({ strengths: [] })).toBe(false)
  })

  it('should return false for non-array quadrants', () => {
    expect(
      isValidSwotData({
        strengths: 'not array',
        weaknesses: [],
        opportunities: [],
        threats: []
      })
    ).toBe(false)
  })
})
