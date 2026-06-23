/**
 * Service Interfaces
 *
 * Defines contracts for all services in the application.
 * These interfaces enable:
 * - Dependency injection
 * - Easy mocking for tests
 * - Clear service boundaries
 *
 * @module services/interfaces
 */

import type { QueryResult, DatabaseConfig } from '@/types/database'
import type { ParsedCodeBlock, Report } from '@/types/report'

// ============================================================================
// Database Service Interface
// ============================================================================

/**
 * Database service interface
 *
 * Provides SQL query execution capabilities.
 * The default implementation uses DuckDB-WASM.
 *
 * @example
 * ```typescript
 * // Production usage
 * const db: IDatabaseService = container.get('database')
 * const result = await db.query('SELECT * FROM users')
 *
 * // Test usage with mock
 * const mockDb: IDatabaseService = {
 *   query: async () => ({ columns: [], data: [], rowCount: 0, executionTime: 0 }),
 *   isInitialized: () => true,
 *   // ...
 * }
 * ```
 */
export interface IDatabaseService {
  /**
   * Initialize the database
   */
  initialize(config?: DatabaseConfig): Promise<void>

  /**
   * Check if database is initialized
   */
  isInitialized(): boolean

  /**
   * Execute a SQL query
   */
  query(sql: string): Promise<QueryResult>

  /**
   * Load a CSV file into a table
   */
  loadCSV(file: File, tableName: string): Promise<string>

  /**
   * Load a Parquet file into a table
   */
  loadParquet(file: File, tableName: string): Promise<string>

  /**
   * Get table schema
   */
  getTableSchema(tableName: string): Promise<QueryResult>

  /**
   * Close the database connection
   */
  close(): Promise<void>
}

// ============================================================================
// Report Execution Service Interface
// ============================================================================

import type { IInputStore } from '@/types/interfaces'
import type { DependencyAnalysis } from '@core/engine/dependency-graph'

/**
 * Execution state for a report
 */
export interface ReportExecutionState {
  parsedBlocks: ParsedCodeBlock[]
  tableMapping: Map<string, string>
  previousInputs: Record<string, any>
  hasExecutedOnce: boolean
}

/**
 * Execution result
 */
export interface ExecutionResult {
  success: boolean
  errors?: string[]
  failedBlocks?: number
  tableMapping?: Map<string, string>
  dependencyAnalysis?: DependencyAnalysis
}

/**
 * Progress callback type
 */
export type ProgressCallback = (progress: number) => void

/**
 * Block update callback type
 */
export type BlockUpdateCallback = (report: Report) => void

/**
 * Report execution service interface
 *
 * Manages report execution and reactive updates.
 *
 * @example
 * ```typescript
 * const execService: IReportExecutionService = container.get('reportExecution')
 * const result = await execService.executeReport(report, inputStore)
 * if (result.success) {
 *   console.log('Report executed successfully')
 * }
 * ```
 */
export interface IReportExecutionService {
  /**
   * Execute a report
   */
  executeReport(
    report: Report,
    inputStore: IInputStore,
    onProgress?: ProgressCallback,
    onBlockUpdate?: BlockUpdateCallback
  ): Promise<ExecutionResult>

  /**
   * Handle reactive execution when inputs change
   */
  handleReactiveExecution(
    reportId: string,
    report: Report,
    inputStore: IInputStore,
    onBlockUpdate?: BlockUpdateCallback
  ): Promise<void>

  /**
   * Setup reactive subscription for a report
   */
  setupReactiveSubscription(
    reportId: string,
    report: Report,
    inputStore: IInputStore,
    onBlockUpdate?: BlockUpdateCallback
  ): void

  /**
   * Cleanup reactive subscription
   */
  cleanupReactiveSubscription(reportId: string): void

  /**
   * Get execution state for a report
   */
  getExecutionState(reportId: string): ReportExecutionState | undefined

  /**
   * Check if report has been executed
   */
  hasExecutedOnce(reportId: string): boolean

  /**
   * Clear execution state for a report
   */
  clearExecutionState(reportId: string): void
}

// ============================================================================
// Service Keys (for type-safe container access)
// ============================================================================

/**
 * Service registry type map
 *
 * Maps service keys to their interface types for type-safe access.
 */
export interface ServiceRegistry {
  database: IDatabaseService
  reportExecution: IReportExecutionService
}

/**
 * Service key type
 */
export type ServiceKey = keyof ServiceRegistry
