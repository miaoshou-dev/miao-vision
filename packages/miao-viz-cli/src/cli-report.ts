import {
  cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync
} from 'node:fs'
import { basename, join, relative, resolve } from 'node:path'
import * as YAML from 'yaml'
import { agentError, isAgentError } from './errors'
import { loadDataset } from './data-loader'
import { profileDataset } from './data-profiler'
import { parseAnalyzeContext, type AnalyzeContext } from './context-schema'
import { executeQueryRecipe } from './query-recipe'
import { createDataContract, validateDataContract } from './report-data-contract'
import {
  atomicWriteJson, hashFile, hashValue, loadReportProject, readRunManifest
} from './report-project-storage'
import {
  evidencePlanSchema, type EvidencePlan, type RunManifest
} from './report-project-types'
import { normalizeSpec, readJson, readSpec, requiredFlag, stringFlag, fail, writeOutput } from './cli-utils'
import { validateReportSpec, collectVerifyIssues, strictVerifyError, validateEvidencePaths } from './spec-validator'
import { resolveChartEvidence } from './chart-evidence'
import { resolveDirectives } from './directive-resolver'
import { mapInsightText } from './insight-utils'
import { renderStaticHtml } from './html-export'
import { exportHtmlToPdf } from './pdf-export'
import type { CliArgs } from './cli-utils'
import type { AgentError, AgentReportSpec, LoadedDataset } from './types'

export async function runReportCommand(args: CliArgs): Promise<unknown> {
  if (args.subcommand === 'init') return reportInit(args)
  if (args.subcommand === 'update') return reportUpdate(args)
  if (args.subcommand === 'info') return reportInfo(args)
  if (args.subcommand === 'history') return reportHistory(args)
  if (args.subcommand === 'clean') return reportClean(args)
  return fail(agentError('UNKNOWN_SUBCOMMAND',
    `Unknown report subcommand: ${args.subcommand ?? '(none)'}. Available: init, update, info, history, clean`))
}

async function reportInit(args: CliArgs): Promise<unknown> {
  const target = args.positional[0]
  const input = requiredFlag(args, 'input')
  const specPath = requiredFlag(args, 'spec')
  const contextPath = requiredFlag(args, 'context')
  const period = requiredFlag(args, 'period')
  for (const value of [target ? null : agentError('MISSING_INPUT', 'Usage: miao-viz report init <project> ...'), input, specPath, contextPath, period]) {
    if (isAgentError(value)) return fail(value)
  }
  const periodIssue = validateRunId(period as string)
  if (periodIssue) return fail(periodIssue)
  const root = resolve(target!)
  if (existsSync(root) && readdirSync(root).length > 0) {
    return fail(agentError('REPORT_PROJECT_INVALID', 'Project target already exists and is not empty.', { project: root }))
  }
  const dataset = loadDataset(input as string, { sheet: stringFlag(args, 'sheet') })
  if (isAgentError(dataset)) return fail(dataset)
  const context = readContext(contextPath as string)
  if (isAgentError(context)) return fail(context)
  const plan = extractPlan(context)
  if (isAgentError(plan)) return fail(plan)
  const normalized = normalizeSpec(readSpec(specPath as string))
  if (isAgentError(normalized)) return fail(normalized)
  const validation = verifySpec(normalized, dataset.value, context)
  if (isAgentError(validation)) return fail(validation)
  const contract = createDataContract(dataset.value, context, plan)
  const project = {
    schemaVersion: 1 as const, name: basename(root), createdAt: new Date().toISOString(),
    projectVersion: 1, specHash: hashValue(normalized), evidencePlanHash: hashValue(plan)
  }
  const summary = {
    project: root, period, contract, evidence: plan.queries.map(query => query.id),
    hashes: { spec: project.specHash, evidencePlan: project.evidencePlanHash },
    risks: context.sampleWarnings.map(warning => warning.message)
  }
  if (args.flags['dry-run'] === true) return { ok: true, value: { dryRun: true, ...summary } }

  mkdirSync(root, { recursive: true })
  atomicWriteJson(join(root, 'project.json'), project)
  atomicWriteJson(join(root, 'data-contract.json'), contract)
  atomicWriteJson(join(root, 'evidence-plan.json'), plan)
  atomicWriteJson(join(root, 'preferences.json'), { theme: stringFlag(args, 'theme') ?? 'standard-white' })
  writeFileSync(join(root, 'report.yaml'), readFileSync(specPath as string, 'utf8'), 'utf8')
  return createRun(root, project, dataset.value, context, validation, period as string, {
    copyInput: args.flags['copy-input'] === true,
    inputPath: input as string,
    formats: parseReportFormats(stringFlag(args, 'format'))
  })
}

async function reportUpdate(args: CliArgs): Promise<unknown> {
  const rootArg = args.positional[0]
  const input = requiredFlag(args, 'input')
  const period = requiredFlag(args, 'period')
  if (!rootArg) return fail(agentError('MISSING_INPUT', 'Usage: miao-viz report update <project> --input <file> --period <id>'))
  if (isAgentError(input)) return fail(input)
  if (isAgentError(period)) return fail(period)
  const periodIssue = validateRunId(period)
  if (periodIssue) return fail(periodIssue)
  const loaded = loadReportProject(rootArg)
  if (isAgentError(loaded)) return fail(loaded)
  const runRoot = join(loaded.root, 'runs', period)
  if (existsSync(runRoot)) {
    return fail(agentError('REPORT_RUN_ALREADY_EXISTS', `Run '${period}' already exists.`, { runId: period }))
  }
  const dataset = loadDataset(input, { sheet: loaded.contract.sheet })
  if (isAgentError(dataset)) return fail(dataset)
  const contractIssues = validateDataContract(dataset.value, loaded.contract)
  if (contractIssues.length) {
    return fail(agentError('REPORT_DATA_CONTRACT_MISMATCH', 'The new input does not satisfy the saved report contract.', {
      issues: contractIssues
    }))
  }
  const previous = latestContext(loaded.root)
  if (isAgentError(previous)) return fail(previous)
  const evidence = []
  for (const item of loaded.plan.queries) {
    const result = executeQueryRecipe(dataset.value.rows, item.recipe)
    if (isAgentError(result)) {
      const error = agentError('EVIDENCE_PLAN_EXECUTION_FAILED', `Evidence '${item.id}' could not be replayed.`, {
        evidenceId: item.id, cause: result
      })
      return failedRun(loaded.root, loaded.project, dataset.value, input, period, error)
    }
    evidence.push({
      id: item.id, query: `Recurring recipe: ${item.id}`, recipe: item.recipe,
      ...(result.rows.length === 1 && !item.recipe.groupBy?.length ? { values: result.rows[0] } : { rows: result.rows })
    })
  }
  const context: AnalyzeContext = { ...previous, evidence }
  const normalized = normalizeSpec(YAML.parse(loaded.spec as string))
  if (isAgentError(normalized)) return fail(normalized)
  const validation = verifySpec(normalized, dataset.value, context)
  if (isAgentError(validation)) return failedRun(loaded.root, loaded.project, dataset.value, input, period, validation)
  return createRun(loaded.root, loaded.project, dataset.value, context, validation, period, {
    copyInput: args.flags['copy-input'] === true, inputPath: input,
    formats: parseReportFormats(stringFlag(args, 'format')),
    pdfTimeout: Number(stringFlag(args, 'pdf-timeout') ?? 30_000),
    keepTemp: args.flags['keep-temp'] === true
  })
}

function reportInfo(args: CliArgs): unknown {
  const root = args.positional[0]
  if (!root) return fail(agentError('MISSING_INPUT', 'Usage: miao-viz report info <project>'))
  const loaded = loadReportProject(root)
  if (isAgentError(loaded)) return fail(loaded)
  const latest = readLatest(loaded.root)
  return { ok: true, value: {
    project: loaded.root, name: loaded.project.name, projectVersion: loaded.project.projectVersion,
    contract: { requiredFields: loaded.contract.requiredFields, sheet: loaded.contract.sheet, minimumRows: loaded.contract.minimumRows },
    evidenceCount: loaded.plan.queries.length, specHash: loaded.project.specHash, latest,
    healthIssues: latest ? [] : ['No ready run is recorded.']
  } }
}

function reportHistory(args: CliArgs): unknown {
  const root = args.positional[0]
  if (!root) return fail(agentError('MISSING_INPUT', 'Usage: miao-viz report history <project>'))
  const loaded = loadReportProject(root)
  if (isAgentError(loaded)) return fail(loaded)
  return { ok: true, value: listRuns(loaded.root).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }
}

function reportClean(args: CliArgs): unknown {
  const root = args.positional[0]
  if (!root) return fail(agentError('MISSING_INPUT', 'Usage: miao-viz report clean <project> --keep <n> [--confirm]'))
  const loaded = loadReportProject(root)
  if (isAgentError(loaded)) return fail(loaded)
  const keep = Number(stringFlag(args, 'keep') ?? '10')
  if (!Number.isInteger(keep) || keep < 0) return fail(agentError('INVALID_ARGUMENT', '--keep must be a non-negative integer.'))
  const latest = readLatest(loaded.root)?.runId
  const runs = listRuns(loaded.root).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const targets = runs.slice(keep).filter(run => run.id !== latest).map(run => {
    const path = join(loaded.root, 'runs', run.id)
    return { runId: run.id, path, bytes: directoryBytes(path) }
  })
  if (args.flags.confirm === true) targets.forEach(target => rmSync(target.path, { recursive: true }))
  return { ok: true, value: {
    dryRun: args.flags.confirm !== true, removed: args.flags.confirm === true ? targets : [],
    candidates: targets, bytes: targets.reduce((sum, target) => sum + target.bytes, 0)
  } }
}

async function createRun(
  root: string,
  project: { projectVersion: number; specHash: string; evidencePlanHash: string },
  dataset: LoadedDataset,
  context: AnalyzeContext,
  spec: AgentReportSpec,
  period: string,
  options: { copyInput: boolean; inputPath: string; formats: Array<'html' | 'pdf'>; pdfTimeout?: number; keepTemp?: boolean }
): Promise<unknown> {
  const runRoot = join(root, 'runs', period)
  mkdirSync(runRoot, { recursive: true })
  const now = new Date().toISOString()
  const inputHash = hashFile(options.inputPath)
  const manifest: RunManifest = {
    schemaVersion: 1, id: period, status: 'running',
    input: { path: resolve(options.inputPath), sha256: inputHash, ...(dataset.sheet ? { sheet: dataset.sheet } : {}) },
    projectVersion: project.projectVersion, inputHash, specHash: project.specHash,
    evidencePlanHash: project.evidencePlanHash, evidenceResultHash: hashValue(context.evidence),
    createdAt: now, updatedAt: now, artifacts: {}
  }
  atomicWriteJson(join(runRoot, 'manifest.json'), manifest)
  if (options.copyInput) {
    const copiedPath = join(runRoot, `input${basename(options.inputPath).includes('.') ? basename(options.inputPath).slice(basename(options.inputPath).lastIndexOf('.')) : ''}`)
    cpSync(options.inputPath, copiedPath)
    manifest.input.copiedPath = relative(runRoot, copiedPath)
  }
  atomicWriteJson(join(runRoot, 'context.json'), context)
  const theme = readPreferences(root).theme as Parameters<typeof renderStaticHtml>[3]
  const html = renderStaticHtml(spec, profileDataset(dataset), dataset.rows, theme, { enabled: true })
  if (options.formats.includes('html')) {
    writeOutput(join(runRoot, 'report.html'), html)
    manifest.artifacts.html = 'report.html'
  }
  if (options.formats.includes('pdf')) {
    const pdfPath = join(runRoot, 'report.pdf')
    const pdf = await exportHtmlToPdf(html, pdfPath, {
      mode: 'report', timeout: options.pdfTimeout, keepTemp: options.keepTemp
    })
    if (!pdf.ok) {
      manifest.status = 'failed'
      manifest.updatedAt = new Date().toISOString()
      manifest.error = { code: pdf.code, message: pdf.message }
      atomicWriteJson(join(runRoot, 'manifest.json'), manifest)
      return fail(pdf)
    }
    manifest.artifacts.pdf = 'report.pdf'
  }
  manifest.status = 'ready'
  manifest.updatedAt = new Date().toISOString()
  atomicWriteJson(join(runRoot, 'manifest.json'), manifest)
  atomicWriteJson(join(root, 'latest.json'), { schemaVersion: 1, runId: period, manifest: `runs/${period}/manifest.json` })
  return { ok: true, value: {
    project: root, runId: period, status: 'ready',
    artifacts: Object.fromEntries(Object.entries(manifest.artifacts).map(([key, value]) => [key, join(runRoot, value)])), warnings: []
  } }
}

function failedRun(root: string, project: { projectVersion: number; specHash: string; evidencePlanHash: string }, dataset: LoadedDataset, input: string, period: string, error: AgentError): unknown {
  const runRoot = join(root, 'runs', period)
  mkdirSync(runRoot, { recursive: true })
  const now = new Date().toISOString()
  const inputHash = hashFile(input)
  atomicWriteJson(join(runRoot, 'manifest.json'), {
    schemaVersion: 1, id: period, status: 'failed',
    input: { path: resolve(input), sha256: inputHash, ...(dataset.sheet ? { sheet: dataset.sheet } : {}) },
    projectVersion: project.projectVersion, inputHash, specHash: project.specHash,
    evidencePlanHash: project.evidencePlanHash, createdAt: now, updatedAt: now, artifacts: {},
    error: { code: error.code, message: error.message }
  })
  return fail(agentError('REPORT_UPDATE_VALIDATION_FAILED', error.message, { runId: period, cause: error }))
}

function verifySpec(spec: AgentReportSpec, dataset: LoadedDataset, context: AnalyzeContext): AgentReportSpec | AgentError {
  const resolved = resolveChartEvidence(structuredClone(spec), context)
  const result = validateReportSpec(resolved, profileDataset(dataset), ['html'], context)
  if (isAgentError(result)) return result
  const evidence = validateEvidencePaths(result.value, context)
  if (isAgentError(evidence)) return evidence
  const strict = strictVerifyError(collectVerifyIssues(result.value, context))
  if (isAgentError(strict)) return strict
  if (result.value.insights) {
    result.value.insights = result.value.insights.map(insight =>
      mapInsightText(insight, text => resolveDirectives(text, context.evidence)))
  }
  return result.value
}

function extractPlan(context: AnalyzeContext): EvidencePlan | AgentError {
  const missing = context.evidence.filter(item => !item.recipe).map(item => item.id)
  if (missing.length) return agentError('EVIDENCE_PLAN_REQUIRED', 'Recurring reports require replayable evidence queries.', {
    hint: 'Re-run data analyze with evidence recipe output enabled.', evidenceIds: missing
  })
  return evidencePlanSchema.parse({
    schemaVersion: 1, queries: context.evidence.map(item => ({ id: item.id, recipe: item.recipe }))
  })
}

function readContext(path: string): AnalyzeContext | AgentError {
  const parsed = parseAnalyzeContext(readJson<unknown>(path))
  return parsed ?? agentError('INVALID_CONTEXT', 'context.json format is invalid.', { contextPath: path })
}

function latestContext(root: string): AnalyzeContext | AgentError {
  const latest = readLatest(root)
  if (!latest) return agentError('REPORT_PROJECT_INVALID', 'Project has no ready run.')
  return readContext(join(root, 'runs', latest.runId, 'context.json'))
}

function readLatest(root: string): { runId: string; manifest?: string } | null {
  try { return JSON.parse(readFileSync(join(root, 'latest.json'), 'utf8')) } catch { return null }
}

function listRuns(root: string): RunManifest[] {
  const runsRoot = join(root, 'runs')
  if (!existsSync(runsRoot)) return []
  return readdirSync(runsRoot).map(id => readRunManifest(join(runsRoot, id, 'manifest.json'))).filter((item): item is RunManifest => Boolean(item))
}

function readPreferences(root: string): Record<string, unknown> {
  try { return JSON.parse(readFileSync(join(root, 'preferences.json'), 'utf8')) } catch { return {} }
}

function directoryBytes(path: string): number {
  return readdirSync(path, { withFileTypes: true }).reduce((sum, entry) => {
    const child = join(path, entry.name)
    return sum + (entry.isDirectory() ? directoryBytes(child) : statSync(child).size)
  }, 0)
}

function parseReportFormats(value: string | undefined): Array<'html' | 'pdf'> {
  if (!value) return ['html']
  const formats = value.split(',').map(item => item.trim()).filter((item): item is 'html' | 'pdf' => item === 'html' || item === 'pdf')
  return formats.length ? Array.from(new Set(formats)) : ['html']
}

function validateRunId(value: string): AgentError | null {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)
    ? null
    : agentError('INVALID_ARGUMENT', 'Run period must be a safe identifier without path separators.', { period: value })
}
