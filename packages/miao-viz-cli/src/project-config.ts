import { z } from 'zod'
import { agentError } from './errors'
import type { AgentError } from './types'

export const projectStatusSchema = z.enum(['todo', 'in_progress', 'done', 'blocked', 'cancelled'])
const field = z.string().trim().min(1)
export const projectConfigSchema = z.object({
  schemaVersion: z.literal(1), projectId: field, name: field,
  timezone: field.refine(value => { try { new Intl.DateTimeFormat('en', { timeZone: value }); return true } catch { return false } }, 'Invalid IANA timezone'),
  fields: z.object({
    task_id: field, title: field, status: field, due_date: field,
    start_date: field.optional(), owner: field.optional(), completed_at: field.optional(),
    stage: field.optional(), is_milestone: field.optional(), next_action: field.optional(),
    action_due_date: field.optional(), blocker: field.optional()
  }).strict(),
  statusMapping: z.record(field, projectStatusSchema).refine(value => Object.keys(value).length > 0, 'Provide explicit status mappings')
}).strict()
export type ProjectConfig = z.infer<typeof projectConfigSchema>
export const isProjectDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
export const projectPeriodSchema = z.object({ start: field.refine(isProjectDate), end: field.refine(isProjectDate) }).strict().refine(value => value.start <= value.end, 'Period start must not exceed end')
export type ProjectPeriod = z.infer<typeof projectPeriodSchema>
export const projectRecipeSchema = z.object({
  kind: z.literal('project-snapshot'), schemaVersion: z.literal(1),
  config: projectConfigSchema, period: projectPeriodSchema,
  view: z.enum(['summary', 'tasks', 'states'])
}).strict()
export type ProjectRecipe = z.infer<typeof projectRecipeSchema>
export function parseProjectConfig(value: unknown): ProjectConfig | AgentError {
  const parsed = projectConfigSchema.safeParse(value)
  return parsed.success ? parsed.data : agentError('PROJECT_FIELD_MAPPING_INVALID', 'Project configuration is invalid.', { issues: parsed.error.issues })
}
export function parseProjectPeriod(start?: string, end?: string): ProjectPeriod | AgentError {
  const parsed = projectPeriodSchema.safeParse({ start, end })
  return parsed.success ? parsed.data : agentError('PROJECT_PERIOD_INVALID', 'Provide --period-start and --period-end as ordered YYYY-MM-DD dates.', { issues: parsed.error.issues })
}
