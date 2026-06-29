import { agentError, isAgentError } from './errors'
import { loadDataset } from './data-loader'
import { profileDataset } from './data-profiler'
import { normalizeSpec, fail, readJson, readSpec, requiredFlag, writeOutput } from './cli-utils'
import { parseAnalyzeContext } from './context-schema'
import { inspectChartTransforms } from './data-transform'
import { normalizeInsights } from './insight-utils'
import { parseEvidenceRefs } from './directive-resolver'
import type { CliArgs } from './cli-utils'

export function runInspect(args: CliArgs): unknown {
  const input = requiredFlag(args, 'input')
  const specPath = requiredFlag(args, 'spec')
  const contextPath = requiredFlag(args, 'context')
  const output = requiredFlag(args, 'output')
  if (isAgentError(input)) return fail(input)
  if (isAgentError(specPath)) return fail(specPath)
  if (isAgentError(contextPath)) return fail(contextPath)
  if (isAgentError(output)) return fail(output)

  const dataset = loadDataset(input)
  if (isAgentError(dataset)) return fail(dataset)

  const spec = normalizeSpec(readSpec(specPath))
  if (isAgentError(spec)) return fail(spec)

  const context = parseAnalyzeContext(readJson<unknown>(contextPath))
  if (!context) return fail(agentError('INVALID_CONTEXT', 'context.json format is invalid.', { contextPath }))

  const profile = profileDataset(dataset.value)
  const charts = spec.charts.map((chart, index) => {
    const inspected = inspectChartTransforms(dataset.value.rows, chart)
    return {
      id: chart.id ?? `chart-${index + 1}`,
      type: chart.type,
      transforms: inspected.transforms,
      encoding: Object.fromEntries(Object.entries(chart.encoding ?? {}).map(([channel, enc]) => {
        const field = enc?.field
        const profileField = field ? profile.columns.find(c => c.name === field) : undefined
        const finalMatch = field ? inspected.rows.some(row => Object.prototype.hasOwnProperty.call(row, field)) : false
        const sourceFieldMatch = Boolean(profileField)
        return [channel, {
          field,
          specType: enc?.type,
          resolvedType: profileField?.type ?? (finalMatch ? inferFinalFieldType(inspected.rows, field) : undefined),
          sourceFieldMatch,
          finalRowsMatch: finalMatch,
          match: sourceFieldMatch || finalMatch,
        }]
      }))
    }
  })

  function inferFinalFieldType(rows: Record<string, unknown>[], field: string | undefined): string | undefined {
    if (!field) return undefined
    const values = rows.map(row => row[field]).filter(value => value !== null && value !== undefined)
    if (values.length === 0) return undefined
    if (values.every(value => typeof value === 'number')) return 'number'
    if (values.every(value => typeof value === 'boolean')) return 'boolean'
    if (values.every(value => value instanceof Date)) return 'date'
    return 'string'
  }

  const referenced = new Set<string>()
  for (const insight of normalizeInsights(spec.insights)) {
    for (const id of insight.evidence) referenced.add(id)
    for (const ref of parseEvidenceRefs(insight.text)) referenced.add(ref.id)
  }
  for (const chart of spec.charts) {
    if (!chart.title) continue
    for (const ref of parseEvidenceRefs(chart.title)) referenced.add(ref.id)
  }

  const defined = context.evidence.map(e => e.id)
  const result = {
    ok: true,
    value: {
      charts,
      evidence: {
        defined,
        referenced: [...referenced],
        unreferenced: defined.filter(id => !referenced.has(id))
      }
    }
  }
  writeOutput(output, `${JSON.stringify(result.value, null, 2)}\n`)
  return result
}
