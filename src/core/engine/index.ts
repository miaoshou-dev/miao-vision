/**
 * Core Engine Exports
 *
 * The current product path uses the report execution engine and VizSpec
 * catalog. The legacy HybridGNode realtime workspace engine has been removed.
 */

export { blockRenderer } from './block-renderer'
export type { BlockRenderContext } from './block-renderer'
export { ReportExecutionService, reportExecutionService } from './report-execution.service'
export type {
  ExecutionResult,
  ProgressCallback,
  BlockUpdateCallback,
  ReportExecutionState
} from './report-execution.service'
