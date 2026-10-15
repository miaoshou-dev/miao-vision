import { z } from 'zod'
import { agentError, isAgentError } from './errors'
import { isProjectDate, projectConfigSchema, projectPeriodSchema, projectStatusSchema, type ProjectConfig, type ProjectPeriod } from './project-config'
import type { AgentError } from './types'

export const projectTaskSchema = z.object({
  task_id: z.string(), title: z.string(), status: projectStatusSchema,
  due_date: z.string().nullable(), start_date: z.string().nullable(), completed_at: z.string().nullable(),
  owner: z.string().nullable(), stage: z.string(), is_milestone: z.boolean(),
  next_action: z.string().nullable(), action_due_date: z.string().nullable(), blocker: z.string().nullable(), sourceRow: z.number().int()
})
export type ProjectTask = z.infer<typeof projectTaskSchema>
export const projectSnapshotSchema = z.object({
  schemaVersion: z.literal(1), config: projectConfigSchema, period: projectPeriodSchema,
  tasks: z.array(projectTaskSchema), warnings: z.array(z.object({ code: z.string(), message: z.string(), taskId: z.string().optional() }))
})
export type ProjectSnapshot = z.infer<typeof projectSnapshotSchema>
export function normalizeProjectSnapshot(rows: Record<string, unknown>[], config: ProjectConfig, period: ProjectPeriod, columns = Object.keys(rows[0] ?? {})): ProjectSnapshot | AgentError {
  const missing = Object.values(config.fields).filter(name => !columns.includes(name))
  if (missing.length) return agentError('PROJECT_FIELD_MAPPING_INVALID', 'Mapped source fields are missing.', { fields: missing, repairHint: 'Restore the mapped columns or explicitly create a new configuration.' })
  const tasks: ProjectTask[] = [], warnings: ProjectSnapshot['warnings'] = [], ids = new Set<string>()
  for (const [index, row] of rows.entries()) {
    const sourceRow = index + 2
    const read = (key: keyof ProjectConfig['fields']) => {
      const value = row[config.fields[key] ?? '']
      return value === null || value === undefined || String(value).trim() === '' ? null : String(value).trim()
    }
    const task_id = read('task_id'), title = read('title'), rawStatus = read('status')
    if (!task_id || !title) return agentError('PROJECT_FIELD_MAPPING_INVALID', 'Task ID and title must be non-empty.', { sourceRow, field: !task_id ? config.fields.task_id : config.fields.title })
    if (ids.has(task_id)) return agentError('PROJECT_DUPLICATE_TASK_ID', 'Task IDs must be unique.', { taskId: task_id, sourceRow })
    ids.add(task_id)
    const status = rawStatus && Object.hasOwn(config.statusMapping, rawStatus) ? config.statusMapping[rawStatus] : undefined
    if (!status) return agentError('PROJECT_UNKNOWN_STATUS', 'Status is not explicitly mapped.', { sourceRow, field: config.fields.status, value: rawStatus, repairHint: 'Add an explicit mapping in a new project configuration.' })
    const dates: Record<string, string | null> = {}
    for (const key of ['start_date', 'due_date', 'completed_at', 'action_due_date'] as const) {
      const raw = read(key)
      if (raw && !isProjectDate(raw)) return agentError('PROJECT_DATE_INVALID', 'Date must be a valid YYYY-MM-DD.', { sourceRow, field: config.fields[key], value: raw })
      dates[key] = raw
    }
    const { start_date, due_date, completed_at, action_due_date } = dates
    if ((start_date && due_date && start_date > due_date) || (completed_at && (status !== 'done' || completed_at > period.end || (start_date && completed_at < start_date)))) {
      return agentError('PROJECT_SNAPSHOT_INCONSISTENT', 'Task dates and completion status conflict.', { taskId: task_id, sourceRow, status, dates })
    }
    const flag = read('is_milestone')
    if (flag && !['true', 'false', '1', '0'].includes(flag.toLowerCase())) return agentError('PROJECT_FIELD_MAPPING_INVALID', 'Milestone flag must be true/false or 1/0.', { sourceRow, field: config.fields.is_milestone, value: flag })
    if (status === 'done' && !completed_at) warnings.push({ code: 'PROJECT_COMPLETION_DATE_MISSING', taskId: task_id, message: `${title}：未提供完成日期，无法判断本期完成或按期完成。` })
    tasks.push({ task_id, title, status, start_date, due_date, completed_at, action_due_date, owner: read('owner'), stage: read('stage') ?? '未分组', is_milestone: flag !== null && ['true', '1'].includes(flag.toLowerCase()), next_action: read('next_action'), blocker: read('blocker'), sourceRow })
  }
  if (!tasks.some(task => task.due_date && !['done', 'cancelled'].includes(task.status)) && tasks.some(task => !['done', 'cancelled'].includes(task.status))) warnings.push({ code: 'PROJECT_DUE_DATES_UNAVAILABLE', message: '未完成任务均无截止日，逾期判断不可用。' })
  return { schemaVersion: 1, config, period, tasks, warnings }
}
export const isOverdue = (task: ProjectTask, end: string): boolean => Boolean(task.due_date && task.due_date < end && !['done', 'cancelled'].includes(task.status))
export function projectSummary(snapshot: ProjectSnapshot): Record<string, number | null> {
  const active = snapshot.tasks.filter(task => task.status !== 'cancelled')
  const done = active.filter(task => task.status === 'done').length
  return { total: snapshot.tasks.length, active: active.length, completed: done, completion_ratio: active.length ? done / active.length : null,
    overdue: snapshot.warnings.some(w => w.code === 'PROJECT_DUE_DATES_UNAVAILABLE') ? null : active.filter(task => isOverdue(task, snapshot.period.end)).length,
    blocked: active.filter(task => task.status === 'blocked').length,
    completed_in_period: active.filter(task => task.status === 'done' && task.completed_at && task.completed_at >= snapshot.period.start && task.completed_at <= snapshot.period.end).length }
}
export function executeProjectRecipe(rows: Record<string, unknown>[], recipe: import('./project-config').ProjectRecipe) {
  const snapshot = normalizeProjectSnapshot(rows, recipe.config, recipe.period)
  if (isAgentError(snapshot)) return snapshot
  const result = recipe.view === 'summary' ? [projectSummary(snapshot)] : recipe.view === 'tasks' ? snapshot.tasks.map(task => ({ ...task })) : ['todo', 'in_progress', 'done', 'blocked', 'cancelled'].map(status => ({ status, count: snapshot.tasks.filter(task => task.status === status).length }))
  return { rows: result, rowCount: result.length, sql: `project-snapshot/v1:${recipe.view}; cutoff=${recipe.period.end}; timezone=${recipe.config.timezone}` }
}
