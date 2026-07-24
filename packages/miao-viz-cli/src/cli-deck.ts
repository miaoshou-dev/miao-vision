import { agentError, isAgentError } from './errors'
import { parseAnalyzeContext } from './context-schema'
import { collectDeckKnowledgeIssues, deckKnowledgeErrors } from './deck-knowledge-validator'
import { parseDeckSpec, validateDeckFields } from './deck-validator'
import { renderDeckHtml } from './deck-renderer'
import { loadDataset } from './data-loader'
import { profileDataset } from './data-profiler'
import { fail, readJson, readSpec, requiredFlag, stringFlag, writeOutput } from './cli-utils'
import type { CliArgs } from './cli-utils'
import { instantiateDeck } from './deck-knowledge-registry'
import * as YAML from 'yaml'
import { exportHtmlToPdf } from './pdf-export'

export function runDeckCommand(args: CliArgs): unknown {
  if (args.subcommand === 'instantiate') return runDeckInstantiate(args)
  if (args.subcommand !== 'validate') {
    return fail(agentError(
      'UNKNOWN_SUBCOMMAND',
      `Unknown deck subcommand: ${args.subcommand ?? '(none)'}. Available: instantiate, validate`,
      { subcommand: args.subcommand, available: ['instantiate', 'validate'] }
    ))
  }

  const specPath = requiredFlag(args, 'spec')
  const contextPath = requiredFlag(args, 'context')
  if (isAgentError(specPath)) return fail(specPath)
  if (isAgentError(contextPath)) return fail(contextPath)

  const parsedSpec = parseDeckSpec(readSpec(specPath))
  if (isAgentError(parsedSpec)) return fail(parsedSpec)

  const context = parseAnalyzeContext(readJson<unknown>(contextPath))
  if (!context) {
    return fail(agentError('INVALID_CONTEXT', 'context.json format is invalid.', { contextPath }))
  }

  const issues = collectDeckKnowledgeIssues(parsedSpec.value, context, args.flags.strict === true)
  const errors = deckKnowledgeErrors(issues)
  if (errors.length > 0) {
    const first = errors[0]
    return fail(agentError(first.code, first.message, { path: first.path, hint: first.hint, issues }))
  }

  return {
    ok: true,
    value: {
      spec: parsedSpec.value,
      warnings: issues.filter(item => item.severity === 'warning').map(item => item.message),
      issues
    }
  }
}

function runDeckInstantiate(args: CliArgs): unknown {
  const intent = args.positional[0]
  if (intent !== 'executive-brief' && intent !== 'business-review') {
    return fail(agentError('INVALID_DECK_INTENT', "Deck intent must be 'executive-brief' or 'business-review'.", { intent }))
  }
  const contextPath = requiredFlag(args, 'context')
  if (isAgentError(contextPath)) return fail(contextPath)
  const context = parseAnalyzeContext(readJson<unknown>(contextPath))
  if (!context) return fail(agentError('INVALID_CONTEXT', 'context.json format is invalid.', { contextPath }))
  const spec = instantiateDeck(intent, context)
  const output = stringFlag(args, 'output')
  if (output) writeOutput(output, YAML.stringify(spec))
  return { ok: true, value: { spec, ...(output ? { output } : {}) } }
}

export async function runDeckRender(args: CliArgs): Promise<unknown> {
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

  const parsed = parseDeckSpec(readSpec(specPath))
  if (isAgentError(parsed)) return fail(parsed)

  const validation = validateDeckFields(parsed.value, profileDataset(dataset.value))
  if (isAgentError(validation)) return fail(validation)

  const contextPath = stringFlag(args, 'context')
  if (args.flags.strict === true && !contextPath) {
    return fail(agentError(
      'DECK_CONTEXT_REQUIRED',
      'Strict deck validation requires --context <context.json>.',
      { hint: 'Run data analyze and pass its context.json output to render deck.' }
    ))
  }

  let knowledgeIssues: ReturnType<typeof collectDeckKnowledgeIssues> = []
  if (contextPath) {
    const context = parseAnalyzeContext(readJson<unknown>(contextPath))
    if (!context) return fail(agentError('INVALID_CONTEXT', 'context.json format is invalid.', { contextPath }))
    knowledgeIssues = collectDeckKnowledgeIssues(validation.value, context, args.flags.strict === true)
    const errors = deckKnowledgeErrors(knowledgeIssues)
    if (errors.length > 0) {
      const first = errors[0]
      return fail(agentError(first.code, first.message, {
        path: first.path,
        hint: first.hint,
        issues: knowledgeIssues
      }))
    }
  }

  const theme = stringFlag(args, 'theme') as Parameters<typeof renderDeckHtml>[2]
  const html = renderDeckHtml(validation.value, dataset.value.rows, theme)
  const format = stringFlag(args, 'format') ?? 'html'
  if (format !== 'html' && format !== 'pdf') {
    return fail(agentError('UNSUPPORTED_OUTPUT_FORMAT', "Deck format must be 'html' or 'pdf'.", { format }))
  }
  if (format === 'pdf') {
    const exported = await exportHtmlToPdf(html, output, {
      mode: 'deck',
      timeout: numberFlag(args, 'pdf-timeout'),
      keepTemp: args.flags['keep-temp'] === true
    })
    if (!exported.ok) return fail(exported)
  } else {
    writeOutput(output, html)
  }
  return {
    ok: true,
    value: {
      output,
      slides: validation.value.slides.length,
      warnings: knowledgeIssues.filter(item => item.severity === 'warning').map(item => item.message),
      issues: knowledgeIssues,
      ...(!contextPath ? {
        skippedChecks: ['claim grounding', 'evidence paths', 'caveat coverage']
      } : {})
    }
  }
}

function numberFlag(args: CliArgs, name: string): number | undefined {
  const value = stringFlag(args, name)
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}
