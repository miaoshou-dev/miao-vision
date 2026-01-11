/**
 * SQL Workspace Logic Module
 *
 * Pure functions for SQL workspace operations.
 */

export {
  SUPPORTED_FILE_EXTENSIONS,
  isFileSupported,
  getFileExtension,
  filterTables,
  formatRowCount,
  getColumnTypeIcon,
  getColumnBadges,
  getColumnTooltip,
  createBasicColumnSchema,
  createBasicTableSchema,
  generatePreviewSQL,
  updateColumnStats
} from './data-explorer'
