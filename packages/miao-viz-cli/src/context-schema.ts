import { z } from 'zod'
import type { VisualIntentFamily, VizType } from './types'
import { MVP_CHART_TYPES } from './spec-schema'
import { queryRecipeSchema, type QueryRecipe } from './query-recipe'
const fieldRoleValues = ['measure', 'dimension', 'time', 'id', 'status', 'score', 'flag', 'text', 'geo', 'unknown'] as const
const chartUsageValues = ['recommended', 'allowed', 'discouraged', 'forbidden'] as const
// Compact field descriptor — only fields useful for spec writing, not full ColumnProfile
export interface AnalyzeField {
  name: string
  role: 'measure' | 'dimension' | 'time' | 'id' | 'status' | 'score' | 'flag' | 'text' | 'geo' | 'unknown'
  type: 'number' | 'string' | 'date' | 'boolean' | 'unknown'
  semanticTags?: string[]
  confidence?: number
  rationale?: string[]
  qualityFlags?: string[]
  chartUsage?: {
    asMeasure: 'recommended' | 'allowed' | 'discouraged' | 'forbidden'
    asDimension: 'recommended' | 'allowed' | 'discouraged' | 'forbidden'
    asDetailKey: 'recommended' | 'allowed' | 'discouraged' | 'forbidden'
  }
  min?: number
  max?: number
  distinctCount?: number
  timePeriods?: number  // only for time role
  span?: string         // only for time role, e.g. "2024-01 – 2024-12"
  comparison?: {
    unit?: 'currency' | 'percentage' | 'count' | 'number'
    currency?: string
    timeGrain?: 'day' | 'month' | 'quarter' | 'year'
    aggregationPolicy: 'sum' | 'avg' | 'count' | 'none'
    comparableGroup?: string
  }
}
export interface AnalyzeEvidence {
  id: string            // e.g. "total", "by_region", "by_time"
  query: string         // human-readable query description
  // Either a single-row summary (total) or multi-row results (by_dimension)
  values?: Record<string, unknown>
  rows?: Record<string, unknown>[]
  recipe?: QueryRecipe
}
export interface CatalogBlockEntry {
  id: string
  score: number
  description: string
  bestFor: string[]
  density: 'compact' | 'medium' | 'full'
  examplePrompt: string
  charts: string[]
  variables: Record<string, {
    type: string
    role?: string
    description: string
    default?: string | number
    min?: number
    max?: number
  }>
  qualityChecks: string[]
  requiredEvidence?: string[]
  validInsightTypes?: string[]
  dataQualityConstraints?: string[]
}
export interface BlockedBlockEntry {
  id: string
  reason: string
}

export type DeckPatternSummary = [id: 'executive-brief' | 'business-review', score: number, density: 'compact' | 'medium', blocks: string[]]
export type DeckSlideBlockSummary = [id: string, score: number, requiredRoles: string[], requiredEvidence: string[]]
export type BlockedDeckSlideBlockSummary = [id: string, reasonCode: string, reason: string]

export interface DeckPatternEntry {
  id: 'executive-brief' | 'business-review'
  score: number
  density: 'compact' | 'medium'
  blocks: string[]
}

export interface DeckSlideBlockEntry {
  id: string
  score: number
  requiredRoles: string[]
  requiredEvidence: string[]
}

export interface BlockedDeckSlideBlockEntry {
  id: string
  reasonCode: string
  reason: string
}

export type CatalogBlockSummary = [id: string, score: number, density: 'compact' | 'medium' | 'full', charts: string[]]
export type CatalogTemplateSummary = [id: string, score: number, density: 'compact' | 'medium' | 'full', blocks: string[]]

export interface AnalyzeCatalog {
  charts: string[]      // allowed chart types for this dataset/intent
  blockedCharts: Array<{
    type: string
    reason: string      // machine-readable reason, e.g. "timePeriods < 3"
  }>
  recommendedPlan: Array<{
    type: string
    note?: string       // e.g. "show top dimension by measure"
  }>
  recommendations?: VisualRecommendation[]
  blocks?: CatalogBlockEntry[]
  blockedBlocks?: BlockedBlockEntry[]
  templates?: CatalogTemplateEntry[]
  blockedTemplates?: BlockedTemplateEntry[]
  deckPatterns?: DeckPatternEntry[]
  slideBlocks?: DeckSlideBlockEntry[]
  blockedSlideBlocks?: BlockedDeckSlideBlockEntry[]
}

export interface VisualRecommendation {
  intent: VisualIntentFamily
  chartType: VizType
  variant?: string
  score: number
  reasons: string[]
  alternatives: Array<{ chartType: VizType; variant?: string; score: number }>
}

export interface CatalogTemplateEntry {
  id: string
  score: number
  bestFor: string[]
  requires: Array<'measure' | 'dimension' | 'time'>
  blocks: string[]
  density: 'compact' | 'medium' | 'full'
  requiredEvidence?: string[]
  qualityConstraints?: string[]
  intents?: VisualIntentFamily[]
  layoutPreset?: 'narrative' | 'executive' | 'analytical' | 'mosaic'
}

export interface BlockedTemplateEntry {
  id: string
  reason: string
}

export interface AnalyzeSampleWarning {
  code: string          // e.g. "small_sample", "two_period_only", "no_distribution"
  message: string       // human-readable, suitable for caveat in insights
}

export interface MetricCandidate {
  id: string
  type: 'unit_average' | 'rate' | 'share' | 'period_change' | 'difference'
  label: string
  formula: string
  value?: number        // pre-computed result (decimal; share = 0.533 means 53.3%)
  confidence: 'high' | 'medium'
  caveat?: string
}

export interface AnalyzeAssumption {
  key: 'primary_measure' | 'primary_dimension' | 'time_field'
  value: string
  confidence: number
  alternatives?: string[]
  reason?: string
}

export interface ClarificationQuestion {
  id: string
  question: string
  options: string[]
  blocking: boolean
  appliesTo: 'measure' | 'dimension' | 'time' | 'template'
}

export interface AnalyzeIntent {
  raw: string
  coverage: 'full' | 'partial'
  assumptions: AnalyzeAssumption[]
  visualTasks?: Array<{
    family: VisualIntentFamily
    fields?: string[]
    confidence: number
    rationale: string[]
  }>
}

export interface AnalyzeContext {
  intent: AnalyzeIntent
  fields: AnalyzeField[]
  evidence: AnalyzeEvidence[]
  catalog: AnalyzeCatalog
  sampleWarnings: AnalyzeSampleWarning[]
  promptRules: string[]
  metricCandidates?: MetricCandidate[]
  clarificationQuestions?: ClarificationQuestion[]
}

export interface CompactAnalyzeContext {
  format: 'compact-v1'
  intent: { raw: string; coverage: 'full' | 'partial'; visualTasks?: Array<[VisualIntentFamily, number, (string[] | null)?, (string[] | null)?]> }
  assumptions: Array<[AnalyzeAssumption['key'], string, number, (string[] | null)?]>
  fields: Array<[
    string,
    AnalyzeField['role'],
    AnalyzeField['type'],
    (number | null)?,
    (number | null)?,
    ({
      tags?: string[]
      confidence?: number
      usage?: [string, string, string]
      comparison?: AnalyzeField['comparison']
    } | null)?
  ]>
  evidence: Array<[string, Record<string, unknown> | Record<string, unknown>[], string?, QueryRecipe?]>
  metricCandidates: Array<[string, MetricCandidate['type'], string, (number | null)?, (string | null)?, (MetricCandidate['confidence'] | null)?, (string | null)?]>
  catalog: {
    charts: string[]
    blockedCharts: Array<[string, string]>
    recommendedPlan?: Array<[string, (string | null)?]>
    recommendations?: Array<[VisualIntentFamily, VizType, string | null, number, string[]]>
    blocks?: Array<[string, number, 'compact' | 'medium' | 'full', string[], (string[] | null)?, (string[] | null)?]>
    blockedBlocks?: Array<[string, string]>
    templates?: Array<[string, number, 'compact' | 'medium' | 'full', string[], (string[] | null)?]>
    blockedTemplates?: Array<[string, string]>
    deckPatterns?: DeckPatternSummary[]
    slideBlocks?: DeckSlideBlockSummary[]
    blockedSlideBlocks?: BlockedDeckSlideBlockSummary[]
  }
  warnings: Array<[string, string]>
  promptRules?: string[]
  clarificationQuestions: Array<[string, string, string[], boolean, ClarificationQuestion['appliesTo']]>
}

// Zod runtime schema — used by validate --context to verify the file format
const analyzeFieldSchema = z.object({
  name: z.string().min(1),
  role: z.enum(fieldRoleValues),
  type: z.enum(['number', 'string', 'date', 'boolean', 'unknown']),
  semanticTags: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  rationale: z.array(z.string()).optional(),
  qualityFlags: z.array(z.string()).optional(),
  chartUsage: z.object({
    asMeasure: z.enum(chartUsageValues),
    asDimension: z.enum(chartUsageValues),
    asDetailKey: z.enum(chartUsageValues)
  }).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  distinctCount: z.number().int().nonnegative().optional(),
  timePeriods: z.number().int().nonnegative().optional(),
  span: z.string().optional()
  ,comparison: z.object({
    unit: z.enum(['currency', 'percentage', 'count', 'number']).optional(),
    currency: z.string().optional(),
    timeGrain: z.enum(['day', 'month', 'quarter', 'year']).optional(),
    aggregationPolicy: z.enum(['sum', 'avg', 'count', 'none']),
    comparableGroup: z.string().optional()
  }).optional()
})

const analyzeEvidenceSchema = z.object({
  id: z.string().min(1),
  query: z.string().min(1),
  values: z.record(z.string(), z.unknown()).optional(),
  rows: z.array(z.record(z.string(), z.unknown())).optional()
  ,recipe: queryRecipeSchema.optional()
}).refine(e => e.values !== undefined || e.rows !== undefined, {
  message: 'Evidence entry must have either values or rows'
})

const catalogBlockVariableSchema = z.object({
  type: z.string().min(1),
  role: z.string().optional(),
  description: z.string(),
  default: z.union([z.string(), z.number()]).optional(),
  min: z.number().optional(),
  max: z.number().optional()
})

const catalogBlockEntrySchema = z.object({
  id: z.string().min(1),
  score: z.number().min(0).max(1),
  description: z.string(),
  bestFor: z.array(z.string()),
  density: z.enum(['compact', 'medium', 'full']),
  examplePrompt: z.string(),
  charts: z.array(z.string()),
  variables: z.record(z.string(), catalogBlockVariableSchema),
  qualityChecks: z.array(z.string()),
  requiredEvidence: z.array(z.string()).optional(),
  validInsightTypes: z.array(z.string()).optional(),
  dataQualityConstraints: z.array(z.string()).optional()
})

const blockedBlockEntrySchema = z.object({
  id: z.string().min(1),
  reason: z.string().min(1)
})

const catalogTemplateEntrySchema = z.object({
  id: z.string().min(1),
  score: z.number().min(0).max(1),
  bestFor: z.array(z.string()),
  requires: z.array(z.enum(['measure', 'dimension', 'time'])),
  blocks: z.array(z.string()),
  density: z.enum(['compact', 'medium', 'full']),
  requiredEvidence: z.array(z.string()).optional(),
  qualityConstraints: z.array(z.string()).optional()
  ,intents: z.array(z.enum(['summary', 'comparison', 'ranking', 'trend', 'change', 'composition', 'distribution', 'relationship', 'flow', 'target-attainment', 'uncertainty', 'geo'])).optional()
  ,layoutPreset: z.enum(['narrative', 'executive', 'analytical', 'mosaic']).optional()
})

const blockedTemplateEntrySchema = z.object({
  id: z.string().min(1),
  reason: z.string().min(1)
})

const deckPatternEntrySchema = z.object({
  id: z.enum(['executive-brief', 'business-review']),
  score: z.number().min(0).max(1),
  density: z.enum(['compact', 'medium']),
  blocks: z.array(z.string().min(1))
})

const deckSlideBlockEntrySchema = z.object({
  id: z.string().min(1),
  score: z.number().min(0).max(1),
  requiredRoles: z.array(z.string()),
  requiredEvidence: z.array(z.string())
})

const blockedDeckSlideBlockEntrySchema = z.object({
  id: z.string().min(1),
  reasonCode: z.string().min(1),
  reason: z.string().min(1)
})

const analyzeCatalogSchema = z.object({
  charts: z.array(z.string().min(1)),
  blockedCharts: z.array(z.object({
    type: z.string().min(1),
    reason: z.string().min(1)
  })),
  recommendedPlan: z.array(z.object({
    type: z.string().min(1),
    note: z.string().optional()
  })),
  recommendations: z.array(z.object({
    intent: z.enum(['summary', 'comparison', 'ranking', 'trend', 'change', 'composition', 'distribution', 'relationship', 'flow', 'target-attainment', 'uncertainty', 'geo']),
    chartType: z.enum(MVP_CHART_TYPES),
    variant: z.string().optional(), score: z.number().min(0).max(1), reasons: z.array(z.string()),
    alternatives: z.array(z.object({ chartType: z.enum(MVP_CHART_TYPES), variant: z.string().optional(), score: z.number() }))
  })).optional(),
  blocks: z.array(catalogBlockEntrySchema).optional(),
  blockedBlocks: z.array(blockedBlockEntrySchema).optional(),
  templates: z.array(catalogTemplateEntrySchema).optional(),
  blockedTemplates: z.array(blockedTemplateEntrySchema).optional()
  ,deckPatterns: z.array(deckPatternEntrySchema).optional()
  ,slideBlocks: z.array(deckSlideBlockEntrySchema).optional()
  ,blockedSlideBlocks: z.array(blockedDeckSlideBlockEntrySchema).optional()
})

const metricCandidateSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['unit_average', 'rate', 'share', 'period_change', 'difference']),
  label: z.string(),
  formula: z.string(),
  value: z.number().optional(),
  confidence: z.enum(['high', 'medium']),
  caveat: z.string().optional()
})

const analyzeAssumptionSchema = z.object({
  key: z.enum(['primary_measure', 'primary_dimension', 'time_field']),
  value: z.string(),
  confidence: z.number().min(0).max(1),
  alternatives: z.array(z.string()).optional(),
  reason: z.string().optional()
})

const legacyAssumptionSchema = z.string().transform((value): AnalyzeAssumption => ({
  key: value.includes('dimension') ? 'primary_dimension' : value.includes('time') ? 'time_field' : 'primary_measure',
  value,
  confidence: 0.5,
  reason: 'legacy string assumption'
}))

const analyzeIntentSchema = z.object({
  raw: z.string().min(1),
  coverage: z.enum(['full', 'partial']),
  assumptions: z.array(z.union([analyzeAssumptionSchema, legacyAssumptionSchema])),
  visualTasks: z.array(z.object({
    family: z.enum(['summary', 'comparison', 'ranking', 'trend', 'change', 'composition', 'distribution', 'relationship', 'flow', 'target-attainment', 'uncertainty', 'geo']),
    fields: z.array(z.string()).optional(), confidence: z.number(), rationale: z.array(z.string())
  })).optional()
})

const analyzeSampleWarningSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1)
})

const clarificationQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  options: z.array(z.string()),
  blocking: z.boolean(),
  appliesTo: z.enum(['measure', 'dimension', 'time', 'template'])
})

export const analyzeContextSchema: z.ZodType<AnalyzeContext> = z.object({
  intent: analyzeIntentSchema,
  fields: z.array(analyzeFieldSchema),
  evidence: z.array(analyzeEvidenceSchema),
  catalog: analyzeCatalogSchema,
  sampleWarnings: z.array(analyzeSampleWarningSchema),
  promptRules: z.array(z.string()),
  metricCandidates: z.array(metricCandidateSchema).optional(),
  clarificationQuestions: z.array(clarificationQuestionSchema).optional()
})

export const compactAnalyzeContextSchema: z.ZodType<CompactAnalyzeContext> = z.object({
  format: z.literal('compact-v1'),
  intent: z.object({
    raw: z.string(),
    coverage: z.enum(['full', 'partial']),
    visualTasks: z.array(z.tuple([z.enum(['summary', 'comparison', 'ranking', 'trend', 'change', 'composition', 'distribution', 'relationship', 'flow', 'target-attainment', 'uncertainty', 'geo']), z.number(), z.array(z.string()).nullable().optional(), z.array(z.string()).nullable().optional()])).optional()
  }),
  assumptions: z.array(z.tuple([
    z.enum(['primary_measure', 'primary_dimension', 'time_field']),
    z.string(),
    z.number(),
    z.array(z.string()).nullable().optional()
  ])),
  fields: z.array(z.tuple([
    z.string(),
    z.enum(fieldRoleValues),
    z.enum(['number', 'string', 'date', 'boolean', 'unknown']),
    z.number().nullable().optional(),
    z.number().nullable().optional(),
    z.object({
      tags: z.array(z.string()).optional(),
      confidence: z.number().optional(),
      usage: z.tuple([z.string(), z.string(), z.string()]).optional()
      ,comparison: z.object({
        unit: z.enum(['currency', 'percentage', 'count', 'number']).optional(),
        currency: z.string().optional(),
        timeGrain: z.enum(['day', 'month', 'quarter', 'year']).optional(),
        aggregationPolicy: z.enum(['sum', 'avg', 'count', 'none']),
        comparableGroup: z.string().optional()
      }).optional()
    }).nullable().optional()
  ])),
  evidence: z.array(z.tuple([z.string(), z.union([
    z.record(z.string(), z.unknown()),
    z.array(z.record(z.string(), z.unknown()))
  ]), z.string().optional(), queryRecipeSchema.optional()])),
  metricCandidates: z.array(z.tuple([
    z.string(),
    z.enum(['unit_average', 'rate', 'share', 'period_change', 'difference']),
    z.string(),
    z.number().nullable().optional(),
    z.string().nullable().optional(),
    z.enum(['high', 'medium']).nullable().optional(),
    z.string().nullable().optional()
  ])),
  catalog: z.object({
    charts: z.array(z.string()),
    blockedCharts: z.array(z.tuple([z.string(), z.string()])),
    recommendedPlan: z.array(z.tuple([z.string(), z.string().nullable().optional()])).optional(),
    recommendations: z.array(z.tuple([z.enum(['summary', 'comparison', 'ranking', 'trend', 'change', 'composition', 'distribution', 'relationship', 'flow', 'target-attainment', 'uncertainty', 'geo']), z.enum(MVP_CHART_TYPES), z.string().nullable(), z.number(), z.array(z.string())])).optional(),
    blocks: z.array(z.tuple([z.string(), z.number(), z.enum(['compact', 'medium', 'full']), z.array(z.string()), z.array(z.string()).nullable().optional(), z.array(z.string()).nullable().optional()])).optional(),
    blockedBlocks: z.array(z.tuple([z.string(), z.string()])).optional(),
    templates: z.array(z.tuple([z.string(), z.number(), z.enum(['compact', 'medium', 'full']), z.array(z.string()), z.array(z.string()).nullable().optional()])).optional(),
    blockedTemplates: z.array(z.tuple([z.string(), z.string()])).optional()
    ,deckPatterns: z.array(z.tuple([z.enum(['executive-brief', 'business-review']), z.number(), z.enum(['compact', 'medium']), z.array(z.string())])).optional()
    ,slideBlocks: z.array(z.tuple([z.string(), z.number(), z.array(z.string()), z.array(z.string())])).optional()
    ,blockedSlideBlocks: z.array(z.tuple([z.string(), z.string(), z.string()])).optional()
  }),
  warnings: z.array(z.tuple([z.string(), z.string()])),
  promptRules: z.array(z.string()).optional(),
  clarificationQuestions: z.array(z.tuple([
    z.string(),
    z.string(),
    z.array(z.string()),
    z.boolean(),
    z.enum(['measure', 'dimension', 'time', 'template'])
  ]))
})

export { fromCompactAnalyzeContext, parseAnalyzeContext, toCompactAnalyzeContext } from './context-compact'
