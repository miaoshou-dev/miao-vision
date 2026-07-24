import { z } from 'zod'
import { queryRecipeSchema, type QueryRecipe } from './query-recipe'

export const REPORT_PROJECT_VERSION = 1 as const
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

export const projectSchema = z.object({
  schemaVersion: z.literal(REPORT_PROJECT_VERSION),
  name: z.string().min(1),
  createdAt: z.string(),
  projectVersion: z.number().int().positive(),
  specHash: z.string(),
  evidencePlanHash: z.string()
})
export type ReportProject = z.infer<typeof projectSchema>

export const runManifestSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  status: z.enum(['running', 'ready', 'needs_review', 'failed']),
  input: z.object({ path: z.string(), sha256: z.string(), sheet: z.string().optional(), copiedPath: z.string().optional() }),
  projectVersion: z.number().int().positive(),
  inputHash: z.string(),
  specHash: z.string(),
  evidencePlanHash: z.string(),
  evidenceResultHash: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  artifacts: z.record(z.string(), z.string()).default({}),
  error: z.object({ code: z.string(), message: z.string() }).optional()
})
export type RunManifest = z.infer<typeof runManifestSchema>

export interface EvidencePlanEntry { id: string; recipe: QueryRecipe }
