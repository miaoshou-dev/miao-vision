/**
 * DataTable Selection Logic
 *
 * Pure functions for row selection management.
 */

export interface SelectionState {
  selectedRows: Set<number>
}

/**
 * Create initial selection state
 */
export function createSelectionState(): SelectionState {
  return {
    selectedRows: new Set()
  }
}

/**
 * Toggle selection of a single row
 */
export function toggleRowSelection(
  selectedRows: Set<number>,
  rowIndex: number
): Set<number> {
  const newSelected = new Set(selectedRows)
  if (newSelected.has(rowIndex)) {
    newSelected.delete(rowIndex)
  } else {
    newSelected.add(rowIndex)
  }
  return newSelected
}

/**
 * Select a single row (deselect others)
 */
export function selectRow(rowIndex: number): Set<number> {
  return new Set([rowIndex])
}

/**
 * Deselect a single row
 */
export function deselectRow(
  selectedRows: Set<number>,
  rowIndex: number
): Set<number> {
  const newSelected = new Set(selectedRows)
  newSelected.delete(rowIndex)
  return newSelected
}

/**
 * Toggle select all rows
 */
export function toggleSelectAll(
  selectedRows: Set<number>,
  totalRows: number
): Set<number> {
  if (selectedRows.size === totalRows) {
    return new Set()
  } else {
    return new Set(Array.from({ length: totalRows }, (_, idx) => idx))
  }
}

/**
 * Select all rows
 */
export function selectAll(totalRows: number): Set<number> {
  return new Set(Array.from({ length: totalRows }, (_, idx) => idx))
}

/**
 * Clear all selections
 */
export function clearSelection(): Set<number> {
  return new Set()
}

/**
 * Check if all rows are selected
 */
export function isAllSelected(
  selectedRows: Set<number>,
  totalRows: number
): boolean {
  return totalRows > 0 && selectedRows.size === totalRows
}

/**
 * Check if some rows are selected (but not all)
 */
export function isSomeSelected(
  selectedRows: Set<number>,
  totalRows: number
): boolean {
  return selectedRows.size > 0 && selectedRows.size < totalRows
}

/**
 * Check if a row is selected
 */
export function isRowSelected(
  selectedRows: Set<number>,
  rowIndex: number
): boolean {
  return selectedRows.has(rowIndex)
}

/**
 * Get selected row indices as array
 */
export function getSelectedIndices(selectedRows: Set<number>): number[] {
  return Array.from(selectedRows).sort((a, b) => a - b)
}

/**
 * Get selected row data
 */
export function getSelectedRows<T>(
  rows: T[],
  selectedRows: Set<number>
): T[] {
  return Array.from(selectedRows)
    .sort((a, b) => a - b)
    .map(idx => rows[idx])
    .filter(Boolean)
}

/**
 * Select range of rows (for shift+click)
 */
export function selectRange(
  selectedRows: Set<number>,
  startIndex: number,
  endIndex: number
): Set<number> {
  const newSelected = new Set(selectedRows)
  const [min, max] = startIndex < endIndex
    ? [startIndex, endIndex]
    : [endIndex, startIndex]

  for (let i = min; i <= max; i++) {
    newSelected.add(i)
  }
  return newSelected
}

/**
 * Invert selection
 */
export function invertSelection(
  selectedRows: Set<number>,
  totalRows: number
): Set<number> {
  const newSelected = new Set<number>()
  for (let i = 0; i < totalRows; i++) {
    if (!selectedRows.has(i)) {
      newSelected.add(i)
    }
  }
  return newSelected
}
