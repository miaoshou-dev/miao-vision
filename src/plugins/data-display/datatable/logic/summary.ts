/**
 * DataTable Summary Row Logic
 *
 * Pure functions for calculating summary/aggregate values.
 */

import type { ColumnDef, SummaryType } from '../types'
import { formatValue } from '../formatter'

export interface SummaryRow {
  [columnName: string]: string
}

/**
 * Calculate summary value for a single column
 */
export function calculateColumnSummary(
  rows: Record<string, unknown>[],
  column: ColumnDef
): string {
  if (!column.summary || column.summary === 'none' || rows.length === 0) {
    return ''
  }

  const values = rows
    .map(row => row[column.name])
    .filter(v => v !== null && v !== undefined && v !== '')

  const numericValues = values
    .map(v => Number(v))
    .filter(v => !isNaN(v))

  switch (column.summary) {
    case 'sum':
      return formatValue(
        numericValues.reduce((acc, v) => acc + v, 0),
        column.format || 'number'
      )
    case 'avg':
      if (numericValues.length === 0) return ''
      return formatValue(
        numericValues.reduce((acc, v) => acc + v, 0) / numericValues.length,
        column.format || 'number'
      )
    case 'count':
      return String(values.length)
    case 'min':
      if (numericValues.length === 0) return ''
      return formatValue(Math.min(...numericValues), column.format || 'number')
    case 'max':
      if (numericValues.length === 0) return ''
      return formatValue(Math.max(...numericValues), column.format || 'number')
    default:
      return ''
  }
}

/**
 * Calculate summary row for all columns
 */
export function calculateSummaryRow(
  rows: Record<string, unknown>[],
  columns: ColumnDef[]
): SummaryRow {
  return columns.reduce((acc, col) => {
    acc[col.name] = calculateColumnSummary(rows, col)
    return acc
  }, {} as SummaryRow)
}

/**
 * Check if any column has summary enabled
 */
export function hasSummaryColumns(columns: ColumnDef[]): boolean {
  return columns.some(col => col.summary && col.summary !== 'none')
}

/**
 * Get columns that have summary enabled
 */
export function getSummaryColumns(columns: ColumnDef[]): ColumnDef[] {
  return columns.filter(col => col.summary && col.summary !== 'none')
}

/**
 * Get summary label for display
 */
export function getSummaryLabel(summaryType: SummaryType): string {
  switch (summaryType) {
    case 'sum':
      return 'Sum'
    case 'avg':
      return 'Average'
    case 'count':
      return 'Count'
    case 'min':
      return 'Min'
    case 'max':
      return 'Max'
    default:
      return ''
  }
}
