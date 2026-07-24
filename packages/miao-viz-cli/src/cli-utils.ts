import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import * as YAML from 'yaml'
import { agentError } from './errors'
import { parseOutputFormats, singleOrReportSpecSchema } from './spec-schema'
import type { AgentError, AgentOutputFormat, AgentReportSpec, DataProfile } from './types'

const GROUPS = new Set(['data', 'spec', 'deck', 'report', 'render'])

const GROUP_SUBCOMMANDS: Record<string, Set<string>> = {
  data:   new Set(['profile', 'query', 'analyze']),
  spec:   new Set(['validate', 'catalog', 'block', 'template', 'inspect']),
  deck:   new Set(['validate', 'instantiate']),
  report: new Set(['init', 'update', 'info', 'history', 'clean']),
  render: new Set(['report', 'deck', 'article']),
}

export interface CliArgs {
  command?: string
  subcommand?: string
  positional: string[]
  flags: Record<string, string | boolean>
}

export const BOOLEAN_FLAGS = new Set([
  'h', 'help', 'summary', 'reliable-only', 'interactive', 'no-interactive',
  'strict', 'patch-hints', 'verify', 'for-llm', 'compact', 'verbose'
  ,'dry-run', 'confirm', 'copy-input', 'keep-temp'
])

function parseRest(args: string[]): { positional: string[]; flags: Record<string, string | boolean> } {
  const positional: string[] = []
  const flags: Record<string, string | boolean> = {}

  for (let i = 0; i < args.length; i += 1) {
    const value = args[i]
    if (value.startsWith('--')) {
      const key = value.slice(2)
      if (BOOLEAN_FLAGS.has(key)) {
        flags[key] = true
        continue
      }
      const next = args[i + 1]
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

  return { positional, flags }
}

export function parseArgs(argv: string[]): CliArgs {
  const [first, ...rest] = argv

  if (first && GROUPS.has(first)) {
    const subcommands = GROUP_SUBCOMMANDS[first]
    const second = rest[0]
    if (second && subcommands?.has(second)) {
      const { positional, flags } = parseRest(rest.slice(1))
      return { command: first, subcommand: second, positional, flags }
    }
    const { positional, flags } = parseRest(rest)
    return { command: first, subcommand: positional[0], positional: positional.slice(1), flags }
  }

  const { positional, flags } = parseRest(rest)
  return { command: first, positional, flags }
}

export function requiredFlag(args: CliArgs, name: string): string | AgentError {
  const value = stringFlag(args, name)
  if (!value) return agentError('MISSING_FLAG', `Missing required flag --${name}.`)
  return value
}

export function stringFlag(args: CliArgs, name: string): string | undefined {
  const value = args.flags[name]
  return typeof value === 'string' ? value : undefined
}

export function numberFlag(args: CliArgs, name: string): number | undefined {
  const value = stringFlag(args, name)
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function formatOutputPath(output: string, ext: string, multiple: boolean): string {
  if (!multiple && output.endsWith(`.${ext}`)) return output
  if (multiple) return output.replace(/\.[a-z0-9]+$/i, '') + `.${ext}`
  return output
}

export function writeOutput(file: string, content: string): void {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, content, 'utf8')
}

export function fail(error: AgentError): AgentError {
  process.exitCode = 1
  return error
}

export function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}

export function readSpec(file: string): unknown {
  const text = readFileSync(file, 'utf8')
  if (file.endsWith('.json')) return JSON.parse(text)
  return YAML.parse(text)
}

export function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf8')) as T
}

export function readProfile(file: string): DataProfile {
  const parsed = readJson<DataProfile | { ok: true; value: DataProfile }>(file)
  if ((parsed as { ok?: unknown }).ok === true) {
    return (parsed as { value: DataProfile }).value
  }
  return parsed as DataProfile
}

export function normalizeSpec(spec: unknown): AgentReportSpec | AgentError {
  const parsed = singleOrReportSpecSchema.safeParse(spec)
  if (!parsed.success) {
    return agentError('INVALID_SPEC', parsed.error.issues.map(issue => issue.message).join('; '))
  }
  return parsed.data
}

export function parseFormats(value: string | undefined): AgentOutputFormat[] | AgentError {
  try {
    return parseOutputFormats(value)
  } catch (error) {
    return agentError('UNSUPPORTED_OUTPUT_FORMAT', error instanceof Error ? error.message : 'Unsupported output format.')
  }
}
