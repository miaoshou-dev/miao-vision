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

const DRILLDOWN_CHART_TYPES = ['bar', 'pie', 'table'] as const

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
  const chartIds = new Set<string>()
  const interactionResult = validateReportInteractions(parsed.data, profile, availableFields)
  if (isAgentError(interactionResult)) return interactionResult

  for (const chart of parsed.data.charts) {
    if (chart.id) {
      if (chartIds.has(chart.id)) {
        return agentError('DUPLICATE_CHART_ID', `Chart id '${chart.id}' is used more than once.`, {
          chartId: chart.id
        })
      }
      chartIds.add(chart.id)
    }

    const chartTypeResult = validateChartType(chart)
    if (isAgentError(chartTypeResult)) return chartTypeResult

    const encodingResult = validateRequiredEncodings(chart)
    if (isAgentError(encodingResult)) return encodingResult

    const chartInteractionResult = validateChartInteraction(chart)
    if (isAgentError(chartInteractionResult)) return chartInteractionResult

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
    if (!chart.encoding?.[encoding]?.field) {
      return agentError('MISSING_ENCODING', `Chart type '${chart.type}' requires encoding '${encoding}'.`, {
        chartType: chart.type,
        requiredEncodings: required
      })
    }
  }
  return ok(chart)
}

function validateReportInteractions(
  spec: AgentReportSpec,
  profile: DataProfile,
  availableFields: string[]
): AgentResult<AgentReportSpec> {
  for (const filter of spec.interactions?.globalFilters ?? []) {
    const column = profile.columns.find(candidate => candidate.name === filter.field)
    if (!column) {
      return agentError('INTERACTION_FIELD_NOT_FOUND', `Interactive filter field '${filter.field}' was not found in the input data.`, {
        field: filter.field,
        availableFields
      })
    }

    if (filter.type === 'range' && column.type !== 'number' && column.type !== 'date') {
      return agentError('INTERACTION_FILTER_TYPE_MISMATCH', `Range filter '${filter.field}' requires a number or date field.`, {
        field: filter.field,
        filterType: filter.type,
        columnType: column.type,
        supportedColumnTypes: ['number', 'date']
      })
    }
  }

  return ok(spec)
}

function validateChartInteraction(chart: AgentChartSpec): AgentResult<AgentChartSpec> {
  if (chart.drilldownPreset && chart.drilldownPreset !== 'category-detail') {
    return agentError('UNSUPPORTED_DRILLDOWN_PRESET', `Drilldown preset '${chart.drilldownPreset}' is not supported.`, {
      supportedPresets: ['category-detail']
    })
  }

  if (chart.drilldownPreset && !DRILLDOWN_CHART_TYPES.includes(chart.type as (typeof DRILLDOWN_CHART_TYPES)[number])) {
    return agentError('UNSUPPORTED_DRILLDOWN_CHART_TYPE', `Drilldown preset '${chart.drilldownPreset}' is not supported for chart type '${chart.type}'.`, {
      chartType: chart.type,
      supportedChartTypes: DRILLDOWN_CHART_TYPES
    })
  }

  if (chart.interaction?.select && !DRILLDOWN_CHART_TYPES.includes(chart.type as (typeof DRILLDOWN_CHART_TYPES)[number])) {
    return agentError('UNSUPPORTED_INTERACTION_CHART_TYPE', `Chart interaction select '${chart.interaction.select}' is not supported for chart type '${chart.type}'.`, {
      chartType: chart.type,
      supportedChartTypes: DRILLDOWN_CHART_TYPES
    })
  }

  return ok(chart)
}

function collectSourceFields(chart: AgentChartSpec, derivedFields: Set<string>): string[] {
  const fields = new Set<string>()

  for (const encoding of Object.values(chart.encoding ?? {})) {
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
