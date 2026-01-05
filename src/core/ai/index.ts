/**
 * AI Module
 *
 * Provides AI-powered features using LLM providers.
 *
 * @module core/ai
 */

// Types
export type {
  LLMProviderType,
  MessageRole,
  ChatMessage,
  CompletionOptions,
  CompletionResponse,
  StreamChunk,
  LLMProvider,
  ProviderConfig,
  AIContext,
  ChartGenerationRequest,
  ChartGenerationResult,
  // Report generation types
  DataSourceInfo,
  ReportSectionType,
  KPISectionConfig,
  TrendSectionConfig,
  RankingSectionConfig,
  ComparisonSectionConfig,
  DistributionSectionConfig,
  TableSectionConfig,
  InsightSectionConfig,
  ReportSection,
  ReportPlan,
  ReportStyle,
  ChartPalette,
  ReportGenerationRequest,
  SectionProgress,
  ReportGenerationResult
} from './types'

// Providers
export { DeepSeekProvider, createDeepSeekProvider } from './providers/deepseek'

// Services
export { ChartGenerator, createChartGenerator } from './chart-generator'
export { ReportPlanner, createReportPlanner } from './report-planner'
export type { PlanningResult } from './report-planner'
export {
  ReportGenerator,
  createReportGenerator,
  generateReport
} from './report-generator'

// Prompts
export {
  buildPlannerSystemPrompt,
  buildPlannerUserPrompt,
  parsePlannerResponse,
  generateSectionMarkdown
} from './prompts'
