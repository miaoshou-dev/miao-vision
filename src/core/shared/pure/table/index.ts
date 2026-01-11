/**
 * Table Utilities
 *
 * Pure functions for table operations: pagination, column formatting, export.
 *
 * @module core/shared/pure/table
 */

// ============================================================================
// Pagination
// ============================================================================

export interface PaginationState {
  page: number
  pageSize: number
  totalRows: number
}

export interface PaginationInfo extends PaginationState {
  totalPages: number
  startRow: number
  endRow: number
  hasNext: boolean
  hasPrev: boolean
}

/**
 * Calculate pagination info
 */
export function getPaginationInfo(state: PaginationState): PaginationInfo {
  const { page, pageSize, totalRows } = state
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const startRow = (currentPage - 1) * pageSize + 1
  const endRow = Math.min(currentPage * pageSize, totalRows)

  return {
    page: currentPage,
    pageSize,
    totalRows,
    totalPages,
    startRow,
    endRow,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1
  }
}

/**
 * Get paginated data slice
 */
export function paginateData<T>(data: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize
  return data.slice(start, start + pageSize)
}

/**
 * Get page numbers for pagination UI
 */
export function getPageNumbers(
  currentPage: number,
  totalPages: number,
  maxVisible: number = 5
): (number | '...')[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const pages: (number | '...')[] = []
  const half = Math.floor(maxVisible / 2)

  // Always show first page
  pages.push(1)

  // Calculate range around current page
  let start = Math.max(2, currentPage - half)
  let end = Math.min(totalPages - 1, currentPage + half)

  // Adjust if at edges
  if (currentPage <= half + 1) {
    end = maxVisible - 1
  }
  if (currentPage >= totalPages - half) {
    start = totalPages - maxVisible + 2
  }

  // Add ellipsis before if needed
  if (start > 2) {
    pages.push('...')
  }

  // Add middle pages
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  // Add ellipsis after if needed
  if (end < totalPages - 1) {
    pages.push('...')
  }

  // Always show last page
  if (totalPages > 1) {
    pages.push(totalPages)
  }

  return pages
}

// ============================================================================
// Column Formatting
// ============================================================================

export type ColumnAlignment = 'left' | 'center' | 'right'

export interface ColumnConfig {
  key: string
  label?: string
  width?: number | string
  minWidth?: number
  maxWidth?: number
  align?: ColumnAlignment
  sortable?: boolean
  resizable?: boolean
  visible?: boolean
  formatter?: (value: unknown) => string
}

/**
 * Infer column alignment from data type
 */
export function inferAlignment(value: unknown): ColumnAlignment {
  if (typeof value === 'number') return 'right'
  if (typeof value === 'boolean') return 'center'
  return 'left'
}

/**
 * Format cell value for display
 */
export function formatCellValue(
  value: unknown,
  formatter?: (value: unknown) => string
): string {
  if (value === null || value === undefined) return ''
  if (formatter) return formatter(value)
  if (value instanceof Date) return value.toLocaleDateString()
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return value.toLocaleString()
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/**
 * Generate column configs from data
 */
export function inferColumns<T extends Record<string, unknown>>(
  data: T[],
  options: { excludeKeys?: string[] } = {}
): ColumnConfig[] {
  if (data.length === 0) return []

  const { excludeKeys = [] } = options
  const firstRow = data[0]
  const excludeSet = new Set(excludeKeys)

  return Object.keys(firstRow)
    .filter(key => !excludeSet.has(key))
    .map(key => ({
      key,
      label: formatColumnLabel(key),
      align: inferAlignment(firstRow[key]),
      sortable: true,
      resizable: true,
      visible: true
    }))
}

/**
 * Format column key to label
 */
export function formatColumnLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase())
}

// ============================================================================
// Export
// ============================================================================

export interface ExportOptions {
  filename?: string
  columns?: string[]
  includeHeaders?: boolean
  delimiter?: string
  dateFormat?: string
}

/**
 * Export data to CSV string
 */
export function toCSV<T extends Record<string, unknown>>(
  data: T[],
  options: ExportOptions = {}
): string {
  if (data.length === 0) return ''

  const {
    columns = Object.keys(data[0]),
    includeHeaders = true,
    delimiter = ','
  } = options

  const rows: string[] = []

  // Header row
  if (includeHeaders) {
    rows.push(columns.map(col => escapeCSV(formatColumnLabel(col))).join(delimiter))
  }

  // Data rows
  for (const row of data) {
    const values = columns.map(col => {
      const value = row[col]
      return escapeCSV(formatCellValue(value))
    })
    rows.push(values.join(delimiter))
  }

  return rows.join('\n')
}

/**
 * Export data to JSON string
 */
export function toJSON<T extends Record<string, unknown>>(
  data: T[],
  options: ExportOptions = {}
): string {
  const { columns } = options

  if (columns) {
    data = data.map(row => {
      const filtered: Record<string, unknown> = {}
      for (const col of columns) {
        filtered[col] = row[col]
      }
      return filtered as T
    })
  }

  return JSON.stringify(data, null, 2)
}

/**
 * Export data to TSV string
 */
export function toTSV<T extends Record<string, unknown>>(
  data: T[],
  options: ExportOptions = {}
): string {
  return toCSV(data, { ...options, delimiter: '\t' })
}

/**
 * Escape value for CSV
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Download string as file
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string = 'text/plain'
): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export and download as CSV
 */
export function exportCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string = 'export.csv',
  options: ExportOptions = {}
): void {
  const csv = toCSV(data, options)
  downloadFile(csv, filename, 'text/csv')
}

/**
 * Export and download as JSON
 */
export function exportJSON<T extends Record<string, unknown>>(
  data: T[],
  filename: string = 'export.json',
  options: ExportOptions = {}
): void {
  const json = toJSON(data, options)
  downloadFile(json, filename, 'application/json')
}

// ============================================================================
// Selection
// ============================================================================

export type SelectionMode = 'none' | 'single' | 'multiple'

export interface SelectionState {
  selectedIds: Set<string | number>
  lastSelectedId: string | number | null
}

/**
 * Create initial selection state
 */
export function createSelectionState(): SelectionState {
  return {
    selectedIds: new Set(),
    lastSelectedId: null
  }
}

/**
 * Toggle selection of a single item
 */
export function toggleSelection(
  state: SelectionState,
  id: string | number,
  mode: SelectionMode = 'multiple'
): SelectionState {
  const newSelectedIds = new Set(state.selectedIds)

  if (mode === 'single') {
    newSelectedIds.clear()
    if (!state.selectedIds.has(id)) {
      newSelectedIds.add(id)
    }
  } else {
    if (newSelectedIds.has(id)) {
      newSelectedIds.delete(id)
    } else {
      newSelectedIds.add(id)
    }
  }

  return {
    selectedIds: newSelectedIds,
    lastSelectedId: id
  }
}

/**
 * Select range of items (for shift+click)
 */
export function selectRange<T extends { id: string | number }>(
  state: SelectionState,
  items: T[],
  targetId: string | number
): SelectionState {
  const newSelectedIds = new Set(state.selectedIds)

  if (state.lastSelectedId === null) {
    newSelectedIds.add(targetId)
  } else {
    const lastIndex = items.findIndex(item => item.id === state.lastSelectedId)
    const targetIndex = items.findIndex(item => item.id === targetId)

    if (lastIndex !== -1 && targetIndex !== -1) {
      const start = Math.min(lastIndex, targetIndex)
      const end = Math.max(lastIndex, targetIndex)

      for (let i = start; i <= end; i++) {
        newSelectedIds.add(items[i].id)
      }
    }
  }

  return {
    selectedIds: newSelectedIds,
    lastSelectedId: targetId
  }
}

/**
 * Select all items
 */
export function selectAll<T extends { id: string | number }>(items: T[]): SelectionState {
  return {
    selectedIds: new Set(items.map(item => item.id)),
    lastSelectedId: items.length > 0 ? items[items.length - 1].id : null
  }
}

/**
 * Clear selection
 */
export function clearSelection(): SelectionState {
  return createSelectionState()
}

/**
 * Check if item is selected
 */
export function isSelected(state: SelectionState, id: string | number): boolean {
  return state.selectedIds.has(id)
}

/**
 * Get selected items
 */
export function getSelectedItems<T extends { id: string | number }>(
  state: SelectionState,
  items: T[]
): T[] {
  return items.filter(item => state.selectedIds.has(item.id))
}
