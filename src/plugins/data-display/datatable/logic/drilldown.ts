/**
 * DataTable Drilldown Logic
 *
 * Pure functions for handling drill-down interactions.
 */

import type { DrilldownConfig, DrilldownMapping } from '../types'

export interface DrilldownActionConfig {
  type: 'setInput' | 'modal'
  mappings?: Array<{
    column: string
    inputName: string
    transform?: string
  }>
  titleTemplate?: string
  displayColumns?: string[]
}

export interface DrilldownExecuteConfig {
  enabled: boolean
  action: DrilldownActionConfig
  cursor?: string
  hoverHighlight?: boolean
  tooltip?: string
}

export interface DrilldownContext {
  rowData: Record<string, unknown>
  rowIndex: number
  sourceComponent: string
  blockId?: string
}

/**
 * Build drilldown action configuration from config
 */
export function buildDrilldownActionConfig(
  drilldown: DrilldownConfig
): DrilldownActionConfig | null {
  if (!drilldown?.enabled) return null

  const actionType = drilldown.action || (drilldown.mappings?.length ? 'setInput' : 'modal')

  if (actionType === 'setInput' && !drilldown.mappings?.length) {
    return null
  }

  if (actionType === 'setInput') {
    return {
      type: 'setInput',
      mappings: drilldown.mappings!.map(m => ({
        column: m.column,
        inputName: m.inputName,
        transform: m.transform
      }))
    }
  }

  return {
    type: 'modal',
    titleTemplate: drilldown.titleTemplate,
    displayColumns: drilldown.displayColumns
  }
}

/**
 * Build drilldown execute configuration
 */
export function buildDrilldownExecuteConfig(
  drilldown: DrilldownConfig,
  actionConfig: DrilldownActionConfig
): DrilldownExecuteConfig {
  return {
    enabled: true,
    action: actionConfig,
    cursor: drilldown.cursor,
    hoverHighlight: drilldown.highlight,
    tooltip: drilldown.tooltip
  }
}

/**
 * Build drilldown context from row data
 */
export function buildDrilldownContext(
  row: Record<string, unknown>,
  rowIndex: number,
  blockId?: string
): DrilldownContext {
  return {
    rowData: row,
    rowIndex,
    sourceComponent: 'datatable',
    blockId
  }
}
