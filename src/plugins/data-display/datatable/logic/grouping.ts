/**
 * DataTable Grouping Logic
 *
 * Pure functions for row grouping and subtotal calculations.
 */

import type { ColumnDef } from '../types'
import { formatValue } from '../formatter'

export interface GroupedData {
  groupKey: string
  groupValue: unknown
  rows: Record<string, unknown>[]
  subtotals?: Record<string, string>
}

/**
 * Group data by specified column
 */
export function groupData(
  rows: Record<string, unknown>[],
  groupByColumn: string,
  columns: ColumnDef[],
  showSubtotals: boolean
): GroupedData[] {
  if (!groupByColumn) return []

  const groups = new Map<string, Record<string, unknown>[]>()

  rows.forEach(row => {
    const groupValue = row[groupByColumn]
    const groupKey = String(groupValue)

    if (!groups.has(groupKey)) {
      groups.set(groupKey, [])
    }
    groups.get(groupKey)!.push(row)
  })

  const groupedData: GroupedData[] = []

  groups.forEach((groupRows, groupKey) => {
    const groupEntry: GroupedData = {
      groupKey,
      groupValue: groupRows[0][groupByColumn],
      rows: groupRows
    }

    // Calculate subtotals if enabled
    if (showSubtotals) {
      groupEntry.subtotals = {}
      columns.forEach(column => {
        if (column.summary && column.summary !== 'none') {
          groupEntry.subtotals![column.name] = calculateSummary(groupRows, column)
        }
      })
    }

    groupedData.push(groupEntry)
  })

  return groupedData
}

/**
 * Toggle group collapsed state
 */
export function toggleGroup(
  collapsedGroups: Set<string>,
  groupKey: string
): Set<string> {
  const newSet = new Set(collapsedGroups)
  if (newSet.has(groupKey)) {
    newSet.delete(groupKey)
  } else {
    newSet.add(groupKey)
  }
  return newSet
}

/**
 * Check if a group is collapsed
 */
export function isGroupCollapsed(
  collapsedGroups: Set<string>,
  groupKey: string
): boolean {
  return collapsedGroups.has(groupKey)
}

/**
 * Get visible rows considering group collapse state
 */
export function getVisibleGroupedRows(
  groupedData: GroupedData[],
  collapsedGroups: Set<string>
): Record<string, unknown>[] {
  const visibleRows: Record<string, unknown>[] = []

  groupedData.forEach(group => {
    // Group header is always visible (could be represented separately)
    if (!collapsedGroups.has(group.groupKey)) {
      visibleRows.push(...group.rows)
    }
  })

  return visibleRows
}

/**
 * Calculate summary value for a column
 */
function calculateSummary(
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
      return formatValue(
        numericValues.reduce((acc, v) => acc + v, 0) / numericValues.length,
        column.format || 'number'
      )
    case 'count':
      return String(values.length)
    case 'min':
      return formatValue(Math.min(...numericValues), column.format || 'number')
    case 'max':
      return formatValue(Math.max(...numericValues), column.format || 'number')
    default:
      return ''
  }
}
