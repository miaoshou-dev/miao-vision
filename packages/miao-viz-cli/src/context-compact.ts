import {
  analyzeContextSchema,
  compactAnalyzeContextSchema,
  type AnalyzeContext,
  type AnalyzeField,
  type CompactAnalyzeContext
} from './context-schema'

type AnalyzeFieldChartUsage = NonNullable<AnalyzeField['chartUsage']>

export function toCompactAnalyzeContext(ctx: AnalyzeContext): CompactAnalyzeContext {
  return {
    format: 'compact-v1',
    intent: {
      raw: ctx.intent.raw, coverage: ctx.intent.coverage,
      visualTasks: ctx.intent.visualTasks?.map(task => [task.family, task.confidence, task.fields ?? null, task.rationale ?? null])
    },
    assumptions: ctx.intent.assumptions.map(a => [a.key, a.value, a.confidence, a.alternatives]),
    fields: ctx.fields.map(f => [
      f.name,
      f.role,
      f.type,
      f.distinctCount,
      f.timePeriods,
      (f.semanticTags?.length || f.confidence !== undefined || f.chartUsage || f.comparison)
        ? {
            ...(f.semanticTags?.length ? { tags: f.semanticTags } : {}),
            ...(f.confidence !== undefined ? { confidence: f.confidence } : {}),
            ...(f.chartUsage ? {
              usage: [f.chartUsage.asMeasure, f.chartUsage.asDimension, f.chartUsage.asDetailKey] as [string, string, string]
            } : {}),
            ...(f.comparison ? { comparison: f.comparison } : {})
          }
        : null
    ]),
    evidence: ctx.evidence.map(e => [e.id, e.values ?? e.rows ?? {}, e.query]),
    metricCandidates: (ctx.metricCandidates ?? []).map(m => [m.id, m.type, m.formula, m.value ?? null, m.label, m.confidence, m.caveat ?? null]),
    catalog: {
      charts: ctx.catalog.charts,
      blockedCharts: ctx.catalog.blockedCharts.map(c => [c.type, c.reason]),
      recommendedPlan: ctx.catalog.recommendedPlan.map(p => [p.type, p.note ?? null]),
      recommendations: ctx.catalog.recommendations?.map(item => [item.intent, item.chartType, item.variant ?? null, item.score, item.reasons]),
      blocks: ctx.catalog.blocks?.map(b => [b.id, b.score, b.density, b.charts, b.requiredEvidence ?? null, b.validInsightTypes ?? null]),
      blockedBlocks: ctx.catalog.blockedBlocks?.map(b => [b.id, b.reason]),
      templates: ctx.catalog.templates?.map(t => [t.id, t.score, t.density, t.blocks, t.requiredEvidence ?? null]),
      blockedTemplates: ctx.catalog.blockedTemplates?.map(t => [t.id, t.reason])
      ,deckPatterns: ctx.catalog.deckPatterns?.map(p => [p.id, p.score, p.density, p.blocks])
      ,slideBlocks: ctx.catalog.slideBlocks?.map(b => [b.id, b.score, b.requiredRoles, b.requiredEvidence])
      ,blockedSlideBlocks: ctx.catalog.blockedSlideBlocks?.map(b => [b.id, b.reasonCode, b.reason])
    },
    warnings: ctx.sampleWarnings.map(w => [w.code, w.message]),
    promptRules: ctx.promptRules,
    clarificationQuestions: (ctx.clarificationQuestions ?? []).map(q => [
      q.id,
      q.question,
      q.options,
      q.blocking,
      q.appliesTo
    ])
  }
}

export function fromCompactAnalyzeContext(ctx: CompactAnalyzeContext): AnalyzeContext {
  return {
    intent: {
      raw: ctx.intent.raw,
      coverage: ctx.intent.coverage,
      assumptions: ctx.assumptions.map(([key, value, confidence, alternatives]) => ({
        key,
        value,
        confidence,
        alternatives: alternatives ?? undefined
      })),
      visualTasks: ctx.intent.visualTasks?.map(([family, confidence, fields, rationale]) => ({ family, confidence, ...(fields ? { fields } : {}), rationale: rationale ?? [] }))
    },
    fields: ctx.fields.map(([name, role, type, distinctCount, timePeriods, meta]) => ({
      name,
      role,
      type,
      ...(meta?.tags ? { semanticTags: meta.tags } : {}),
      ...(meta?.confidence !== undefined ? { confidence: meta.confidence } : {}),
      ...(meta?.usage ? {
        chartUsage: {
          asMeasure: meta.usage[0] as AnalyzeFieldChartUsage['asMeasure'],
          asDimension: meta.usage[1] as AnalyzeFieldChartUsage['asDimension'],
          asDetailKey: meta.usage[2] as AnalyzeFieldChartUsage['asDetailKey']
        }
      } : {}),
      ...(meta?.comparison ? { comparison: meta.comparison } : {}),
      ...(distinctCount !== undefined && distinctCount !== null ? { distinctCount } : {}),
      ...(timePeriods !== undefined && timePeriods !== null ? { timePeriods } : {})
    })),
    evidence: ctx.evidence.map(([id, value, query]) => ({
      id,
      query: query ?? `compact evidence: ${id}`,
      ...(Array.isArray(value) ? { rows: value } : { values: value })
    })),
    catalog: {
      charts: ctx.catalog.charts,
      blockedCharts: ctx.catalog.blockedCharts.map(([type, reason]) => ({ type, reason })),
      recommendedPlan: (ctx.catalog.recommendedPlan ?? []).map(([type, note]) => ({ type, ...(note ? { note } : {}) })),
      recommendations: ctx.catalog.recommendations?.map(([intent, chartType, variant, score, reasons]) => ({ intent, chartType, ...(variant ? { variant } : {}), score, reasons, alternatives: [] })),
      blocks: ctx.catalog.blocks?.map(([id, score, density, charts, requiredEvidence, validInsightTypes]) => ({
        id,
        score,
        description: '',
        bestFor: [],
        density,
        examplePrompt: '',
        charts,
        variables: {},
        qualityChecks: [],
        ...(requiredEvidence?.length ? { requiredEvidence } : {}),
        ...(validInsightTypes?.length ? { validInsightTypes } : {})
      })),
      blockedBlocks: ctx.catalog.blockedBlocks?.map(([id, reason]) => ({ id, reason })),
      templates: ctx.catalog.templates?.map(([id, score, density, blocks, requiredEvidence]) => ({
        id,
        score,
        bestFor: [],
        requires: [],
        blocks,
        density,
        ...(requiredEvidence?.length ? { requiredEvidence } : {})
      })),
      blockedTemplates: ctx.catalog.blockedTemplates?.map(([id, reason]) => ({ id, reason }))
      ,deckPatterns: ctx.catalog.deckPatterns?.map(([id, score, density, blocks]) => ({ id, score, density, blocks }))
      ,slideBlocks: ctx.catalog.slideBlocks?.map(([id, score, requiredRoles, requiredEvidence]) => ({ id, score, requiredRoles, requiredEvidence }))
      ,blockedSlideBlocks: ctx.catalog.blockedSlideBlocks?.map(([id, reasonCode, reason]) => ({ id, reasonCode, reason }))
    },
    sampleWarnings: ctx.warnings.map(([code, message]) => ({ code, message })),
    promptRules: ctx.promptRules ?? [],
    metricCandidates: ctx.metricCandidates.map(([id, type, formula, value, label, confidence, caveat]) => ({
      id,
      type,
      label: label ?? id,
      formula,
      ...(value !== undefined && value !== null ? { value } : {}),
      confidence: confidence ?? 'medium',
      ...(caveat ? { caveat } : {})
    })),
    clarificationQuestions: ctx.clarificationQuestions.map(([id, question, options, blocking, appliesTo]) => ({
      id,
      question,
      options,
      blocking,
      appliesTo
    }))
  }
}

export function parseAnalyzeContext(value: unknown): AnalyzeContext | null {
  const unwrapped = (value as { ok?: unknown; value?: unknown }).ok === true
    ? (value as { value: unknown }).value
    : value
  const full = analyzeContextSchema.safeParse(unwrapped)
  if (full.success) return full.data
  const compact = compactAnalyzeContextSchema.safeParse(unwrapped)
  if (compact.success) return fromCompactAnalyzeContext(compact.data)
  return null
}
