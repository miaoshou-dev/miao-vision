/**
 * AI Prompts Module
 *
 * Exports all prompt builders for AI-powered report generation.
 *
 * @module core/ai/prompts
 */

export {
  buildPlannerSystemPrompt,
  buildPlannerUserPrompt,
  parsePlannerResponse
} from './report-planner'

export {
  generateSectionMarkdown,
  generateKPIMarkdown,
  generateTrendMarkdown,
  generateRankingMarkdown,
  generateComparisonMarkdown,
  generateDistributionMarkdown,
  generateTableMarkdown,
  generateInsightMarkdown,
  buildInsightSystemPrompt,
  buildInsightUserPrompt
} from './section-generator'
