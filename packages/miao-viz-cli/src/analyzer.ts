import type { ColumnProfile, LoadedDataset } from './types'
import type {
  AnalyzeContext,
  AnalyzeCatalog,
  AnalyzeEvidence,
  AnalyzeField,
  AnalyzeSampleWarning,
  MetricCandidate
} from './context-schema'
import { profileDataset } from './data-profiler'
import { queryDataset } from './data-query'
import { queryOptionsToRecipe } from './query-recipe'
import { isAgentError } from './errors'
import { BLOCK_REGISTRY, toCatalogBlockEntry } from './report-block-registry'
import type { BlockMatchContext } from './report-block-registry'
import { buildTemplateCatalog } from './report-template-registry'
import { buildClarificationQuestions } from './analyze-clarifications'
import { parseIntent } from './analyzer-intent'
import { CHART_THRESHOLDS } from './chart-catalog-thresholds'
import { buildDeckCatalog } from './deck-knowledge-registry'

export interface AnalyzerOptions {
  intent?: string
  extraQuery?: string
  // Corrects a misidentified assumption, e.g. "primary_measure=orders"
  correctAssumption?: string
}

export function analyzeDataset(dataset: LoadedDataset, options: AnalyzerOptions = {}): AnalyzeContext {
  const profile = profileDataset(dataset)
  const fields = buildAnalyzeFields(profile.columns)
  const intent = parseIntent(options.intent ?? '', fields, options.correctAssumption)
  const sampleWarnings = buildSampleWarnings(profile.rows, fields)
  const evidence = runStandardQueries(dataset, fields, sampleWarnings)

  if (options.extraQuery) {
    const extra = runExtraQuery(dataset, options.extraQuery, evidence.length)
    if (extra) evidence.push(extra)
  }

  const metricCandidates = buildMetricCandidates(fields, evidence)
  const catalog = buildCatalog(fields, sampleWarnings, profile.rows, evidence, metricCandidates)
  addP0Recommendations(catalog, intent, fields)
  const promptRules = buildPromptRules(catalog.charts, sampleWarnings)
  const clarificationQuestions = buildClarificationQuestions(fields, options.intent ?? '')

  const context: AnalyzeContext = { intent, fields, evidence, catalog, sampleWarnings, promptRules, metricCandidates, clarificationQuestions }
  Object.assign(context.catalog, buildDeckCatalog(context))
  return context
}

function addP0Recommendations(catalog: AnalyzeCatalog, intent: AnalyzeContext['intent'], fields: AnalyzeField[]): void {
  const dimensions = fields.filter(field => ['dimension', 'status', 'flag', 'geo'].includes(field.role))
  const measures = fields.filter(field => field.role === 'measure' || field.role === 'score')
  const tasks = intent.visualTasks ?? []
  const recommendations: NonNullable<AnalyzeCatalog['recommendations']> = []
  const push = (family: typeof tasks[number]['family'], chartType: NonNullable<AnalyzeCatalog['recommendations']>[number]['chartType'], variant: string | undefined, score: number, reason: string) => {
    recommendations.push({ intent: family, chartType, ...(variant ? { variant } : {}), score, reasons: [reason], alternatives: [] })
  }
  for (const task of tasks) {
    if (task.family === 'summary' && measures.length) push(task.family, 'bigvalue', undefined, 0.9, 'quantitative measure detected')
    if ((task.family === 'comparison' || task.family === 'ranking') && dimensions.length && measures.length) push(task.family, 'dot', 'standard', 0.86, 'dimension and quantitative measure detected')
    if ((task.family === 'comparison' || task.family === 'ranking') && dimensions.length && measures.length) push(task.family, 'bar', 'horizontal', 0.82, 'category comparison is available')
    if (task.family === 'change' && dimensions.length && measures.length >= 2) push(task.family, 'dot', 'dumbbell', 0.92, 'dimension and two comparable measures detected')
    if (task.family === 'change' && dimensions.length && measures.length) push(task.family, 'bar', 'diverging', 0.78, 'signed measure can be compared around zero')
    if (task.family === 'target-attainment' && measures.length >= 2) push(task.family, 'bullet', 'standard', 0.92, 'actual and target measures are available')
    if (task.family === 'uncertainty' && measures.length >= 2) push(task.family, 'range', 'standard', 0.9, 'two quantitative interval endpoints are available')
    if (task.family === 'trend' && catalog.charts.includes('line')) push(task.family, 'line', 'standard', 0.88, 'ordered time field has sufficient periods')
    if ((task.family === 'ranking' || task.family === 'composition') && dimensions.length && measures.length && (measures[0].min ?? 0) >= 0) push(task.family, 'pareto', undefined, 0.82, 'non-negative ranked contribution supports cumulative share')
    if (task.family === 'trend' && measures.length >= 2 && measures[0].comparison?.comparableGroup !== measures[1].comparison?.comparableGroup) push(task.family, 'combo-bar-line', undefined, 0.8, 'two measures with different comparison units share an ordered dimension')
    if (task.family === 'composition' && dimensions.length && measures.length && dimensions[0].distinctCount !== undefined && dimensions[0].distinctCount <= 7) push(task.family, 'pie', undefined, 0.84, 'small part-to-whole category set detected')
    if (task.family === 'distribution' && measures.length && catalog.charts.includes('histogram')) push(task.family, 'histogram', undefined, 0.88, 'reliable numeric distribution is available')
    if (task.family === 'relationship' && measures.length >= 2) push(task.family, 'scatter', undefined, 0.9, 'two quantitative measures detected')
    if (task.family === 'flow' && dimensions.length && measures.length) push(task.family, 'funnel', undefined, 0.8, 'ordered stage-like dimension and measure can express drop-off')
    if (task.family === 'geo' && dimensions.some(field => field.role === 'geo') && measures.length) push(task.family, 'bar', 'horizontal', 0.72, 'P0 defers maps; rank geographic categories locally')
  }
  for (const recommendation of recommendations) {
    if (!catalog.charts.includes(recommendation.chartType)) catalog.charts.push(recommendation.chartType)
    recommendation.alternatives = recommendations.filter(other => other.intent === recommendation.intent && other !== recommendation).slice(0, 2).map(other => ({ chartType: other.chartType, variant: other.variant, score: other.score }))
  }
  catalog.recommendations = recommendations.sort((a, b) => b.score - a.score)
}

// ---- Field role identification ----

function buildAnalyzeFields(columns: ColumnProfile[]): AnalyzeField[] {
  return columns.map(col => {
    const field: AnalyzeField = {
      name: col.name,
      role: col.role ?? 'unknown',
      type: mapType(col.type),
      ...(col.semanticTags ? { semanticTags: col.semanticTags } : {}),
      ...(col.confidence !== undefined ? { confidence: col.confidence } : {}),
      ...(col.rationale ? { rationale: col.rationale } : {}),
      ...(col.qualityFlags ? { qualityFlags: col.qualityFlags } : {}),
      ...(col.chartUsage ? { chartUsage: col.chartUsage } : {}),
      distinctCount: col.distinctCount
    }
    field.comparison = buildComparisonMetadata(col, field)
    if (col.type === 'number') {
      if (col.min !== undefined) field.min = col.min
      if (col.max !== undefined) field.max = col.max
    }
    if (col.type === 'date' && col.temporal) {
      field.timePeriods = countTimePeriods(col)
      field.span = col.temporal.span
    }
    return field
  })
}

function buildComparisonMetadata(col: ColumnProfile, field: AnalyzeField): NonNullable<AnalyzeField['comparison']> {
  const tags = new Set(col.semanticTags ?? [])
  const unit = tags.has('currency') ? 'currency' : tags.has('percentage') ? 'percentage' : /count|qty|quantity|orders?|units?/i.test(col.name) ? 'count' : col.type === 'number' ? 'number' : undefined
  const aggregationPolicy = field.role === 'time' || field.role === 'dimension' ? 'none' : unit === 'percentage' ? 'avg' : unit === 'count' ? 'sum' : field.role === 'measure' || field.role === 'score' ? 'sum' : 'none'
  return {
    ...(unit ? { unit } : {}),
    ...(col.temporal?.granularity ? { timeGrain: col.temporal.granularity } : {}),
    aggregationPolicy,
    comparableGroup: `${unit ?? field.type}:${aggregationPolicy}`
  }
}

function mapType(t: string): AnalyzeField['type'] {
  if (t === 'number') return 'number'
  if (t === 'string') return 'string'
  if (t === 'date') return 'date'
  if (t === 'boolean') return 'boolean'
  return 'unknown'
}

function countTimePeriods(col: ColumnProfile): number {
  if (!col.temporal) return 0
  // Approximate: use distinctCount as a proxy for time periods
  return col.distinctCount ?? 0
}

// ---- Standard queries ----

function runStandardQueries(
  dataset: LoadedDataset,
  fields: AnalyzeField[],
  sampleWarnings: AnalyzeSampleWarning[]
): AnalyzeEvidence[] {
  const evidence: AnalyzeEvidence[] = []
  const measures = fields.filter(f => f.role === 'measure' || f.role === 'score')
  const dimensions = fields.filter(f => f.role === 'dimension' || f.role === 'status' || f.role === 'geo' || f.role === 'flag')
  const times = fields.filter(f => f.role === 'time')

  const primaryMeasure = measures[0]
  const primaryDimension = dimensions[0]
  const primaryTime = times[0]

  // Query 1: total
  if (measures.length > 0) {
    const measureExpr = measures.slice(0, 4)
      .map(m => `sum(${m.name}) as total_${m.name}`)
      .concat(['count(*) as row_count'])
      .join(', ')
    const options = { measure: measureExpr }
    const result = queryDataset(dataset.rows, options)
    if (!isAgentError(result) && result.rows.length > 0) {
      evidence.push({
        id: 'total',
        query: `Total aggregates: ${measureExpr}`,
        recipe: recipeOf(options),
        values: result.rows[0]
      })
    }
  }

  // Query 2: by_dimension
  if (primaryMeasure && primaryDimension) {
    const measureExpr = `sum(${primaryMeasure.name}) as total_${primaryMeasure.name}, count(*) as row_count`
    const options = {
      groupby: primaryDimension.name,
      measure: measureExpr,
      orderby: `total_${primaryMeasure.name} desc`
    }
    const result = queryDataset(dataset.rows, options)
    if (!isAgentError(result) && result.rows.length > 0) {
      // Compute share
      const totalVal = result.rows.reduce((s, r) => s + Number(r[`total_${primaryMeasure.name}`] ?? 0), 0)
      const rows = result.rows.map(r => {
        const val = Number(r[`total_${primaryMeasure.name}`] ?? 0)
        return { ...r, share: totalVal > 0 ? Math.round(val / totalVal * 10000) / 10000 : 0 }
      })
      evidence.push({
        id: 'by_dimension',
        query: `${primaryMeasure.name} by ${primaryDimension.name}, with share`,
        recipe: withShare(recipeOf(options), `total_${primaryMeasure.name}`),
        rows
      })
    }
  }

  // Query 3: by_time (only if timePeriods >= 2 to avoid noise)
  const hasInsufficientTime = sampleWarnings.some(w => w.code === 'two_period_only' || w.code === 'one_period_only')
  if (primaryMeasure && primaryTime && !hasInsufficientTime) {
    const measureExpr = `sum(${primaryMeasure.name}) as total_${primaryMeasure.name}`
    const options = {
      groupby: primaryTime.name,
      measure: measureExpr,
      orderby: `${primaryTime.name} asc`
    }
    const result = queryDataset(dataset.rows, options)
    if (!isAgentError(result) && result.rows.length > 0) {
      evidence.push({
        id: 'by_time',
        query: `${primaryMeasure.name} by ${primaryTime.name} (ascending)`,
        recipe: recipeOf(options),
        rows: result.rows
      })
    }
  }

  return evidence
}

function runExtraQuery(
  dataset: LoadedDataset,
  extraQuery: string,
  existingCount: number
): AnalyzeEvidence | null {
  // extraQuery format: "groupby=col;measure=fn(col) as alias;filter=col>=val"
  const parts: Record<string, string> = {}
  for (const part of extraQuery.split(';')) {
    const idx = part.indexOf('=')
    if (idx < 0) continue
    parts[part.slice(0, idx).trim()] = part.slice(idx + 1).trim()
  }
  const result = queryDataset(dataset.rows, {
    groupby: parts.groupby,
    measure: parts.measure,
    filter: parts.filter,
    orderby: parts.orderby,
    limit: parts.limit ? Number(parts.limit) : undefined
  })
  if (isAgentError(result)) return null
  return {
    id: `extra_${existingCount + 1}`,
    query: `Custom query: ${extraQuery}`,
    recipe: recipeOf({
      groupby: parts.groupby, measure: parts.measure, filter: parts.filter,
      orderby: parts.orderby, limit: parts.limit ? Number(parts.limit) : undefined
    }),
    rows: result.rows
  }
}

function recipeOf(options: Parameters<typeof queryDataset>[1]) {
  const recipe = queryOptionsToRecipe(options)
  return isAgentError(recipe) ? undefined : recipe
}

function withShare(recipe: ReturnType<typeof recipeOf>, field: string) {
  return recipe ? { ...recipe, share: { field, alias: 'share' } } : undefined
}

// ---- Sample warnings ----

function buildSampleWarnings(rowCount: number, fields: AnalyzeField[]): AnalyzeSampleWarning[] {
  const warnings: AnalyzeSampleWarning[] = []
  if (rowCount === 0) {
    warnings.push({ code: 'empty_dataset', message: 'Dataset has no rows. No analysis is possible.' })
    return warnings
  }
  if (rowCount < 10) {
    warnings.push({ code: 'extreme_small_sample', message: `Only ${rowCount} rows. Rankings and comparisons are descriptive only; do not generalize.` })
  } else if (rowCount < 20) {
    warnings.push({ code: 'small_sample', message: `Only ${rowCount} rows. Outlier and distribution analysis is unreliable.` })
  } else if (rowCount < 30) {
    warnings.push({ code: 'limited_sample', message: `Only ${rowCount} rows. Skewness statistics may be unreliable.` })
  }

  const times = fields.filter(f => f.role === 'time')
  if (times.length > 0) {
    const periods = times[0].timePeriods ?? 0
    if (periods === 1) {
      warnings.push({ code: 'one_period_only', message: 'Only 1 time period. Time-based analysis is not possible.' })
    } else if (periods === 2) {
      warnings.push({ code: 'two_period_only', message: 'Only 2 time periods. Do not describe as a trend; use "period-over-period change" instead.' })
    } else if (periods < 3) {
      warnings.push({ code: 'insufficient_time_periods', message: `Only ${periods} time periods detected. Avoid describing as a trend.` })
    }
  }

  return warnings
}

// ---- Catalog ----

function buildCatalog(
  fields: AnalyzeField[],
  warnings: AnalyzeSampleWarning[],
  rowCount: number,
  evidence: AnalyzeEvidence[],
  metricCandidates: MetricCandidate[]
): AnalyzeCatalog {
  const measures = fields.filter(f => f.role === 'measure' || f.role === 'score')
  const dimensions = fields.filter(f => f.role === 'dimension' || f.role === 'status' || f.role === 'geo' || f.role === 'flag')
  const times = fields.filter(f => f.role === 'time')
  const timePeriods = times[0]?.timePeriods ?? 0
  const primaryDimension = dimensions[0]

  const blockedCharts: Array<{ type: string; reason: string }> = []
  const charts: string[] = ['bigvalue', 'table']

  // bar chart
  if (primaryDimension && primaryDimension.distinctCount !== undefined) {
    if (primaryDimension.distinctCount > CHART_THRESHOLDS.bar.hardMaxCategories) {
      blockedCharts.push({ type: 'bar', reason: `TOO_MANY_CATEGORIES: distinctCount=${primaryDimension.distinctCount} > ${CHART_THRESHOLDS.bar.hardMaxCategories} for primary dimension; use table` })
    } else if (primaryDimension.distinctCount >= 2) {
      charts.push('bar')
    }
  }

  // line chart
  if (times.length > 0) {
    if (timePeriods < CHART_THRESHOLDS.line.minTimePeriods) {
      blockedCharts.push({ type: 'line', reason: `INSUFFICIENT_TIME_PERIODS: timePeriods=${timePeriods} < ${CHART_THRESHOLDS.line.minTimePeriods}; need at least ${CHART_THRESHOLDS.line.minTimePeriods} to show a line trend` })
    } else {
      charts.push('line')
      charts.push('area')
    }
  } else {
    blockedCharts.push({ type: 'line', reason: 'NO_TIME_FIELD: no time field detected in dataset' })
  }

  // pie chart
  if (primaryDimension) {
    const dc = primaryDimension.distinctCount ?? 0
    if (dc > CHART_THRESHOLDS.pie.maxSlices) {
      blockedCharts.push({ type: 'pie', reason: `TOO_MANY_SLICES: distinctCount=${dc} > ${CHART_THRESHOLDS.pie.maxSlices} slices; use bar chart instead` })
    } else if (dc >= 2 && measures.length > 0) {
      charts.push('pie')
    }
  }

  // histogram
  if (rowCount < CHART_THRESHOLDS.histogram.minRows) {
    blockedCharts.push({ type: 'histogram', reason: `SMALL_SAMPLE_DISTRIBUTION: rows=${rowCount} < ${CHART_THRESHOLDS.histogram.minRows}; distribution is unreliable` })
  } else if (measures.length > 0) {
    charts.push('histogram')
  }

  // scatter
  if (measures.length < CHART_THRESHOLDS.scatter.minMeasures) {
    blockedCharts.push({ type: 'scatter', reason: `NEEDS_TWO_MEASURES: fewer than ${CHART_THRESHOLDS.scatter.minMeasures} numeric measure fields; scatter requires x and y measures` })
  } else {
    charts.push('scatter')
  }

  const recommendedPlan = buildRecommendedPlan(charts, fields)

  const partialCatalog = { charts, blockedCharts, recommendedPlan }
  const matchCtx: BlockMatchContext = { fields, evidence, catalog: partialCatalog, sampleWarnings: warnings, metricCandidates }

  const blocks: AnalyzeCatalog['blocks'] = []
  const blockedBlocks: AnalyzeCatalog['blockedBlocks'] = []

  for (const resolver of BLOCK_REGISTRY) {
    const decision = resolver.canUse(matchCtx)
    if (decision.ok && decision.score >= 0.5) {
      blocks.push(toCatalogBlockEntry(resolver, decision, matchCtx))
    } else {
      blockedBlocks.push({ id: resolver.id, reason: decision.reason ?? `score=${decision.score.toFixed(2)} < 0.5` })
    }
  }
  blocks.sort((a, b) => b.score - a.score)
  const templateCatalog = buildTemplateCatalog(matchCtx)

  return { charts, blockedCharts, recommendedPlan, blocks, blockedBlocks, ...templateCatalog }
}

function buildRecommendedPlan(
  charts: string[],
  fields: AnalyzeField[]
): Array<{ type: string; note?: string }> {
  const plan: Array<{ type: string; note?: string }> = []
  const measures = fields.filter(f => f.role === 'measure' || f.role === 'score')
  const dimensions = fields.filter(f => f.role === 'dimension' || f.role === 'status' || f.role === 'geo' || f.role === 'flag')
  const times = fields.filter(f => f.role === 'time')

  if (charts.includes('bigvalue') && measures.length > 0) {
    plan.push({ type: 'bigvalue', note: `show ${measures.slice(0, 2).map(f => f.name).join(', ')} as KPI` })
  }
  if (charts.includes('bar') && dimensions.length > 0 && measures.length > 0) {
    plan.push({ type: 'bar', note: `${measures[0].name} by ${dimensions[0].name}, top N` })
  }
  if (charts.includes('line') && times.length > 0 && measures.length > 0) {
    plan.push({ type: 'line', note: `${measures[0].name} over ${times[0].name}` })
  } else if (charts.includes('bar') && plan.length < 2) {
    plan.push({ type: 'table', note: 'fallback table for full detail view' })
  }

  return plan.slice(0, 3)
}

// ---- Metric candidates ----

function buildMetricCandidates(fields: AnalyzeField[], evidence: AnalyzeEvidence[]): MetricCandidate[] {
  const candidates: MetricCandidate[] = []
  const measures = fields.filter(f => f.role === 'measure' || f.role === 'score')
  const dimensions = fields.filter(f => f.role === 'dimension' || f.role === 'status' || f.role === 'geo' || f.role === 'flag')

  const totalEvidence = evidence.find(e => e.id === 'total')
  const byDimEvidence = evidence.find(e => e.id === 'by_dimension')
  const byTimeEvidence = evidence.find(e => e.id === 'by_time')

  // unit_average: sum-type measure / count-type measure
  const sumMeasures = measures.filter(m => !isCountLike(m.name))
  const countMeasures = measures.filter(m => isCountLike(m.name))
  if (sumMeasures.length > 0 && countMeasures.length > 0 && totalEvidence?.values) {
    const sm = sumMeasures[0]
    const cm = countMeasures[0]
    const sumVal = Number(totalEvidence.values[`total_${sm.name}`] ?? 0)
    const cntVal = Number(totalEvidence.values[`total_${cm.name}`] ?? 0)
    const value = cntVal > 0 ? Math.round(sumVal / cntVal * 100) / 100 : undefined
    candidates.push({
      id: `unit_avg_${sm.name}_per_${cm.name}`,
      type: 'unit_average',
      label: `${sm.name} per ${cm.name}`,
      formula: `sum(${sm.name}) / sum(${cm.name})`,
      value,
      confidence: 'high'
    })
  }

  // share: top dimension entry's fraction of total measure
  if (byDimEvidence?.rows && byDimEvidence.rows.length > 0 && dimensions[0] && measures[0]) {
    const topRow = byDimEvidence.rows[0]
    const dimName = dimensions[0].name
    const mName = measures[0].name
    const dimVal = String(topRow[dimName] ?? '')
    const share = typeof topRow['share'] === 'number' ? topRow['share'] : undefined
    candidates.push({
      id: `share_top_${dimName}`,
      type: 'share',
      label: `Top ${dimName} share of ${mName}`,
      formula: `sum(${mName} where ${dimName}='${dimVal}') / sum(${mName})`,
      value: share,
      confidence: 'high'
    })
  }

  // period_change: (latest - prev) / prev from by_time evidence (only generated when periods >= 3)
  if (byTimeEvidence?.rows && byTimeEvidence.rows.length >= 2 && measures[0]) {
    const rows = byTimeEvidence.rows
    const mName = measures[0].name
    const key = `total_${mName}`
    const latest = Number(rows[rows.length - 1][key] ?? 0)
    const prev = Number(rows[rows.length - 2][key] ?? 0)
    const value = prev !== 0 ? Math.round((latest - prev) / prev * 10000) / 10000 : undefined
    candidates.push({
      id: `period_change_${mName}`,
      type: 'period_change',
      label: `${mName} period-over-period change`,
      formula: `(latest ${mName} - previous ${mName}) / previous ${mName}`,
      value,
      confidence: 'high'
    })
  }

  return candidates
}

function isCountLike(name: string): boolean {
  return /\b(count|order|orders|unit|units|qty|quantity|item|items|transaction|transactions|ticket|tickets|visit|visits|click|clicks|session|sessions)\b/.test(name.toLowerCase())
}

// ---- Prompt rules ----

function buildPromptRules(charts: string[], warnings: AnalyzeSampleWarning[]): string[] {
  const rules: string[] = [
    `Use only chart types listed in catalog.charts: ${charts.join(', ')}.`,
    'Every insight must cite at least one evidence id from the evidence array.',
    'Do not compute new percentages or aggregates. Use values from evidence rows directly.',
  ]
  if (warnings.length > 0) {
    rules.push(
      'Mention sampleWarnings as caveats in related insights. ' +
      'Use language: "在当前样本中" (in this N-row sample) or "based on limited data".'
    )
  }
  return rules
}
