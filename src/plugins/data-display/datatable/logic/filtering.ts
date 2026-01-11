/**
 * DataTable Filtering Logic
 *
 * Pure functions for filtering table data.
 */

import type { ColumnFilter, FilterState } from '../types'

/**
 * Apply filters to data rows
 */
export function applyFilters<T extends Record<string, unknown>>(
  rows: T[],
  filters: FilterState
): T[] {
  if (filters.length === 0) return rows

  return rows.filter(row => {
    return filters.every(filter => matchesFilter(row, filter))
  })
}

/**
 * Check if a row matches a single filter
 */
export function matchesFilter<T extends Record<string, unknown>>(
  row: T,
  filter: ColumnFilter
): boolean {
  const value = row[filter.column]
  if (value === null || value === undefined) return false

  switch (filter.operator) {
    case 'contains':
      return String(value).toLowerCase().includes(String(filter.value).toLowerCase())
    case 'not_contains':
      return !String(value).toLowerCase().includes(String(filter.value).toLowerCase())
    case 'equals':
      return String(value).toLowerCase() === String(filter.value).toLowerCase()
    case 'not_equals':
      return String(value).toLowerCase() !== String(filter.value).toLowerCase()
    case 'greater_than':
      return Number(value) > Number(filter.value)
    case 'less_than':
      return Number(value) < Number(filter.value)
    case 'between':
      return Number(value) >= Number(filter.value) && Number(value) <= Number(filter.value2)
    case 'after':
      return new Date(value as string) > new Date(filter.value)
    case 'before':
      return new Date(value as string) < new Date(filter.value)
    case 'date_between':
      return new Date(value as string) >= new Date(filter.value) &&
             new Date(value as string) <= new Date(filter.value2!)
    default:
      return true
  }
}

/**
 * Add or update a filter in the filter state
 */
export function addOrUpdateFilter(
  filterState: FilterState,
  filter: ColumnFilter
): FilterState {
  const existingIndex = filterState.findIndex(f => f.column === filter.column)
  if (existingIndex >= 0) {
    const newState = [...filterState]
    newState[existingIndex] = filter
    return newState
  }
  return [...filterState, filter]
}

/**
 * Remove a filter by column name
 */
export function removeFilter(filterState: FilterState, columnName: string): FilterState {
  return filterState.filter(f => f.column !== columnName)
}

/**
 * Get active filter for a column
 */
export function getActiveFilter(
  filterState: FilterState,
  columnName: string
): ColumnFilter | undefined {
  return filterState.find(f => f.column === columnName)
}
