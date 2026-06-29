import { z } from 'zod'

// Compact field descriptor — only fields useful for spec writing, not full ColumnProfile
export interface AnalyzeField {
  name: string
  role: 'measure' | 'dimension' | 'time' | 'id' | 'status' | 'score' | 'unknown'
  type: 'number' | 'string' | 'date' | 'boolean' | 'unknown'
  min?: number
  max?: number
  distinctCount?: number
  timePeriods?: number  // only for time role
  span?: string         // only for time role, e.g. "2024-01 – 2024-12"
}

// A single evidence entry from a precomputed query
export interface AnalyzeEvidence {
  id: string            // e.g. "total", "by_region", "by_time"
  query: string         // human-readable query description
  // Either a single-row summary (total) or multi-row results (by_dimension)
  values?: Record<string, unknown>
  rows?: Record<string, unknown>[]
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
}

export interface BlockedBlockEntry {
  id: string
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
  blocks?: CatalogBlockEntry[]
  blockedBlocks?: BlockedBlockEntry[]
  templates?: CatalogTemplateEntry[]
  blockedTemplates?: BlockedTemplateEntry[]
}

export interface CatalogTemplateEntry {
  id: string
  score: number
  bestFor: string[]
  requires: Array<'measure' | 'dimension' | 'time'>
  blocks: string[]
  density: 'compact' | 'medium' | 'full'
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
  intent: { raw: string; coverage: 'full' | 'partial' }
  assumptions: Array<[AnalyzeAssumption['key'], string, number, string[]?]>
  fields: Array<[string, AnalyzeField['role'], AnalyzeField['type'], number?, number?]>
  evidence: Array<[string, Record<string, unknown> | Record<string, unknown>[]]>
  metricCandidates: Array<[string, MetricCandidate['type'], string, number?]>
  catalog: {
    charts: string[]
    blockedCharts: Array<[string, string]>
    blocks?: CatalogBlockSummary[]
    blockedBlocks?: Array<[string, string]>
    templates?: CatalogTemplateSummary[]
    blockedTemplates?: Array<[string, string]>
  }
  warnings: Array<[string, string]>
  clarificationQuestions: Array<[string, string, string[], boolean, ClarificationQuestion['appliesTo']]>
}

// Zod runtime schema — used by validate --context to verify the file format
const analyzeFieldSchema = z.object({
  name: z.string().min(1),
  role: z.enum(['measure', 'dimension', 'time', 'id', 'status', 'score', 'unknown']),
  type: z.enum(['number', 'string', 'date', 'boolean', 'unknown']),
  min: z.number().optional(),
  max: z.number().optional(),
  distinctCount: z.number().int().nonnegative().optional(),
  timePeriods: z.number().int().nonnegative().optional(),
  span: z.string().optional()
})

const analyzeEvidenceSchema = z.object({
  id: z.string().min(1),
  query: z.string().min(1),
  values: z.record(z.string(), z.unknown()).optional(),
  rows: z.array(z.record(z.string(), z.unknown())).optional()
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
  qualityChecks: z.array(z.string())
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
  density: z.enum(['compact', 'medium', 'full'])
})

const blockedTemplateEntrySchema = z.object({
  id: z.string().min(1),
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
  blocks: z.array(catalogBlockEntrySchema).optional(),
  blockedBlocks: z.array(blockedBlockEntrySchema).optional(),
  templates: z.array(catalogTemplateEntrySchema).optional(),
  blockedTemplates: z.array(blockedTemplateEntrySchema).optional()
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
  assumptions: z.array(z.union([analyzeAssumptionSchema, legacyAssumptionSchema]))
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
    coverage: z.enum(['full', 'partial'])
  }),
  assumptions: z.array(z.tuple([
    z.enum(['primary_measure', 'primary_dimension', 'time_field']),
    z.string(),
    z.number(),
    z.array(z.string()).nullable().optional()
  ])),
  fields: z.array(z.tuple([
    z.string(),
    z.enum(['measure', 'dimension', 'time', 'id', 'status', 'score', 'unknown']),
    z.enum(['number', 'string', 'date', 'boolean', 'unknown']),
    z.number().nullable().optional(),
    z.number().nullable().optional()
  ])),
  evidence: z.array(z.tuple([z.string(), z.union([
    z.record(z.string(), z.unknown()),
    z.array(z.record(z.string(), z.unknown()))
  ])])),
  metricCandidates: z.array(z.tuple([
    z.string(),
    z.enum(['unit_average', 'rate', 'share', 'period_change', 'difference']),
    z.string(),
    z.number().nullable().optional()
  ])),
  catalog: z.object({
    charts: z.array(z.string()),
    blockedCharts: z.array(z.tuple([z.string(), z.string()])),
    blocks: z.array(z.tuple([z.string(), z.number(), z.enum(['compact', 'medium', 'full']), z.array(z.string())])).optional(),
    blockedBlocks: z.array(z.tuple([z.string(), z.string()])).optional(),
    templates: z.array(z.tuple([z.string(), z.number(), z.enum(['compact', 'medium', 'full']), z.array(z.string())])).optional(),
    blockedTemplates: z.array(z.tuple([z.string(), z.string()])).optional()
  }),
  warnings: z.array(z.tuple([z.string(), z.string()])),
  clarificationQuestions: z.array(z.tuple([
    z.string(),
    z.string(),
    z.array(z.string()),
    z.boolean(),
    z.enum(['measure', 'dimension', 'time', 'template'])
  ]))
})

export function toCompactAnalyzeContext(ctx: AnalyzeContext): CompactAnalyzeContext {
  return {
    format: 'compact-v1',
    intent: { raw: ctx.intent.raw, coverage: ctx.intent.coverage },
    assumptions: ctx.intent.assumptions.map(a => [a.key, a.value, a.confidence, a.alternatives]),
    fields: ctx.fields.map(f => [f.name, f.role, f.type, f.distinctCount, f.timePeriods]),
    evidence: ctx.evidence.map(e => [e.id, e.values ?? e.rows ?? {}]),
    metricCandidates: (ctx.metricCandidates ?? []).map(m => [m.id, m.type, m.formula, m.value]),
    catalog: {
      charts: ctx.catalog.charts,
      blockedCharts: ctx.catalog.blockedCharts.map(c => [c.type, c.reason]),
      blocks: ctx.catalog.blocks?.map(b => [b.id, b.score, b.density, b.charts]),
      blockedBlocks: ctx.catalog.blockedBlocks?.map(b => [b.id, b.reason]),
      templates: ctx.catalog.templates?.map(t => [t.id, t.score, t.density, t.blocks]),
      blockedTemplates: ctx.catalog.blockedTemplates?.map(t => [t.id, t.reason])
    },
    warnings: ctx.sampleWarnings.map(w => [w.code, w.message]),
    clarificationQuestions: (ctx.clarificationQuestions ?? []).map(q => [
      q.id,
      q.question,
      q.options,
      q.blocking,
      q.appliesTo
    ])
  }
}

export function fromCompactAnalyzeContext(ctx: CompactAnalyzeContext): AnalyzeContext {
  return {
    intent: {
      raw: ctx.intent.raw,
      coverage: ctx.intent.coverage,
      assumptions: ctx.assumptions.map(([key, value, confidence, alternatives]) => ({
        key,
        value,
        confidence,
      alternatives: alternatives ?? undefined
      }))
    },
    fields: ctx.fields.map(([name, role, type, distinctCount, timePeriods]) => ({
      name,
      role,
      type,
      ...(distinctCount !== undefined && distinctCount !== null ? { distinctCount } : {}),
      ...(timePeriods !== undefined && timePeriods !== null ? { timePeriods } : {})
    })),
    evidence: ctx.evidence.map(([id, value]) => ({
      id,
      query: `compact evidence: ${id}`,
      ...(Array.isArray(value) ? { rows: value } : { values: value })
    })),
    catalog: {
      charts: ctx.catalog.charts,
      blockedCharts: ctx.catalog.blockedCharts.map(([type, reason]) => ({ type, reason })),
      recommendedPlan: [],
      blocks: ctx.catalog.blocks?.map(([id, score, density, charts]) => ({
        id,
        score,
        description: '',
        bestFor: [],
        density,
        examplePrompt: '',
        charts,
        variables: {},
        qualityChecks: []
      })),
      blockedBlocks: ctx.catalog.blockedBlocks?.map(([id, reason]) => ({ id, reason })),
      templates: ctx.catalog.templates?.map(([id, score, density, blocks]) => ({
        id,
        score,
        bestFor: [],
        requires: [],
        blocks,
        density
      })),
      blockedTemplates: ctx.catalog.blockedTemplates?.map(([id, reason]) => ({ id, reason }))
    },
    sampleWarnings: ctx.warnings.map(([code, message]) => ({ code, message })),
    promptRules: [],
    metricCandidates: ctx.metricCandidates.map(([id, type, formula, value]) => ({
      id,
      type,
      label: id,
      formula,
      ...(value !== undefined && value !== null ? { value } : {}),
      confidence: 'medium'
    })),
    clarificationQuestions: ctx.clarificationQuestions.map(([id, question, options, blocking, appliesTo]) => ({
      id,
      question,
      options,
      blocking,
      appliesTo
    }))
  }
}

export function parseAnalyzeContext(value: unknown): AnalyzeContext | null {
  const unwrapped = (value as { ok?: unknown; value?: unknown }).ok === true
    ? (value as { value: unknown }).value
    : value
  const full = analyzeContextSchema.safeParse(unwrapped)
  if (full.success) return full.data
  const compact = compactAnalyzeContextSchema.safeParse(unwrapped)
  if (compact.success) return fromCompactAnalyzeContext(compact.data)
  return null
}
