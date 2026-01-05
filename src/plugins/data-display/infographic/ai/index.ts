/**
 * AI Module for Infographic Generation
 *
 * Provides text analysis, data extraction, template recommendation,
 * and end-to-end conversion capabilities.
 */

// Text Analysis
export {
  analyzeText,
  detectCategory,
  isSuitableForInfographic,
  type TextPattern,
  type TextAnalysisResult
} from './text-analyzer'

// Data Extraction
export {
  extractData,
  toTemplateData,
  type ExtractedItem,
  type ExtractedComparison,
  type ExtractedFlow,
  type ExtractedHierarchy,
  type ExtractedRelation,
  type DataExtractionResult
} from './data-extractor'

// Smart Recommender
export {
  getSmartRecommendations,
  getBestTemplate,
  suggestTemplateByCategory,
  getTemplateForUseCase,
  analyzeAndRecommend,
  type SmartRecommendation,
  type RecommendationRequest
} from './smart-recommender'

// Agent Skills
export {
  AGENT_SKILLS,
  getSkillById,
  getSkillDefinitions,
  executeSkill,
  createFromTextSkill,
  getTemplateSyntaxSkill,
  listStructuresSkill,
  recommendTemplateSkill,
  updateInfographicSkill,
  type SkillParameter,
  type AgentSkill
} from './agent-skills'

// Pipeline
export {
  textToInfographic,
  quickConvert,
  convertWithTemplate,
  batchConvert,
  type PipelineConfig,
  type PipelineResult
} from './pipeline'
