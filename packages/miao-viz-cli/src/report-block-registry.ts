import type { AnalyzeContext, AnalyzeField, CatalogBlockEntry } from './context-schema'
import type { AgentChartSpec } from './types'

// Subset of AnalyzeContext available when block matching runs (catalog is being built)
export interface BlockMatchContext {
  fields: AnalyzeField[]
  evidence: AnalyzeContext['evidence']
  catalog: AnalyzeContext['catalog']
  sampleWarnings: AnalyzeContext['sampleWarnings']
}

export interface BlockDecision {
  ok: boolean
  score: number   // 0–1; ≥0.9 strong match, 0.5–0.9 usable, <0.5 not recommended
  reason?: string // set when ok=false, e.g. "timePeriods=2 < 3"
  warnings?: string[]
}

export interface BlockVariableDef {
  type: 'field' | 'number' | 'string' | 'enum'
  role?: 'measure' | 'dimension' | 'time'
  description: string
  default?: string | number
  min?: number
  max?: number
  enumValues?: string[]
  required: boolean
}

export interface ReportBlockResolver {
  id: string
  description: string
  bestFor: string[]
  density: 'compact' | 'medium' | 'full'
  examplePrompt: string
  variables: Record<string, BlockVariableDef>
  qualityChecks: string[]

  canUse(ctx: BlockMatchContext): BlockDecision
  defaultVariables(ctx: BlockMatchContext): Record<string, unknown>
  compile(variables: Record<string, unknown>, ctx: BlockMatchContext): { charts: AgentChartSpec[]; insights?: string[] }
}

// ---- Scoring helpers ----

function scoreCatalogCoverage(chartTypes: string[], ctx: BlockMatchContext): number {
  const allAvailable = chartTypes.every(t => ctx.catalog.charts.includes(t))
  return allAvailable ? 0.2 : 0
}

function scoreDimQuality(dim: AnalyzeField | undefined): number {
  if (!dim) return 0
  const dc = dim.distinctCount ?? 0
  return dc >= 2 && dc <= 20 ? 0.1 : 0
}

function scoreEvidenceCoverage(ctx: BlockMatchContext): number {
  return ctx.evidence.length > 0 ? 0.1 : 0
}

function scoreTimePeriods(fields: AnalyzeField[]): number {
  const time = fields.find(f => f.role === 'time')
  if (!time) return 0
  const periods = time.timePeriods ?? 0
  return Math.min(periods / 3, 1) * 0.1
}

// ---- Chart spec builders ----

function buildKpiChart(measure: string): AgentChartSpec {
  const alias = `total_${measure}`
  return {
    id: `kpi_total_${measure}`,
    type: 'bigvalue',
    title: `Total ${measure}`,
    data: {
      transform: [
        { type: 'aggregate', measures: [{ field: measure, op: 'sum', as: alias }] }
      ]
    },
    encoding: { value: { field: alias, type: 'quantitative' } }
  }
}

function buildBarChart(measure: string, dimension: string, topN: number): AgentChartSpec {
  const alias = `total_${measure}`
  return {
    id: `ranking_by_${dimension}`,
    type: 'bar',
    title: `${measure} by ${dimension}`,
    data: {
      transform: [
        { type: 'aggregate', groupBy: [dimension], measures: [{ field: measure, op: 'sum', as: alias }] },
        { type: 'sort', field: alias, order: 'desc' },
        { type: 'limit', value: topN }
      ]
    },
    encoding: {
      x: { field: dimension, type: 'nominal' },
      y: { field: alias, type: 'quantitative' }
    }
  }
}

function buildLineChart(measure: string, timeField: string): AgentChartSpec {
  const alias = `total_${measure}`
  return {
    id: `trend_by_${timeField}`,
    type: 'line',
    title: `${measure} over ${timeField}`,
    data: {
      transform: [
        { type: 'aggregate', groupBy: [timeField], measures: [{ field: measure, op: 'sum', as: alias }] },
        { type: 'sort', field: timeField, order: 'asc' }
      ]
    },
    encoding: {
      x: { field: timeField, type: 'temporal' },
      y: { field: alias, type: 'quantitative' }
    }
  }
}

function buildPieChart(measure: string, dimension: string): AgentChartSpec {
  const alias = `total_${measure}`
  return {
    id: `share_by_${dimension}`,
    type: 'pie',
    title: `${measure} share by ${dimension}`,
    data: {
      transform: [
        { type: 'aggregate', groupBy: [dimension], measures: [{ field: measure, op: 'sum', as: alias }] },
        { type: 'sort', field: alias, order: 'desc' },
        { type: 'limit', value: 7 }
      ]
    },
    encoding: {
      label: { field: dimension, type: 'nominal' },
      value: { field: alias, type: 'quantitative' }
    }
  }
}

function buildTableChart(measure: string, dimension: string): AgentChartSpec {
  const alias = `total_${measure}`
  return {
    id: 'detail_table',
    type: 'table',
    title: 'Full Detail',
    data: {
      transform: [
        { type: 'aggregate', groupBy: [dimension], measures: [{ field: measure, op: 'sum', as: alias }] },
        { type: 'sort', field: alias, order: 'desc' }
      ]
    },
    encoding: {}
  }
}

// ---- Resolver implementations ----

const kpiSummary: ReportBlockResolver = {
  id: 'kpi-summary',
  description: 'One or more KPI cards showing total metrics at a glance.',
  bestFor: ['executive summary', 'single-metric overview', 'no dimension breakdown needed'],
  density: 'compact',
  examplePrompt: 'Show me the total sales and order count',
  variables: {
    primaryMeasure: { type: 'field', role: 'measure', description: 'Main metric to display as KPI', required: true }
  },
  qualityChecks: ['Do not exceed 4 bigvalue cards per report'],

  canUse(ctx) {
    const measures = ctx.fields.filter(f => f.role === 'measure' || f.role === 'score')
    if (measures.length === 0) return { ok: false, score: 0, reason: 'no numeric measure field' }
    const score = 0.5
      + scoreCatalogCoverage(['bigvalue'], ctx)
      + scoreEvidenceCoverage(ctx)
    return { ok: true, score: Math.min(score, 1) }
  },

  defaultVariables(ctx) {
    const measure = ctx.fields.find(f => f.role === 'measure' || f.role === 'score')
    return { primaryMeasure: measure?.name ?? '' }
  },

  compile(variables, _ctx) {
    const measure = String(variables.primaryMeasure)
    return { charts: [buildKpiChart(measure)] }
  }
}

const snapshotRanking: ReportBlockResolver = {
  id: 'snapshot-ranking',
  description: 'KPI card + ranked bar chart. Best for static snapshots without a time dimension.',
  bestFor: ['regional ranking', 'category comparison', 'top-N with no time axis'],
  density: 'compact',
  examplePrompt: 'Show me sales by region, top 10',
  variables: {
    primaryMeasure: { type: 'field', role: 'measure', description: 'Metric to rank by', required: true },
    primaryDimension: { type: 'field', role: 'dimension', description: 'Dimension to group by', required: true },
    topN: { type: 'number', description: 'Number of top rows to show', default: 10, min: 3, max: 50, required: false }
  },
  qualityChecks: [
    'bar chart has sort (desc) + limit — verify transform order',
    'Do not exceed 4 bigvalue cards',
    'Add caveat if context.json contains sampleWarnings'
  ],

  canUse(ctx) {
    const measures = ctx.fields.filter(f => f.role === 'measure' || f.role === 'score')
    const dimensions = ctx.fields.filter(f => f.role === 'dimension' || f.role === 'status')
    if (measures.length === 0) return { ok: false, score: 0, reason: 'no numeric measure field' }
    if (dimensions.length === 0) return { ok: false, score: 0, reason: 'no dimension field' }
    const score = 0.5
      + scoreCatalogCoverage(['bigvalue', 'bar'], ctx)
      + scoreDimQuality(dimensions[0])
      + scoreEvidenceCoverage(ctx)
    return { ok: true, score: Math.min(score, 1) }
  },

  defaultVariables(ctx) {
    const measure = ctx.fields.find(f => f.role === 'measure' || f.role === 'score')
    const dimension = ctx.fields.find(f => f.role === 'dimension' || f.role === 'status')
    return { primaryMeasure: measure?.name ?? '', primaryDimension: dimension?.name ?? '', topN: 10 }
  },

  compile(variables, _ctx) {
    const measure = String(variables.primaryMeasure)
    const dimension = String(variables.primaryDimension)
    const topN = Number(variables.topN ?? 10)
    return {
      charts: [buildKpiChart(measure), buildBarChart(measure, dimension, topN)],
      insights: []
    }
  }
}

const trendOverview: ReportBlockResolver = {
  id: 'trend-overview',
  description: 'KPI card + line chart. For datasets with a time dimension and ≥3 periods.',
  bestFor: ['time series trend', 'monthly/quarterly overview', 'single measure over time'],
  density: 'compact',
  examplePrompt: 'Show me sales trend over time',
  variables: {
    primaryMeasure: { type: 'field', role: 'measure', description: 'Metric to trend', required: true },
    timeField: { type: 'field', role: 'time', description: 'Time dimension field', required: true }
  },
  qualityChecks: [
    'line chart has sort asc on time field — already included',
    'Add caveat if timePeriods is limited (< 6)'
  ],

  canUse(ctx) {
    const measures = ctx.fields.filter(f => f.role === 'measure' || f.role === 'score')
    const times = ctx.fields.filter(f => f.role === 'time')
    if (measures.length === 0) return { ok: false, score: 0, reason: 'no numeric measure field' }
    if (times.length === 0) return { ok: false, score: 0, reason: 'no time field detected' }
    const timePeriods = times[0].timePeriods ?? 0
    if (timePeriods < 3) return { ok: false, score: 0, reason: `timePeriods=${timePeriods} < 3` }
    const score = 0.5
      + scoreCatalogCoverage(['bigvalue', 'line'], ctx)
      + scoreTimePeriods(ctx.fields)
      + scoreEvidenceCoverage(ctx)
    return { ok: true, score: Math.min(score, 1) }
  },

  defaultVariables(ctx) {
    const measure = ctx.fields.find(f => f.role === 'measure' || f.role === 'score')
    const time = ctx.fields.find(f => f.role === 'time')
    return { primaryMeasure: measure?.name ?? '', timeField: time?.name ?? '' }
  },

  compile(variables, _ctx) {
    const measure = String(variables.primaryMeasure)
    const timeField = String(variables.timeField)
    return {
      charts: [buildKpiChart(measure), buildLineChart(measure, timeField)],
      insights: []
    }
  }
}

const comparisonBreakdown: ReportBlockResolver = {
  id: 'comparison-breakdown',
  description: 'Bar chart + pie chart for dual-angle breakdown of a measure by one dimension.',
  bestFor: ['category share', 'part-to-whole analysis', 'bar + pie dual view'],
  density: 'medium',
  examplePrompt: 'Break down revenue by product category, show both ranking and share',
  variables: {
    primaryMeasure: { type: 'field', role: 'measure', description: 'Metric to break down', required: true },
    primaryDimension: { type: 'field', role: 'dimension', description: 'Grouping dimension', required: true },
    topN: { type: 'number', description: 'Top N bars to show', default: 10, min: 3, max: 20, required: false }
  },
  qualityChecks: [
    'pie chart limited to ≤7 slices — already enforced',
    'bar top-N for long-tail dimensions'
  ],

  canUse(ctx) {
    const measures = ctx.fields.filter(f => f.role === 'measure' || f.role === 'score')
    const dimensions = ctx.fields.filter(f => f.role === 'dimension' || f.role === 'status')
    if (measures.length === 0) return { ok: false, score: 0, reason: 'no numeric measure field' }
    if (dimensions.length === 0) return { ok: false, score: 0, reason: 'no dimension field' }
    const dim = dimensions[0]
    const dc = dim.distinctCount ?? 0
    if (dc > 20) return { ok: false, score: 0, reason: `distinctCount=${dc} > 20; pie would have too many slices` }
    const score = 0.5
      + scoreCatalogCoverage(['bar', 'pie'], ctx)
      + scoreDimQuality(dim)
      + scoreEvidenceCoverage(ctx)
    return { ok: true, score: Math.min(score, 1) }
  },

  defaultVariables(ctx) {
    const measure = ctx.fields.find(f => f.role === 'measure' || f.role === 'score')
    const dimension = ctx.fields.find(f => f.role === 'dimension' || f.role === 'status')
    return { primaryMeasure: measure?.name ?? '', primaryDimension: dimension?.name ?? '', topN: 10 }
  },

  compile(variables, _ctx) {
    const measure = String(variables.primaryMeasure)
    const dimension = String(variables.primaryDimension)
    const topN = Number(variables.topN ?? 10)
    return {
      charts: [buildBarChart(measure, dimension, topN), buildPieChart(measure, dimension)],
      insights: []
    }
  }
}

const trendRanking: ReportBlockResolver = {
  id: 'trend-ranking',
  description: 'KPI + line trend + ranking bar. Executive summary combining time and category views.',
  bestFor: ['executive summary', 'monthly review with category breakdown', 'combined trend + ranking'],
  density: 'full',
  examplePrompt: 'Show me sales trend and which regions are performing best',
  variables: {
    primaryMeasure: { type: 'field', role: 'measure', description: 'Main metric', required: true },
    primaryDimension: { type: 'field', role: 'dimension', description: 'Ranking dimension', required: true },
    timeField: { type: 'field', role: 'time', description: 'Time dimension', required: true },
    topN: { type: 'number', description: 'Top N bars in ranking', default: 5, min: 3, max: 10, required: false }
  },
  qualityChecks: [
    'line chart sort asc on time field — already included',
    'bar chart sort desc + limit — already included',
    'Add caveat if sampleWarnings present'
  ],

  canUse(ctx) {
    const measures = ctx.fields.filter(f => f.role === 'measure' || f.role === 'score')
    const dimensions = ctx.fields.filter(f => f.role === 'dimension' || f.role === 'status')
    const times = ctx.fields.filter(f => f.role === 'time')
    if (measures.length === 0) return { ok: false, score: 0, reason: 'no numeric measure field' }
    if (dimensions.length === 0) return { ok: false, score: 0, reason: 'no dimension field' }
    if (times.length === 0) return { ok: false, score: 0, reason: 'no time field detected' }
    const timePeriods = times[0].timePeriods ?? 0
    if (timePeriods < 3) return { ok: false, score: 0, reason: `timePeriods=${timePeriods} < 3` }
    const score = 0.5
      + scoreCatalogCoverage(['bigvalue', 'line', 'bar'], ctx)
      + scoreTimePeriods(ctx.fields)
      + scoreDimQuality(dimensions[0])
    return { ok: true, score: Math.min(score, 1) }
  },

  defaultVariables(ctx) {
    const measure = ctx.fields.find(f => f.role === 'measure' || f.role === 'score')
    const dimension = ctx.fields.find(f => f.role === 'dimension' || f.role === 'status')
    const time = ctx.fields.find(f => f.role === 'time')
    return { primaryMeasure: measure?.name ?? '', primaryDimension: dimension?.name ?? '', timeField: time?.name ?? '', topN: 5 }
  },

  compile(variables, _ctx) {
    const measure = String(variables.primaryMeasure)
    const dimension = String(variables.primaryDimension)
    const timeField = String(variables.timeField)
    const topN = Number(variables.topN ?? 5)
    return {
      charts: [
        buildKpiChart(measure),
        buildLineChart(measure, timeField),
        buildBarChart(measure, dimension, topN)
      ],
      insights: []
    }
  }
}

const fullDetailReport: ReportBlockResolver = {
  id: 'full-detail-report',
  description: 'Complete report: KPI + trend line + ranking bar + detail table.',
  bestFor: ['comprehensive analysis', 'full business review', 'all-in-one report'],
  density: 'full',
  examplePrompt: 'Give me a complete analysis of our sales performance',
  variables: {
    primaryMeasure: { type: 'field', role: 'measure', description: 'Main metric', required: true },
    primaryDimension: { type: 'field', role: 'dimension', description: 'Grouping dimension', required: true },
    timeField: { type: 'field', role: 'time', description: 'Time dimension', required: true },
    topN: { type: 'number', description: 'Top N in ranking bar', default: 5, min: 3, max: 10, required: false }
  },
  qualityChecks: [
    'total chart count is 4 — within V01 limit of 6',
    'line chart sort asc on time field — already included',
    'bar chart sort desc + limit — already included',
    'Add caveat if sampleWarnings present',
    'Table shows aggregated rows, not raw rows'
  ],

  canUse(ctx) {
    const measures = ctx.fields.filter(f => f.role === 'measure' || f.role === 'score')
    const dimensions = ctx.fields.filter(f => f.role === 'dimension' || f.role === 'status')
    const times = ctx.fields.filter(f => f.role === 'time')
    if (measures.length === 0) return { ok: false, score: 0, reason: 'no numeric measure field' }
    if (dimensions.length === 0) return { ok: false, score: 0, reason: 'no dimension field' }
    if (times.length === 0) return { ok: false, score: 0, reason: 'no time field detected' }
    const timePeriods = times[0].timePeriods ?? 0
    if (timePeriods < 3) return { ok: false, score: 0, reason: `timePeriods=${timePeriods} < 3` }
    const score = 0.5
      + scoreCatalogCoverage(['bigvalue', 'line', 'bar', 'table'], ctx)
      + scoreTimePeriods(ctx.fields)
      + scoreDimQuality(dimensions[0])
    return { ok: true, score: Math.min(score, 1) }
  },

  defaultVariables(ctx) {
    const measure = ctx.fields.find(f => f.role === 'measure' || f.role === 'score')
    const dimension = ctx.fields.find(f => f.role === 'dimension' || f.role === 'status')
    const time = ctx.fields.find(f => f.role === 'time')
    return { primaryMeasure: measure?.name ?? '', primaryDimension: dimension?.name ?? '', timeField: time?.name ?? '', topN: 5 }
  },

  compile(variables, _ctx) {
    const measure = String(variables.primaryMeasure)
    const dimension = String(variables.primaryDimension)
    const timeField = String(variables.timeField)
    const topN = Number(variables.topN ?? 5)
    return {
      charts: [
        buildKpiChart(measure),
        buildLineChart(measure, timeField),
        buildBarChart(measure, dimension, topN),
        buildTableChart(measure, dimension)
      ],
      insights: []
    }
  }
}

export const BLOCK_REGISTRY: ReportBlockResolver[] = [
  kpiSummary,
  snapshotRanking,
  trendOverview,
  comparisonBreakdown,
  trendRanking,
  fullDetailReport
]

export function getBlockById(id: string): ReportBlockResolver | undefined {
  return BLOCK_REGISTRY.find(b => b.id === id)
}

// Convert a resolver + canUse decision to CatalogBlockEntry (for context.json output)
export function toCatalogBlockEntry(
  resolver: ReportBlockResolver,
  decision: BlockDecision,
  ctx: BlockMatchContext
): CatalogBlockEntry {
  const vars = resolver.defaultVariables(ctx)
  const variables: CatalogBlockEntry['variables'] = {}
  for (const [key, def] of Object.entries(resolver.variables)) {
    variables[key] = {
      type: def.type,
      ...(def.role ? { role: def.role } : {}),
      description: def.description,
      ...(vars[key] !== undefined ? { default: vars[key] as string | number } : {}),
      ...(def.min !== undefined ? { min: def.min } : {}),
      ...(def.max !== undefined ? { max: def.max } : {})
    }
  }
  // Derive chart types from compile output using default variables
  const compiled = resolver.compile(vars, ctx)
  return {
    id: resolver.id,
    score: decision.score,
    description: resolver.description,
    bestFor: resolver.bestFor,
    density: resolver.density,
    examplePrompt: resolver.examplePrompt,
    charts: compiled.charts.map(c => c.type as string),
    variables,
    qualityChecks: resolver.qualityChecks
  }
}
