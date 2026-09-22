import { agentError, isAgentError, ok } from './errors'
import { MVP_CHART_TYPES, OUTPUT_FORMATS, reportSpecSchema } from './spec-schema'
import { parseEvidenceRefs, resolveEvidencePath } from './directive-resolver'
import { getCatalogItem } from './chart-catalog'
import { countChartsByType } from './spec-utils'
import { normalizeInsights } from './insight-utils'
import { collectChartSemanticWarnings } from './spec-validator-intelligence'
import { VALIDATOR_ERROR_CODES } from './error-codes'
import { validateReportInteractions } from './report-interaction-validator'
import { collectP0Warnings, validateP0ChartSpec } from './spec-validator-p0'
import { collectVisualDiversityIssues } from './report-diversity-audit'
import { validateP1ChartSpec } from './spec-validator-p1'
import { validatePosterSpec } from './poster/poster-validation'
import type { AnalyzeContext } from './context-schema'
import type { AgentChartSpec, AgentDataTransform, AgentOutputFormat, AgentResult, AgentReportSpec, DataProfile } from './types'
import { normalizePosterSpec } from './poster/poster-normalizer'

export { collectVerifyIssues, collectVerifyWarnings, strictVerifyError, type VerifyIssue } from './spec-validator-intelligence'
export { validateProvenance, type ProvenanceCoverage, type ProvenanceValidation } from './provenance-validator'

const DRILLDOWN_CHART_TYPES = ['bar', 'pie', 'table'] as const

export function validateReportSpec(
  spec: unknown,
  profile: DataProfile,
  formats: AgentOutputFormat[] = ['html'],
  context?: AnalyzeContext
): AgentResult<AgentReportSpec> {
  if (typeof spec === 'object' && spec !== null && 'specVersion' in spec && Number((spec as { specVersion?: unknown }).specVersion) > 1) {
    return agentError('UNSUPPORTED_SPEC_VERSION', `Unsupported specVersion: ${String((spec as { specVersion?: unknown }).specVersion)}.`, { supportedVersions: [1] })
  }
  const rawPoster = typeof spec === 'object' && spec !== null ? (spec as { poster?: { template?: unknown } }).poster : undefined
  const posterTemplate = rawPoster?.template
  const posterTemplates = ['data-poster-ranking', 'data-poster-share', 'data-poster-comparison', 'data-poster-trend', 'data-poster-flow', 'data-poster-geo', 'content-poster-timeline']
  if (posterTemplate !== undefined && (typeof posterTemplate !== 'string' || !posterTemplates.includes(posterTemplate))) {
    return agentError('POSTER_TEMPLATE_UNKNOWN', `Poster template '${String(posterTemplate)}' is not registered.`, {
      path: 'poster.template', templateId: posterTemplate, availableIds: posterTemplates, repairHint: 'Use a registered poster template id.'
    })
  }
  const parsed = reportSpecSchema.safeParse(spec)
  if (!parsed.success) {
    return agentError('INVALID_SPEC', parsed.error.issues.map(issue => issue.message).join('; '))
  }

  const normalizedSpec = normalizePosterSpec(parsed.data)
  const posterResult = validatePosterSpec(normalizedSpec)
  if (isAgentError(posterResult)) return posterResult

  for (const format of formats) {
    if (!OUTPUT_FORMATS.includes(format)) {
      return agentError('UNSUPPORTED_OUTPUT_FORMAT', `Unsupported output format: ${format}`, {
        supportedFormats: OUTPUT_FORMATS
      })
    }
  }

  const availableFields = profile.columns.map(column => column.name)
  const chartIds = new Set<string>()
  const interactionResult = validateReportInteractions(normalizedSpec, profile, availableFields)
  if (isAgentError(interactionResult)) return interactionResult

  for (const chart of normalizedSpec.charts) {
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

    const p0Result = validateP0ChartSpec(chart, profile, context)
    if (isAgentError(p0Result)) return p0Result
    const p1Result = validateP1ChartSpec(chart, profile)
    if (isAgentError(p1Result)) return p1Result

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

  const drilldownResult = validateDrilldownCharts(normalizedSpec.charts)
  if (isAgentError(drilldownResult)) return drilldownResult

  return ok(normalizedSpec)
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
  warnings.push(...collectVisualDiversityIssues(spec, context).map(issue => `${issue.code} ${issue.path}: ${issue.message} ${issue.suggestion}`))

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
    warnings.push(...collectP0Warnings(chart, profile))

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
  for (let chartIndex = 0; chartIndex < spec.charts.length; chartIndex++) {
    for (const reference of spec.charts[chartIndex].references ?? []) {
      for (const raw of [reference.value, reference.from, reference.to]) {
        if (typeof raw !== 'string') continue
        for (const ref of parseEvidenceRefs(raw)) {
          const resolved = resolveEvidencePath(context.evidence, ref.id, ref.path)
          if (!resolved.found) issues.push({ code: VALIDATOR_ERROR_CODES.EVIDENCE_PATH_NOT_FOUND, message: `Reference evidence path '${ref.raw}' does not exist.`, evidenceId: ref.id, path: ref.path, location: `charts[${chartIndex}].references`, availableIds })
        }
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
  const required = catalogItem?.variants?.find(variant => variant.id === (chart.variant ?? 'standard'))?.requiredEncodings ?? catalogItem?.requiredEncodings ?? []
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
