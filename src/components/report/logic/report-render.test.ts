/**
 * Report Rendering Logic - Unit Tests
 *
 * Tests for pure functions in report-render.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  findMissingDataSources,
  hasReportChanged,
  getContentToRender,
  clearChartElements,
  calculateRenderStats,
  logRenderDebug
} from './report-render'
import type { Report } from '@/types/report'

// ============================================================================
// Test Fixtures
// ============================================================================

function createReport(overrides: Partial<Report> = {}): Report {
  return {
    id: 'test-report-1',
    title: 'Test Report',
    content: '# Test Report\n\nThis is test content.',
    createdAt: new Date(),
    updatedAt: new Date(),
    blocks: [],
    metadata: {},
    ...overrides
  }
}

// ============================================================================
// findMissingDataSources
// ============================================================================

describe('findMissingDataSources', () => {
  it('returns empty array when no data sources required', () => {
    const report = createReport({
      metadata: { dataSources: [] }
    })
    const tableMapping = new Map([['sales', 'sales_table']])

    const result = findMissingDataSources(report, tableMapping)

    expect(result).toEqual([])
  })

  it('returns empty array when tableMapping is undefined', () => {
    const report = createReport({
      metadata: { dataSources: ['sales', 'orders'] }
    })

    const result = findMissingDataSources(report, undefined)

    expect(result).toEqual([])
  })

  it('returns empty array when all sources available', () => {
    const report = createReport({
      metadata: { dataSources: ['sales', 'orders'] }
    })
    const tableMapping = new Map([
      ['sales', 'sales_table'],
      ['orders', 'orders_table']
    ])

    const result = findMissingDataSources(report, tableMapping)

    expect(result).toEqual([])
  })

  it('returns missing sources', () => {
    const report = createReport({
      metadata: { dataSources: ['sales', 'orders', 'customers'] }
    })
    const tableMapping = new Map([
      ['sales', 'sales_table']
    ])

    const result = findMissingDataSources(report, tableMapping)

    expect(result).toHaveLength(2)
    expect(result).toContain('orders')
    expect(result).toContain('customers')
  })

  it('handles report with no metadata', () => {
    const report = createReport()
    delete report.metadata

    const result = findMissingDataSources(report, new Map())

    expect(result).toEqual([])
  })

  it('handles report with empty dataSources', () => {
    const report = createReport({
      metadata: {}
    })

    const result = findMissingDataSources(report, new Map())

    expect(result).toEqual([])
  })
})

// ============================================================================
// hasReportChanged
// ============================================================================

describe('hasReportChanged', () => {
  it('returns false when currentReportId is null', () => {
    const result = hasReportChanged(null, 'new-report-id')

    expect(result).toBe(false)
  })

  it('returns false when IDs are the same', () => {
    const result = hasReportChanged('report-123', 'report-123')

    expect(result).toBe(false)
  })

  it('returns true when IDs are different', () => {
    const result = hasReportChanged('report-123', 'report-456')

    expect(result).toBe(true)
  })

  it('handles empty strings', () => {
    expect(hasReportChanged('', '')).toBe(false)
    expect(hasReportChanged('report', '')).toBe(true)
  })
})

// ============================================================================
// getContentToRender
// ============================================================================

describe('getContentToRender', () => {
  it('returns processed content when available', () => {
    const report = createReport({
      content: '# Original Content',
      metadata: {
        _processedContent: '# Processed Content'
      }
    })

    const result = getContentToRender(report)

    expect(result).toBe('# Processed Content')
  })

  it('returns original content when no processed content', () => {
    const report = createReport({
      content: '# Original Content',
      metadata: {}
    })

    const result = getContentToRender(report)

    expect(result).toBe('# Original Content')
  })

  it('returns original content when metadata is undefined', () => {
    const report = createReport({
      content: '# Original Content'
    })
    delete report.metadata

    const result = getContentToRender(report)

    expect(result).toBe('# Original Content')
  })

  it('returns empty processed content if set', () => {
    const report = createReport({
      content: '# Original Content',
      metadata: {
        _processedContent: ''
      }
    })

    const result = getContentToRender(report)

    // Empty string is falsy, so falls back to original
    expect(result).toBe('# Original Content')
  })
})

// ============================================================================
// clearChartElements
// ============================================================================

describe('clearChartElements', () => {
  it('removes elements from parent', () => {
    const parent = document.createElement('div')
    const child1 = document.createElement('div')
    const child2 = document.createElement('div')
    parent.appendChild(child1)
    parent.appendChild(child2)

    clearChartElements([child1, child2])

    expect(parent.children.length).toBe(0)
  })

  it('handles elements without parent', () => {
    const orphan = document.createElement('div')

    // Should not throw
    expect(() => clearChartElements([orphan])).not.toThrow()
  })

  it('handles empty array', () => {
    expect(() => clearChartElements([])).not.toThrow()
  })

  it('handles mixed elements', () => {
    const parent = document.createElement('div')
    const attached = document.createElement('div')
    const orphan = document.createElement('div')
    parent.appendChild(attached)

    clearChartElements([attached, orphan])

    expect(parent.children.length).toBe(0)
  })
})

// ============================================================================
// calculateRenderStats
// ============================================================================

describe('calculateRenderStats', () => {
  it('calculates stats for report with blocks', () => {
    const report = createReport({
      blocks: [
        { id: 'block1', type: 'sql', content: 'SELECT 1', status: 'success', sqlResult: { data: [], columns: [], rowCount: 0, executionTime: 0 } },
        { id: 'block2', type: 'sql', content: 'SELECT 2', status: 'success', sqlResult: { data: [], columns: [], rowCount: 0, executionTime: 0 } },
        { id: 'block3', type: 'markdown', content: '# Header', status: 'pending' }
      ]
    })

    const stats = calculateRenderStats(report)

    expect(stats.blocksCount).toBe(3)
    expect(stats.blocksWithResults).toBe(2)
  })

  it('handles report with no blocks', () => {
    const report = createReport({
      blocks: []
    })

    const stats = calculateRenderStats(report)

    expect(stats.blocksCount).toBe(0)
    expect(stats.blocksWithResults).toBe(0)
  })

  it('handles report with undefined blocks', () => {
    const report = createReport()
    delete report.blocks

    const stats = calculateRenderStats(report)

    expect(stats.blocksCount).toBe(0)
    expect(stats.blocksWithResults).toBe(0)
  })
})

// ============================================================================
// logRenderDebug
// ============================================================================

describe('logRenderDebug', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('logs render information', () => {
    const stats = {
      blocksCount: 5,
      blocksWithResults: 3
    }

    logRenderDebug('Test', stats, 10)

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Test triggered'))
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Blocks: 5'))
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('tableMapping size: 10'))
  })
})
