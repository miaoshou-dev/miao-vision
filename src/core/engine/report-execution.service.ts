/**
 * Report Execution Service
 *
 * Centralized service for executing reports and managing reactive execution
 * Extracted from App.svelte to improve maintainability and testability
 */

import { get, type Unsubscriber } from 'svelte/store'
import type { Report, ParsedCodeBlock, ReportBlock } from '@/types/report'
import type { IInputStore } from '@/types/interfaces'
import type { SQLTemplateContext } from '@core/database/template'
import { parseMarkdown, extractSQLBlocks } from '@core/markdown/parser'
import { executeReport as executeReportSQL } from '@core/markdown/sql-executor'
import {
  processConditionals,
  buildConditionalContext,
  hasConditionalBlocks
} from '@core/markdown/conditional-processor'
import {
  processLoops,
  buildLoopContext,
  hasLoopBlocks
} from '@core/markdown/loop-processor'
import {
  findAffectedBlocks,
  reExecuteAffectedBlocks,
  getChangedInputs
} from '@core/engine/reactive-executor'
import { getInputInitializer } from '@core/services'
import { duckDBManager } from '@core/database'
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
 * Progress callback
 */
export type ProgressCallback = (progress: number) => void

/**
 * Block update callback
 */
export type BlockUpdateCallback = (report: Report) => void

/**
 * Report Execution Service
 * Manages report execution and reactive updates
 */
export class ReportExecutionService {
  private executionStates = new Map<string, ReportExecutionState>()
  private reactiveUnsubscribers = new Map<string, Unsubscriber>()
  private reportSchemas = new Map<string, string>()  // reportId -> schema name (e.g., "report_abc123")

  /**
   * Execute a report
   */
  async executeReport(
    report: Report,
    inputStore: IInputStore,
    onProgress?: ProgressCallback,
    onBlockUpdate?: BlockUpdateCallback
  ): Promise<ExecutionResult> {
    console.log('🚀 ReportExecutionService.executeReport() called for:', report.id)

    try {
      // Create a schema for this report (schema isolation instead of separate DB instances)
      console.log('🔧 Creating schema for Report...')
      const schemaName = await duckDBManager.createReportSchema(report.id)
      this.reportSchemas.set(report.id, schemaName)
      console.log(`✅ Report schema created: ${schemaName}`)

      // Parse the markdown to extract blocks
      console.log('Parsing markdown...')
      const parsed = await parseMarkdown(report.content)
      const sqlBlocks = extractSQLBlocks(parsed.codeBlocks)

      console.log(`Executing report with ${sqlBlocks.length} SQL blocks, ${parsed.codeBlocks.length} total blocks`)

      // Initialize input defaults BEFORE executing SQL
      getInputInitializer().initializeDefaults(parsed.codeBlocks, inputStore)

      const inputValues = get(inputStore)
      console.log('Input values after initialization:', inputValues)

      // Create SQL template context
      const templateContext: SQLTemplateContext = {
        inputs: inputValues,
        metadata: report.metadata
      }

      // Execute the report with schema name
      console.log(`Calling executeReportSQL() with schema: ${schemaName}...`)
      const result = await executeReportSQL(
        report,
        parsed.codeBlocks,
        duckDBManager,  // Use shared DuckDB instance
        onProgress,
        templateContext,
        schemaName  // Pass schema name for table isolation
      )

      console.log('executeReportSQL() completed:', result)

      if (result.success) {
        console.log('✅ Report executed successfully')

        // Process loop and conditional blocks if present
        let finalParsedBlocks = parsed.codeBlocks
        let contentToProcess = report.content
        let contentChanged = false

        // Step 1: Process {#each} loops first (they may generate conditional content)
        if (hasLoopBlocks(contentToProcess)) {
          console.log('🔄 Processing {#each} loop blocks...')
          const loopContext = buildLoopContext(
            report.blocks,
            inputValues,
            report.metadata
          )
          const loopProcessedContent = processLoops(contentToProcess, loopContext)

          if (loopProcessedContent !== contentToProcess) {
            console.log('  Content changed after loop processing')
            contentToProcess = loopProcessedContent
            contentChanged = true
          }
        }

        // Step 2: Process {#if} conditionals
        if (hasConditionalBlocks(contentToProcess)) {
          console.log('🔀 Processing conditional blocks...')
          const conditionalContext = buildConditionalContext(
            report.blocks,
            inputValues,
            report.metadata
          )
          const conditionalProcessedContent = processConditionals(contentToProcess, conditionalContext)

          if (conditionalProcessedContent !== contentToProcess) {
            console.log('  Content changed after conditional processing')
            contentToProcess = conditionalProcessedContent
            contentChanged = true
          }
        }

        // If content changed, re-parse to get updated HTML and blocks
        if (contentChanged) {
          console.log('  Re-parsing processed content...')
          const reParsed = await parseMarkdown(contentToProcess)
          finalParsedBlocks = reParsed.codeBlocks
          // Update report's processed content for rendering
          // Note: We don't modify report.content directly to preserve original
          report.metadata = { ...report.metadata, _processedContent: contentToProcess }
        }

        // Save execution state for reactive updates
        this.executionStates.set(report.id, {
          parsedBlocks: finalParsedBlocks,
          tableMapping: result.tableMapping,
          previousInputs: { ...inputValues },
          hasExecutedOnce: true
        })

        console.log('✅ First execution completed - reactive execution now enabled')

        // Trigger block update callback
        if (onBlockUpdate) {
          onBlockUpdate({ ...report })
        }
      } else {
        console.error('❌ Report execution had errors:', result.errors)
      }

      // Convert to ExecutionResult format
      return {
        success: result.success,
        errors: result.errors.map(e => `${e.blockId}: ${e.message}`),
        failedBlocks: result.failedBlocks,
        tableMapping: result.tableMapping,
        dependencyAnalysis: result.dependencyAnalysis
      }
    } catch (error) {
      console.error('💥 Failed to execute report:', error)
      throw error
    }
  }

  /**
   * Setup reactive execution for a report
   * Returns an unsubscribe function
   */
  setupReactiveExecution(
    report: Report,
    inputStore: IInputStore,
    onBlockUpdate: BlockUpdateCallback
  ): Unsubscriber {
    console.log('🔄 Setting up reactive execution for report:', report.id)

    // Clean up previous subscription if exists
    const oldUnsubscribe = this.reactiveUnsubscribers.get(report.id)
    if (oldUnsubscribe) {
      console.log('  Cleaning up old reactive subscription')
      oldUnsubscribe()
    }

    // Subscribe to input changes
    const unsubscribe = inputStore.subscribe(async (newInputs) => {
      const state = this.executionStates.get(report.id)

      // Don't run reactive execution until after first manual Execute
      if (!state || !state.hasExecutedOnce) {
        console.log('⏸️ Reactive execution skipped - waiting for first Execute')
        if (state) {
          state.previousInputs = { ...newInputs }
        }
        return
      }

      // Skip if this is the first subscription
      if (Object.keys(state.previousInputs).length === 0) {
        state.previousInputs = { ...newInputs }
        return
      }

      // Find what inputs changed
      const changedInputs = getChangedInputs(newInputs, state.previousInputs)
      console.log('🔍 Checking input changes...')
      console.log('  Changed inputs:', changedInputs)

      if (changedInputs.length === 0) {
        console.log('  ⏭️  No inputs changed, skipping reactive execution')
        return
      }

      console.log('🔄 Input changed:', changedInputs)

      // Find affected SQL blocks
      const affectedBlocks = findAffectedBlocks(report.blocks, changedInputs)
      console.log('  Found', affectedBlocks.length, 'affected blocks:', affectedBlocks.map(b => b.id))

      if (affectedBlocks.length === 0) {
        console.log('  ⚠️  No blocks affected by this input change')
        return
      }

      // Clean up affected tables and execute
      await this.executeReactiveUpdate(
        report,
        state,
        affectedBlocks,
        newInputs,
        onBlockUpdate
      )
    })

    // Store unsubscribe function
    this.reactiveUnsubscribers.set(report.id, unsubscribe)

    return unsubscribe
  }

  /**
   * Execute reactive update for affected blocks
   */
  private async executeReactiveUpdate(
    report: Report,
    state: ReportExecutionState,
    affectedBlocks: ReportBlock[],
    newInputs: Record<string, any>,
    onBlockUpdate: BlockUpdateCallback
  ) {
    console.log('🧹 Clearing affected SQL result tables...')
    console.log(`  Affected blocks: ${affectedBlocks.map(b => b.id).join(', ')}`)

    try {
      // Clean up affected tables
      await this.cleanupAffectedTables(affectedBlocks, state.tableMapping)

      // Re-execute affected blocks
      const templateContext: SQLTemplateContext = {
        inputs: newInputs,
        metadata: report.metadata
      }

      console.log('🔧 Template context for reactive execution:', { inputs: newInputs })

      // Get the report's schema name
      const schemaName = this.reportSchemas.get(report.id)

      await reExecuteAffectedBlocks(
        affectedBlocks,
        state.parsedBlocks,
        state.tableMapping,
        templateContext,
        (blockId, result, dependencies) => {
          // Update the block in the report
          const blockIndex = report.blocks.findIndex(b => b.id === blockId)

          if (blockIndex !== -1 && result) {
            report.blocks[blockIndex] = {
              ...report.blocks[blockIndex],
              sqlResult: result,
              dependencies,
              status: 'success'
            }

            console.log(`✅ Block ${blockId} updated with new result`)
          }
        },
        duckDBManager,  // Use shared DuckDB instance
        schemaName  // Pass schema name
      )

      // Trigger reactivity
      console.log('🔄 Triggering block update callback')
      onBlockUpdate({ ...report })

      // Update previous inputs
      state.previousInputs = { ...newInputs }
      console.log('✅ Reactive execution complete')
    } catch (err) {
      console.error('❌ Reactive execution failed:', err)
    }
  }

  /**
   * Clean up tables for affected blocks
   */
  private async cleanupAffectedTables(
    affectedBlocks: ReportBlock[],
    tableMapping: Map<string, string>
  ) {
    try {
      // Build list of tables to drop (only for affected blocks)
      const affectedBlockIds = new Set(affectedBlocks.map(b => b.id))
      const tablesToDrop: string[] = []

      // For each affected block, find its corresponding chart table
      for (const blockId of affectedBlockIds) {
        const tableName = tableMapping.get(blockId)
        if (tableName) {
          tablesToDrop.push(tableName)
          console.log(`  Will drop table for block ${blockId}: ${tableName}`)
        }
      }

      // Drop affected tables from unified DuckDB instance
      if (tablesToDrop.length > 0) {
        console.log(`  Dropping ${tablesToDrop.length} affected tables...`)
        for (const tableName of tablesToDrop) {
          console.log(`    Dropping table: ${tableName}`)
          // Drop from unified DuckDB used by report SQL queries.
          try {
            if (duckDBManager.isInitialized()) {
              await duckDBManager.query(`DROP TABLE IF EXISTS "${tableName}"`)
            }
          } catch (err) {
            console.warn(`    Failed to drop table: ${err}`)
          }
        }
        console.log('  ✅ Affected tables dropped')
      } else {
        console.log('  No result tables to drop')
      }
    } catch (err) {
      console.warn('  Failed to drop tables:', err)
    }
  }

  /**
   * Get execution state for a report
   */
  getExecutionState(reportId: string): ReportExecutionState | undefined {
    return this.executionStates.get(reportId)
  }

  /**
   * Clear execution state for a report
   */
  clearExecutionState(reportId: string) {
    console.log('🧹 Clearing execution state for report:', reportId)

    // Unsubscribe from reactive updates
    const unsubscribe = this.reactiveUnsubscribers.get(reportId)
    if (unsubscribe) {
      unsubscribe()
      this.reactiveUnsubscribers.delete(reportId)
    }

    // Drop report schema (cascades to all tables)
    const schemaName = this.reportSchemas.get(reportId)
    if (schemaName) {
      console.log(`  Dropping schema: ${schemaName}`)
      duckDBManager.dropReportSchema(reportId).catch(err =>
        console.warn('  Failed to drop schema:', err)
      )
      this.reportSchemas.delete(reportId)
    }

    // Clear execution state
    this.executionStates.delete(reportId)
  }

  /**
   * Cleanup all subscriptions and database instances
   */
  cleanup() {
    console.log('🧹 Cleaning up all reactive subscriptions and report schemas')
    for (const [_reportId, unsubscribe] of this.reactiveUnsubscribers.entries()) {
      unsubscribe()
    }
    this.reactiveUnsubscribers.clear()
    this.executionStates.clear()

    // Drop all report schemas
    for (const [reportId, _schemaName] of this.reportSchemas.entries()) {
      console.log(`  Dropping schema for report: ${reportId}`)
      duckDBManager.dropReportSchema(reportId).catch(err =>
        console.warn(`  Failed to drop schema for ${reportId}:`, err)
      )
    }
    this.reportSchemas.clear()
  }
}

/**
 * Singleton instance
 */
export const reportExecutionService = new ReportExecutionService()
