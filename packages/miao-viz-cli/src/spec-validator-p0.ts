import { agentError, ok } from './errors'
import { getCatalogItem } from './chart-catalog'
import type { AnalyzeContext } from './context-schema'
import type { AgentChartSpec, AgentResult, DataProfile } from './types'
import { parseEvidenceRefs, resolveEvidencePath } from './directive-resolver'

const VARIANTS: Record<string, string[]> = {
  bar: ['vertical', 'horizontal', 'grouped', 'stacked', 'diverging'],
  line: ['standard'],
  area: ['standard', 'stacked'],
  dot: ['standard', 'lollipop', 'dumbbell'],
  bullet: ['standard'], range: ['standard']
}

export function validateP0ChartSpec(chart: AgentChartSpec, profile: DataProfile, context?: AnalyzeContext): AgentResult<void> {
  const supported = VARIANTS[chart.type]
  if (chart.variant && (!supported || !supported.includes(chart.variant))) {
    return agentError('UNSUPPORTED_CHART_VARIANT', `Unsupported variant '${chart.variant}' for ${chart.type}.`, { chartId: chart.id, supportedVariants: supported ?? [] })
  }
  const catalog = getCatalogItem(chart.type)
  const required = catalog?.variants?.find(variant => variant.id === (chart.variant ?? 'standard'))?.requiredEncodings ?? catalog?.requiredEncodings ?? []
  const missing = required.filter(key => !chart.encoding?.[key]?.field)
  if (missing.length > 0) return agentError('MISSING_ENCODING', `${chart.type}${chart.variant ? `.${chart.variant}` : ''} requires encoding(s): ${missing.join(', ')}.`, { chartId: chart.id, missing })

  const available = new Set(profile.columns.map(column => column.name))
  const semanticFields = [
    ...(chart.references ?? []).flatMap(reference => reference.field ? [reference.field] : []),
    ...(chart.annotations ?? []).flatMap(annotation => selectorFields(annotation.selector)),
    chart.facet?.row?.field, chart.facet?.column?.field
  ].filter((field): field is string => Boolean(field))
  const unknown = semanticFields.find(field => !available.has(field))
  if (unknown) return agentError('FIELD_NOT_FOUND', `Field '${unknown}' was not found in the input data.`, { field: unknown, availableFields: [...available] })

  for (const reference of chart.references ?? []) {
    const hasValue = reference.value !== undefined || Boolean(reference.field)
    const hasBand = reference.from !== undefined && reference.to !== undefined
    if ((reference.type === 'line' && !hasValue) || (reference.type === 'band' && !hasBand)) return agentError('INVALID_REFERENCE_SOURCE', `Reference '${reference.id ?? reference.label ?? reference.type}' has no valid source.`, { chartId: chart.id })
    if (reference.type === 'band' && typeof reference.from === 'number' && typeof reference.to === 'number' && reference.from > reference.to) return agentError('INVALID_REFERENCE_RANGE', 'Reference band requires from <= to.', { chartId: chart.id })
    if (reference.field && reference.aggregate && !reference.evidence) return agentError('INVALID_REFERENCE_SOURCE', `Data-derived reference for '${reference.field}' must bind evidence.`, { chartId: chart.id })
    if (reference.evidence && context && !context.evidence.some(item => item.id === reference.evidence)) return agentError('INVALID_REFERENCE_SOURCE', `Reference evidence '${reference.evidence}' was not found.`, { chartId: chart.id })
    for (const raw of [reference.value, reference.from, reference.to]) {
      if (typeof raw !== 'string' || !raw.startsWith('$evidence:')) continue
      const refs = parseEvidenceRefs(raw)
      const result = refs.length === 1 ? resolveEvidencePath(context?.evidence ?? [], refs[0].id, refs[0].path) : { found: false, value: undefined }
      if (!result.found || !Number.isFinite(Number(result.value))) return agentError('INVALID_REFERENCE_SOURCE', `Reference directive '${raw}' does not resolve to a number.`, { chartId: chart.id })
    }
  }
  return ok(undefined)
}

function selectorFields(selector: AgentChartSpec['annotations'] extends Array<infer T> | undefined ? T extends { selector: infer S } ? S : never : never): string[] {
  if (!selector || typeof selector !== 'object') return []
  const value = selector as Record<string, unknown>
  return ['field', 'orderBy', 'startField', 'endField'].map(key => value[key]).filter((field): field is string => typeof field === 'string')
}

export function collectP0Warnings(chart: AgentChartSpec, profile: DataProfile): string[] {
  const warnings: string[] = []
  const lineCount = (chart.references ?? []).filter(reference => reference.type === 'line').length
  const bandCount = (chart.references ?? []).filter(reference => reference.type === 'band').length
  if ((chart.references?.length ?? 0) > 4 || lineCount > 3 || bandCount > 2) warnings.push(`TOO_MANY_REFERENCES: chart '${chart.id ?? chart.type}' exceeds 3 lines, 2 bands, or 4 overlays total.`)
  if ((chart.annotations?.length ?? 0) > 5) warnings.push(`TOO_MANY_ANNOTATIONS: chart '${chart.id ?? chart.type}' renders only the 5 highest-priority annotations.`)
  const facetField = chart.facet?.row?.field ?? chart.facet?.column?.field
  if (facetField) {
    const column = profile.columns.find(item => item.name === facetField)
    if ((column?.distinctCount ?? 0) > (chart.facet?.maxPanels ?? 8)) warnings.push(`FACET_TOO_MANY_PANELS: '${facetField}' exceeds the configured panel limit.`)
    if (column?.role === 'id') warnings.push(`FACET_HIGH_CARDINALITY_FIELD: '${facetField}' is an id field and cannot produce readable facets.`)
    if (chart.facet?.scales === 'independent') warnings.push(`FACET_INDEPENDENT_SCALES_COMPARISON_RISK: independent scales prevent direct panel magnitude comparison.`)
  }
  if (chart.type === 'range') warnings.push(...collectInvalidRangeWarnings(chart, profile))
  return warnings
}

function collectInvalidRangeWarnings(chart: AgentChartSpec, profile: DataProfile): string[] {
  const lower = chart.encoding?.lower?.field; const upper = chart.encoding?.upper?.field
  if (!lower || !upper) return []
  const lowProfile = profile.columns.find(column => column.name === lower); const highProfile = profile.columns.find(column => column.name === upper)
  return lowProfile?.max !== undefined && highProfile?.min !== undefined && lowProfile.max > highProfile.min
    ? [`INVALID_REFERENCE_RANGE: '${lower}' may exceed '${upper}' for some rows; validate row-level intervals.`] : []
}
