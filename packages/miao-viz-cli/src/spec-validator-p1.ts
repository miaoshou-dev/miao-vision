import { agentError, ok } from './errors'
import type { AgentChartSpec, AgentResult, DataProfile } from './types'

export function validateP1ChartSpec(chart: AgentChartSpec, profile: DataProfile): AgentResult<void> {
  if (chart.type === 'pareto') {
    const field = profile.columns.find(column => column.name === chart.encoding?.y?.field)
    if (field?.min !== undefined && field.min < 0) return agentError('PARETO_NEGATIVE_VALUE', 'Pareto requires a non-negative measure.', { chartId: chart.id, fallback: 'bar.horizontal' })
  }
  if (chart.type === 'combo-bar-line') {
    const bar = profile.columns.find(column => column.name === chart.encoding?.y?.field)
    const line = profile.columns.find(column => column.name === chart.encoding?.lineY?.field)
    if (!bar || !line) return agentError('COMBO_MISSING_MEASURE', 'Combo chart requires y and lineY measures.', { chartId: chart.id })
    const barUnit = chart.encoding?.y?.unit ?? bar.semanticTags?.find(tag => ['currency', 'percentage', 'count'].includes(tag))
    const lineUnit = chart.encoding?.lineY?.unit ?? line.semanticTags?.find(tag => ['currency', 'percentage', 'count'].includes(tag))
    if (!barUnit || !lineUnit) return agentError('COMBO_UNIT_REQUIRED', 'Combo chart requires explicit units on y and lineY when profile semantics cannot establish them.', { chartId: chart.id, fallback: ['bar', 'line'] })
    if (barUnit === lineUnit) return agentError('COMBO_SAME_UNIT', 'Combo chart requires two explicitly different units; use separate views or one chart.', { chartId: chart.id, fallback: ['bar', 'line'] })
  }
  const available = new Set([...profile.columns.map(column => column.name), ...(chart.data?.transform ?? []).flatMap(transform => [transform.as, ...(transform.measures ?? []).map(measure => measure.as)]).filter((field): field is string => Boolean(field))])
  for (const field of [chart.quality?.sampleSizeField, chart.quality?.estimatedField, chart.quality?.incompleteField].filter((value): value is string => Boolean(value))) {
    if (!available.has(field)) return agentError('QUALITY_FIELD_NOT_FOUND', `Quality encoding field '${field}' was not found.`, { chartId: chart.id, field })
  }
  if (chart.colorScale?.type === 'diverging' && (chart.colorScale.domain?.length ?? 0) > 0 && chart.colorScale.domain?.length !== 3) return agentError('INVALID_COLOR_DOMAIN', 'Diverging colorScale.domain must contain [min, center, max].', { chartId: chart.id })
  return ok(undefined)
}
