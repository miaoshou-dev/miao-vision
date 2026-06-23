/**
 * Service Test Utilities
 *
 * Provides mock implementations and helper functions for testing.
 * Use these utilities to create isolated test environments.
 *
 * @module services/test-utils
 *
 * @example
 * ```typescript
 * import { createTestContainer, createMockDatabase } from '@/lib/services/test-utils'
 *
 * describe('MyComponent', () => {
 *   let container: ServiceContainer
 *
 *   beforeEach(() => {
 *     container = createTestContainer()
 *   })
 *
 *   it('should query database', async () => {
 *     const db = container.get('database')
 *     const result = await db.query('SELECT 1')
 *     expect(result.rowCount).toBe(1)
 *   })
 * })
 * ```
 */

import { createContainer, type ServiceContainer } from './container'
import type {
  IDatabaseService,
  IReportExecutionService,
  ExecutionResult
} from './interfaces'
import type { QueryResult } from '@/types/database'

// ============================================================================
// Mock Database Service
// ============================================================================

/**
 * Options for creating mock database
 */
export interface MockDatabaseOptions {
  /**
   * Default query result to return
   */
  defaultResult?: QueryResult

  /**
   * Map of SQL patterns to results
   */
  queryResults?: Map<string, QueryResult>

  /**
   * Whether the database is initialized
   */
  initialized?: boolean
}

/**
 * Create a mock database service
 *
 * @example
 * ```typescript
 * const mockDb = createMockDatabase({
 *   defaultResult: { columns: ['name'], data: [{ name: 'test' }], rowCount: 1, executionTime: 10 }
 * })
 * ```
 */
export function createMockDatabase(options: MockDatabaseOptions = {}): IDatabaseService {
  const {
    defaultResult = { columns: [], data: [], rowCount: 0, executionTime: 0 },
    queryResults = new Map(),
    initialized = true
  } = options

  let isInit = initialized

  return {
    initialize: async () => {
      isInit = true
    },

    isInitialized: () => isInit,

    query: async (sql: string) => {
      // Check for specific query results
      for (const [pattern, result] of queryResults) {
        if (sql.includes(pattern)) {
          return result
        }
      }
      return defaultResult
    },

    loadCSV: async (_file, tableName) => tableName,

    loadParquet: async (_file, tableName) => tableName,

    getTableSchema: async () => defaultResult,

    close: async () => {
      isInit = false
    }
  }
}

// ============================================================================
// Mock Report Execution Service
// ============================================================================

/**
 * Options for creating mock report execution service
 */
export interface MockReportExecutionServiceOptions {
  /**
   * Default execution result
   */
  executionResult?: ExecutionResult

  /**
   * Map of report IDs to execution states
   */
  executionStates?: Map<string, any>
}

/**
 * Create a mock report execution service
 */
export function createMockReportExecutionService(
  options: MockReportExecutionServiceOptions = {}
): IReportExecutionService {
  const {
    executionResult = { success: true },
    executionStates = new Map()
  } = options

  return {
    executeReport: async () => executionResult,

    handleReactiveExecution: async () => {},

    setupReactiveSubscription: () => {},

    cleanupReactiveSubscription: () => {},

    getExecutionState: (reportId) => executionStates.get(reportId),

    hasExecutedOnce: (reportId) => executionStates.has(reportId),

    clearExecutionState: (reportId) => {
      executionStates.delete(reportId)
    }
  }
}

// ============================================================================
// Test Container Factory
// ============================================================================

/**
 * Options for creating test container
 */
export interface TestContainerOptions {
  /**
   * Mock database options
   */
  database?: MockDatabaseOptions

  /**
   * Mock report execution service options
   */
  reportExecution?: MockReportExecutionServiceOptions
}

/**
 * Create a test container with mock services
 *
 * @example
 * ```typescript
 * const container = createTestContainer({
 *   database: {
 *     defaultResult: { columns: ['id'], data: [{ id: 1 }], rowCount: 1, executionTime: 5 }
 *   }
 * })
 *
 * const db = container.get('database')
 * const result = await db.query('SELECT * FROM users')
 * expect(result.rowCount).toBe(1)
 * ```
 */
export function createTestContainer(options: TestContainerOptions = {}): ServiceContainer {
  const container = createContainer()

  container.register('database', createMockDatabase(options.database))
  container.register('reportExecution', createMockReportExecutionService(options.reportExecution))

  return container
}

// ============================================================================
// Test Data Factories
// ============================================================================

/**
 * Create a mock query result
 */
export function createQueryResult(
  columns: string[],
  data: Record<string, any>[],
  options: { executionTime?: number } = {}
): QueryResult {
  return {
    columns,
    data,
    rowCount: data.length,
    executionTime: options.executionTime || 0
  }
}
