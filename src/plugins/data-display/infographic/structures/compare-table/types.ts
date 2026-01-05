/**
 * CompareTable Types
 *
 * Comparison table infographic - feature/option comparison in table format
 */

import type { Snippet } from 'svelte'
import type { ThemeColors } from '../../theme'

/**
 * Table column definition
 */
export interface TableColumn {
  /** Column ID */
  id: string
  /** Column header */
  header: string
  /** Optional icon */
  icon?: string
  /** Optional header color */
  color?: string
  /** Column width (relative) */
  width?: number
}

/**
 * Table row data
 */
export interface TableRow {
  /** Row label (first column) */
  label: string
  /** Values for each column (keyed by column id) */
  values: Record<string, string | number | boolean>
  /** Optional row highlight */
  highlight?: boolean
}

/**
 * Cell layout info
 */
export interface CellLayout {
  /** Column info */
  column: TableColumn
  /** Row info */
  row: TableRow
  /** Cell value */
  value: string | number | boolean
  /** Row index */
  rowIndex: number
  /** Column index */
  colIndex: number
  /** X position */
  x: number
  /** Y position */
  y: number
  /** Cell width */
  width: number
  /** Cell height */
  height: number
  /** Theme colors */
  themeColors: ThemeColors
}

/**
 * CompareTable props
 */
export interface CompareTableProps {
  /** Table columns */
  columns: TableColumn[]
  /** Table rows */
  rows: TableRow[]
  /** Show row numbers */
  showRowNumbers?: boolean
  /** Alternate row colors */
  striped?: boolean
  /** Header style */
  headerStyle?: 'filled' | 'underline' | 'minimal'
  /** Cell padding */
  cellPadding?: number
  /** Row height */
  rowHeight?: number
  /** Header height */
  headerHeight?: number
  /** Show borders */
  showBorders?: boolean
  /** Custom cell renderer */
  cell?: Snippet<[CellLayout]>
  /** Width */
  width?: number
  /** Height */
  height?: number
}
