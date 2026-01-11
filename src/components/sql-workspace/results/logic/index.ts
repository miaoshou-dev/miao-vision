/**
 * Results Chart Logic Module
 *
 * Pure functions for chart data processing and rendering.
 */

// Chart data processing
export {
  prepareChartData,
  hasXColumnDuplicates,
  getSmartAggregation,
  type ChartDataset,
  type PreparedChartData,
  type AggregationType,
  type SortOrder
} from './chart-data'

// Chart configuration
export {
  CHART_TYPES,
  AGGREGATIONS,
  CHART_COLORS,
  DEFAULT_CHART_DIMENSIONS,
  getChartColor,
  getResultHash,
  getConfigHash,
  isVgplotSupported,
  type ChartType
} from './chart-config'

// Chart rendering
export {
  formatValue,
  renderPieChart,
  exportSVG,
  exportPNG,
  type PieChartOptions
} from './chart-render'
