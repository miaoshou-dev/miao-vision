import { z } from 'zod'

export const reviewStageSchema = z.enum([
  'input_resolved', 'profiled', 'analyzed', 'spec_instantiated',
  'validated', 'rendered', 'delivery_verified', 'completed', 'failed'
])

export const reviewStatusSchema = z.enum(['pending', 'running', 'completed', 'warning', 'failed', 'skipped'])

export const reviewRunStatusSchema = z.enum(['pending', 'running', 'ready', 'warning', 'failed'])

const reviewEventBaseSchema = z.object({
  runId: z.string().min(1).max(160),
  sequence: z.number().int().nonnegative(),
  timestamp: z.string().datetime()
})

export const reviewStageEventSchema = reviewEventBaseSchema.extend({
  type: z.literal('run.stage'),
  stage: reviewStageSchema,
  status: reviewStatusSchema,
  message: z.string().max(2000).optional(),
  code: z.string().max(120).nullable().optional()
})

export const reviewArtifactEventSchema = reviewEventBaseSchema.extend({
  type: z.literal('artifact.updated'),
  kind: z.enum(['report', 'deck', 'article']),
  primaryPath: z.string().min(1).max(4096),
  previewPath: z.string().min(1).max(4096).optional(),
  verified: z.boolean(),
  deliveryStatus: z.enum(['ready', 'needs_review', 'restricted', 'failed', 'missing']),
  coverage: z.object({
    objectCoverage: z.number().min(0).max(1), claimCheckCoverage: z.number().min(0).max(1),
    eligibleObjects: z.number().int().nonnegative(), coveredObjects: z.number().int().nonnegative(),
    requiredClaimChecks: z.number().int().nonnegative(), passedClaimChecks: z.number().int().nonnegative(),
    invalidReferences: z.number().int().nonnegative(), failedClaimChecks: z.number().int().nonnegative(),
    empty: z.boolean()
  }).optional(),
  evidence: z.object({
    metricCount: z.number().int().nonnegative(), highlightCount: z.number().int().nonnegative(), missingCount: z.number().int().nonnegative()
  }).optional(),
  dataQuality: z.object({
    rows: z.number().int().nonnegative(), columnCount: z.number().int().nonnegative(),
    completeness: z.number().min(0).max(1), nullRate: z.number().min(0).max(1),
    highNullColumns: z.array(z.string().min(1).max(300)).max(8),
    flags: z.array(z.string().min(1).max(600)).max(8),
    outlierColumns: z.array(z.string().min(1).max(300)).max(8)
  }).optional(),
  delivery: z.object({
    format: z.string().min(1).max(16), sizeBytes: z.number().int().nonnegative(),
    alternativeFormats: z.array(z.string().min(1).max(16)).max(8), hasPreview: z.boolean(),
    shareSafe: z.boolean().optional()
  }).optional(),
  fingerprints: z.object({
    specHash: z.string().regex(/^[a-f0-9]{64}$/),
    dataFingerprint: z.string().regex(/^[a-f0-9]{64}$/)
  }).optional(),
  composition: z.object({
    theme: z.string().min(1).max(120).optional(),
    charts: z.array(z.object({ id: z.string().min(1).max(300), type: z.string().min(1).max(120), hash: z.string().regex(/^[a-f0-9]{64}$/), path: z.string().max(300).optional(), title: z.string().max(500).optional(), evidenceIds: z.array(z.string().max(300)).max(30).optional() })).max(100),
    insights: z.array(z.object({ id: z.string().min(1).max(300), hash: z.string().regex(/^[a-f0-9]{64}$/), path: z.string().max(300).optional(), title: z.string().max(500).optional(), evidenceIds: z.array(z.string().max(300)).max(30).optional() })).max(100),
    evidence: z.array(z.object({ id: z.string().min(1).max(300), hash: z.string().regex(/^[a-f0-9]{64}$/), path: z.string().max(300).optional() })).max(200)
  }).optional(),
  evidenceItems: z.array(z.object({
    id: z.string().min(1).max(300), query: z.string().min(1).max(2000),
    caveat: z.string().max(2000).optional()
  })).max(200).optional()
})

export const reviewIssueEventSchema = reviewEventBaseSchema.extend({
  type: z.literal('run.issue'),
  severity: z.enum(['warning', 'error']),
  code: z.string().min(1).max(120),
  message: z.string().min(1).max(4000),
  path: z.string().max(4096).optional()
})

export const reviewCompletedEventSchema = reviewEventBaseSchema.extend({
  type: z.literal('run.completed'),
  status: z.enum(['ready', 'warning', 'failed']),
  message: z.string().max(2000).optional()
})

export const reviewEventSchema = z.discriminatedUnion('type', [
  reviewStageEventSchema,
  reviewArtifactEventSchema,
  reviewIssueEventSchema,
  reviewCompletedEventSchema
])

export type ReviewStage = z.infer<typeof reviewStageSchema>
export type ReviewRunStatus = z.infer<typeof reviewRunStatusSchema>
export type ReviewEvent = z.infer<typeof reviewEventSchema>

export interface ReviewRunSnapshot {
  runId: string
  parentRunId?: string
  kind: 'report' | 'deck' | 'article'
  title: string
  status: ReviewRunStatus
  startedAt: string
  finishedAt?: string
  currentStage?: ReviewStage
  events: ReviewEvent[]
  artifact?: Extract<ReviewEvent, { type: 'artifact.updated' }>
  issues: Extract<ReviewEvent, { type: 'run.issue' }>[]
}

export function now(): string {
  return new Date().toISOString()
}

export function createRunSnapshot(input: Pick<ReviewRunSnapshot, 'runId' | 'kind' | 'title' | 'parentRunId'>): ReviewRunSnapshot {
  return { ...input, status: 'pending', startedAt: now(), events: [], issues: [] }
}
