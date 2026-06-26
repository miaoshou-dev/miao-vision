import { agentError, isAgentError, ok } from './errors'
import { MVP_CHART_TYPES, OUTPUT_FORMATS, reportSpecSchema } from './spec-schema'
import { parseEvidenceRefs, resolveEvidencePath } from './directive-resolver'
import { getCatalogItem } from './chart-catalog'
import { countChartsByType } from './spec-utils'
import type { AnalyzeContext } from './context-schema'
import type { AgentChartSpec, AgentOutputFormat, AgentResult, AgentReportSpec, DataProfile } from './types'

const FORBIDDEN_WORDS: Array<{ pattern: RegExp; word: string }> = [
  { pattern: /\b(trend|趋势)\b/i, word: 'trend/趋势' },
  { pattern: /\b(drive|drives|drove|driven|驱动)\b/i, word: 'drive/驱动' },
  { pattern: /\b(significant|显著)\b/i, word: 'significant/显著' },
  { pattern: /strong\s+correlation|强相关/i, word: 'strong correlation/强相关' },
  { pattern: /\bshould\b|应该/i, word: 'should/应该' }
]

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
  }

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
  const texts: string[] = [
    ...(spec.insights ?? []),
    ...spec.charts.map(c => c.title).filter((t): t is string => Boolean(t))
  ]
  for (const text of texts) {
    for (const ref of parseEvidenceRefs(text)) {
      const { found } = resolveEvidencePath(context.evidence, ref.id, ref.path)
      if (!found) {
        return agentError(
          'EVIDENCE_PATH_NOT_FOUND',
          `$evidence:${ref.id}.${ref.path} not found in context.evidence. ` +
          `Available ids: ${context.evidence.map(e => e.id).join(', ') || '(none)'}`,
          { evidenceId: ref.id, path: ref.path, availableIds: context.evidence.map(e => e.id) }
        )
      }
    }
  }
  return ok(undefined)
}

// T47–T49: forbidden-word and caveat-propagation checks (--verify mode)
export function collectVerifyWarnings(
  spec: AgentReportSpec,
  context?: AnalyzeContext
): string[] {
  const warnings: string[] = []
  const insights = spec.insights ?? []

  // T49: forbidden word detection in insights
  for (const text of insights) {
    for (const { pattern, word } of FORBIDDEN_WORDS) {
      if (pattern.test(text)) {
        warnings.push(
          `insight contains forbidden word '${word}': "${text.slice(0, 80)}${text.length > 80 ? '...' : ''}" — ` +
          'use only when backed by statistical evidence in context.evidence[]'
        )
      }
    }
  }

  // T48: sampleWarning caveat propagation — if sampleWarnings exist, at least one insight must contain a caveat
  if (context?.sampleWarnings.length) {
    const CAVEAT_PATTERNS = [
      /仅供参考|样本量|有限数据|based on.*rows?|N-row sample|limited data|small sample/i,
      /环比变化|period.over.period/i
    ]
    const hasCaveat = insights.some(text => CAVEAT_PATTERNS.some(p => p.test(text)))
    if (insights.length > 0 && !hasCaveat) {
      const codes = context.sampleWarnings.map(w => w.code).join(', ')
      warnings.push(
        `sampleWarnings present (${codes}) but no insight contains a required caveat. ` +
        'Add "(based on N rows only)" or "仅供参考，样本量极小" to data-backed insights.'
      )
    }
  }

  return warnings
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

function validateTransforms(chart: AgentChartSpec): AgentResult<AgentChartSpec> {
  for (const transform of chart.data?.transform ?? []) {
    if (transform.type === 'filter') {
      return agentError(
        'UNSUPPORTED_TRANSFORM',
        `Chart '${chart.id ?? chart.type}': transform type 'filter' has no renderer executor and will silently return unfiltered rows. ` +
        'Use miao-viz query --filter to pre-filter, or remove this transform.',
        { chartId: chart.id ?? chart.type, transformType: 'filter' }
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
