/**
 * Data Visualization Types
 *
 * Types for BigValue, DataTable, and Chart components
 */

// ============================================================================
// BigValue Types
// ============================================================================

export interface BigValueConfig {
  query: string       // SQL result name to use as data source
  value: string       // Column name to extract the value from
  title?: string      // Display title
  format?: 'number' | 'currency' | 'percent'  // Value format
  comparison?: string // Optional: reference to comparison query result
  comparisonLabel?: string  // Label for comparison (e.g., "vs last month")
}

export interface BigValueData {
  value: number
  title: string
  formatted: string
  comparison?: ComparisonData
}

export interface ComparisonData {
  value: number           // Raw comparison value
  percent: number         // Percentage change
  trend: 'up' | 'down' | 'neutral'
  label: string           // Display label
  formatted: string       // Formatted comparison value
}

// ============================================================================
// Value Types (inline single value display)
// ============================================================================

export interface ValueConfig {
  data: string            // SQL result name to use as data source
  column: string          // Column name to extract the value from
  row?: number            // Row index (default: 0)
  format?: 'auto' | 'number' | 'currency' | 'percent' | 'date' | 'text'
  precision?: number      // Decimal precision (default: 2)
  prefix?: string         // Text before value
  suffix?: string         // Text after value
  placeholder?: string    // Text when value is null (default: '-')
  class?: string          // Additional CSS classes
}

export interface ValueData {
  value: any              // The extracted value
  config: ValueConfig     // Configuration
}

// ============================================================================
// DataTable Types
// ============================================================================

/**
 * Configuration from datatable code block
 */
export interface DataTableConfig {
  query: string              // SQL result name to use as data source
  columns?: ColumnConfig[]   // Column configurations (optional, auto-detect if not provided)
  searchable?: boolean       // Enable search functionality (default: true)
  sortable?: boolean         // Enable sorting (default: true)
  exportable?: boolean       // Enable CSV export (default: true)
  columnSelector?: boolean   // Enable column visibility selector (default: false)
  filterable?: boolean       // Enable column-level filtering (default: false)
  summaryRow?: boolean       // Enable summary row at bottom (default: false)
  selectable?: boolean       // Enable row selection (default: false)
  rowHeight?: number         // Row height for virtual scrolling (default: 36)
  maxHeight?: number         // Max table height in pixels (default: 600)
}

/**
 * Summary aggregation types
 */
export type SummaryType = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'none'

/**
 * Conditional formatting rule
 */
export interface ConditionalFormat {
  condition: 'greater_than' | 'less_than' | 'equals' | 'between'
  value: number
  value2?: number  // For 'between'
  backgroundColor?: string
  textColor?: string
  fontWeight?: 'normal' | 'bold'
}

/**
 * Column configuration
 */
export interface ColumnConfig {
  name: string               // Column name (from SQL result)
  label?: string             // Display label (default: name)
  format?: FormatType        // Value format
  align?: 'left' | 'right' | 'center'  // Text alignment
  width?: number | string    // Column width (px or %)
  visible?: boolean          // Column visibility (default: true)
  resizable?: boolean        // Allow column resizing (default: true)
  summary?: SummaryType      // Summary aggregation type (default: 'none')
  conditionalFormat?: ConditionalFormat[]  // Conditional formatting rules
  showDataBar?: boolean      // Show data bar in cells (default: false)
}

/**
 * Format types for cell values
 */
export type FormatType = 'number' | 'currency' | 'percent' | 'date' | 'text'

/**
 * Column metadata (auto-detected from data)
 */
export interface ColumnMeta {
  name: string
  type: 'number' | 'string' | 'date' | 'boolean' | 'unknown'
  sample: any[]              // Sample values for preview
}

/**
 * Sort state
 */
export interface SortState {
  column: string
  direction: 'asc' | 'desc'
}

/**
 * Filter types
 */
export type FilterOperator =
  // Text filters
  | 'contains'
  | 'not_contains'
  | 'equals'
  | 'not_equals'
  // Numeric filters
  | 'greater_than'
  | 'less_than'
  | 'between'
  // Date filters
  | 'after'
  | 'before'
  | 'date_between'

/**
 * Filter state for a single column
 */
export interface ColumnFilter {
  column: string
  operator: FilterOperator
  value: any
  value2?: any  // For 'between' and 'date_between' operators
}

/**
 * Filter state collection
 */
export type FilterState = ColumnFilter[]

/**
 * DataTable component data
 */
export interface DataTableData {
  config: DataTableConfig
  columns: ColumnConfig[]    // Final column config (merged with auto-detect)
  rows: any[]                // Raw data rows
  filteredRows: any[]        // Filtered/searched rows
  sortState: SortState | null
  searchQuery: string
}

// ============================================================================
// Histogram Types (for future implementation)
// ============================================================================

export interface HistogramConfig {
  data: string       // Data source (table name)
  x: string          // Column for binning
  bins?: number      // Number of bins (default: 20)
  color?: string     // Bar color
  title?: string     // Chart title
  xLabel?: string    // X-axis label
  yLabel?: string    // Y-axis label (default: "Count")
}

export interface HistogramBin {
  x0: number         // Bin start
  x1: number         // Bin end
  count: number      // Number of items in this bin
}

export interface HistogramData {
  bins: HistogramBin[]
  min: number
  max: number
  binWidth: number
}
