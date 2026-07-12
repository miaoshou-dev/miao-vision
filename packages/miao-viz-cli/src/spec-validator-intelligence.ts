import { parseEvidenceRefs } from './directive-resolver'
import { insightPreview, normalizeInsights } from './insight-utils'
import type { AnalyzeContext, CatalogBlockEntry, CatalogTemplateEntry } from './context-schema'
import type { AgentChartSpec, AgentInsightType, AgentResult, AgentReportSpec } from './types'
import { agentError, ok } from './errors'

const FORBIDDEN_WORDS: Array<{ pattern: RegExp; word: string }> = [
  { pattern: /\b(trend|趋势)\b/i, word: 'trend/趋势' },
  { pattern: /\b(drive|drives|drove|driven|驱动)\b/i, word: 'drive/驱动' },
  { pattern: /\b(significant|显著)\b/i, word: 'significant/显著' },
  { pattern: /strong\s+correlation|强相关/i, word: 'strong correlation/强相关' },
  { pattern: /\bshould\b|应该/i, word: 'should/应该' }
]

export interface VerifyIssue {
  code:
    | 'INSIGHT_FORBIDDEN_WORD_STRICT'
    | 'INSIGHT_MISSING_CAVEAT_STRICT'
    | 'INSIGHT_NUMERIC_CLAIM_WITHOUT_EVIDENCE_STRICT'
    | 'INSIGHT_TREND_WITHOUT_TIME_STRICT'
    | 'INSIGHT_STRONG_CLAIM_WITHOUT_EVIDENCE_STRICT'
    | 'INSIGHT_REQUIRED_EVIDENCE_MISSING_STRICT'
    | 'INSIGHT_TYPE_NOT_ALLOWED_STRICT'
    | 'BLOCK_REQUIRED_EVIDENCE_MISSING_STRICT'
    | 'TEMPLATE_REQUIRED_EVIDENCE_MISSING_STRICT'
  message: string
}

export function collectVerifyWarnings(spec: AgentReportSpec, context?: AnalyzeContext): string[] {
  const warnings: string[] = []
  const insights = normalizeInsights(spec.insights)
  const timeField = context?.fields.find(f => f.role === 'time')
  const timePeriods = timeField?.timePeriods ?? 0
  const hasTrendSupport = Boolean(timeField && timePeriods >= 3)

  for (const insight of insights) {
    const type = insight.type ?? inferInsightType(insight)
    if (context) {
      const evidenceIds = collectContextEvidenceIds(context)
      for (const evidenceId of insight.evidence) {
        if (!evidenceIds.has(evidenceId)) {
          warnings.push(`INSIGHT_REQUIRED_EVIDENCE_MISSING: insight references evidence '${evidenceId}' but context.evidence does not contain it: ${insightPreview(insight.text)}`)
        }
      }
      if (insight.type) {
        const required = requiredEvidenceForInsightType(insight.type)
        const missing = required.filter(id => !insight.evidence.includes(id) && parseEvidenceRefs(insight.text).every(ref => ref.id !== id))
        if (missing.length) {
          warnings.push(`INSIGHT_REQUIRED_EVIDENCE_MISSING: ${insight.type} insight requires evidence ${missing.join(', ')}: ${insightPreview(insight.text)}`)
        }
      }
    }

    for (const { pattern, word } of FORBIDDEN_WORDS) {
      if (word === 'trend/趋势' && type === 'trend' && hasTrendSupport && insight.evidence.includes('by_time')) continue
      if (pattern.test(insight.text)) {
        warnings.push(`insight contains forbidden word '${word}': ${insightPreview(insight.text)} — use only when backed by statistical evidence in context.evidence[]`)
      }
    }
    if (/\d/.test(insight.text) && insight.evidence.length === 0 && parseEvidenceRefs(insight.text).length === 0) {
      warnings.push(`INSIGHT_NUMERIC_CLAIM_WITHOUT_EVIDENCE: insight contains numeric claim without structured evidence: ${insightPreview(insight.text)}`)
    }
    if (/\b(trend|trending|趋势)\b/i.test(insight.text) && context && !hasTrendSupport) {
      const reason = timeField ? `timePeriods=${timePeriods} < 3` : 'no time field detected'
      warnings.push(`INSIGHT_TREND_WITHOUT_TIME: insight describes a trend but context has ${reason}: ${insightPreview(insight.text)}`)
    }
    if (isStrongClaim(insight.text) && insight.evidence.length === 0 && parseEvidenceRefs(insight.text).length === 0) {
      warnings.push(`INSIGHT_STRONG_CLAIM_WITHOUT_EVIDENCE: strong causal/statistical language requires supporting evidence: ${insightPreview(insight.text)}`)
    }
    if (context && insight.type && type) {
      warnings.push(...collectInsightTypeWarnings(type, insight.text, spec, context))
    }
  }

  for (const title of spec.charts.map(c => c.title).filter((t): t is string => Boolean(t))) {
    if (/\b(trend|trending|趋势)\b/i.test(title) && context && !hasTrendSupport) {
      const reason = timeField ? `timePeriods=${timePeriods} < 3` : 'no time field detected'
      warnings.push(`INSIGHT_TREND_WITHOUT_TIME: chart title describes a trend but context has ${reason}: ${insightPreview(title)}`)
    }
  }

  if (context?.sampleWarnings.length) {
    const caveats = [/仅供参考|样本量|有限数据|based on.*rows?|N-row sample|limited data|small sample/i, /环比变化|period.over.period/i]
    const hasCaveat = insights.some(insight => Boolean(insight.caveat) || caveats.some(p => p.test(insight.text)))
    if (insights.length > 0 && !hasCaveat) {
      const codes = context.sampleWarnings.map(w => w.code).join(', ')
      warnings.push(`sampleWarnings present (${codes}) but no insight contains a required caveat. Add "(based on N rows only)" or "仅供参考，样本量极小" to data-backed insights.`)
    }
  }
  if (context) warnings.push(...collectBlockTemplateEvidenceWarnings(spec, context))
  return warnings
}

export function strictVerifyError(warnings: string[]): AgentResult<void> {
  if (warnings.length === 0) return ok(undefined)
  const issues = warnings.map(warningToVerifyIssue)
  return agentError('STRICT_VERIFY_FAILED', `Strict verify failed with ${warnings.length} warning(s).`, { warnings, issues })
}

export function collectChartSemanticWarnings(chart: AgentChartSpec, chartLabel: string, context: AnalyzeContext): string[] {
  const warnings: string[] = []
  for (const [channel, encoding] of Object.entries(chart.encoding ?? {})) {
    if (!encoding?.field) continue
    const field = context.fields.find(f => f.name === encoding.field)
    if (!field) continue
    const isMeasureChannel = channel === 'y' || channel === 'value' || channel === 'size'
    const isQuantitativeEncoding = encoding.type === 'quantitative' || Boolean(encoding.aggregate)
    if (field.role === 'id' && (isMeasureChannel || isQuantitativeEncoding)) {
      warnings.push(`${chartLabel}: ID_AS_MEASURE '${field.name}' is used as a quantitative ${channel} encoding. Identifiers must not be summed or averaged; choose a measure field or count rows instead.`)
    }
  }
  if (chart.type === 'line') {
    const xField = chart.encoding?.x?.field
    const field = xField ? context.fields.find(f => f.name === xField) : undefined
    if (!field || (field.role !== 'time' && chart.encoding?.x?.type !== 'ordinal')) {
      warnings.push(`${chartLabel}: LINE_REQUIRES_TIME_OR_ORDERED_X line chart x field '${xField ?? '(missing)'}' is not a time field or explicit ordinal encoding.`)
    } else if (field.role === 'time' && (field.timePeriods ?? 0) < 3) {
      warnings.push(`${chartLabel}: INSUFFICIENT_TIME_PERIODS line chart needs at least 3 time periods; '${field.name}' has ${field.timePeriods ?? 0}.`)
    }
  }
  if (chart.type === 'pie') {
    const labelField = chart.encoding?.label?.field
    const field = labelField ? context.fields.find(f => f.name === labelField) : undefined
    if (field?.distinctCount !== undefined && field.distinctCount > 7) {
      warnings.push(`${chartLabel}: TOO_MANY_SLICES pie label field '${labelField}' has ${field.distinctCount} values (>7). Use bar chart or table.`)
    }
  }
  return warnings
}

export function collectContextEvidenceIds(context: AnalyzeContext): Set<string> {
  return new Set(context.evidence.map(e => e.id))
}

export function inferInsightType(insight: { text: string; evidence: string[] }): AgentInsightType | undefined {
  const text = insight.text.toLowerCase()
  const evidence = new Set(insight.evidence)
  if (evidence.has('by_time') && /\b(period-over-period|increased|decreased|unchanged|环比)\b/i.test(insight.text)) return 'delta'
  if (evidence.has('by_time') || /\btrend|over time|趋势\b/i.test(insight.text)) return 'trend'
  if (evidence.has('by_dimension') && /\btop|rank|leads|highest|lowest|排名\b/i.test(insight.text)) return 'rank'
  if (evidence.has('by_dimension') && /\bshare|contributed|占比|份额\b/i.test(insight.text)) return 'share'
  if (evidence.has('total') || /^total\b/i.test(insight.text)) return 'total'
  if (/\bcorrelation|relationship|相关\b/i.test(insight.text)) return 'correlation'
  if (/\bdistribution|outlier|histogram|分布\b/i.test(insight.text)) return 'distribution'
  if (/\bmissing|null|quality|样本|缺失\b/i.test(text)) return 'data_quality'
  return undefined
}

export function requiredEvidenceForInsightType(type: AgentInsightType): string[] {
  switch (type) {
    case 'total': return ['total']
    case 'rank':
    case 'share': return ['by_dimension']
    case 'trend':
    case 'delta': return ['by_time']
    default: return []
  }
}

export function collectBlockTemplateEvidenceWarnings(spec: AgentReportSpec, context: AnalyzeContext): string[] {
  const warnings: string[] = []
  const evidenceIds = collectContextEvidenceIds(context)
  for (const block of matchingBlocks(spec, context)) {
    const missing = (block.requiredEvidence ?? []).filter(id => !evidenceIds.has(id))
    if (missing.length) {
      warnings.push(`BLOCK_REQUIRED_EVIDENCE_MISSING: block '${block.id}' requires context evidence ${missing.join(', ')}.`)
    }
  }
  for (const template of matchingTemplates(spec, context)) {
    const missing = (template.requiredEvidence ?? []).filter(id => !evidenceIds.has(id))
    if (missing.length) {
      warnings.push(`TEMPLATE_REQUIRED_EVIDENCE_MISSING: template '${template.id}' requires context evidence ${missing.join(', ')}.`)
    }
  }
  return warnings
}

function collectInsightTypeWarnings(
  type: AgentInsightType,
  text: string,
  spec: AgentReportSpec,
  context: AnalyzeContext
): string[] {
  const matched = matchingBlocks(spec, context).filter(block => block.validInsightTypes?.length)
  if (matched.length === 0) return []
  const allowedByAny = matched.some(block => block.validInsightTypes?.includes(type))
  return allowedByAny ? [] : [
    `INSIGHT_TYPE_NOT_ALLOWED: insight type '${type}' is not allowed by matched block candidates (${matched.map(b => b.id).join(', ')}): ${insightPreview(text)}`
  ]
}

function matchingBlocks(spec: AgentReportSpec, context: AnalyzeContext): CatalogBlockEntry[] {
  const chartTypes = spec.charts.map(chart => chart.type as string)
  return (context.catalog.blocks ?? []).filter(block => {
    if (block.score < 0.5) return false
    const requiredCharts = block.charts ?? []
    return requiredCharts.length > 0 && requiredCharts.every(type => chartTypes.includes(type))
  })
}

function matchingTemplates(spec: AgentReportSpec, context: AnalyzeContext): CatalogTemplateEntry[] {
  const matchedBlockIds = new Set(matchingBlocks(spec, context).map(block => block.id))
  return (context.catalog.templates ?? []).filter(template => {
    if (template.score < 0.5 || template.blocks.length === 0) return false
    return template.blocks.every(blockId => matchedBlockIds.has(blockId))
  })
}

function warningToVerifyIssue(message: string): VerifyIssue {
  if (message.includes('INSIGHT_REQUIRED_EVIDENCE_MISSING')) return { code: 'INSIGHT_REQUIRED_EVIDENCE_MISSING_STRICT', message }
  if (message.includes('INSIGHT_TYPE_NOT_ALLOWED')) return { code: 'INSIGHT_TYPE_NOT_ALLOWED_STRICT', message }
  if (message.includes('BLOCK_REQUIRED_EVIDENCE_MISSING')) return { code: 'BLOCK_REQUIRED_EVIDENCE_MISSING_STRICT', message }
  if (message.includes('TEMPLATE_REQUIRED_EVIDENCE_MISSING')) return { code: 'TEMPLATE_REQUIRED_EVIDENCE_MISSING_STRICT', message }
  if (message.includes('INSIGHT_TREND_WITHOUT_TIME')) return { code: 'INSIGHT_TREND_WITHOUT_TIME_STRICT', message }
  if (message.includes('INSIGHT_STRONG_CLAIM_WITHOUT_EVIDENCE')) return { code: 'INSIGHT_STRONG_CLAIM_WITHOUT_EVIDENCE_STRICT', message }
  if (message.includes('forbidden word')) return { code: 'INSIGHT_FORBIDDEN_WORD_STRICT', message }
  if (message.includes('numeric claim without structured evidence')) return { code: 'INSIGHT_NUMERIC_CLAIM_WITHOUT_EVIDENCE_STRICT', message }
  return { code: 'INSIGHT_MISSING_CAVEAT_STRICT', message }
}

function isStrongClaim(text: string): boolean {
  return /\b(significant|prove|proves|proved|causes?|caused|drives?|drove|driven|predicts?|prediction|forecast|strong correlation)\b|显著|证明|导致|因果|驱动|预测|强相关/i.test(text)
}
