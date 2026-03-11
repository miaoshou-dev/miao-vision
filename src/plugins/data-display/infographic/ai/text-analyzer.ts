/**
 * TextAnalyzer re-export
 *
 * Implementation lives in core/ai/infographic/text-analyzer so that
 * SemanticAnalyzer (core/) can use it without a layer violation.
 * Plugins re-export from there to keep all existing import paths working.
 */
export type { TextPattern, TextAnalysisResult } from '@core/ai/infographic/text-analyzer'
export { analyzeText, detectCategory, isSuitableForInfographic } from '@core/ai/infographic/text-analyzer'
