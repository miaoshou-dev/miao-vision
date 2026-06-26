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
import { BLOCK_REGISTRY, toCatalogBlockEntry } from './report-block-registry'
import type { BlockMatchContext } from './report-block-registry'

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

  const catalog = buildCatalog(fields, sampleWarnings, profile.rows, evidence)
  const promptRules = buildPromptRules(catalog.charts, sampleWarnings)
  const metricCandidates = buildMetricCandidates(fields, evidence)

  return { intent, fields, evidence, catalog, sampleWarnings, promptRules, metricCandidates }
}

// ---- Field role identification ----

function buildAnalyzeFields(columns: ColumnProfile[]): AnalyzeField[] {
  return columns.map(col => {
    const role = refineRole(col)
    const field: AnalyzeField = {
      name: col.name,
      role,
      type: mapType(col.type),
      distinctCount: col.distinctCount
    }
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

function refineRole(col: ColumnProfile): AnalyzeField['role'] {
  if (col.type === 'date') return 'time'
  if (col.type === 'boolean') return 'status'
  if (col.role === 'id') return 'id'
  if (col.type === 'number') {
    const name = col.name.toLowerCase()
    if (/\b(score|rating|grade|rank|level|index)\b/.test(name)) return 'score'
    return 'measure'
  }
  if (col.type === 'string') {
    const name = col.name.toLowerCase()
    if (/\b(status|state|phase|stage|flag|type|category|tier)\b/.test(name) &&
        col.distinctCount <= 10) return 'status'
    if (col.role === 'id') return 'id'
    return 'dimension'
  }
  return 'unknown'
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

// ---- Intent parsing ----

function parseIntent(
  raw: string,
  fields: AnalyzeField[],
  correctAssumption?: string
): AnalyzeContext['intent'] {
  const measures = fields.filter(f => f.role === 'measure' || f.role === 'score')
  const dimensions = fields.filter(f => f.role === 'dimension' || f.role === 'status')
  const times = fields.filter(f => f.role === 'time')

  let primaryMeasure = measures[0]?.name
  let primaryDimension = dimensions[0]?.name

  // Apply user corrections
  if (correctAssumption) {
    const m = correctAssumption.match(/^primary_measure=(\w+)$/)
    const d = correctAssumption.match(/^primary_dimension=(\w+)$/)
    if (m) primaryMeasure = m[1]
    if (d) primaryDimension = d[1]
  }

  const assumptions: string[] = []
  if (primaryMeasure) {
    const verify = measures.length > 1 ? ` (verify: ${measures.map(f => f.name).join(', ')} — choose with --correct-assumption primary_measure=<name>)` : ''
    assumptions.push(`primary measure is "${primaryMeasure}"${verify}`)
  }
  if (primaryDimension) {
    assumptions.push(`primary dimension is "${primaryDimension}"`)
  }
  if (times.length > 0) {
    const t = times[0]
    const verify = times.length > 1 ? ` (verify: ${times.map(f => f.name).join(', ')})` : ''
    assumptions.push(`time field is "${t.name}"${verify}`)
  }
  if (measures.length === 0) {
    assumptions.push('no numeric measure detected — use --correct-assumption primary_measure=<col>')
  }

  const rawLower = raw.toLowerCase()
  const wantsTrend = /trend|over time|by month|by year/.test(rawLower)
  const timePeriods = times[0] ? (times[0].timePeriods ?? 0) : 0
  const coverage = (wantsTrend && timePeriods < 3) ? 'partial' : 'full'

  return { raw: raw || '(no intent specified)', coverage, assumptions }
}

// ---- Standard queries ----

function runStandardQueries(
  dataset: LoadedDataset,
  fields: AnalyzeField[],
  sampleWarnings: AnalyzeSampleWarning[]
): AnalyzeEvidence[] {
  const evidence: AnalyzeEvidence[] = []
  const measures = fields.filter(f => f.role === 'measure' || f.role === 'score')
  const dimensions = fields.filter(f => f.role === 'dimension' || f.role === 'status')
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
    const result = queryDataset(dataset.rows, { measure: measureExpr })
    if (result && 'rows' in result && result.rows.length > 0) {
      evidence.push({
        id: 'total',
        query: `Total aggregates: ${measureExpr}`,
        values: result.rows[0]
      })
    }
  }

  // Query 2: by_dimension
  if (primaryMeasure && primaryDimension) {
    const measureExpr = `sum(${primaryMeasure.name}) as total_${primaryMeasure.name}, count(*) as row_count`
    const result = queryDataset(dataset.rows, {
      groupby: primaryDimension.name,
      measure: measureExpr,
      orderby: `total_${primaryMeasure.name} desc`
    })
    if (result && 'rows' in result && result.rows.length > 0) {
      // Compute share
      const totalVal = result.rows.reduce((s, r) => s + Number(r[`total_${primaryMeasure.name}`] ?? 0), 0)
      const rows = result.rows.map(r => {
        const val = Number(r[`total_${primaryMeasure.name}`] ?? 0)
        return { ...r, share: totalVal > 0 ? Math.round(val / totalVal * 10000) / 10000 : 0 }
      })
      evidence.push({
        id: 'by_dimension',
        query: `${primaryMeasure.name} by ${primaryDimension.name}, with share`,
        rows
      })
    }
  }

  // Query 3: by_time (only if timePeriods >= 2 to avoid noise)
  const hasInsufficientTime = sampleWarnings.some(w => w.code === 'two_period_only' || w.code === 'one_period_only')
  if (primaryMeasure && primaryTime && !hasInsufficientTime) {
    const measureExpr = `sum(${primaryMeasure.name}) as total_${primaryMeasure.name}`
    const result = queryDataset(dataset.rows, {
      groupby: primaryTime.name,
      measure: measureExpr,
      orderby: `${primaryTime.name} asc`
    })
    if (result && 'rows' in result && result.rows.length > 0) {
      evidence.push({
        id: 'by_time',
        query: `${primaryMeasure.name} by ${primaryTime.name} (ascending)`,
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
  // extraQuery format: "groupby=col,measure=fn(col) as alias,filter=col>=val"
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
  if (!result || !('rows' in result)) return null
  return {
    id: `extra_${existingCount + 1}`,
    query: `Custom query: ${extraQuery}`,
    rows: result.rows
  }
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
  evidence: AnalyzeEvidence[]
): AnalyzeCatalog {
  const measures = fields.filter(f => f.role === 'measure' || f.role === 'score')
  const dimensions = fields.filter(f => f.role === 'dimension' || f.role === 'status')
  const times = fields.filter(f => f.role === 'time')
  const timePeriods = times[0]?.timePeriods ?? 0
  const primaryDimension = dimensions[0]

  const blockedCharts: Array<{ type: string; reason: string }> = []
  const charts: string[] = ['bigvalue', 'table']

  // bar chart
  if (primaryDimension && primaryDimension.distinctCount !== undefined) {
    if (primaryDimension.distinctCount > 30) {
      blockedCharts.push({ type: 'bar', reason: `distinctCount=${primaryDimension.distinctCount} > 30 for primary dimension; use table` })
    } else if (primaryDimension.distinctCount >= 2) {
      charts.push('bar')
    }
  }

  // line chart
  if (times.length > 0) {
    if (timePeriods < 3) {
      blockedCharts.push({ type: 'line', reason: `timePeriods=${timePeriods} < 3; need at least 3 to show a line trend` })
    } else {
      charts.push('line')
      charts.push('area')
    }
  } else {
    blockedCharts.push({ type: 'line', reason: 'no time field detected in dataset' })
  }

  // pie chart
  if (primaryDimension) {
    const dc = primaryDimension.distinctCount ?? 0
    if (dc > 7) {
      blockedCharts.push({ type: 'pie', reason: `distinctCount=${dc} > 7 slices; use bar chart instead` })
    } else if (dc >= 2 && measures.length > 0) {
      charts.push('pie')
    }
  }

  // histogram
  if (rowCount < 20) {
    blockedCharts.push({ type: 'histogram', reason: `rows=${rowCount} < 20; distribution is unreliable` })
  } else if (measures.length > 0) {
    charts.push('histogram')
  }

  // scatter
  if (measures.length < 2) {
    blockedCharts.push({ type: 'scatter', reason: 'fewer than 2 numeric measure fields; scatter requires x and y measures' })
  } else {
    charts.push('scatter')
  }

  const recommendedPlan = buildRecommendedPlan(charts, fields)

  const partialCatalog = { charts, blockedCharts, recommendedPlan }
  const matchCtx: BlockMatchContext = { fields, evidence, catalog: partialCatalog, sampleWarnings: warnings }

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

  return { charts, blockedCharts, recommendedPlan, blocks, blockedBlocks }
}

function buildRecommendedPlan(
  charts: string[],
  fields: AnalyzeField[]
): Array<{ type: string; note?: string }> {
  const plan: Array<{ type: string; note?: string }> = []
  const measures = fields.filter(f => f.role === 'measure' || f.role === 'score')
  const dimensions = fields.filter(f => f.role === 'dimension' || f.role === 'status')
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
  const dimensions = fields.filter(f => f.role === 'dimension' || f.role === 'status')

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
