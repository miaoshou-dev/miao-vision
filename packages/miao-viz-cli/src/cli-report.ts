import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import * as YAML from 'yaml';
import type { CliArgs } from './cli-utils';
import { fail, normalizeSpec, readSpec, requiredFlag, stringFlag } from './cli-utils';
import { type AnalyzeContext } from './context-schema';
import { loadDataset } from './data-loader';
import { agentError, isAgentError } from './errors';
import { executeQueryRecipe } from './query-recipe';
import { createDataContract, validateDataContract } from './report-data-contract';
import { copyReportProfileAssets, resolveReportProfileAssets } from './report-profile-assets';
import { readReportProfile, validateReportProfileEvidence } from './report-profile-io';
import { atomicWriteJson, hashValue, loadReportProject, readRunManifest } from './report-project-storage';
import { type ReportProject } from './report-project-types';
import { createRun, failedRun } from './cli-report-run';
import { analyzeProjectFlags } from './project-analysis';
import { buildProjectPeriodBrief } from './project-period-brief';
import { updateProjectReport } from './project-report-update';
import { normalizeProjectSnapshot } from './project-snapshot';
import { directoryBytes, extractPlan, latestContext, listRuns, manifestChanges, parseReportFormats, readContext, readLatest, readProfileWarnings, validateRunId, verifySpec } from './report-lifecycle-utils';

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
  const dataset = loadDataset(input as string, { sheet: stringFlag(args, 'sheet'), projectDates: Boolean(stringFlag(args, 'project-config')) })
  if (isAgentError(dataset)) return fail(dataset)
  let context = readContext(contextPath as string)
  if (isAgentError(context)) return fail(context)
  context = analyzeProjectFlags(context, dataset.value, args)
  if (isAgentError(context)) return fail(context)
  const projectRecipe = context.evidence.find(item => item.recipe?.project)?.recipe?.project
  if (projectRecipe && !stringFlag(args, 'project-config')) return fail(agentError('PROJECT_FIELD_MAPPING_INVALID', 'Project init requires an explicit --project-config and period dates.'))
  const snapshot = projectRecipe ? normalizeProjectSnapshot(dataset.value.rows, projectRecipe.config, projectRecipe.period, dataset.value.columns) : null
  if (isAgentError(snapshot)) return fail(snapshot)
  if (snapshot && stringFlag(args, 'profile')) return fail(agentError('INVALID_ARGUMENT', 'Project report configuration provides project identity; numeric report profiles are not supported for project snapshots.'))
  const profilePath = stringFlag(args, 'profile')
  let profile = readReportProfile(profilePath)
  if (isAgentError(profile)) return fail(profile)
  let profileAssets = null
  if (profile) {
    const profileIssue = validateReportProfileEvidence(profile, context)
    if (profileIssue) return fail(profileIssue)
    profileAssets = resolveReportProfileAssets(profile, profilePath as string)
    if (isAgentError(profileAssets)) return fail(profileAssets)
    profile = profileAssets.profile
  }
  const plan = extractPlan(context)
  if (isAgentError(plan)) return fail(plan)
  const normalized = normalizeSpec(readSpec(specPath as string))
  if (isAgentError(normalized)) return fail(normalized)
  if (snapshot && !normalized.charts.some(chart => chart.id === 'project-schedule' && chart.type === 'gantt')) return fail(agentError('BLOCK_NOT_APPLICABLE', 'Project initialization requires the project-status block or project-periodic template.'))
  const validation = verifySpec(normalized, dataset.value, context)
  if (isAgentError(validation)) return fail(validation)
  const contract = createDataContract(dataset.value, context, plan)
  const project: ReportProject = snapshot ? {
    schemaVersion: 3, name: snapshot.config.name, createdAt: new Date().toISOString(), projectVersion: 1,
    specHash: hashValue(normalized), evidencePlanHash: hashValue(plan), projectConfigHash: hashValue(snapshot.config), baselineSnapshotHash: hashValue(snapshot)
  } : profile ? {
    schemaVersion: 2, name: basename(root), createdAt: new Date().toISOString(), projectVersion: 1,
    specHash: hashValue(normalized), evidencePlanHash: hashValue(plan), reportProfileHash: hashValue(profile)
  } : {
    schemaVersion: 1, name: basename(root), createdAt: new Date().toISOString(), projectVersion: 1,
    specHash: hashValue(normalized), evidencePlanHash: hashValue(plan)
  }
  const summary = {
    project: root, period, contract, evidence: plan.queries.map(query => query.id),
    hashes: {
      spec: project.specHash, evidencePlan: project.evidencePlanHash,
      ...(project.schemaVersion === 2 ? { reportProfile: project.reportProfileHash } : {})
    },
    ...(profile ? { profile: { metrics: profile.metrics.length, client: profile.client?.name ?? null } } : {}),
    risks: [
      ...context.sampleWarnings.map(warning => warning.message),
      ...(profileAssets?.warnings.map(warning => warning.message) ?? [])
    ]
  }
  if (args.flags['dry-run'] === true) return { ok: true, value: { dryRun: true, ...summary } }

  mkdirSync(root, { recursive: true })
  if (profileAssets) copyReportProfileAssets(profileAssets, root)
  atomicWriteJson(join(root, 'project.json'), project)
  atomicWriteJson(join(root, 'data-contract.json'), contract)
  atomicWriteJson(join(root, 'evidence-plan.json'), plan)
  if (profile) atomicWriteJson(join(root, 'report-profile.json'), profile)
  if (snapshot) {
    atomicWriteJson(join(root, 'project-config.json'), snapshot.config)
    atomicWriteJson(join(root, 'baseline-snapshot.json'), snapshot)
  }
  atomicWriteJson(join(root, 'preferences.json'), {
    theme: stringFlag(args, 'theme') ?? 'standard-white',
    ...(profileAssets?.warnings.length ? { profileWarnings: profileAssets.warnings } : {})
  })
  writeFileSync(join(root, 'report.yaml'), readFileSync(specPath as string, 'utf8'), 'utf8')
  return createRun(root, project, dataset.value, context, validation, period as string, {
    copyInput: args.flags['copy-input'] === true,
    inputPath: input as string,
    formats: parseReportFormats(stringFlag(args, 'format')),
    profile,
    ...(snapshot ? { projectData: { snapshot, brief: buildProjectPeriodBrief(snapshot), frozen: snapshot } } : {}),
    reviewReasons: profileAssets?.warnings ?? []
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
  if (loaded.project.schemaVersion === 3) return updateProjectReport(loaded, args, input, period)
  const dataset = loadDataset(input, { sheet: loaded.contract.sheet })
  if (isAgentError(dataset)) return fail(dataset)
  const contractIssues = validateDataContract(dataset.value, loaded.contract)
  if (contractIssues.length) {
    return fail(agentError('REPORT_DATA_CONTRACT_MISMATCH', 'The new input does not satisfy the saved report contract.', {
      issues: contractIssues,
      patches: contractIssues.flatMap(issue => issue.field && issue.candidates?.length
        ? [{ op: 'replace', path: `/fieldMappings/${issue.field}`, value: issue.candidates[0] }]
        : issue.expected.startsWith('sheet:')
          ? [{ op: 'replace', path: '/input/sheet', value: issue.expected.slice('sheet:'.length) }]
          : []),
      repairs: contractIssues.map(issue => issue.actual === 'missing'
        ? `Map '${issue.candidates?.[0] ?? 'a compatible source field'}' to required field '${issue.field ?? issue.expected}'.`
        : issue.expected.startsWith('sheet:')
          ? `Select saved ${issue.expected}.`
          : `Convert '${issue.field ?? 'input'}' from ${issue.actual} to compatible type ${issue.expected} before update.`)
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
  const currentSpecHash = hashValue(normalized)
  const currentPlanHash = hashValue(loaded.plan)
  if (currentSpecHash !== loaded.project.specHash || currentPlanHash !== loaded.project.evidencePlanHash) {
    return fail(agentError('REPORT_LINEAGE_CONTRACT_CHANGED', 'The saved report specification or evidence recipe changed after project initialization.', {
      changes: {
        spec: currentSpecHash !== loaded.project.specHash,
        evidencePlan: currentPlanHash !== loaded.project.evidencePlanHash
      },
      repairHint: 'Create a new report project version so the metric and lineage change is explicit.'
    }))
  }
  const validation = verifySpec(normalized, dataset.value, context)
  if (isAgentError(validation)) return failedRun(loaded.root, loaded.project, dataset.value, input, period, validation)
  return createRun(loaded.root, loaded.project, dataset.value, context, validation, period, {
    copyInput: args.flags['copy-input'] === true, inputPath: input,
    formats: parseReportFormats(stringFlag(args, 'format')),
    pdfTimeout: Number(stringFlag(args, 'pdf-timeout') ?? 30_000),
    keepTemp: args.flags['keep-temp'] === true,
    baseline: { runId: readLatest(loaded.root)?.runId ?? null, evidence: previous.evidence },
    profile: loaded.profile,
    reviewReasons: readProfileWarnings(loaded.preferences)
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
    latestChanges: latest ? manifestChanges(readRunManifest(join(loaded.root, 'runs', latest.runId, 'manifest.json'))) : undefined,
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
