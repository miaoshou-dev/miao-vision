/**
 * DataTable Column Visibility Logic
 *
 * Pure functions for managing column visibility.
 */

import type { ColumnDef } from '../types'

export interface ColumnVisibility {
  [columnName: string]: boolean
}

/**
 * Initialize column visibility from column definitions
 */
export function initializeColumnVisibility(columns: ColumnDef[]): ColumnVisibility {
  return columns.reduce((acc, col) => {
    acc[col.name] = col.visible !== false
    return acc
  }, {} as ColumnVisibility)
}

/**
 * Toggle visibility of a single column
 * Prevents hiding the last visible column
 */
export function toggleColumnVisibility(
  visibility: ColumnVisibility,
  columnName: string
): ColumnVisibility {
  const visibleCount = Object.values(visibility).filter(v => v).length

  // Prevent hiding the last visible column
  if (visibleCount === 1 && visibility[columnName]) {
    return visibility
  }

  return {
    ...visibility,
    [columnName]: !visibility[columnName]
  }
}

/**
 * Show a specific column
 */
export function showColumn(
  visibility: ColumnVisibility,
  columnName: string
): ColumnVisibility {
  return {
    ...visibility,
    [columnName]: true
  }
}

/**
 * Hide a specific column (respects minimum 1 visible)
 */
export function hideColumn(
  visibility: ColumnVisibility,
  columnName: string
): ColumnVisibility {
  const visibleCount = Object.values(visibility).filter(v => v).length

  if (visibleCount === 1 && visibility[columnName]) {
    return visibility
  }

  return {
    ...visibility,
    [columnName]: false
  }
}

/**
 * Show all columns
 */
export function showAllColumns(columns: ColumnDef[]): ColumnVisibility {
  return columns.reduce((acc, col) => {
    acc[col.name] = true
    return acc
  }, {} as ColumnVisibility)
}

/**
 * Hide all columns except specified ones
 */
export function showOnlyColumns(
  columns: ColumnDef[],
  visibleColumnNames: string[]
): ColumnVisibility {
  return columns.reduce((acc, col) => {
    acc[col.name] = visibleColumnNames.includes(col.name)
    return acc
  }, {} as ColumnVisibility)
}

/**
 * Get visible columns
 */
export function getVisibleColumns(
  columns: ColumnDef[],
  visibility: ColumnVisibility
): ColumnDef[] {
  return columns.filter(col => visibility[col.name] !== false)
}

/**
 * Get hidden columns
 */
export function getHiddenColumns(
  columns: ColumnDef[],
  visibility: ColumnVisibility
): ColumnDef[] {
  return columns.filter(col => visibility[col.name] === false)
}

/**
 * Count visible columns
 */
export function countVisibleColumns(visibility: ColumnVisibility): number {
  return Object.values(visibility).filter(v => v).length
}

/**
 * Check if a column is visible
 */
export function isColumnVisible(
  visibility: ColumnVisibility,
  columnName: string
): boolean {
  return visibility[columnName] !== false
}

/**
 * Check if column can be hidden (not the last visible one)
 */
export function canHideColumn(
  visibility: ColumnVisibility,
  columnName: string
): boolean {
  const visibleCount = Object.values(visibility).filter(v => v).length
  return !(visibleCount === 1 && visibility[columnName])
}
