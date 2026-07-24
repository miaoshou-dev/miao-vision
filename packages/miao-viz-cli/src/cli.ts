#!/usr/bin/env node

import packageJson from '../package.json'
import { agentError, isAgentError } from './errors'
import { loadDataset } from './data-loader'
import { profileDataset, profileSummary } from './data-profiler'
import { queryDataset } from './data-query'
import { renderStaticHtml } from './html-export'
import { validateReportSpec, collectValidationWarnings, validateEvidencePaths, collectVerifyIssues, strictVerifyError } from './spec-validator'
import { parseAnalyzeContext, toCompactAnalyzeContext } from './context-schema'
import { renderChartSvg } from './svg-renderer'
import { collectArtifactSizeWarnings } from './artifact-budget'
import { resolveChartEvidence } from './chart-evidence'
import { collectVisualDiversityIssues } from './report-diversity-audit'
import { runArticle } from './cli-article'
import { analyzeDataset } from './analyzer'
import { generatePatchHints, collectWarningPatches } from './patch-hints'
import { printHelp } from './cli-help'
import { runCatalog, runBlock } from './cli-block'
import { runTemplate } from './cli-template'
import { runInspect } from './cli-inspect'
import { runDeckCommand, runDeckRender } from './cli-deck'
import {
  parseArgs, requiredFlag, stringFlag, numberFlag,
  formatOutputPath, writeOutput, fail, printJson,
  readSpec, readJson, readProfile, normalizeSpec, parseFormats
} from './cli-utils'
import { resolveDirectives } from './directive-resolver'
import { mapInsightText } from './insight-utils'
import type { CliArgs } from './cli-utils'
import type { AnalyzeContext } from './context-schema'
import type { AgentReportSpec } from './types'
import { runReportCommand } from './cli-report'
import { exportHtmlToPdf } from './pdf-export'
import { join } from 'node:path'

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
    }

    printJson(agentError('UNKNOWN_COMMAND', `Unknown command: ${args.command ?? '(none)'}`, {
      commands: ['data', 'spec', 'deck', 'report', 'render']
    }))
    process.exitCode = 1
  } catch (error) {
    printJson(agentError('CLI_FAILED', error instanceof Error ? error.message : 'CLI failed.'))
    process.exitCode = 1
  }
}

function runData(args: CliArgs): void | Promise<void> {
  switch (args.subcommand) {
    case 'profile':
      printJson(runProfile(args))
      return
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

function runSpec(args: CliArgs): void {
  switch (args.subcommand) {
    case 'validate':
      printJson(runValidate(args))
      return
    case 'catalog':
      printJson(runCatalog(args))
      return
    case 'block':
      printJson(runBlock(args))
      return
    case 'template':
      printJson(runTemplate(args))
      return
    case 'inspect':
      printJson(runInspect(args))
      return
    default:
      printJson(fail(agentError('UNKNOWN_SUBCOMMAND',
        `Unknown spec subcommand: ${args.subcommand ?? '(none)'}. Available: validate, catalog, block, template, inspect`,
        { subcommand: args.subcommand, available: ['validate', 'catalog', 'block', 'template', 'inspect'] }
      )))
  }
}

async function runRenderGroup(args: CliArgs): Promise<void> {
  switch (args.subcommand) {
    case 'report':
      printJson(await runRender(args))
      return
    case 'deck':
      printJson(await runDeckRender(args))
      return
    case 'article':
      printJson(await runArticle(args))
      return
    default:
      printJson(fail(agentError('UNKNOWN_SUBCOMMAND',
        `Unknown render subcommand: ${args.subcommand ?? '(none)'}. Available: report, deck, article`,
        { subcommand: args.subcommand, available: ['report', 'deck', 'article'] }
      )))
  }
}

function runProfile(args: CliArgs): unknown {
  const file = args.positional[0]
  if (!file) return fail(agentError('MISSING_INPUT', 'Usage: miao-viz data profile <file> [--summary] [--columns col1,col2] [--reliable-only] [--sheet <name>] [--limit <rows>]'))

  const dataset = loadDataset(file, {
    sheet: stringFlag(args, 'sheet'),
    limit: numberFlag(args, 'limit')
  })
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

  if (args.flags['verify'] === true) {
    const verifyIssues = collectVerifyIssues(result.value, context)
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
      return { ok: true, value: result.value, warnings, visualDiversityIssues, warningPatches }
    }
  }

  return { ok: true, value: result.value, warnings, visualDiversityIssues }
}

async function runRender(args: CliArgs): Promise<unknown> {
  const input = requiredFlag(args, 'input')
  const specPath = requiredFlag(args, 'spec')
  if (isAgentError(input)) return fail(input)
  if (isAgentError(specPath)) return fail(specPath)

  const formats = parseFormats(stringFlag(args, 'format'))
  if (isAgentError(formats)) return fail(formats)
  const outputDir = stringFlag(args, 'output-dir')
  const output = stringFlag(args, 'output')
  if (formats.length > 1 && !outputDir) return fail(agentError('MISSING_FLAG', 'Multiple formats require --output-dir <directory>.'))
  if (formats.length === 1 && !output) return fail(agentError('MISSING_FLAG', 'Missing required flag --output.'))

  const dataset = loadDataset(input, {
    sheet: stringFlag(args, 'sheet'),
    limit: numberFlag(args, 'limit')
  })
  if (isAgentError(dataset)) return fail(dataset)

  const profile = profileDataset(dataset.value)
  const spec = readSpec(specPath)
  const normalized = normalizeSpec(spec)
  if (isAgentError(normalized)) return fail(normalized)

  const contextPath = stringFlag(args, 'context')
  let renderContext: ReturnType<typeof parseAnalyzeContext> = null
  if (contextPath) {
    const raw = readJson<unknown>(contextPath)
    const unwrapped = (raw as { ok?: unknown; value?: unknown }).ok === true ? (raw as { value: unknown }).value : raw
    renderContext = parseAnalyzeContext(unwrapped)
    if (!renderContext) return fail(agentError('INVALID_CONTEXT', 'context.json format is invalid.', { contextPath }))
  }

  const resolvedSpec = renderContext ? resolveChartEvidence(normalized, renderContext) : normalized
  const validation = validateReportSpec(resolvedSpec, profile, formats, renderContext ?? undefined)
  if (isAgentError(validation)) return fail(validation)

  // Resolve $evidence: directives in insights[] when --context is provided
  if (renderContext && validation.value.insights && validation.value.insights.length > 0) {
      validation.value.insights = validation.value.insights.map(insight =>
        mapInsightText(insight, text => resolveDirectives(text, renderContext!.evidence))
      )
  }

  const themeFlag = stringFlag(args, 'theme') as 'standard-white' | 'magazine' | 'standard-dark' | 'minimal' | 'nyt' | 'bloomberg' | 'tableau' | undefined
  // HTML reports are interactive by default. Keep --interactive as a
  // backwards-compatible explicit opt-in and --no-interactive as the opt-out.
  const interactive = args.flags['no-interactive'] !== true

  const written: string[] = []
  const warnings: string[] = []
  const html = renderStaticHtml(validation.value, profile, dataset.value.rows, themeFlag, { enabled: interactive })
  for (const format of formats) {
    if (format === 'html') {
      const htmlPath = outputDir ? join(outputDir, 'report.html') : formatOutputPath(output!, 'html', false)
      warnings.push(...collectArtifactSizeWarnings(html, interactive))
      writeOutput(htmlPath, html)
      written.push(htmlPath)
    } else if (format === 'pdf') {
      const pdfPath = outputDir ? join(outputDir, 'report.pdf') : formatOutputPath(output!, 'pdf', false)
      const result = await exportHtmlToPdf(html, pdfPath, {
        mode: 'report',
        pageSize: stringFlag(args, 'page-size') as 'A4' | 'Letter' | undefined,
        orientation: stringFlag(args, 'orientation') as 'portrait' | 'landscape' | undefined,
        margin: stringFlag(args, 'margin'),
        timeout: numberFlag(args, 'pdf-timeout'),
        keepTemp: args.flags['keep-temp'] === true
      })
      if (!result.ok) return fail(result)
      written.push(pdfPath)
      warnings.push(...result.value.warnings.map(issue => issue.message))
    } else if (format === 'svg') {
      const svgPath = outputDir ? join(outputDir, 'report.svg') : formatOutputPath(output!, 'svg', false)
      if (validation.value.charts.length !== 1) {
        return fail(agentError('SVG_REQUIRES_SINGLE_CHART', 'SVG output currently supports a single chart spec.'))
      }
      writeOutput(svgPath, renderChartSvg(validation.value.charts[0], dataset.value.rows))
      written.push(svgPath)
    } else {
      return fail(agentError('OUTPUT_FORMAT_NOT_IMPLEMENTED', `Output format '${format}' is not implemented yet.`, {
        implementedFormats: ['html', 'svg', 'pdf']
      }))
    }
  }

  return { ok: true, value: { output: written, profile, interactive: formats.includes('html') ? interactive : false }, ...(warnings.length ? { warnings } : {}) }
}

function runQuery(args: CliArgs): unknown {
  const file = args.positional[0]
  if (!file) return fail(agentError('MISSING_INPUT', 'Usage: miao-viz data query <file> [--groupby cols] [--measure "fn(col) as alias"] [--filter col=val] [--orderby "col desc"] [--limit n]'))

  const dataset = loadDataset(file, { sheet: stringFlag(args, 'sheet') })
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
  const file = args.positional[0]
  if (!file) {
    printJson(fail(agentError('MISSING_INPUT', 'Usage: miao-viz data analyze <file> [--intent "..."] [--output context.json] [--extra-query "..."] [--correct-assumption "primary_measure=col"] [--sheet <name>] [--limit <n>]')))
    return
  }

  const dataset = loadDataset(file, {
    sheet: stringFlag(args, 'sheet'),
    limit: numberFlag(args, 'limit')
  })
  if (isAgentError(dataset)) { printJson(fail(dataset)); return }

  const context = analyzeDataset(dataset.value, {
    intent: stringFlag(args, 'intent'),
    extraQuery: stringFlag(args, 'extra-query'),
    correctAssumption: stringFlag(args, 'correct-assumption')
  })

  const value = args.flags['compact'] === true ? toCompactAnalyzeContext(context) : context
  const result = { ok: true, value }
  const outputPath = stringFlag(args, 'output')
  if (outputPath) {
    writeOutput(outputPath, `${JSON.stringify(result, null, 2)}\n`)
    process.stdout.write(`${JSON.stringify({ ok: true, value: { output: outputPath } }, null, 2)}\n`)
  } else {
    printJson(result)
  }
}

main()
