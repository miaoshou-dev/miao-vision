/**
 * DataTable Column Resize Logic
 *
 * Pure functions for column resizing and frozen column positioning.
 */

import type { ColumnDef } from '../types'

export interface ResizeState {
  resizingColumn: string | null
  resizeStartX: number
  resizeStartWidth: number
}

export interface ColumnWidths {
  [columnName: string]: number
}

/**
 * Initialize resize state
 */
export function createResizeState(): ResizeState {
  return {
    resizingColumn: null,
    resizeStartX: 0,
    resizeStartWidth: 0
  }
}

/**
 * Start resizing a column
 */
export function startResize(
  columnName: string,
  clientX: number,
  columns: ColumnDef[],
  columnWidths: ColumnWidths
): ResizeState {
  const column = columns.find(c => c.name === columnName)
  if (!column) {
    return createResizeState()
  }

  const currentWidth = columnWidths[columnName] ||
    (typeof column.width === 'number' ? column.width : 150)

  return {
    resizingColumn: columnName,
    resizeStartX: clientX,
    resizeStartWidth: currentWidth
  }
}

/**
 * Calculate new column width during resize
 */
export function calculateResizeWidth(
  state: ResizeState,
  clientX: number,
  minWidth: number = 50
): number {
  if (!state.resizingColumn) return state.resizeStartWidth

  const diff = clientX - state.resizeStartX
  return Math.max(minWidth, state.resizeStartWidth + diff)
}

/**
 * Update column widths with new width
 */
export function updateColumnWidth(
  columnWidths: ColumnWidths,
  columnName: string,
  newWidth: number
): ColumnWidths {
  return { ...columnWidths, [columnName]: newWidth }
}

/**
 * Get column width as CSS string
 */
export function getColumnWidth(
  column: ColumnDef,
  columnWidths: ColumnWidths
): string {
  if (columnWidths[column.name]) {
    return `${columnWidths[column.name]}px`
  }
  if (column.width) {
    return typeof column.width === 'number' ? `${column.width}px` : column.width
  }
  return 'auto'
}

/**
 * Get column width as number (for calculations)
 */
export function getColumnWidthNumber(
  column: ColumnDef,
  columnWidths: ColumnWidths,
  defaultWidth: number = 150
): number {
  if (columnWidths[column.name]) {
    return columnWidths[column.name]
  }
  if (typeof column.width === 'number') {
    return column.width
  }
  return defaultWidth
}

/**
 * Calculate frozen column offset
 */
export function getFrozenOffset(
  column: ColumnDef,
  visibleColumns: ColumnDef[],
  columnWidths: ColumnWidths,
  hasSelectColumn: boolean = false,
  selectColumnWidth: number = 50
): number {
  if (!column.frozen) return 0

  const columnIndex = visibleColumns.findIndex(c => c.name === column.name)
  let offset = 0

  if (column.frozen === 'left') {
    // Sum widths of all frozen columns to the left
    for (let i = 0; i < columnIndex; i++) {
      const col = visibleColumns[i]
      if (col.frozen === 'left') {
        offset += getColumnWidthNumber(col, columnWidths)
      }
    }
    // Add select column width if present
    if (hasSelectColumn) {
      offset += selectColumnWidth
    }
  } else if (column.frozen === 'right') {
    // Sum widths of all frozen columns to the right
    for (let i = columnIndex + 1; i < visibleColumns.length; i++) {
      const col = visibleColumns[i]
      if (col.frozen === 'right') {
        offset += getColumnWidthNumber(col, columnWidths)
      }
    }
  }

  return offset
}

/**
 * Get all frozen left columns
 */
export function getFrozenLeftColumns(columns: ColumnDef[]): ColumnDef[] {
  return columns.filter(col => col.frozen === 'left')
}

/**
 * Get all frozen right columns
 */
export function getFrozenRightColumns(columns: ColumnDef[]): ColumnDef[] {
  return columns.filter(col => col.frozen === 'right')
}

/**
 * Check if table has frozen columns
 */
export function hasFrozenColumns(columns: ColumnDef[]): boolean {
  return columns.some(col => col.frozen)
}
