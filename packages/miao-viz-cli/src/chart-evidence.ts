import { parseEvidenceRefs, resolveEvidencePath } from './directive-resolver'
import type { AnalyzeContext } from './context-schema'
import type { AgentReferenceLayer, AgentReportSpec } from './types'

function resolveValue(value: number | string | undefined, context: AnalyzeContext): number | string | undefined {
  if (typeof value !== 'string') return value
  const refs = parseEvidenceRefs(value)
  if (refs.length !== 1 || refs[0].raw !== value) return value
  const result = resolveEvidencePath(context.evidence, refs[0].id, refs[0].path)
  return result.found && (typeof result.value === 'number' || typeof result.value === 'string') ? result.value : value
}

function resolveReference(reference: AgentReferenceLayer, context: AnalyzeContext): AgentReferenceLayer {
  return { ...reference, value: resolveValue(reference.value, context), from: resolveValue(reference.from, context), to: resolveValue(reference.to, context) }
}

export function resolveChartEvidence(spec: AgentReportSpec, context: AnalyzeContext): AgentReportSpec {
  return { ...spec, charts: spec.charts.map(chart => ({ ...chart, references: chart.references?.map(reference => resolveReference(reference, context)) })) }
}
