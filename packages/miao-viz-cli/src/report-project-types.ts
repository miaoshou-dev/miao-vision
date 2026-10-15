import { z } from 'zod'
import { projectPeriodSchema } from './project-config'
import { queryRecipeSchema, type QueryRecipe } from './query-recipe'

export const REPORT_PROJECT_VERSION = 2 as const
const fieldType = z.enum(['number', 'string', 'date', 'boolean', 'unknown'])

export const dataContractSchema = z.object({
  schemaVersion: z.literal(1),
  requiredFields: z.array(z.object({ name: z.string(), type: fieldType })),
  optionalFields: z.array(z.object({ name: z.string(), type: fieldType })).default([]),
  sheet: z.string().optional(),
  minimumRows: z.number().int().positive().default(1)
})
export type DataContract = z.infer<typeof dataContractSchema>

export const evidencePlanSchema = z.object({
  schemaVersion: z.literal(1),
  queries: z.array(z.object({ id: z.string().min(1), recipe: queryRecipeSchema }))
})
export type EvidencePlan = z.infer<typeof evidencePlanSchema>

const projectBaseSchema = z.object({
  name: z.string().min(1),
  createdAt: z.string(),
  projectVersion: z.number().int().positive(),
  specHash: z.string(),
  evidencePlanHash: z.string()
})
const projectV1Schema = projectBaseSchema.extend({ schemaVersion: z.literal(1) })
const projectV2Schema = projectBaseSchema.extend({
  schemaVersion: z.literal(REPORT_PROJECT_VERSION),
  reportProfileHash: z.string().min(1)
})
const projectV3Schema = projectBaseSchema.extend({ schemaVersion: z.literal(3), projectConfigHash: z.string().min(1), baselineSnapshotHash: z.string().min(1) })
export const projectSchema = z.union([projectV1Schema, projectV2Schema, projectV3Schema])
export type ReportProject = z.infer<typeof projectSchema>

const runManifestBaseSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['running', 'ready', 'needs_review', 'failed']),
  input: z.object({ path: z.string(), sha256: z.string(), sheet: z.string().optional(), copiedPath: z.string().optional() }),
  projectVersion: z.number().int().positive(),
  inputHash: z.string(),
  specHash: z.string(),
  evidencePlanHash: z.string(),
  evidenceResultHash: z.string().optional(),
  lineageHash: z.string().optional(),
  coverage: z.object({
    objectCoverage: z.number(),
    claimCheckCoverage: z.number(),
    eligibleObjects: z.number().int().nonnegative(),
    coveredObjects: z.number().int().nonnegative()
  }).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  artifacts: z.record(z.string(), z.string()).default({}),
  error: z.object({ code: z.string(), message: z.string() }).optional()
})
const runManifestV1Schema = runManifestBaseSchema.extend({ schemaVersion: z.literal(1) })
const runManifestV2Schema = runManifestBaseSchema.extend({
  schemaVersion: z.literal(2),
  baselineRunId: z.string().nullable().optional(),
  changes: z.object({
    status: z.enum(['no_baseline', 'ready', 'partial']),
    metrics: z.number().int().nonnegative(),
    rankings: z.number().int().nonnegative(),
    anomaliesAdded: z.number().int().nonnegative(),
    anomaliesRemoved: z.number().int().nonnegative(),
    notComparable: z.number().int().nonnegative()
  }).optional()
})
const runManifestV3Schema = runManifestBaseSchema.extend({
  schemaVersion: z.literal(3),
  reportProfileHash: z.string().min(1),
  baselineRunId: z.string().nullable(),
  changes: z.object({
    status: z.enum(['no_baseline', 'ready', 'partial']),
    metrics: z.number().int().nonnegative(),
    rankings: z.number().int().nonnegative(),
    anomaliesAdded: z.number().int().nonnegative(),
    anomaliesRemoved: z.number().int().nonnegative(),
    notComparable: z.number().int().nonnegative()
  }),
  review: z.object({
    status: z.enum(['ready', 'needs_review', 'blocked']),
    materialChanges: z.number().int().nonnegative(),
    warnings: z.number().int().nonnegative(),
    blockingIssues: z.number().int().nonnegative()
  })
})
const runManifestV4Schema = runManifestBaseSchema.extend({
  schemaVersion: z.literal(4), projectConfigHash: z.string().min(1), snapshotHash: z.string().min(1),
  period: projectPeriodSchema, timezone: z.string(), baselineRunId: z.string().nullable(), replacesRunId: z.string().optional(),
  review: z.object({ status: z.enum(['ready', 'needs_review', 'blocked']), warnings: z.number().int().nonnegative() })
})
export const runManifestSchema = z.union([runManifestV1Schema, runManifestV2Schema, runManifestV3Schema, runManifestV4Schema])
export type RunManifest = z.infer<typeof runManifestSchema>

export interface EvidencePlanEntry { id: string; recipe: QueryRecipe }
