import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as YAML from 'yaml'
import { agentError, isAgentError } from './errors'
import { loadDataset } from './data-loader'
import { parseProjectPeriod, type ProjectPeriod } from './project-config'
import { normalizeProjectSnapshot, projectSnapshotSchema, type ProjectSnapshot } from './project-snapshot'
import { buildProjectPeriodBrief } from './project-period-brief'
import { addProjectEvidence } from './project-analysis'
import { analyzeDataset } from './analyzer'
import { hashValue, type LoadedReportProject } from './report-project-storage'
import { listRuns, parseReportFormats, verifySpec } from './report-lifecycle-utils'
import { createRun } from './cli-report-run'
import { normalizeSpec, stringFlag, fail, type CliArgs } from './cli-utils'
import type { AgentError } from './types'

export function selectProjectBaseline(loaded: LoadedReportProject, period: ProjectPeriod) {
  const runs = listRuns(loaded.root)
  const superseded = new Set(runs.flatMap(run => run.schemaVersion === 4 && ['ready', 'needs_review'].includes(run.status) && run.replacesRunId ? [run.replacesRunId] : []))
  return runs.filter(run => !superseded.has(run.id) && run.schemaVersion === 4 && ['ready', 'needs_review'].includes(run.status) && run.projectConfigHash === (loaded.project.schemaVersion === 3 ? loaded.project.projectConfigHash : '') && run.period.end < period.start)
    .sort((a, b) => {
      if (a.schemaVersion !== 4 || b.schemaVersion !== 4) return 0
      return b.period.end.localeCompare(a.period.end) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)
    })[0] ?? null
}
export function validateProjectRevision(loaded: LoadedReportProject, period: ProjectPeriod, replacesRunId?: string): AgentError | null {
  const same = listRuns(loaded.root).filter(run => ['ready', 'needs_review'].includes(run.status) && run.schemaVersion === 4 && run.period.start === period.start && run.period.end === period.end)
  if (same.length && !replacesRunId) return agentError('PROJECT_PERIOD_ALREADY_EXISTS', 'This logical period already exists; use --replaces-run with a new run ID.', { runIds: same.map(run => run.id) })
  if (replacesRunId) {
    const replaced = same.find(run => run.id === replacesRunId)
    if (!replaced || !['ready', 'needs_review'].includes(replaced.status)) return agentError('PROJECT_REVISION_INVALID', 'Revision must reference a successful run of the same period.', { replacesRunId })
    if (same.some(run => run.schemaVersion === 4 && run.replacesRunId === replacesRunId && ['ready', 'needs_review'].includes(run.status))) return agentError('PROJECT_REVISION_INVALID', 'This run has already been superseded; replace its latest revision.', { replacesRunId })
  }
  return null
}
export function readProjectSnapshot(path: string): ProjectSnapshot {
  return projectSnapshotSchema.parse(JSON.parse(readFileSync(path, 'utf8')))
}
export async function updateProjectReport(loaded: LoadedReportProject, args: CliArgs, input: string, runId: string): Promise<unknown> {
  if (!loaded.projectConfig || loaded.project.schemaVersion !== 3) return fail(agentError('REPORT_PROJECT_INVALID', 'Project configuration is missing.'))
  const period = parseProjectPeriod(stringFlag(args, 'period-start'), stringFlag(args, 'period-end'))
  if (isAgentError(period)) return fail(period)
  const replacesRunId = stringFlag(args, 'replaces-run')
  const revisionError = validateProjectRevision(loaded, period, replacesRunId)
  if (revisionError) return fail(revisionError)
  if (existsSync(join(loaded.root, 'runs', runId))) return fail(agentError('REPORT_RUN_ALREADY_EXISTS', 'Run already exists.', { runId }))
  const normalized = normalizeSpec(YAML.parse(loaded.spec as string))
  if (isAgentError(normalized)) return fail(normalized)
  if (hashValue(normalized) !== loaded.project.specHash || hashValue(loaded.plan) !== loaded.project.evidencePlanHash) return fail(agentError('REPORT_LINEAGE_CONTRACT_CHANGED', 'Report specification or evidence plan changed; create a new project version.'))
  const dataset = loadDataset(input, { sheet: loaded.contract.sheet, projectDates: true })
  if (isAgentError(dataset)) return fail(dataset)
  const snapshot = normalizeProjectSnapshot(dataset.value.rows, loaded.projectConfig, period, dataset.value.columns)
  if (isAgentError(snapshot)) return fail(snapshot)
  const context = addProjectEvidence(analyzeDataset(dataset.value), dataset.value, loaded.projectConfig, period)
  if (isAgentError(context)) return fail(context)
  const validation = verifySpec(normalized, dataset.value, context)
  if (isAgentError(validation)) return fail(validation)
  const baselineRun = selectProjectBaseline(loaded, period)
  let baseline: ProjectSnapshot | null = null, frozen: ProjectSnapshot
  try {
    if (baselineRun) {
      baseline = readProjectSnapshot(join(loaded.root, 'runs', baselineRun.id, 'project-snapshot.json'))
      if (baselineRun.schemaVersion !== 4 || hashValue(baseline) !== baselineRun.snapshotHash || hashValue(baseline.config) !== baselineRun.projectConfigHash) throw new Error('Comparison snapshot lineage changed')
    }
    frozen = readProjectSnapshot(join(loaded.root, 'baseline-snapshot.json'))
  } catch (error) { return fail(agentError('REPORT_PROJECT_INVALID', 'Saved task snapshot is invalid.', { detail: String(error) })) }
  const brief = buildProjectPeriodBrief(snapshot, baseline, baselineRun?.id ?? null, baselineRun?.status === 'needs_review')
  return createRun(loaded.root, loaded.project, dataset.value, context, validation, runId, {
    inputPath: input, copyInput: args.flags['copy-input'] === true, formats: parseReportFormats(stringFlag(args, 'format')),
    pdfTimeout: Number(stringFlag(args, 'pdf-timeout') ?? 30_000), keepTemp: args.flags['keep-temp'] === true,
    projectData: { snapshot, brief, frozen, comparison: baseline, replacesRunId }, baseline: undefined
  })
}
