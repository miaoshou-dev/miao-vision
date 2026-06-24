import { agentError, isAgentError, ok } from './errors'
import { MVP_CHART_TYPES, OUTPUT_FORMATS, reportSpecSchema } from './spec-schema'
import type { AgentChartSpec, AgentOutputFormat, AgentResult, AgentReportSpec, DataProfile } from './types'

const REQUIRED_ENCODINGS: Record<string, string[]> = {
  bar: ['x', 'y'],
  line: ['x', 'y'],
  area: ['x', 'y'],
  pie: ['label', 'value'],
  scatter: ['x', 'y'],
  histogram: ['x'],
  heatmap: ['x', 'y', 'value'],
  table: [],
  bigvalue: ['value']
}

export function validateReportSpec(
  spec: unknown,
  profile: DataProfile,
  formats: AgentOutputFormat[] = ['html']
): AgentResult<AgentReportSpec> {
  const parsed = reportSpecSchema.safeParse(spec)
  if (!parsed.success) {
    return agentError('INVALID_SPEC', parsed.error.issues.map(issue => issue.message).join('; '))
  }

  for (const format of formats) {
    if (!OUTPUT_FORMATS.includes(format)) {
      return agentError('UNSUPPORTED_OUTPUT_FORMAT', `Unsupported output format: ${format}`, {
        supportedFormats: OUTPUT_FORMATS
      })
    }
  }

  const availableFields = profile.columns.map(column => column.name)
  for (const chart of parsed.data.charts) {
    const chartTypeResult = validateChartType(chart)
    if (isAgentError(chartTypeResult)) return chartTypeResult

    const encodingResult = validateRequiredEncodings(chart)
    if (isAgentError(encodingResult)) return encodingResult

    const derivedFields = collectDerivedFields(chart)
    const sourceFields = collectSourceFields(chart, derivedFields)
    for (const field of sourceFields) {
      if (!availableFields.includes(field) && !derivedFields.has(field)) {
        return agentError('FIELD_NOT_FOUND', `Field '${field}' was not found in the input data.`, {
          field,
          availableFields
        })
      }
    }
  }

  return ok(parsed.data)
}

export function getCatalogEntries(): Array<{
  type: string
  requiredEncodings: string[]
  optionalEncodings: string[]
}> {
  return MVP_CHART_TYPES.map(type => ({
    type,
    requiredEncodings: REQUIRED_ENCODINGS[type] ?? [],
    optionalEncodings: ['color', 'size', 'label', 'value'].filter(encoding => {
      return !(REQUIRED_ENCODINGS[type] ?? []).includes(encoding)
    })
  }))
}

function validateChartType(chart: AgentChartSpec): AgentResult<AgentChartSpec> {
  if (!MVP_CHART_TYPES.includes(chart.type as (typeof MVP_CHART_TYPES)[number])) {
    return agentError('UNSUPPORTED_CHART_TYPE', `Chart type '${chart.type}' is not supported in the MVP.`, {
      supportedTypes: MVP_CHART_TYPES
    })
  }
  return ok(chart)
}

function validateRequiredEncodings(chart: AgentChartSpec): AgentResult<AgentChartSpec> {
  const required = REQUIRED_ENCODINGS[chart.type] ?? []
  for (const encoding of required) {
    if (!chart.encoding[encoding]?.field) {
      return agentError('MISSING_ENCODING', `Chart type '${chart.type}' requires encoding '${encoding}'.`, {
        chartType: chart.type,
        requiredEncodings: required
      })
    }
  }
  return ok(chart)
}

function collectSourceFields(chart: AgentChartSpec, derivedFields: Set<string>): string[] {
  const fields = new Set<string>()

  for (const encoding of Object.values(chart.encoding)) {
    if (encoding?.field && !derivedFields.has(encoding.field)) fields.add(encoding.field)
  }

  for (const transform of chart.data?.transform ?? []) {
    if (transform.field) fields.add(transform.field)
    for (const field of transform.groupBy ?? []) fields.add(field)
    for (const measure of transform.measures ?? []) fields.add(measure.field)
  }

  return Array.from(fields)
}

function collectDerivedFields(chart: AgentChartSpec): Set<string> {
  const fields = new Set<string>()
  for (const transform of chart.data?.transform ?? []) {
    if (transform.as) fields.add(transform.as)
    for (const measure of transform.measures ?? []) fields.add(measure.as)
  }
  return fields
}
