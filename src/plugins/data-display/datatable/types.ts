/**
 * DataTable Component Types
 */

export type FormatType = 'number' | 'currency' | 'percent' | 'date' | 'text'

export type SummaryType = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'none'

export interface ConditionalFormat {
  condition: 'greater_than' | 'less_than' | 'equals' | 'between' | 'top_n' | 'bottom_n'
  value: number
  value2?: number  // For 'between'
  backgroundColor?: string
  textColor?: string
  fontWeight?: 'normal' | 'bold'
}

// Color scale configuration (gradient from low to high)
export type ColorScaleType = 'red-green' | 'green-red' | 'red-yellow-green' | 'blue-white-red' | 'white-blue'

export interface ColorScale {
  type: ColorScaleType
  min?: number  // Optional manual min (default: auto from data)
  max?: number  // Optional manual max (default: auto from data)
}

// Icon set configuration
export type IconSetType = 'arrows' | 'trend' | 'rating' | 'flags' | 'symbols'

export interface IconSet {
  type: IconSetType
  thresholds?: [number, number]  // [low, high] percentiles (default: [33, 67])
  showValue?: boolean  // Show value alongside icon (default: true)
}

// Image configuration for image columns
export interface ImageConfig {
  width?: number | string  // Image width (px or %)
  height?: number | string  // Image height (px or %)
  rounded?: boolean  // Rounded corners (default: false)
  fit?: 'contain' | 'cover' | 'fill'  // Object fit (default: 'contain')
}

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
  colorScale?: ColorScale    // Color scale gradient
  iconSet?: IconSet          // Icon set for value indicators

  // NEW: Advanced column features
  contentType?: 'text' | 'image' | 'html'  // Content type (default: 'text')
  imageConfig?: ImageConfig  // Image configuration (when contentType='image')
  frozen?: 'left' | 'right' | false  // Freeze column position (default: false)
}

/**
 * Drill-down value mapping for extracting values from clicked row
 */
export interface DrilldownMapping {
  column: string             // Source column name in the data
  inputName: string          // Target input name to set
  transform?: 'string' | 'number' | 'date'  // Optional transformation
}

/**
 * Drill-down configuration for table rows
 */
export interface DrilldownConfig {
  enabled: boolean           // Enable drill-down on row click
  action?: 'setInput' | 'modal'  // Action type (default: setInput if mappings provided, modal otherwise)
  mappings?: DrilldownMapping[]  // Map columns to input variables (for setInput action)
  displayColumns?: string[]  // Columns to display in modal (for modal action, default: all)
  titleTemplate?: string     // Title template for modal, e.g. "Order #{order_id}" (for modal action)
  cursor?: 'pointer' | 'zoom-in'  // Cursor style on hover (default: pointer)
  highlight?: boolean        // Highlight row on hover (default: true)
  tooltip?: string           // Tooltip text for drill-down hint
}

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
  drilldown?: DrilldownConfig  // Drill-down configuration for row clicks

  // NEW: Advanced table features
  resizableColumns?: boolean // Enable column width resizing (default: false)
  groupBy?: string           // Column name to group rows by
  showSubtotals?: boolean    // Show subtotal rows for each group (default: false)
  groupCollapsible?: boolean // Allow collapsing/expanding groups (default: true)
}

export interface ColumnMeta {
  name: string
  type: 'number' | 'string' | 'date' | 'boolean' | 'unknown'
  sample: any[]              // Sample values for preview
}

export interface SortState {
  column: string
  direction: 'asc' | 'desc'
}

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

export interface ColumnFilter {
  column: string
  operator: FilterOperator
  value: any
  value2?: any  // For 'between' and 'date_between' operators
}

export type FilterState = ColumnFilter[]

export interface DataTableData {
  config: DataTableConfig
  columns: ColumnConfig[]    // Final column config (merged with auto-detect)
  rows: any[]                // Raw data rows
  filteredRows: any[]        // Filtered/searched rows
  sortState: SortState | null
  searchQuery: string
}

// Type aliases for consistency with logic files
export type ColumnDef = ColumnConfig
export type ConditionalFormatRule = ConditionalFormat
export type ColorScaleConfig = ColorScale
export type IconSetConfig = IconSet
