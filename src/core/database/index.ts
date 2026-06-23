/**
 * Database Module
 *
 * Unified exports for all database-related functionality.
 *
 * The current product path uses the local DuckDB manager for report preview
 * and CLI-oriented visualization generation. Remote connector exports have
 * been removed with the SQL Workspace retirement.
 */

// Export DuckDB Manager and instances
// Note: Now using real DuckDBManager with schema isolation support
export {
  DuckDBManager,
  workspaceDB,
  duckDBManager,  // Alias for workspaceDB (with schema methods)
  createReportDB
} from './duckdb'

// Table loading utilities
export { loadDataIntoTable, dropTable } from './table-loader'

// Schema analysis utilities
export {
  SchemaAnalyzer,
  createSchemaAnalyzer,
  type IQueryExecutor
} from './schema-analyzer'

// Pagination utilities
export {
  PaginationService,
  createPaginationService,
  wrapWithPagination,
  wrapWithCount,
  wrapWithCursorPagination,
  PAGE_SIZES,
  DEFAULT_PAGINATION,
  type PaginationOptions,
  type PaginatedResult,
  type CursorPaginationOptions,
  type CursorPaginatedResult,
  type QueryExecutor
} from './pagination'

// Query cache utilities
export {
  QueryCache,
  createQueryCache,
  getQueryCache,
  createCachedExecutor,
  type CacheConfig,
  type CacheStats
} from './query-cache'
