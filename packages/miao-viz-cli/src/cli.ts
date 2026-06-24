#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import * as YAML from 'yaml'
import { loadDataset } from './data-loader'
import { profileDataset } from './data-profiler'
import { agentError, isAgentError } from './errors'
import { renderStaticHtml } from './html-export'
import { getCatalogEntries, validateReportSpec } from './spec-validator'
import { parseOutputFormats, singleOrReportSpecSchema } from './spec-schema'
import { renderChartSvg } from './svg-renderer'
import { deckSpecSchema } from './deck-schema'
import { renderDeckHtml } from './deck-renderer'
import type { AgentError, AgentOutputFormat, AgentReportSpec, DataProfile } from './types'

interface CliArgs {
  command?: string
  positional: string[]
  flags: Record<string, string | boolean>
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

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
      printJson({ ok: true, value: { charts: getCatalogEntries() } })
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

    printJson(agentError('UNKNOWN_COMMAND', `Unknown command: ${args.command ?? '(none)'}`, {
      commands: ['profile', 'validate', 'catalog', 'render', 'deck']
    }))
    process.exitCode = 1
  } catch (error) {
    printJson(agentError('CLI_FAILED', error instanceof Error ? error.message : 'CLI failed.'))
    process.exitCode = 1
  }
}

function runProfile(args: CliArgs): unknown {
  const file = args.positional[0]
  if (!file) return fail(agentError('MISSING_INPUT', 'Usage: miao-viz profile <file> [--sheet <name>] [--limit <rows>]'))

  const dataset = loadDataset(file, {
    sheet: stringFlag(args, 'sheet'),
    limit: numberFlag(args, 'limit')
  })
  if (isAgentError(dataset)) return fail(dataset)
  return { ok: true, value: profileDataset(dataset.value) }
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
  if (isAgentError(result)) return fail(result)
  return { ok: true, value: result.value }
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

  const themeFlag = stringFlag(args, 'theme') as 'default' | 'editorial' | 'dark' | 'minimal' | undefined

  const written: string[] = []
  for (const format of formats) {
    if (format === 'html') {
      const htmlPath = formatOutputPath(output, 'html', formats.length > 1)
      writeOutput(htmlPath, renderStaticHtml(validation.value, profile, dataset.value.rows, themeFlag))
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
  const parsed = deckSpecSchema.safeParse(raw)
  if (!parsed.success) {
    return fail(agentError('INVALID_DECK_SPEC', parsed.error.issues.map(i => i.message).join('; ')))
  }

  const themeFlag = stringFlag(args, 'theme') as 'default' | 'editorial' | 'dark' | 'minimal' | undefined
  const html = renderDeckHtml(parsed.data, dataset.value.rows, themeFlag)
  writeOutput(output, html)
  return { ok: true, value: { output, slides: parsed.data.slides.length } }
}

function normalizeSpec(spec: unknown): AgentReportSpec | AgentError {
  const parsed = singleOrReportSpecSchema.safeParse(spec)
  if (!parsed.success) {
    return agentError('INVALID_SPEC', parsed.error.issues.map(issue => issue.message).join('; '))
  }
  return parsed.data
}

function parseFormats(value: string | undefined): AgentOutputFormat[] | AgentError {
  try {
    return parseOutputFormats(value)
  } catch (error) {
    return agentError('UNSUPPORTED_OUTPUT_FORMAT', error instanceof Error ? error.message : 'Unsupported output format.')
  }
}

function readSpec(file: string): unknown {
  const text = readFileSync(file, 'utf8')
  if (file.endsWith('.json')) return JSON.parse(text)
  return YAML.parse(text)
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf8')) as T
}

function readProfile(file: string): DataProfile {
  const parsed = readJson<DataProfile | { ok: true; value: DataProfile }>(file)
  if ((parsed as { ok?: unknown }).ok === true) {
    return (parsed as { value: DataProfile }).value
  }
  return parsed as DataProfile
}

function parseArgs(argv: string[]): CliArgs {
  const [command, ...rest] = argv
  const positional: string[] = []
  const flags: Record<string, string | boolean> = {}

  for (let i = 0; i < rest.length; i += 1) {
    const value = rest[i]
    if (value.startsWith('--')) {
      const key = value.slice(2)
      const next = rest[i + 1]
      if (!next || next.startsWith('--')) {
        flags[key] = true
      } else {
        flags[key] = next
        i += 1
      }
    } else {
      positional.push(value)
    }
  }

  return { command, positional, flags }
}

function requiredFlag(args: CliArgs, name: string): string | AgentError {
  const value = stringFlag(args, name)
  if (!value) return agentError('MISSING_FLAG', `Missing required flag --${name}.`)
  return value
}

function stringFlag(args: CliArgs, name: string): string | undefined {
  const value = args.flags[name]
  return typeof value === 'string' ? value : undefined
}

function numberFlag(args: CliArgs, name: string): number | undefined {
  const value = stringFlag(args, name)
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function formatOutputPath(output: string, ext: string, multiple: boolean): string {
  if (!multiple && output.endsWith(`.${ext}`)) return output
  if (multiple) return output.replace(/\.[a-z0-9]+$/i, '') + `.${ext}`
  return output
}

function writeOutput(file: string, content: string): void {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, content, 'utf8')
}

function fail(error: AgentError): AgentError {
  process.exitCode = 1
  return error
}

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}

main()
