/**
 * Table Loader
 *
 * Utilities for loading data into DuckDB tables.
 * Used to store SQL query results for chart rendering and SQL references.
 *
 * P1.5: Uses Web Worker for CPU-intensive SQL string building
 * to prevent main thread blocking on large datasets.
 */

import { workspaceDB, type DuckDBManager } from './index'
import { buildTableSQLInWorker, isChartWorkerAvailable } from '@/workers/use-chart-worker'

/**
 * Options for loading data into table
 */
export interface LoadTableOptions {
  /** Create as TEMPORARY table (won't show in SHOW TABLES) - DEPRECATED: Use schema instead */
  temporary?: boolean
  /** Schema to create table in (e.g., 'report_data' for report tables, undefined for main schema) */
  schema?: string
  /** Database instance to use (defaults to workspaceDB if not provided) */
  db?: DuckDBManager
}

/**
 * Load data from query result into a DuckDB table
 *
 * With the unified DuckDB instance, this creates the table directly
 * in duckDBManager for report preview and SQL references.
 *
 * @param tableName - Name of the table to create
 * @param data - Array of row objects
 * @param columns - Array of column names
 * @param options - Table creation options
 */
export async function loadDataIntoTable(
  tableName: string,
  data: any[],
  columns: string[],
  options?: LoadTableOptions
): Promise<void> {
  try {
    // Use provided DB instance or default to workspaceDB
    const db = options?.db || workspaceDB

    // Ensure DuckDB is initialized
    if (!db.isInitialized()) {
      await db.initialize()
    }

    if (data.length === 0) {
      console.warn(`Cannot create table ${tableName}: no data`)
      return
    }

    const startTime = performance.now()
    let createTableSQL: string

    // P1.5: Use Worker for large datasets to avoid blocking main thread
    const shouldUseWorker = isChartWorkerAvailable() && data.length > 100

    // Build fully qualified table name with schema if provided
    const fullTableName = options?.schema ? `${options.schema}.${tableName}` : tableName

    if (shouldUseWorker) {
      console.log(`[TableLoader] Using Worker for ${data.length} rows`)
      try {
        // Build SQL in background worker (non-blocking)
        createTableSQL = await buildTableSQLInWorker(fullTableName, data, columns)

        // Fix schema-qualified table names: Worker wraps entire name in quotes
        // Change: CREATE TABLE "schema.table" → CREATE TABLE schema."table"
        if (fullTableName.includes('.')) {
          const parts = fullTableName.split('.')
          const schema = parts.slice(0, -1).join('.')
          const table = parts[parts.length - 1]
          const wrongPattern = `"${fullTableName}"`
          const correctPattern = `${schema}."${table}"`
          createTableSQL = createTableSQL.replace(wrongPattern, correctPattern)
        }

        // Handle TEMP TABLE option
        if (options?.temporary) {
          createTableSQL = createTableSQL.replace('CREATE OR REPLACE TABLE', 'CREATE OR REPLACE TEMP TABLE')
        }

        const buildTime = performance.now() - startTime
        console.log(`[TableLoader] SQL built in Worker: ${buildTime.toFixed(2)}ms`)
      } catch (workerError) {
        console.warn('[TableLoader] Worker failed, falling back to main thread:', workerError)
        // Fallback to main thread
        createTableSQL = buildTableSQLSync(fullTableName, data, columns, options)
      }
    } else {
      // Small datasets or worker not available - use main thread
      console.log(`[TableLoader] Using main thread for ${data.length} rows`)
      createTableSQL = buildTableSQLSync(fullTableName, data, columns, options)
    }

    // Execute SQL (DuckDB is already in a worker, so this is async)
    await db.query(createTableSQL)

    const totalTime = performance.now() - startTime
    const schemaInfo = options?.schema ? ` in schema '${options.schema}'` : ''
    console.log(`Table created: ${fullTableName}${schemaInfo} (${data.length} rows) in ${totalTime.toFixed(2)}ms`)
  } catch (error) {
    console.error('Failed to load data into table:', error)
    throw error
  }
}

/**
 * Build SQL synchronously in main thread (fallback)
 * P1.5: This is the original implementation, kept as fallback
 */
function buildTableSQLSync(
  tableName: string,
  data: any[],
  columns: string[],
  options?: LoadTableOptions
): string {
  const columnDefs = columns.map(col => `"${col}"`).join(', ')
  const values = data.map(row => {
    const vals = columns.map(col => {
      const val = row[col]
      if (val === null || val === undefined) return 'NULL'
      if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`
      if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
      return String(val)
    })
    return `(${vals.join(', ')})`
  }).join(', ')

  // Use TEMP TABLE if requested (won't show in SHOW TABLES)
  const tableType = options?.temporary ? 'TEMP TABLE' : 'TABLE'

  // Handle schema-qualified table names (e.g., "report_data.chart_data_block_0")
  // Split schema and table, only quote the table name
  let tableIdentifier: string
  if (tableName.includes('.')) {
    const parts = tableName.split('.')
    const schema = parts.slice(0, -1).join('.')  // Handle catalog.schema.table
    const table = parts[parts.length - 1]
    tableIdentifier = `${schema}."${table}"`
  } else {
    tableIdentifier = `"${tableName}"`
  }

  return `
    CREATE OR REPLACE ${tableType} ${tableIdentifier} AS
    SELECT * FROM (VALUES ${values}) AS t(${columnDefs})
  `
}

/**
 * Drop a table from DuckDB
 *
 * @param tableName - Name of the table to drop
 * @param db - Database instance (defaults to workspaceDB)
 */
export async function dropTable(tableName: string, db?: DuckDBManager): Promise<void> {
  try {
    const database = db || workspaceDB
    if (!database.isInitialized()) {
      return
    }
    await database.query(`DROP TABLE IF EXISTS "${tableName}"`)
    console.log(`Table dropped: ${tableName}`)
  } catch (error) {
    console.warn(`Failed to drop table ${tableName}:`, error)
  }
}
