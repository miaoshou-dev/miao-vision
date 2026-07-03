#!/usr/bin/env node

import packageJson from '../package.json'
import { agentError, isAgentError } from './errors'
import { loadDataset } from './data-loader'
import { profileDataset, profileSummary } from './data-profiler'
import { queryDataset } from './data-query'
import { renderStaticHtml } from './html-export'
import { validateReportSpec, collectValidationWarnings, validateEvidencePaths, collectVerifyWarnings, strictVerifyError } from './spec-validator'
import { parseAnalyzeContext, toCompactAnalyzeContext } from './context-schema'
import { renderChartSvg } from './svg-renderer'
import { renderDeckHtml } from './deck-renderer'
import { parseDeckSpec, validateDeckFields } from './deck-validator'
import { runArticle } from './cli-article'
import { analyzeDataset } from './analyzer'
import { generatePatchHints, collectWarningPatches } from './patch-hints'
import { printHelp } from './cli-help'
import { runCatalog, runBlock } from './cli-block'
import { runTemplate } from './cli-template'
import { runInspect } from './cli-inspect'
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
    printHelp(args.command)
    return
  }

  try {
    if (args.command === 'profile') {
      printJson(runProfile(args))
      return
    }

    if (args.command === 'validate') {
      printJson(runValidate(args))
      return
    }

    if (args.command === 'catalog') {
      printJson(runCatalog(args))
      return
    }

    if (args.command === 'block') {
      printJson(runBlock(args))
      return
    }

    if (args.command === 'template') {
      printJson(runTemplate(args))
      return
    }

    if (args.command === 'inspect') {
      printJson(runInspect(args))
      return
    }

    if (args.command === 'render') {
      printJson(runRender(args))
      return
    }

    if (args.command === 'deck') {
      printJson(runDeck(args))
      return
    }

    if (args.command === 'article') {
      printJson(await runArticle(args))
      return
    }

    if (args.command === 'query') {
      printJson(runQuery(args))
      return
    }

    if (args.command === 'analyze') {
      await runAnalyze(args)
      return
    }

    printJson(agentError('UNKNOWN_COMMAND', `Unknown command: ${args.command ?? '(none)'}`, {
      commands: ['profile', 'validate', 'catalog', 'block', 'template', 'inspect', 'render', 'deck', 'article', 'query', 'analyze']
    }))
    process.exitCode = 1
  } catch (error) {
    printJson(agentError('CLI_FAILED', error instanceof Error ? error.message : 'CLI failed.'))
    process.exitCode = 1
  }
}

function runProfile(args: CliArgs): unknown {
  const file = args.positional[0]
  if (!file) return fail(agentError('MISSING_INPUT', 'Usage: miao-viz profile <file> [--summary] [--columns col1,col2] [--reliable-only] [--sheet <name>] [--limit <rows>]'))

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

  const result = validateReportSpec(normalized, profile)
  if (isAgentError(result)) {
    if (args.flags['patch-hints'] === true) {
      return fail({ ...result, patches: generatePatchHints(result, normalized as AgentReportSpec) })
    }
    return fail(result)
  }

  // Optional context.json for catalog compliance and semantic checks (T26, T27)
  let context: AnalyzeContext | undefined
  const contextPath = stringFlag(args, 'context')
  if (contextPath) {
    const raw = readJson<unknown>(contextPath)
    const unwrapped = (raw as { ok?: unknown; value?: unknown }).ok === true
      ? (raw as { value: unknown }).value
      : raw
    const parsed = parseAnalyzeContext(unwrapped)
    if (!parsed) {
      return fail(agentError(
        'INVALID_CONTEXT',
        'context.json format is invalid.',
        { contextPath }
      ))
    }
    context = parsed
  }

  const warnings = collectValidationWarnings(result.value, profile, context)

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
    const verifyWarnings = collectVerifyWarnings(result.value, context)
    warnings.push(...verifyWarnings)
    if (args.flags['strict'] === true) {
      const strictResult = strictVerifyError(verifyWarnings)
      if (isAgentError(strictResult)) return fail(strictResult)
    }
  }

  if (args.flags['patch-hints'] === true) {
    const warningPatches = collectWarningPatches(result.value)
    if (warningPatches.length > 0) {
      return { ok: true, value: result.value, warnings, warningPatches }
    }
  }

  return { ok: true, value: result.value, warnings }
}

function runRender(args: CliArgs): unknown {
  const input = requiredFlag(args, 'input')
  const specPath = requiredFlag(args, 'spec')
  const output = requiredFlag(args, 'output')
  if (isAgentError(input)) return fail(input)
  if (isAgentError(specPath)) return fail(specPath)
  if (isAgentError(output)) return fail(output)

  const formats = parseFormats(stringFlag(args, 'format'))
  if (isAgentError(formats)) return fail(formats)

  const dataset = loadDataset(input, {
    sheet: stringFlag(args, 'sheet'),
    limit: numberFlag(args, 'limit')
  })
  if (isAgentError(dataset)) return fail(dataset)

  const profile = profileDataset(dataset.value)
  const spec = readSpec(specPath)
  const normalized = normalizeSpec(spec)
  if (isAgentError(normalized)) return fail(normalized)

  const validation = validateReportSpec(normalized, profile, formats)
  if (isAgentError(validation)) return fail(validation)

  // Resolve $evidence: directives in insights[] when --context is provided
  const contextPath = stringFlag(args, 'context')
  if (contextPath && validation.value.insights && validation.value.insights.length > 0) {
    const raw = readJson<unknown>(contextPath)
    const unwrapped = (raw as { ok?: unknown; value?: unknown }).ok === true
      ? (raw as { value: unknown }).value
      : raw
    const parsed = parseAnalyzeContext(unwrapped)
    if (parsed) {
      validation.value.insights = validation.value.insights.map(insight =>
        mapInsightText(insight, text => resolveDirectives(text, parsed.evidence))
      )
    }
  }

  const themeFlag = stringFlag(args, 'theme') as 'default' | 'editorial' | 'dark' | 'minimal' | undefined
  const interactive = args.flags['interactive'] === true
    ? true
    : args.flags['no-interactive'] === true
      ? false
      : undefined

  const written: string[] = []
  for (const format of formats) {
    if (format === 'html') {
      const htmlPath = formatOutputPath(output, 'html', formats.length > 1)
      writeOutput(htmlPath, renderStaticHtml(validation.value, profile, dataset.value.rows, themeFlag, { enabled: interactive }))
      written.push(htmlPath)
    } else if (format === 'svg') {
      const svgPath = formatOutputPath(output, 'svg', formats.length > 1)
      if (validation.value.charts.length !== 1) {
        return fail(agentError('SVG_REQUIRES_SINGLE_CHART', 'SVG output currently supports a single chart spec.'))
      }
      writeOutput(svgPath, renderChartSvg(validation.value.charts[0], dataset.value.rows))
      written.push(svgPath)
    } else {
      return fail(agentError('OUTPUT_FORMAT_NOT_IMPLEMENTED', `Output format '${format}' is not implemented yet.`, {
        implementedFormats: ['html', 'svg']
      }))
    }
  }

  return { ok: true, value: { output: written, profile } }
}

function runDeck(args: CliArgs): unknown {
  const input = requiredFlag(args, 'input')
  const specPath = requiredFlag(args, 'spec')
  const output = requiredFlag(args, 'output')
  if (isAgentError(input)) return fail(input)
  if (isAgentError(specPath)) return fail(specPath)
  if (isAgentError(output)) return fail(output)

  const dataset = loadDataset(input, {
    sheet: stringFlag(args, 'sheet'),
    limit: numberFlag(args, 'limit')
  })
  if (isAgentError(dataset)) return fail(dataset)

  const raw = readSpec(specPath)
  const parsed = parseDeckSpec(raw)
  if (isAgentError(parsed)) return fail(parsed)

  const profile = profileDataset(dataset.value)
  const validation = validateDeckFields(parsed.value, profile)
  if (isAgentError(validation)) return fail(validation)

  const themeFlag = stringFlag(args, 'theme') as 'default' | 'editorial' | 'dark' | 'minimal' | undefined
  const html = renderDeckHtml(validation.value, dataset.value.rows, themeFlag)
  writeOutput(output, html)
  return { ok: true, value: { output, slides: validation.value.slides.length } }
}

function runQuery(args: CliArgs): unknown {
  const file = args.positional[0]
  if (!file) return fail(agentError('MISSING_INPUT', 'Usage: miao-viz query <file> [--groupby cols] [--measure "fn(col) as alias"] [--filter col=val] [--orderby "col desc"] [--limit n]'))

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
    printJson(fail(agentError('MISSING_INPUT', 'Usage: miao-viz analyze <file> [--intent "..."] [--output context.json] [--extra-query "..."] [--correct-assumption "primary_measure=col"] [--sheet <name>] [--limit <n>]')))
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
