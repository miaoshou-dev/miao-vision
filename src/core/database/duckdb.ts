import * as duckdb from '@duckdb/duckdb-wasm'
import type { DatabaseConfig, QueryResult } from '@/types/database'

// Import bundles
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url'
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url'
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url'
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url'

const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
  mvp: {
    mainModule: duckdb_wasm,
    mainWorker: mvp_worker
  },
  eh: {
    mainModule: duckdb_wasm_eh,
    mainWorker: eh_worker
  }
}

/**
 * Workspace database alias for ATTACH (deprecated - Memory-only mode)
 */
export const WORKSPACE_DB_PATH = 'workspace.db'
export const WORKSPACE_ATTACH_NAME = 'workspace_data'

export class DuckDBManager {
  private db: duckdb.AsyncDuckDB | null = null
  private conn: duckdb.AsyncDuckDBConnection | null = null
  private logger: duckdb.ConsoleLogger
  private attachedDatabases = new Set<string>()
  private schemas = new Set<string>(['main', 'report_data'])  // Track created schemas

  constructor() {
    this.logger = new duckdb.ConsoleLogger()
  }

  async initialize(config: DatabaseConfig = {}): Promise<void> {
    if (this.db) {
      console.log('DuckDB already initialized')
      return
    }

    try {
      const bundles = config.bundles || MANUAL_BUNDLES
      const bundle = await duckdb.selectBundle(bundles)

      if (!bundle.mainWorker) {
        throw new Error('Failed to select DuckDB worker')
      }

      const logger = config.logger || this.logger
      const worker = new Worker(bundle.mainWorker)

      this.db = new duckdb.AsyncDuckDB(logger, worker)
      await this.db.instantiate(bundle.mainModule)

      this.conn = await this.db.connect()

      // Create report_data schema for report internal tables
      // This separates report tables from user tables in SQL Workspace
      await this.conn.query('CREATE SCHEMA IF NOT EXISTS report_data;')
      console.log('Created report_data schema for report tables')

      console.log('DuckDB-WASM initialized successfully (Memory mode)')
    } catch (error) {
      console.error('Failed to initialize DuckDB:', error)
      throw error
    }
  }

  async query(sql: string): Promise<QueryResult> {
    if (!this.conn) {
      throw new Error('Database not initialized. Call initialize() first.')
    }

    const startTime = performance.now()

    try {
      const result = await this.conn.query(sql)
      const schema = result.schema
      const columns = schema.fields.map(field => field.name)

      // Check which columns are date/timestamp types
      const dateColumnIndices = new Set<number>()
      schema.fields.forEach((field, index) => {
        const typeStr = field.type.toString().toLowerCase()
        if (typeStr.includes('date') || typeStr.includes('timestamp')) {
          dateColumnIndices.add(index)
        }
      })

      // Convert data, handling date columns specially
      const data = result.toArray().map(row => {
        const jsonRow = row.toJSON()

        // Convert date columns from timestamps to date strings
        if (dateColumnIndices.size > 0) {
          columns.forEach((colName, index) => {
            if (dateColumnIndices.has(index) && jsonRow[colName] != null) {
              const timestamp = jsonRow[colName]
              if (typeof timestamp === 'number') {
                // Convert timestamp to YYYY-MM-DD format
                const date = new Date(timestamp)
                if (!isNaN(date.getTime())) {
                  jsonRow[colName] = date.toISOString().split('T')[0]
                }
              }
            }
          })
        }

        return jsonRow
      })

      const executionTime = performance.now() - startTime

      return {
        data,
        columns,
        rowCount: data.length,
        executionTime
      }
    } catch (error) {
      console.error('Query execution failed:', error)
      throw error
    }
  }

  async loadCSV(file: File, tableName: string): Promise<void> {
    if (!this.db || !this.conn) {
      throw new Error('Database not initialized')
    }

    try {
      const buffer = await file.arrayBuffer()
      const fileName = `/${file.name}`

      await this.db.registerFileBuffer(fileName, new Uint8Array(buffer))

      await this.conn.query(`
        CREATE TABLE ${tableName} AS
        SELECT * FROM read_csv_auto('${fileName}')
      `)

      console.log(`CSV file loaded as table: ${tableName}`)
    } catch (error) {
      console.error('Failed to load CSV:', error)
      throw error
    }
  }

  async loadParquet(file: File, tableName: string): Promise<void> {
    if (!this.db || !this.conn) {
      throw new Error('Database not initialized')
    }

    try {
      const buffer = await file.arrayBuffer()
      const fileName = `/${file.name}`

      await this.db.registerFileBuffer(fileName, new Uint8Array(buffer))

      await this.conn.query(`
        CREATE TABLE ${tableName} AS
        SELECT * FROM read_parquet('${fileName}')
      `)

      console.log(`Parquet file loaded as table: ${tableName}`)
    } catch (error) {
      console.error('Failed to load Parquet:', error)
      throw error
    }
  }

  async listTables(): Promise<string[]> {
    if (!this.conn) {
      throw new Error('Database not initialized')
    }

    try {
      // Only show tables from main schema (exclude report_data schema)
      // This naturally separates user tables from report internal tables
      const result = await this.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'main'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `)
      return result.data.map((row: any) => row.table_name)
    } catch (error) {
      console.error('Failed to list tables:', error)
      return []
    }
  }

  async getTableSchema(tableName: string): Promise<any[]> {
    if (!this.conn) {
      throw new Error('Database not initialized')
    }

    try {
      const result = await this.query(`DESCRIBE ${tableName}`)
      return result.data
    } catch (error) {
      console.error('Failed to get table schema:', error)
      throw error
    }
  }

  /**
   * Clean up all tables in report_data schema
   * Useful when re-executing reports or clearing report cache
   */
  async cleanupReportTables(): Promise<void> {
    if (!this.conn) {
      throw new Error('Database not initialized')
    }

    try {
      // Get all tables in report_data schema
      const result = await this.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'report_data'
          AND table_type = 'BASE TABLE'
      `)

      const tableCount = result.data.length

      if (tableCount === 0) {
        console.log('No report tables to clean up')
        return
      }

      // Drop each table (use full catalog.schema.table format)
      for (const row of result.data) {
        const tableName = row.table_name
        await this.query(`DROP TABLE IF EXISTS memory.report_data."${tableName}"`)
      }

      console.log(`Cleaned up ${tableCount} report tables from report_data schema`)
    } catch (error) {
      console.error('Failed to cleanup report tables:', error)
      throw error
    }
  }

  /**
   * Attach workspace database (deprecated - Memory-only mode)
   * Note: In Memory-only mode, both workspace and report use same memory space
   *
   * @returns true if attached, false if already attached
   */
  async attachWorkspaceDatabase(): Promise<boolean> {
    if (!this.conn) {
      throw new Error('Database not initialized')
    }

    // Check if already attached
    if (this.attachedDatabases.has(WORKSPACE_ATTACH_NAME)) {
      console.log(`📎 Workspace already attached as ${WORKSPACE_ATTACH_NAME}`)
      return false
    }

    try {
      // ATTACH workspace.db in read-only mode
      await this.conn.query(`
        ATTACH '${WORKSPACE_DB_PATH}' (READ_ONLY) AS ${WORKSPACE_ATTACH_NAME}
      `)

      this.attachedDatabases.add(WORKSPACE_ATTACH_NAME)
      console.log(`✅ Attached workspace database as ${WORKSPACE_ATTACH_NAME} (READ_ONLY)`)
      return true
    } catch (error) {
      console.warn(`⚠️  Failed to attach workspace database:`, error)
      // Workspace DB might not exist yet (first time user)
      return false
    }
  }

  /**
   * Detach workspace database
   */
  async detachWorkspaceDatabase(): Promise<void> {
    if (!this.conn) {
      return
    }

    if (!this.attachedDatabases.has(WORKSPACE_ATTACH_NAME)) {
      return
    }

    try {
      await this.conn.query(`DETACH ${WORKSPACE_ATTACH_NAME}`)
      this.attachedDatabases.delete(WORKSPACE_ATTACH_NAME)
      console.log(`🔓 Detached workspace database`)
    } catch (error) {
      console.warn(`Failed to detach workspace:`, error)
    }
  }

  /**
   * Check if workspace database is currently attached
   */
  isWorkspaceAttached(): boolean {
    return this.attachedDatabases.has(WORKSPACE_ATTACH_NAME)
  }

  /**
   * Create a schema for a report
   * Uses schema isolation instead of separate DB instances
   *
   * @param reportId - Report identifier
   * @returns Schema name (e.g., "report_abc123")
   */
  async createReportSchema(reportId: string): Promise<string> {
    if (!this.conn) {
      throw new Error('Database not initialized')
    }

    const schemaName = `report_${reportId.replace(/-/g, '_')}`

    if (this.schemas.has(schemaName)) {
      console.warn(`⚠️  Schema ${schemaName} already exists`)
      return schemaName
    }

    try {
      await this.conn.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`)
      this.schemas.add(schemaName)
      console.log(`✅ Created schema: ${schemaName}`)
      return schemaName
    } catch (error) {
      console.error(`Failed to create schema ${schemaName}:`, error)
      throw error
    }
  }

  /**
   * Drop a report schema and all its tables
   *
   * @param reportId - Report identifier
   */
  async dropReportSchema(reportId: string): Promise<void> {
    if (!this.conn) {
      return
    }

    const schemaName = `report_${reportId.replace(/-/g, '_')}`

    if (!this.schemas.has(schemaName) || schemaName === 'main' || schemaName === 'report_data') {
      return
    }

    try {
      await this.conn.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`)
      this.schemas.delete(schemaName)
      console.log(`🗑️  Dropped schema: ${schemaName} (all tables removed)`)
    } catch (error) {
      console.warn(`Failed to drop schema ${schemaName}:`, error)
    }
  }

  /**
   * List all tables in a specific schema
   *
   * @param schemaName - Schema name (e.g., "report_abc123")
   * @returns Array of table names
   */
  async listTablesInSchema(schemaName: string): Promise<string[]> {
    if (!this.conn) {
      throw new Error('Database not initialized')
    }

    try {
      const result = await this.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = '${schemaName}'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `)
      return result.data.map((row: any) => row.table_name)
    } catch (error) {
      console.error(`Failed to list tables in schema ${schemaName}:`, error)
      return []
    }
  }

  /**
   * Check if a schema exists
   *
   * @param schemaName - Schema name to check
   * @returns true if schema exists
   */
  hasSchema(schemaName: string): boolean {
    return this.schemas.has(schemaName)
  }

  async close(): Promise<void> {
    if (this.conn) {
      // Detach all attached databases before closing
      for (const dbName of this.attachedDatabases) {
        try {
          await this.conn.query(`DETACH ${dbName}`)
        } catch (err) {
          console.warn(`Failed to detach ${dbName}:`, err)
        }
      }
      this.attachedDatabases.clear()

      await this.conn.close()
      this.conn = null
    }
    if (this.db) {
      await this.db.terminate()
      this.db = null
    }
    console.log('DuckDB connection closed')
  }

  isInitialized(): boolean {
    return this.db !== null && this.conn !== null
  }

  /**
   * Get the underlying AsyncDuckDB instance
   * Used to share with Mosaic's wasmConnector
   */
  getDB(): duckdb.AsyncDuckDB | null {
    return this.db
  }

  /**
   * Get the underlying connection for direct queries
   * Used by AI Report to discover available tables
   */
  getConnection(): duckdb.AsyncDuckDBConnection | null {
    return this.conn
  }

  /**
   * Execute a statement without returning results (CREATE, DROP, INSERT, etc.)
   */
  async exec(sql: string): Promise<void> {
    if (!this.conn) {
      throw new Error('Database not initialized. Call initialize() first.')
    }

    try {
      await this.conn.query(sql)
    } catch (error) {
      console.error('Exec failed:', error)
      throw error
    }
  }
}

/**
 * SQL Workspace database instance (Memory-only mode)
 * This is the main database instance for user data uploaded via SQL Workspace
 */
export const workspaceDB = new DuckDBManager()

/**
 * Legacy alias for backward compatibility
 * @deprecated Use workspaceDB instead
 */
export const duckDBManager = workspaceDB

/**
 * @deprecated Use schema-based isolation instead (createReportSchema)
 * This function creates separate DuckDB instances which is memory-intensive.
 * Use duckDBManager.createReportSchema(reportId) for better performance.
 */
export async function createReportDB(): Promise<DuckDBManager> {
  console.warn('⚠️  createReportDB() is deprecated. Use schema-based isolation instead.')
  const db = new DuckDBManager()
  await db.initialize({ persist: false })
  return db
}
