import { describe, expect, it } from 'vitest'
import { readFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as XLSX from 'xlsx'
import { projectConfigSchema, parseProjectPeriod } from './project-config'
import { normalizeProjectSnapshot, projectSummary, executeProjectRecipe, type ProjectSnapshot } from './project-snapshot'
import { isAgentError } from './errors'
import { buildProjectPeriodBrief, prioritizeTasks } from './project-period-brief'
import { renderGanttChart } from './gantt-chart'
import { renderProjectReportHtml } from './project-report-html'
import { executeQueryRecipe, parseQueryRecipe } from './query-recipe'
import { loadDataset } from './data-loader'
import { addProjectEvidence } from './project-analysis'
import { analyzeDataset } from './analyzer'
import { projectReportSpec } from './project-report-catalog'
import { validateProvenance } from './provenance-validator'
const config = projectConfigSchema.parse(JSON.parse(readFileSync('test_data/project_reports/config.json', 'utf8')))
const period = { start: '2026-10-01', end: '2026-10-07' }
const row = { task_id: 'T', title: 'Test', status: 'todo', due_date: '2026-10-06', start_date: null, owner: null, completed_at: null, stage: null, is_milestone: false, next_action: null, action_due_date: null, blocker: null }
function snapshot(rows: Record<string, unknown>[] = [row], p = period): ProjectSnapshot {
  const result = normalizeProjectSnapshot(rows, config, p)
  if (isAgentError(result)) throw new Error(JSON.stringify(result))
  return result
}
describe('project snapshot contracts and facts', () => {
  it.each([
    ['duplicate ID', [row, row], 'PROJECT_DUPLICATE_TASK_ID'],
    ['unknown status', [{ ...row, status: 'mystery' }], 'PROJECT_UNKNOWN_STATUS'],
    ['invalid date', [{ ...row, due_date: '2026-02-30' }], 'PROJECT_DATE_INVALID'],
    ['reversed dates', [{ ...row, start_date: '2026-10-08' }], 'PROJECT_SNAPSHOT_INCONSISTENT'],
    ['unfinished with completion date', [{ ...row, completed_at: '2026-10-02' }], 'PROJECT_SNAPSHOT_INCONSISTENT'],
    ['future completion', [{ ...row, status: 'done', completed_at: '2026-10-08' }], 'PROJECT_SNAPSHOT_INCONSISTENT'],
    ['empty title', [{ ...row, title: '' }], 'PROJECT_FIELD_MAPPING_INVALID']
  ])('rejects %s', (_, rows, code) => expect(normalizeProjectSnapshot(rows, config, period)).toMatchObject({ ok: false, code }))
  it('requires exact period dates and honors cutoff rather than the current clock', () => {
    expect(parseProjectPeriod('2026-10-08', '2026-10-07')).toMatchObject({ ok: false })
    expect(projectSummary(snapshot())).toMatchObject({ overdue: 1, completion_ratio: 0 })
    expect(projectSummary(snapshot([{ ...row, due_date: period.end }]))).toMatchObject({ overdue: 0 })
    expect(projectSummary(snapshot([{ ...row, status: 'cancelled' }]))).toMatchObject({ active: 0, completion_ratio: null, overdue: 0 })
  })
  it('keeps missing dates and owners explicit and never invents completion timing', () => {
    const s = snapshot([{ ...row, status: 'done', completed_at: null }])
    expect(projectSummary(s)).toMatchObject({ completed: 1, completed_in_period: 0 })
    expect(s.warnings[0].code).toBe('PROJECT_COMPLETION_DATE_MISSING')
    expect(projectSummary(snapshot([{ ...row, due_date: null }])).overdue).toBeNull()
  })
  it('replays project evidence with stable facts and rejects missing mapped columns', () => {
    const project = { kind: 'project-snapshot' as const, schemaVersion: 1 as const, config, period, view: 'summary' as const }
    const recipe = { schemaVersion: 1, project }
    expect(executeQueryRecipe([row], recipe)).toEqual(executeProjectRecipe([row], project))
    expect(executeQueryRecipe([row], recipe)).toEqual(executeQueryRecipe([row], recipe))
    expect(normalizeProjectSnapshot([{ task_id: 'x' }], config, period)).toMatchObject({ code: 'PROJECT_FIELD_MAPPING_INVALID' })
    expect(parseQueryRecipe({ ...recipe, groupBy: ['status'] })).toMatchObject({ ok: false })
  })
  it('normalizes actual XLSX date cells for project analysis without changing default loading', () => {
    const dir = mkdtempSync(join(tmpdir(), 'project-xlsx-')), path = join(dir, 'tasks.xlsx')
    const sheet = XLSX.utils.json_to_sheet([{ ...row, due_date: new Date('2026-10-06T00:00:00Z') }], { cellDates: true })
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, 'Tasks')
    XLSX.writeFile(book, path)
    const data = loadDataset(path, { sheet: 'Tasks', projectDates: true })
    if (isAgentError(data)) throw new Error(data.message)
    expect(data.value.rows[0].due_date).toBe('2026-10-06')
    expect(normalizeProjectSnapshot(data.value.rows, config, period)).toMatchObject({ schemaVersion: 1 })
  })
  it('compares IDs, distinguishes missing tasks and preserves source evidence', () => {
    const old = snapshot([row, { ...row, task_id: 'D', status: 'done', completed_at: '2026-10-03' }, { ...row, task_id: 'M' }])
    const current = snapshot([{ ...row, status: 'blocked', due_date: '2026-10-20', owner: 'Lee' }, { ...row, task_id: 'D' }, { ...row, task_id: 'N' }], { start: '2026-10-08', end: '2026-10-14' })
    const brief = buildProjectPeriodBrief(current, old, 'W1')
    expect(brief.changes.map(change => change.kind)).toEqual(['blocked', 'due_date', 'owner', 'reopened', 'added', 'missing'])
    expect(brief.status).toBe('needs_review')
    expect(brief.changes.at(-1)?.evidenceRefs[0]).toContain('baseline:W1:project_tasks.rows[2]')
    expect(buildProjectPeriodBrief(current).changes).toEqual([])
    expect(buildProjectPeriodBrief(old, old, 'W1').changes).toEqual([])
  })
  it('prioritizes important tasks and renders date points, baseline and milestone labels', () => {
    const s = snapshot(Array.from({ length: 30 }, (_, i) => ({ ...row, task_id: `T${i}`, due_date: '2026-10-20', is_milestone: i === 29 })))
    const chosen = prioritizeTasks(s.tasks, period.end)
    expect(chosen).toHaveLength(15)
    expect(chosen[0].task_id).toBe('T29')
    const html = renderGanttChart({ type: 'gantt', style: { cutoff: period.end } }, [{ ...s.tasks[0], baseline_start: '2026-10-01', baseline_end: '2026-10-03' }])
    expect(html).toContain('gantt-due-point')
    expect(html).not.toContain('class="gantt-bar"')
    expect(html).toContain('gantt-baseline')
    expect(html).toContain('gantt-cutoff')
    const report = renderProjectReportHtml(s)
    expect(report).toContain('未排期')
    expect(report).toContain('project-schedule-page')
    expect(report).toContain('不代表整个项目交付进度')
  })
  it('keeps project evidence and instantiated blocks verifiable', () => {
    const data = loadDataset('test_data/project_reports/normal-1.csv')
    if (isAgentError(data)) throw new Error(data.message)
    const ctx = addProjectEvidence(analyzeDataset(data.value), data.value, config, period)
    if (isAgentError(ctx)) throw new Error(ctx.message)
    const spec = projectReportSpec({ ...ctx })
    expect(validateProvenance(spec, ctx).issues).toEqual([])
    const incorrect = structuredClone(spec)
    incorrect.charts[1].encoding!.y!.aggregate = 'sum'
    expect(validateProvenance(incorrect, ctx).issues.length).toBeGreaterThan(0)
  })
})
