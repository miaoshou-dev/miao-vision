/**
 * DataTable Logic Module
 *
 * Pure functions for table operations, separated from UI.
 * All functions are side-effect free and fully testable.
 */

// Filtering
export {
  applyFilters,
  matchesFilter,
  addOrUpdateFilter,
  removeFilter,
  getActiveFilter
} from './filtering'

// Cell rendering
export {
  getCellValue,
  getCellStyle,
  getDataBarWidth,
  interpolateColor,
  getColorScaleBackground,
  getIconForValue,
  type IconInfo
} from './cell-render'

// Virtual scrolling
export {
  calculateRowHeight,
  calculateOverscan,
  calculateVisibleRange,
  calculateTotalHeight,
  calculateOffsetY,
  getVisibleRows,
  type VirtualScrollConfig,
  type VisibleRange
} from './virtual-scroll'

// Grouping
export {
  groupData,
  toggleGroup,
  isGroupCollapsed,
  getVisibleGroupedRows,
  type GroupedData
} from './grouping'

// Summary
export {
  calculateColumnSummary,
  calculateSummaryRow,
  hasSummaryColumns,
  getSummaryColumns,
  getSummaryLabel,
  type SummaryRow
} from './summary'

// Column resizing
export {
  createResizeState,
  startResize,
  calculateResizeWidth,
  updateColumnWidth,
  getColumnWidth,
  getColumnWidthNumber,
  getFrozenOffset,
  getFrozenLeftColumns,
  getFrozenRightColumns,
  hasFrozenColumns,
  type ResizeState,
  type ColumnWidths
} from './column-resize'

// Selection
export {
  createSelectionState,
  toggleRowSelection,
  selectRow,
  deselectRow,
  toggleSelectAll,
  selectAll,
  clearSelection,
  isAllSelected,
  isSomeSelected,
  isRowSelected,
  getSelectedIndices,
  getSelectedRows,
  selectRange,
  invertSelection,
  type SelectionState
} from './selection'

// Column visibility
export {
  initializeColumnVisibility,
  toggleColumnVisibility,
  showColumn,
  hideColumn,
  showAllColumns,
  showOnlyColumns,
  getVisibleColumns,
  getHiddenColumns,
  countVisibleColumns,
  isColumnVisible,
  canHideColumn,
  type ColumnVisibility
} from './column-visibility'

// Drilldown
export {
  buildDrilldownActionConfig,
  buildDrilldownExecuteConfig,
  buildDrilldownContext,
  type DrilldownActionConfig,
  type DrilldownExecuteConfig,
  type DrilldownContext
} from './drilldown'
