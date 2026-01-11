/**
 * DataTable Virtual Scrolling Logic
 *
 * Pure functions for virtual scrolling calculations.
 */

import type { ColumnDef } from '../types'

export interface VirtualScrollConfig {
  rowHeight: number
  maxHeight: number
  overscan: number
}

export interface VisibleRange {
  start: number
  end: number
}

/**
 * Calculate row height based on column configuration
 */
export function calculateRowHeight(
  columns: ColumnDef[],
  configRowHeight?: number
): number {
  if (configRowHeight) return configRowHeight

  // Check if any column has images
  const hasImageColumn = columns.some(col => col.contentType === 'image')
  if (hasImageColumn) {
    // Find max image height
    const maxImageHeight = Math.max(
      ...columns
        .filter(col => col.contentType === 'image')
        .map(col => {
          const height = col.imageConfig?.height || 50
          return typeof height === 'number' ? height : 50
        })
    )
    // Add padding (8px top + 8px bottom)
    return maxImageHeight + 16
  }

  return 36 // Default row height
}

/**
 * Calculate overscan based on table complexity
 */
export function calculateOverscan(columns: ColumnDef[]): number {
  const hasFrozenColumns = columns.some(col => col.frozen)
  const hasImages = columns.some(col => col.contentType === 'image')

  // Tables with both frozen columns and images need more overscan for stability
  if (hasFrozenColumns && hasImages) return 20

  // Tables with images need moderate overscan
  if (hasImages) return 10

  // Default overscan
  return 5
}

/**
 * Calculate visible row range for virtual scrolling
 */
export function calculateVisibleRange(
  scrollTop: number,
  totalRows: number,
  rowHeight: number,
  maxHeight: number,
  overscan: number
): VisibleRange {
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
  const viewportHeight = maxHeight - 40 // Account for header
  const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2
  const end = Math.min(totalRows, start + visibleCount)

  return { start, end }
}

/**
 * Calculate total height for virtual scrolling container
 */
export function calculateTotalHeight(rowCount: number, rowHeight: number): number {
  return rowCount * rowHeight
}

/**
 * Calculate Y offset for visible rows
 */
export function calculateOffsetY(startIndex: number, rowHeight: number): number {
  return startIndex * rowHeight
}

/**
 * Get visible rows from data array
 */
export function getVisibleRows<T>(
  data: T[],
  range: VisibleRange
): T[] {
  return data.slice(range.start, range.end)
}
