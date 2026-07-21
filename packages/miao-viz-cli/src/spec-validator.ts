import { agentError, isAgentError, ok } from './errors'
import { MVP_CHART_TYPES, OUTPUT_FORMATS, reportSpecSchema } from './spec-schema'
import { parseEvidenceRefs, resolveEvidencePath } from './directive-resolver'
import { getCatalogItem } from './chart-catalog'
import { countChartsByType } from './spec-utils'
import { normalizeInsights } from './insight-utils'
import { collectChartSemanticWarnings } from './spec-validator-intelligence'
import { VALIDATOR_ERROR_CODES } from './error-codes'
import { interactionCapabilities } from './interaction-capabilities'
import type { AnalyzeContext } from './context-schema'
import type { AgentChartSpec, AgentDataTransform, AgentOutputFormat, AgentResult, AgentReportSpec, DataProfile } from './types'

export { collectVerifyIssues, collectVerifyWarnings, strictVerifyError, type VerifyIssue } from './spec-validator-intelligence'

const DRILLDOWN_CHART_TYPES = ['bar', 'pie', 'table'] as const

export function validateReportSpec(
  spec: unknown,
  profile: DataProfile,
  formats: AgentOutputFormat[] = ['html'],
  context?: AnalyzeContext
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

    const transformResult = validateTransforms(chart)
    if (isAgentError(transformResult)) return transformResult

    const catalogErrorResult = runCatalogErrorRules(chart, context)
    if (isAgentError(catalogErrorResult)) return catalogErrorResult

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

    const finalSchemaResult = validateEncodingFieldsInFinalSchema(chart)
    if (isAgentError(finalSchemaResult)) return finalSchemaResult
  }

  const drilldownResult = validateDrilldownCharts(parsed.data.charts)
  if (isAgentError(drilldownResult)) return drilldownResult

  return ok(parsed.data)
}

export function getCatalogEntries(): Array<{
  type: string
  requiredEncodings: string[]
  optionalEncodings: string[]
}> {
  return MVP_CHART_TYPES.map(type => {
    const catalogItem = getCatalogItem(type)
    const required = catalogItem?.requiredEncodings ?? []
    return {
      type,
      requiredEncodings: required,
      optionalEncodings: ['color', 'size', 'label', 'value'].filter(encoding => !required.includes(encoding))
    }
  })
}

// Collect soft warnings (non-fatal issues the LLM should fix before rendering).
// Requires profile for semantic checks; pass context to also run catalog compliance.
export function collectValidationWarnings(
  spec: AgentReportSpec,
  profile: DataProfile,
  context?: AnalyzeContext
): string[] {
  const warnings: string[] = []

  // V01: too many charts in a single report
  if (spec.charts.length > 6) {
    warnings.push(
      `Report has ${spec.charts.length} charts (>6). Consider splitting into multiple sections or removing low-value charts.`
    )
  }

  // V02: too many bigvalue cards
  const bigvalueCount = countChartsByType(spec, 'bigvalue')
  if (bigvalueCount > 4) {
    warnings.push(
      `Report has ${bigvalueCount} bigvalue cards (>4). Use kpigrid for 5+ KPI cards to avoid visual clutter.`
    )
  }

  for (const chart of spec.charts) {
    const chartLabel = chart.id ? `chart '${chart.id}'` : `${chart.type} chart`

    // T24: derive-month applied to a string field (profile-based check)
    for (const t of chart.data?.transform ?? []) {
      if (t.type === 'derive-month' && t.field) {
        const col = profile.columns.find(c => c.name === t.field)
        if (col && col.type === 'string') {
          warnings.push(
            `${chartLabel}: derive-month applied to '${t.field}' which is a string field in the profile. ` +
            'derive-month expects a date field; the transform will silently produce empty strings.'
          )
        }
      }
    }

    // T26: catalog compliance — chart type is blocked by context.json
    if (context) {
      const blocked = context.catalog.blockedCharts.find(b => b.type === chart.type)
      if (blocked) {
        warnings.push(
          `${chartLabel}: type '${chart.type}' is in catalog.blockedCharts (${blocked.reason}). ` +
          'Choose a type from catalog.charts instead.'
        )
      }

      const semanticWarnings = collectChartSemanticWarnings(chart, chartLabel, context)
      warnings.push(...semanticWarnings)
    }

    // Catalog warning rules (V03/V04 MISSING_SORT_TRANSFORM, TOO_MANY_CATEGORIES, TOO_MANY_SLICES, etc.)
    const catalogItem = getCatalogItem(chart.type)
    if (catalogItem) {
      for (const rule of catalogItem.rules) {
        if (rule.severity !== 'warning' || !rule.validate) continue
        const issue = rule.validate(chart, context)
        if (issue) {
          warnings.push(issue.message)
        }
      }
    }
  }

  return warnings
}

// T38: validate that every $evidence:id.path ref in insights resolves in context.evidence
export function validateEvidencePaths(
  spec: AgentReportSpec,
  context: AnalyzeContext
): AgentResult<void> {
  const availableIds = context.evidence.map(e => e.id)
  const issues: Array<{ code: string; message: string; evidenceId: string; path?: string; location: string; availableIds: string[] }> = []
  for (const insight of normalizeInsights(spec.insights)) {
    for (const evidenceId of insight.evidence) {
      if (!availableIds.includes(evidenceId)) {
        issues.push({
          code: VALIDATOR_ERROR_CODES.INSIGHT_EVIDENCE_NOT_FOUND,
          message: `insight.evidence id '${evidenceId}' not found in context.evidence.`,
          evidenceId,
          location: 'insights[].evidence',
          availableIds
        })
      }
    }
  }

  for (const { location, text } of collectEvidenceTextFields(spec)) {
    for (const ref of parseEvidenceRefs(text)) {
      const { found } = resolveEvidencePath(context.evidence, ref.id, ref.path)
      if (!found) {
        issues.push({
          code: VALIDATOR_ERROR_CODES.EVIDENCE_PATH_NOT_FOUND,
          message: `$evidence:${ref.id}.${ref.path} not found in context.evidence.`,
          evidenceId: ref.id,
          path: ref.path,
          location,
          availableIds
        })
      }
    }
  }
  if (issues.length > 0) {
    const first = issues[0]
    return agentError(
      first.code,
      `${first.message} ${issues.length > 1 ? `(${issues.length} evidence issue(s) total.) ` : ''}` +
      `Available ids: ${availableIds.join(', ') || '(none)'}`,
      { evidenceId: first.evidenceId, path: first.path, availableIds, issues }
    )
  }
  return ok(undefined)
}

function collectEvidenceTextFields(spec: AgentReportSpec): Array<{ location: string; text: string }> {
  const texts: Array<{ location: string; text: string }> = []
  if (spec.title) texts.push({ location: 'title', text: spec.title })
  if (spec.description) texts.push({ location: 'description', text: spec.description })
  normalizeInsights(spec.insights).forEach((insight, index) => {
    texts.push({ location: `insights[${index}].text`, text: insight.text })
    if (insight.caveat) texts.push({ location: `insights[${index}].caveat`, text: insight.caveat })
  })
  spec.charts.forEach((chart, chartIndex) => {
    if (chart.title) texts.push({ location: `charts[${chartIndex}].title`, text: chart.title })
    const description = (chart as AgentChartSpec & { description?: string }).description
    if (description) texts.push({ location: `charts[${chartIndex}].description`, text: description })
    for (const [channel, encoding] of Object.entries(chart.encoding ?? {})) {
      if (encoding?.format) texts.push({ location: `charts[${chartIndex}].encoding.${channel}.format`, text: encoding.format })
    }
    collectStringLeaves(chart.style, `charts[${chartIndex}].style`, texts)
  })
  return texts
}

function collectStringLeaves(value: unknown, path: string, out: Array<{ location: string; text: string }>): void {
  if (typeof value === 'string') {
    out.push({ location: path, text: value })
  } else if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) collectStringLeaves(child, `${path}.${key}`, out)
  }
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
  const catalogItem = getCatalogItem(chart.type)
  const required = catalogItem?.requiredEncodings ?? []
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

function runCatalogErrorRules(chart: AgentChartSpec, ctx?: AnalyzeContext): AgentResult<AgentChartSpec> {
  const catalogItem = getCatalogItem(chart.type)
  if (!catalogItem) return ok(chart)
  for (const rule of catalogItem.rules) {
    if (rule.severity !== 'error' || !rule.validate) continue
    const issue = rule.validate(chart, ctx)
    if (issue) {
      return agentError(issue.code, issue.message, { chartId: issue.chartId })
    }
  }
  return ok(chart)
}

function validateReportInteractions(
  spec: AgentReportSpec,
  profile: DataProfile,
  availableFields: string[]
): AgentResult<AgentReportSpec> {
  if ((spec.interactions?.globalFilters?.length ?? 0) > 0) {
    const unsupported = spec.charts.find(chart => !interactionCapabilities(chart.type).filter)
    if (unsupported) return agentError('INTERACTION_CHART_NOT_FILTERABLE', `Chart type '${unsupported.type}' cannot be updated by global filters.`, { chartId: unsupported.id, chartType: unsupported.type })
  }
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

function validateDrilldownCharts(charts: AgentChartSpec[]): AgentResult<void> {
  const chartIds = new Set(charts.map(c => c.id).filter((id): id is string => Boolean(id)))
  for (const chart of charts) {
    if (chart.drilldownChart) {
      if (!chartIds.has(chart.drilldownChart)) {
        return agentError('INVALID_DRILLDOWN_CHART', `drilldownChart '${chart.drilldownChart}' on chart '${chart.id ?? chart.type}' does not match any chart id.`, {
          chartId: chart.id,
          drilldownChart: chart.drilldownChart,
          availableIds: [...chartIds]
        })
      }
    }
  }
  return ok(void 0 as unknown as void)
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

function validateTransforms(chart: AgentChartSpec): AgentResult<AgentChartSpec> {
  const catalogItem = getCatalogItem(chart.type)
  if (!catalogItem) return ok(chart)
  const allowed = new Set(catalogItem.allowedTransforms)
  for (const transform of chart.data?.transform ?? []) {
    if (!allowed.has(transform.type)) {
      const detail = { chartId: chart.id, chartType: chart.type, transformType: transform.type, allowedTransforms: catalogItem.allowedTransforms }
      return agentError(
        VALIDATOR_ERROR_CODES.UNSUPPORTED_TRANSFORM,
        `Transform '${transform.type}' is not supported for chart type '${chart.type}'. Allowed transforms: ${catalogItem.allowedTransforms.join(', ') || '(none)'}.`,
        { detail, ...detail }
      )
    }
    const malformed = validateTransformShape(transform)
    if (malformed) {
      const detail = { chartId: chart.id, chartType: chart.type, transformType: transform.type, reason: malformed }
      return agentError(VALIDATOR_ERROR_CODES.INVALID_TRANSFORM, malformed, { detail, ...detail })
    }
  }
  return ok(chart)
}

function validateTransformShape(transform: AgentDataTransform): string | null {
  if (transform.type === 'aggregate') {
    const hasGroupBy = Boolean(transform.groupBy?.length)
    const hasMeasures = Boolean(transform.measures?.length)
    if (!hasGroupBy && !hasMeasures) return 'aggregate transform requires groupBy or measures.'
    for (const measure of transform.measures ?? []) {
      if (!measure.field || !measure.op || !measure.as) return 'aggregate measures require field, op, and as.'
    }
  } else if (transform.type === 'sort' && !transform.field) {
    return 'sort transform requires field.'
  } else if (transform.type === 'limit' && (!Number.isInteger(transform.value) || Number(transform.value) <= 0)) {
    return 'limit transform requires a positive integer value.'
  } else if (transform.type === 'derive-month' && (!transform.field || !transform.as)) {
    return 'derive-month transform requires field and as.'
  }
  return null
}

// Simulate the output field set after all transforms run.
// Returns null when no aggregate transform exists (no schema narrowing — skip the check).
// When aggregate is present, output is ONLY groupBy fields + measures[*].as fields;
// all source columns that are not explicitly carried through disappear.
function simulateFinalSchema(chart: AgentChartSpec): Set<string> | null {
  let schema: Set<string> | null = null

  for (const transform of chart.data?.transform ?? []) {
    if (transform.type === 'aggregate') {
      const next = new Set<string>()
      for (const field of transform.groupBy ?? []) next.add(field)
      for (const measure of transform.measures ?? []) next.add(measure.as)
      schema = next
    } else if (transform.type === 'derive-month' && transform.as && schema !== null) {
      // derive-month after an aggregate adds a new column to the current narrowed schema
      schema.add(transform.as)
    }
    // sort and limit leave the field set unchanged
  }

  return schema
}

function validateEncodingFieldsInFinalSchema(chart: AgentChartSpec): AgentResult<AgentChartSpec> {
  const finalSchema = simulateFinalSchema(chart)
  if (!finalSchema) return ok(chart)

  const chartLabel = chart.id ? `chart '${chart.id}'` : `${chart.type} chart`
  const available = [...finalSchema].join(', ') || '(none)'

  for (const [channel, encoding] of Object.entries(chart.encoding ?? {})) {
    const field = (encoding as { field?: string } | undefined)?.field
    if (!field) continue
    if (!finalSchema.has(field)) {
      return agentError(
        'ENCODING_FIELD_NOT_IN_FINAL_ROWS',
        `${chartLabel}: encoding.${channel}.field '${field}' does not exist in rows after transforms. ` +
        `Available fields after transforms: ${available}`,
        { chartId: chart.id, channel, field, availableAfterTransforms: [...finalSchema] }
      )
    }
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
