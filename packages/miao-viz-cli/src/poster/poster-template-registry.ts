import { agentError } from '../errors'
import type { BlockMatchContext } from '../report-block-registry'
import type { AgentReportSpec, AgentResult, PosterSlotBlock, VisualIntentFamily } from '../types'

export type PosterTemplateIntent = 'ranking' | 'share' | 'comparison' | 'trend' | 'flow' | 'geo' | 'timeline'
export type PosterDataRole = 'measure' | 'dimension' | 'geo' | 'stage'

export interface PosterTemplateCapacity {
  minCategories?: number
  maxCategories?: number
  minMeasures?: number
  maxMeasures?: number
}

export interface PosterTemplateFallback {
  templateId?: string
  compositionId: string
  reason: string
}

export interface PosterTemplateDecision {
  ok: boolean
  score: number
  reason?: string
}

export interface PosterTemplateDefinition {
  id: string
  label: string
  intent: PosterTemplateIntent
  reportIntents: VisualIntentFamily[]
  bestFor: string[]
  requiredRoles: PosterDataRole[]
  capacity: PosterTemplateCapacity
  compositionId: string
  allowedBlocks: PosterSlotBlock[]
  fallback?: PosterTemplateFallback
  canUse(ctx: BlockMatchContext): PosterTemplateDecision
  instantiate(ctx: BlockMatchContext): AgentReportSpec
}

const readableDimensionRoles = ['dimension', 'status', 'flag', 'geo'] as const

function measures(ctx: BlockMatchContext) {
  return ctx.fields.filter(field => field.role === 'measure' || field.role === 'score')
}

function dimension(ctx: BlockMatchContext) {
  return ctx.fields.find(field => readableDimensionRoles.some(role => field.role === role))
}

function geoDimension(ctx: BlockMatchContext) {
  return ctx.fields.find(field => field.role === 'geo')
}

function categoryDecision(ctx: BlockMatchContext, options: { minMeasures?: number; requireGeo?: boolean; requireFlowIntent?: boolean } = {}): PosterTemplateDecision {
  const dim = options.requireGeo ? geoDimension(ctx) : dimension(ctx)
  const availableMeasures = measures(ctx)
  const minMeasures = options.minMeasures ?? 1
  if (!dim) return { ok: false, score: 0, reason: options.requireGeo ? 'missing required geo dimension' : 'missing required dimension' }
  if (availableMeasures.length < minMeasures) return { ok: false, score: 0, reason: `measure count=${availableMeasures.length} < ${minMeasures}` }
  const count = dim.distinctCount ?? 0
  if (count < 3) return { ok: false, score: 0, reason: `category count=${count} < 3` }
  if (count > 12) return { ok: false, score: 0, reason: `category count=${count} > 12` }
  if (options.requireFlowIntent && !ctx.intent?.visualTasks?.some(task => task.family === 'flow')) {
    return { ok: false, score: 0, reason: 'missing required flow intent' }
  }
  return { ok: true, score: Math.min(0.91, 0.72 + (ctx.evidence.length > 0 ? 0.1 : 0) + (count <= 10 ? 0.09 : 0)) }
}

function rankingSpec(ctx: BlockMatchContext, options: { compositionId: string; title: string; reportTitle?: string; rationale?: string; secondary?: boolean; flow?: boolean; geo?: boolean }): AgentReportSpec {
  const dim = options.geo ? geoDimension(ctx) : dimension(ctx)
  const availableMeasures = measures(ctx)
  const chartId = options.flow ? 'flow-chart' : 'ranking-chart'
  const chartType = options.flow ? 'funnel' as const : 'bar' as const
  const secondaryChartId = options.secondary ? 'comparison-chart' : undefined
  const charts: AgentReportSpec['charts'] = [{
    id: chartId,
    type: chartType,
    title: `${availableMeasures[0]?.name ?? 'Measure'} by ${dim?.name ?? 'Category'}`,
    encoding: { x: { field: dim?.name ?? '' }, y: { field: availableMeasures[0]?.name ?? '' } },
    style: { showValueLabels: true },
    provenance: { evidence: ['by_dimension'], derivedFrom: ['$evidence:by_dimension.rows'] }
  }]
  if (secondaryChartId) {
    charts.push({
      id: secondaryChartId,
      type: 'bar',
      title: `${availableMeasures[1]?.name ?? 'Second measure'} by ${dim?.name ?? 'Category'}`,
      encoding: { x: { field: dim?.name ?? '' }, y: { field: availableMeasures[1]?.name ?? '' } },
      style: { showValueLabels: true },
      provenance: { evidence: ['by_dimension'], derivedFrom: ['$evidence:by_dimension.rows'] }
    })
  }
  return {
    title: options.reportTitle ?? options.title,
    layout: { preset: 'poster' },
    poster: {
      ...(options.compositionId === 'ranked-story' ? { template: 'data-poster-ranking' as const } : {}),
      composition: options.compositionId,
      theme: 'editorial-light',
      selection: { source: 'auto', rationale: [options.rationale ?? `${options.compositionId} requirements matched`], confidence: 0.8 },
      chartId,
      ...(secondaryChartId ? { secondaryChartId } : {}),
      hero: { title: options.title },
      footer: { source: 'Source: local dataset' },
      chart: { sort: 'desc', maxItems: 10 }
    },
    charts
  }
}

export const POSTER_TEMPLATE_REGISTRY: PosterTemplateDefinition[] = [
  {
    id: 'data-poster-trend', label: 'Data Poster Trend', intent: 'trend', reportIntents: ['trend', 'change'],
    bestFor: ['time series poster', 'change over time'], requiredRoles: ['measure'], capacity: { minMeasures: 1, maxMeasures: 2 },
    compositionId: 'trend-story', allowedBlocks: ['hero', 'callout', 'chart', 'decorative', 'footer'],
    fallback: { templateId: 'data-poster-ranking', compositionId: 'ranked-story', reason: 'Use ranking when no usable time field is available.' },
    canUse: ctx => {
      const time = ctx.fields.find(field => field.role === 'time')
      const measure = measures(ctx)[0]
      const periods = time?.timePeriods ?? 0
      if (!time || !measure) return { ok: false, score: 0, reason: 'trend requires time and measure fields' }
      if (periods < 3) return { ok: false, score: 0, reason: `timePeriods=${periods} < 3` }
      return { ok: true, score: Math.min(0.93, 0.76 + (ctx.evidence.length > 0 ? 0.1 : 0) + (periods >= 6 ? 0.07 : 0)) }
    },
    instantiate: ctx => {
      const time = ctx.fields.find(field => field.role === 'time')?.name ?? ''
      const measure = measures(ctx)[0]?.name ?? ''
      const chartId = 'trend-chart'
      return { title: 'Miao Vision Trend Poster', layout: { preset: 'poster' }, poster: { template: 'data-poster-trend', composition: 'trend-story', theme: 'editorial-light', chartId, hero: { title: 'Trend Over Time' }, footer: { source: 'Source: local dataset' }, chart: { sort: 'desc', maxItems: 10 } }, charts: [{ id: chartId, type: 'line', title: `${measure} over ${time}`, encoding: { x: { field: time }, y: { field: measure } }, provenance: { evidence: ['by_time'], derivedFrom: ['$evidence:by_time.rows'] } }] }
    }
  },
  {
    id: 'content-poster-timeline', label: 'Content Poster Timeline', intent: 'timeline', reportIntents: [],
    bestFor: ['history timeline', 'product evolution', 'event chronology'],
    requiredRoles: [], capacity: { minCategories: 3, maxCategories: 12 },
    compositionId: 'timeline-story', allowedBlocks: ['hero', 'callout', 'chart', 'decorative', 'footer'],
    canUse: ctx => {
      const textFields = ctx.fields.filter(field => field.role === 'text')
      const ordered = ctx.fields.some(field => field.role === 'time' || field.role === 'measure')
      if (textFields.length < 2 || !ordered) return { ok: false, score: 0, reason: 'timeline requires ordered field and title/description text fields' }
      return { ok: true, score: 0.88 }
    },
    instantiate: ctx => {
      const ordered = ctx.fields.find(field => field.role === 'time' || field.role === 'measure')?.name ?? ''
      const textFields = ctx.fields.filter(field => field.role === 'text').map(field => field.name)
      const chartId = 'timeline-chart'
      return {
        title: 'Miao Vision Timeline', layout: { preset: 'poster' },
        poster: { template: 'content-poster-timeline', composition: 'timeline-story', theme: 'editorial-light', chartId, hero: { title: 'Timeline' }, footer: { source: 'Source: local timeline input' }, timeline: { roles: { order: ordered, timeLabel: ordered, title: textFields[0] ?? '', description: textFields[1] ?? '' } } },
        charts: [{ id: chartId, type: 'infographic-flow', title: 'Timeline', encoding: { x: { field: ordered }, y: { field: ordered } } }]
      }
    }
  },
  {
    id: 'data-poster-share', label: 'Data Poster Share', intent: 'share', reportIntents: ['composition'],
    bestFor: ['part-to-whole composition', '100% stacked category comparison'],
    requiredRoles: ['measure', 'dimension'], capacity: { minCategories: 3, maxCategories: 12, minMeasures: 1 },
    compositionId: 'share-story', allowedBlocks: ['hero', 'callout', 'chart', 'decorative', 'footer'],
    fallback: { templateId: 'data-poster-ranking', compositionId: 'ranked-story', reason: 'Use ranking when no series field is available.' },
    canUse: ctx => {
      const decision = categoryDecision(ctx)
      const dimensions = ctx.fields.filter(field => ['dimension', 'status', 'flag'].includes(field.role))
      if (!decision.ok) return decision
      if (dimensions.length < 2) return { ok: false, score: 0, reason: 'share requires category and series dimensions' }
      return { ok: true, score: Math.min(0.94, decision.score + 0.03) }
    },
    instantiate: ctx => {
      const spec = rankingSpec(ctx, { compositionId: 'share-story', title: 'Composition by Category' })
      const dimensions = ctx.fields.filter(field => ['dimension', 'status', 'flag'].includes(field.role))
      const measure = measures(ctx)[0]
      const chart = spec.charts[0]
      chart.variant = 'horizontal'
      chart.encoding = { x: { field: dimensions[0]?.name ?? '' }, y: { field: measure?.name ?? '' }, color: { field: dimensions[1]?.name ?? '' } }
      chart.style = { ...chart.style, barMode: 'stacked', showValueLabels: true }
      spec.poster = { ...spec.poster!, template: 'data-poster-share', share: { normalize: '100%', categoryField: dimensions[0]?.name, seriesField: dimensions[1]?.name, valueField: measure?.name } }
      return spec
    }
  },
  {
    id: 'data-poster-ranking', label: 'Data Poster Ranking', intent: 'ranking', reportIntents: ['ranking', 'comparison'],
    bestFor: ['single-page ranking poster', 'shareable category comparison', 'static data story'],
    requiredRoles: ['measure', 'dimension'], capacity: { minCategories: 3, maxCategories: 12, minMeasures: 1 },
    compositionId: 'ranked-story', allowedBlocks: ['hero', 'callout', 'chart', 'decorative', 'footer'],
    canUse: ctx => categoryDecision(ctx),
    instantiate: ctx => rankingSpec(ctx, {
      compositionId: 'ranked-story',
      title: 'Category Ranking',
      reportTitle: 'Miao Vision Data Poster',
      rationale: 'ranking intent and readable categorical dimension detected'
    })
  },
  {
    id: 'data-poster-comparison', label: 'Data Poster Comparison', intent: 'comparison', reportIntents: ['comparison'],
    bestFor: ['two-measure category comparison', 'side-by-side ranking poster'],
    requiredRoles: ['measure', 'dimension'], capacity: { minCategories: 3, maxCategories: 12, minMeasures: 2, maxMeasures: 2 },
    compositionId: 'comparison-story', allowedBlocks: ['hero', 'callout', 'chart', 'decorative', 'footer'],
    fallback: { templateId: 'data-poster-ranking', compositionId: 'ranked-story', reason: 'Use a ranking poster when only one measure is available.' },
    canUse: ctx => categoryDecision(ctx, { minMeasures: 2 }),
    instantiate: ctx => rankingSpec(ctx, { compositionId: 'comparison-story', title: 'Category Comparison', secondary: true })
  },
  {
    id: 'data-poster-flow', label: 'Data Poster Flow', intent: 'flow', reportIntents: ['flow'],
    bestFor: ['stage conversion poster', 'ordered process flow'],
    requiredRoles: ['measure', 'stage'], capacity: { minCategories: 3, maxCategories: 12, minMeasures: 1 },
    compositionId: 'flow-story', allowedBlocks: ['hero', 'callout', 'chart', 'decorative', 'footer'],
    fallback: { templateId: 'data-poster-ranking', compositionId: 'ranked-story', reason: 'Use ranking when stage intent is unavailable.' },
    canUse: ctx => categoryDecision(ctx, { requireFlowIntent: true }),
    instantiate: ctx => rankingSpec(ctx, { compositionId: 'flow-story', title: 'Stage Flow', flow: true })
  },
  {
    id: 'data-poster-geo', label: 'Data Poster Geography', intent: 'geo', reportIntents: ['geo'],
    bestFor: ['geographic category ranking', 'local-first geo comparison'],
    requiredRoles: ['measure', 'geo'], capacity: { minCategories: 3, maxCategories: 12, minMeasures: 1 },
    compositionId: 'geo-ranking-story', allowedBlocks: ['hero', 'callout', 'chart', 'decorative', 'footer'],
    fallback: { compositionId: 'geo-ranking-story', reason: 'Use geographic ranking until local map rendering is available.' },
    canUse: ctx => categoryDecision(ctx, { requireGeo: true }),
    instantiate: ctx => rankingSpec(ctx, { compositionId: 'geo-ranking-story', title: 'Geographic Ranking', geo: true })
  }
]

export function getPosterTemplateById(id: string): PosterTemplateDefinition | undefined {
  return POSTER_TEMPLATE_REGISTRY.find(template => template.id === id)
}

export function resolvePosterTemplateById(id: string): AgentResult<PosterTemplateDefinition> {
  const template = getPosterTemplateById(id)
  return template
    ? { ok: true, value: template }
    : agentError('POSTER_TEMPLATE_UNKNOWN', `Poster template '${id}' is not registered.`, {
      templateId: id,
      availableIds: POSTER_TEMPLATE_REGISTRY.map(item => item.id)
    })
}
