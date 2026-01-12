/**
 * Infographic AI Module
 *
 * LLM-powered infographic generation from text content.
 *
 * @module core/ai/infographic
 */

// Types
export type {
  SemanticAnalysisResult,
  ExtractedEntity,
  VisualizationSuggestion,
  InfographicSection,
  InfographicPlan,
  InfographicPlanRequest,
  InfographicPlanResult,
  InfographicProgress,
  GeneratedInfographic
} from './types'

// SemanticAnalyzer
export {
  SemanticAnalyzer,
  createSemanticAnalyzer,
  type SemanticAnalyzerOptions
} from './semantic-analyzer'

// InfographicPlanner
export {
  InfographicPlanner,
  createInfographicPlanner,
  type InfographicPlannerOptions
} from './infographic-planner'

// InfographicGenerator
export {
  InfographicGenerator,
  createInfographicGenerator,
  generateInfographicMarkdown,
  type InfographicGeneratorOptions
} from './infographic-generator'

// Prompts (for customization)
export {
  SEMANTIC_ANALYZER_SYSTEM_PROMPT,
  buildSemanticAnalyzerPrompt,
  getInfographicPlannerSystemPrompt,
  buildInfographicPlannerPrompt,
  DATA_EXTRACTOR_SYSTEM_PROMPT,
  buildDataExtractionPrompt,
  CATEGORY_DETECTION_PROMPT
} from './prompts'

// Phase 2: Article Analysis & Multi-Chart Planning

// ArticleAnalyzer
export {
  ArticleAnalyzer,
  createArticleAnalyzer,
  type ArticleSection,
  type DataPoint,
  type ArticleAnalysisResult,
  type ReportStructure
} from './article-analyzer'

// MultiChartPlanner
export {
  MultiChartPlanner,
  createMultiChartPlanner,
  planMultiChart,
  type LayoutConfig,
  type PlannedChart,
  type MultiChartPlan
} from './multi-chart-planner'

// ArticleToReport Pipeline
export {
  ArticleToReportPipeline,
  createArticleToReportPipeline,
  articleToReport,
  streamArticleToReport,
  type ArticleToReportOptions,
  type PipelineProgress,
  type ArticleToReportResult
} from './article-to-report'
