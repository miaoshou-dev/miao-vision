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
}

export interface AnalyzeSampleWarning {
  code: string          // e.g. "small_sample", "two_period_only", "no_distribution"
  message: string       // human-readable, suitable for caveat in insights
}

export interface AnalyzeIntent {
  raw: string
  coverage: 'full' | 'partial'
  assumptions: string[] // e.g. ["sales is the primary measure", "region is the primary dimension"]
}

export interface AnalyzeContext {
  intent: AnalyzeIntent
  fields: AnalyzeField[]
  evidence: AnalyzeEvidence[]
  catalog: AnalyzeCatalog
  sampleWarnings: AnalyzeSampleWarning[]
  promptRules: string[]
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
  blockedBlocks: z.array(blockedBlockEntrySchema).optional()
})

const analyzeIntentSchema = z.object({
  raw: z.string().min(1),
  coverage: z.enum(['full', 'partial']),
  assumptions: z.array(z.string())
})

const analyzeSampleWarningSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1)
})

export const analyzeContextSchema: z.ZodType<AnalyzeContext> = z.object({
  intent: analyzeIntentSchema,
  fields: z.array(analyzeFieldSchema),
  evidence: z.array(analyzeEvidenceSchema),
  catalog: analyzeCatalogSchema,
  sampleWarnings: z.array(analyzeSampleWarningSchema),
  promptRules: z.array(z.string())
})
