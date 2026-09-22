#!/usr/bin/env node
import packageJson from '../package.json'
import { agentError, isAgentError } from './errors'
import { profileDataset, profileSummary } from './data-profiler'
import { queryDataset } from './data-query'
import { validateReportSpec, collectValidationWarnings, validateEvidencePaths, collectVerifyIssues, strictVerifyError } from './spec-validator'
import { parseAnalyzeContext, toCompactAnalyzeContext } from './context-schema'
import { collectVisualDiversityIssues } from './report-diversity-audit'
import { analyzeDataset } from './analyzer'
import { generatePatchHints, collectWarningPatches } from './patch-hints'
import { printHelp } from './cli-help'
import { runCatalog, runBlock } from './cli-block'
import { runTemplate } from './cli-template'
import { runScene } from './cli-scene'
import { runSummary } from './cli-summary'
import { runSpecDiff } from './cli-spec-diff'
import { runInspect } from './cli-inspect'
import { runInteraction } from './cli-interaction'
import { runDeckCommand } from './cli-deck'
import { parseArgs, requiredFlag, stringFlag, numberFlag, writeOutput, fail, printJson, readSpec, readJson, readProfile, normalizeSpec } from './cli-utils'
import { firstInput, loadCliDataset } from './cli-dataset'
import { validateProvenance, type ProvenanceCoverage } from './provenance-validator'
import type { CliArgs } from './cli-utils'
import type { AnalyzeContext } from './context-schema'
import type { AgentReportSpec } from './types'
import { runReportCommand } from './cli-report'
import { packageTrustedArtifact } from './trusted-artifact'
import { runRenderGroup } from './cli-render'
import { runArtifactCommand } from './cli-artifact'
import { diagnoseEnvironment } from './diagnostic'
import { runReviewCommand } from './cli-review'
import { publishStageOnce, reviewPublisherFromArgs, stage } from './review/review-publisher'
import type { ReviewStage } from './review/review-events'
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  if (args.command === '--version' || args.command === '-v' || args.command === 'version') {
    process.stdout.write(`${packageJson.version}\n`)
    return
  }
  if (args.command === '--help' || args.command === '-h' || args.command === 'help' || !args.command) {
    printHelp()
    return
  }
  if (args.flags['help'] === true || args.flags['h'] === true) {
    if (args.subcommand) {
      printHelp(`${args.command}.${args.subcommand}`)
    } else {
      printHelp(args.command)
    }
    return
  }
  try {
    switch (args.command) {
      case 'data':
        return runData(args)
      case 'spec':
        return runSpec(args)
      case 'deck':
        printJson(runDeckCommand(args))
        return
      case 'render':
        return runRenderGroup(args)
      case 'report':
        printJson(await runReportCommand(args))
        return
      case 'artifact':
        printJson(runArtifactCommand(args))
        return
      case 'review':
        return runReviewCommand(args)
      case 'diagnose':
        printJson(diagnoseEnvironment({ input: stringFlag(args, 'input'), output: stringFlag(args, 'output'), host: stringFlag(args, 'host'), requirePdf: args.flags['pdf'] === true }))
        return
    }
    printJson(agentError('UNKNOWN_COMMAND', `Unknown command: ${args.command ?? '(none)'}`, {
      commands: ['data', 'spec', 'deck', 'report', 'render', 'artifact', 'review']
    }))
    process.exitCode = 1
  } catch (error) {
    printJson(agentError('CLI_FAILED', error instanceof Error ? error.message : 'CLI failed.'))
    process.exitCode = 1
  }
}
async function runData(args: CliArgs): Promise<void> {
  switch (args.subcommand) {
    case 'profile': {
      const result = runProfile(args)
      await publishStandaloneResult(args, 'profiled', result, 'Input data profiled.')
      printJson(result)
      return
    }
    case 'query':
      printJson(runQuery(args))
      return
    case 'analyze':
      return runAnalyze(args)
    default:
      printJson(fail(agentError('UNKNOWN_SUBCOMMAND',
        `Unknown data subcommand: ${args.subcommand ?? '(none)'}. Available: profile, query, analyze`,
        { subcommand: args.subcommand, available: ['profile', 'query', 'analyze'] }
      )))
  }
}
async function runSpec(args: CliArgs): Promise<void> {
  switch (args.subcommand) {
    case 'validate': {
      const result = runValidate(args)
      await publishStandaloneResult(args, 'validated', result, 'Report spec validated.')
      printJson(result)
      return
    }
    case 'catalog':
      printJson(runCatalog(args))
      return
    case 'block': {
      const result = runBlock(args)
      if (args.positional[0] === 'instantiate') await publishStandaloneResult(args, 'spec_instantiated', result, 'Report block instantiated.')
      printJson(result)
      return
    }
    case 'template': {
      const result = runTemplate(args)
      if (args.positional[0] === 'instantiate') await publishStandaloneResult(args, 'spec_instantiated', result, 'Report template instantiated.')
      printJson(result)
      return
    }
    case 'scene': {
      const result = runScene(args)
      if (args.positional[0] === 'instantiate') await publishStandaloneResult(args, 'spec_instantiated', result, 'Report scene instantiated.')
      printJson(result)
      return
    }
    case 'summary':
      printJson(runSummary(args))
      return
    case 'diff':
      printJson(runSpecDiff(args))
      return
    case 'inspect':
      printJson(runInspect(args))
      return
    case 'interaction':
      printJson(runInteraction(args))
      return
    default:
      printJson(fail(agentError('UNKNOWN_SUBCOMMAND',
        `Unknown spec subcommand: ${args.subcommand ?? '(none)'}. Available: validate, catalog, block, template, scene, summary, diff, inspect, interaction`,
        { subcommand: args.subcommand, available: ['validate', 'catalog', 'block', 'template', 'scene', 'summary', 'diff', 'inspect', 'interaction'] }
      )))
  }
}

function runProfile(args: CliArgs): unknown {
  const file = args.positional[0] ?? firstInput(args)
  if (!file) return fail(agentError('MISSING_INPUT', 'Usage: miao-viz data profile <file> [--summary] [--columns col1,col2] [--reliable-only] [--sheet <name>] [--limit <rows>]'))

  const dataset = loadCliDataset(args, file)
  if (isAgentError(dataset)) return fail(dataset)

  if (args.flags['summary'] === true) {
    return { ok: true, value: profileSummary(dataset.value) }
  }

  const columnsFlag = stringFlag(args, 'columns')
  const columns = columnsFlag ? columnsFlag.split(',').map(c => c.trim()).filter(Boolean) : undefined
  const reliableOnly = args.flags['reliable-only'] === true

  return { ok: true, value: profileDataset(dataset.value, { columns, reliableOnly }) }
}

function runValidate(args: CliArgs): unknown {
  const specPath = requiredFlag(args, 'spec')
  const profilePath = requiredFlag(args, 'profile')
  if (isAgentError(specPath)) return fail(specPath)
  if (isAgentError(profilePath)) return fail(profilePath)

  const profile = readProfile(profilePath)
  const spec = readSpec(specPath)
  const normalized = normalizeSpec(spec)
  if (isAgentError(normalized)) return fail(normalized)

  let context: AnalyzeContext | undefined
  const contextPath = stringFlag(args, 'context')
  if (contextPath) {
    const raw = readJson<unknown>(contextPath)
    const unwrapped = (raw as { ok?: unknown; value?: unknown }).ok === true ? (raw as { value: unknown }).value : raw
    const parsed = parseAnalyzeContext(unwrapped)
    if (!parsed) return fail(agentError('INVALID_CONTEXT', 'context.json format is invalid.', { contextPath }))
    context = parsed
  }

  const result = validateReportSpec(normalized, profile, ['html'], context)
  if (isAgentError(result)) {
    if (args.flags['patch-hints'] === true) {
      return fail({ ...result, patches: generatePatchHints(result, normalized as AgentReportSpec) })
    }
    return fail(result)
  }

  if (args.flags['trusted'] === true) {
    if (args.flags['strict'] !== true || args.flags['verify'] !== true || !context) {
      return fail(agentError('TRUSTED_VALIDATION_FLAGS_REQUIRED', 'Trusted validation requires --strict, --verify, and --context.', {
        requiredFlags: ['strict', 'verify', 'context']
      }))
    }
    if (!result.value.interactions?.dataPolicy) {
      return fail(agentError('INTERACTION_DATA_POLICY_REQUIRED', 'Trusted validation requires interactions.dataPolicy.', { path: 'interactions.dataPolicy' }))
    }
  }

  if (args.flags['strict'] === true && result.value.interactions?.dataPolicy) {
    const trust = packageTrustedArtifact(result.value, profile, [], { context })
    const restricted = trust.shareSafety.checks.flatMap(check => check.issues).filter(issue => issue.severity === 'error')
    if (restricted.length) {
      const first = restricted[0]
      return fail(agentError(first.code, first.message, { path: first.path, issues: restricted }))
    }
  }

  const warnings = collectValidationWarnings(result.value, profile, context)
  const visualDiversityIssues = collectVisualDiversityIssues(result.value, context)

  // --strict: blockedChart violations become hard errors (T26)
  if (args.flags['strict'] === true && context) {
    for (const chart of result.value.charts) {
      const blocked = context.catalog.blockedCharts.find(b => b.type === chart.type)
      if (blocked) {
        const err = agentError(
          'BLOCKED_CHART_STRICT',
          `Strict mode: chart '${chart.id ?? chart.type}' uses blocked type '${chart.type}' (${blocked.reason})`,
          { chartId: chart.id ?? chart.type, chartType: chart.type, reason: blocked.reason }
        )
        if (args.flags['patch-hints'] === true) {
          return fail({ ...err, patches: generatePatchHints(err, result.value, context.catalog.charts) })
        }
        return fail(err)
      }
    }
  }

  // T38: $evidence path validation — hard fail when --context is provided
  if (context) {
    const evResult = validateEvidencePaths(result.value, context)
    if (isAgentError(evResult)) {
      const err = evResult
      if (args.flags['patch-hints'] === true) {
        return fail({ ...err, patches: generatePatchHints(err, result.value) })
      }
      return fail(err)
    }
  }

  let coverage: ProvenanceCoverage | undefined
  if (args.flags['verify'] === true) {
    const provenance = context ? validateProvenance(result.value, context) : undefined
    coverage = provenance?.coverage
    const verifyIssues = [...collectVerifyIssues(result.value, context), ...(provenance?.issues ?? [])]
    const verifyWarnings = verifyIssues.map(issue => issue.message)
    warnings.push(...verifyWarnings)
    if (args.flags['strict'] === true) {
      const strictResult = strictVerifyError(verifyIssues)
      if (isAgentError(strictResult)) {
        if (args.flags['patch-hints'] === true) {
          return fail({ ...strictResult, patches: generatePatchHints(strictResult, result.value) })
        }
        return fail(strictResult)
      }
    }
  }

  if (args.flags['patch-hints'] === true) {
    const warningPatches = collectWarningPatches(result.value)
    if (warningPatches.length > 0) {
      return { ok: true, value: result.value, warnings, visualDiversityIssues, coverage, warningPatches }
    }
  }

  return { ok: true, value: result.value, warnings, visualDiversityIssues, coverage }
}

function runQuery(args: CliArgs): unknown {
  const file = args.positional[0] ?? firstInput(args)
  if (!file) return fail(agentError('MISSING_INPUT', 'Usage: miao-viz data query <file> [--groupby cols] [--measure "fn(col) as alias"] [--filter col=val] [--orderby "col desc"] [--limit n]'))

  const dataset = loadCliDataset(args, file, false)
  if (isAgentError(dataset)) return fail(dataset)

  const result = queryDataset(dataset.value.rows, {
    groupby: stringFlag(args, 'groupby'),
    measure: stringFlag(args, 'measure'),
    filter: stringFlag(args, 'filter'),
    orderby: stringFlag(args, 'orderby'),
    limit: numberFlag(args, 'limit')
  })
  if (isAgentError(result)) return fail(result)
  return { ok: true, value: result }
}

async function runAnalyze(args: CliArgs): Promise<void> {
  const file = args.positional[0] ?? firstInput(args)
  if (!file) {
    const result = fail(agentError('MISSING_INPUT', 'Usage: miao-viz data analyze <file> [--intent "..."] [--output context.json] [--extra-query "..."] [--correct-assumption "primary_measure=col"] [--sheet <name>] [--limit <n>]'))
    await publishStandaloneResult(args, 'analyzed', result, 'Analyze context created.')
    printJson(result)
    return
  }

  const dataset = loadCliDataset(args, file)
  if (isAgentError(dataset)) {
    const result = fail(dataset)
    await publishStandaloneResult(args, 'analyzed', result, 'Analyze context created.')
    printJson(result)
    return
  }

  const context = analyzeDataset(dataset.value, {
    intent: stringFlag(args, 'intent'),
    extraQuery: stringFlag(args, 'extra-query'),
    correctAssumption: stringFlag(args, 'correct-assumption')
  })

  const value = args.flags['compact'] === true ? toCompactAnalyzeContext(context) : context
  const result = { ok: true, value }
  await publishStandaloneResult(args, 'analyzed', result, 'Analyze context created.')
  const outputPath = stringFlag(args, 'output')
  if (outputPath) {
    writeOutput(outputPath, `${JSON.stringify(result, null, 2)}\n`)
    process.stdout.write(`${JSON.stringify({ ok: true, value: { output: outputPath } }, null, 2)}\n`)
  } else {
    printJson(result)
  }
}

async function publishStandaloneResult(args: CliArgs, reviewStage: ReviewStage, result: unknown, successMessage: string): Promise<void> {
  const publisher = reviewPublisherFromArgs(args, 'report', 'report workflow')
  if (!publisher) return
  await publishStageOnce(publisher, stage('input_resolved', 'completed', 'Input and review options resolved.'))
  const record = result && typeof result === 'object' ? result as { ok?: unknown; code?: unknown; message?: unknown } : undefined
  if (record?.ok === true) {
    await publishStageOnce(publisher, stage(reviewStage, 'completed', successMessage))
    return
  }
  const code = typeof record?.code === 'string' ? record.code : 'COMMAND_FAILED'
  const message = typeof record?.message === 'string' ? record.message : `${reviewStage} command failed.`
  await publisher.publish(stage(reviewStage, 'failed', message, code))
  await publisher.publish({ type: 'run.issue', severity: 'error', code, message })
}

main()
