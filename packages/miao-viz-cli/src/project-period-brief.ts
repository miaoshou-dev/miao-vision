import { isOverdue, projectSummary, type ProjectSnapshot, type ProjectTask } from './project-snapshot'
export type TaskChangeKind = 'added' | 'missing' | 'completed' | 'reopened' | 'status' | 'due_date' | 'owner' | 'blocked' | 'unblocked'
export interface TaskChange { taskId: string; title: string; kind: TaskChangeKind; previous: string | null; current: string | null; evidenceRefs: string[] }
export interface ProjectPeriodBrief {
  schemaVersion: 1; period: ProjectSnapshot['period']; baselineRunId: string | null
  metrics: Record<string, number | null>; changes: TaskChange[]; warnings: ProjectSnapshot['warnings']; status: 'ready' | 'needs_review'
}
export function buildProjectPeriodBrief(snapshot: ProjectSnapshot, baseline: ProjectSnapshot | null = null, baselineRunId: string | null = null, baselineNeedsReview = false): ProjectPeriodBrief {
  const changes: TaskChange[] = [], previous = new Map(baseline?.tasks.map(task => [task.task_id, task]))
  const emit = (task: ProjectTask, kind: TaskChangeKind, from: string | null, to: string | null, currentIndex?: number, previousIndex?: number) => {
    const evidenceRefs = [currentIndex === undefined ? `baseline:${baselineRunId}:project_tasks.rows[${previousIndex}]` : `$evidence:project_tasks.rows[${currentIndex}]`]
    if (currentIndex !== undefined && previousIndex !== undefined) evidenceRefs.push(`baseline:${baselineRunId}:project_tasks.rows[${previousIndex}]`)
    changes.push({ taskId: task.task_id, title: task.title, kind, previous: from, current: to, evidenceRefs })
  }
  if (baseline) {
    snapshot.tasks.forEach((task, index) => {
      const old = previous.get(task.task_id), oldIndex = baseline.tasks.findIndex(item => item.task_id === task.task_id)
      if (!old) { emit(task, 'added', null, task.status, index); return }
      if (old.status !== task.status) {
        const kind = task.status === 'done' ? 'completed' : old.status === 'done' ? 'reopened' : task.status === 'blocked' ? 'blocked' : old.status === 'blocked' ? 'unblocked' : 'status'
        emit(task, kind, old.status, task.status, index, oldIndex)
      }
      for (const key of ['due_date', 'owner'] as const) if (old[key] !== task[key]) emit(task, key, old[key], task[key], index, oldIndex)
    })
    const currentIds = new Set(snapshot.tasks.map(task => task.task_id))
    baseline.tasks.forEach((task, index) => { if (!currentIds.has(task.task_id)) emit(task, 'missing', task.status, null, undefined, index) })
  }
  const warnings = [...snapshot.warnings]
  for (const change of changes.filter(change => change.kind === 'missing')) warnings.push({ code: 'PROJECT_TASK_MISSING', taskId: change.taskId, message: `${change.title}：本期快照缺失，不能认定完成或取消。` })
  if (baselineNeedsReview) warnings.push({ code: 'PROJECT_BASELINE_NEEDS_REVIEW', message: '比较基线仍有待复核问题。' })
  return { schemaVersion: 1, period: snapshot.period, baselineRunId, metrics: projectSummary(snapshot), changes, warnings, status: warnings.length ? 'needs_review' : 'ready' }
}
export function prioritizeTasks(tasks: ProjectTask[], end: string): ProjectTask[] {
  const score = (task: ProjectTask) => Number(task.is_milestone) * 4 + Number(task.status === 'blocked') * 2 + Number(isOverdue(task, end))
  return [...tasks].sort((a, b) => score(b) - score(a) || (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') || a.task_id.localeCompare(b.task_id)).slice(0, 15)
}
