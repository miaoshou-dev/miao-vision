import { z } from 'zod'
import { queryRecipeSchema } from './query-recipe'
import type { AgentChartSpec, AgentOutputFormat, AgentReportSpec } from './types'

export const MVP_CHART_TYPES = [
  'bar',
  'line',
  'area',
  'pie',
  'scatter',
  'histogram',
  'heatmap',
  'table',
  'bigvalue',
  'progress',
  'sparkline',
  'delta',
  'funnel',
  'gauge',
  'bubble',
  'boxplot',
  'waterfall',
  'radar',
  'calendar',
  'treemap',
  'pivot',
  'sankey',
  'infographic-kpi',
  'infographic-list',
  'infographic-flow',
  'infographic-hierarchy',
  'infographic-comparison',
  'dot',
  'bullet',
  'range'
  ,'pareto'
  ,'combo-bar-line'
] as const

export const OUTPUT_FORMATS = ['html', 'svg', 'png', 'pdf'] as const

const fieldEncodingSchema = z.object({
  field: z.string().min(1),
  type: z.enum(['quantitative', 'nominal', 'temporal', 'ordinal']).optional(),
  aggregate: z.enum(['sum', 'avg', 'count', 'min', 'max']).optional(),
  format: z.string().optional(),
  unit: z.string().min(1).optional()
})

const transformSchema = z.object({
  type: z.enum(['derive-month', 'aggregate', 'sort', 'limit', 'filter']),
  field: z.string().optional(),
  as: z.string().optional(),
  groupBy: z.array(z.string()).optional(),
  measures: z.array(z.object({
    field: z.string(),
    op: z.enum(['sum', 'avg', 'count', 'min', 'max']),
    as: z.string()
  })).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  value: z.unknown().optional()
})

export const globalFilterSchema = z.object({
  field: z.string().min(1),
  type: z.enum(['select', 'range']),
  multiSelect: z.boolean().optional()
})

const chartInteractionSchema = z.object({
  tooltip: z.boolean().optional(),
  select: z.enum(['filter', 'detail']).optional()
})

const insightTypeSchema = z.enum(['total', 'rank', 'share', 'trend', 'delta', 'correlation', 'distribution', 'data_quality'])
const insightCheckSchema = z.enum(['evidence_ref_exists', 'value_match', 'rank_position', 'delta_formula', 'trend_periods', 'share_formula', 'benchmark_present', 'sample_size', 'caveat_present'])
const insightClaimArgsSchema = z.object({
  expected: z.union([z.string(), z.number()]).optional(), value: z.string().optional(), rows: z.string().optional(), series: z.string().optional(),
  subjectField: z.string().optional(), valueField: z.string().optional(), subject: z.string().optional(), expectedRank: z.number().int().positive().optional(),
  order: z.enum(['asc', 'desc']).optional(), from: z.string().optional(), to: z.string().optional(), mode: z.enum(['absolute', 'percent', 'percentage-point']).optional(),
  minimumPeriods: z.number().int().positive().optional(), direction: z.enum(['up', 'down', 'flat']).optional(), numerator: z.string().optional(), denominator: z.string().optional(),
  benchmark: z.string().optional(), tolerance: z.number().positive().optional()
}).strict()
const provenanceDetailSchema = z.object({
  evidence: z.array(z.string().min(1)).optional(),
  derivedFrom: z.array(z.string().min(1)).optional(),
  check: insightCheckSchema.optional(),
  claimArgs: insightClaimArgsSchema.optional(),
  exemption: z.enum(['decorative', 'methodology']).optional()
}).strict()
export const provenanceSchema = z.union([
  z.string().regex(/^\$evidence:[A-Za-z0-9_-]+\..+$/, 'Provenance shorthand must be one complete $evidence:<id>.<path> reference.'),
  provenanceDetailSchema
])

const referenceValueSchema = z.union([z.number(), z.string().min(1)])
const referenceLayerSchema = z.object({
  id: z.string().min(1).optional(), type: z.enum(['line', 'band']), axis: z.enum(['x', 'y']),
  value: referenceValueSchema.optional(), from: referenceValueSchema.optional(), to: referenceValueSchema.optional(),
  field: z.string().min(1).optional(), aggregate: z.enum(['sum', 'avg', 'count', 'min', 'max']).optional(),
  label: z.string().optional(), evidence: z.string().min(1).optional(), provenance: provenanceSchema.optional()
}).strict()

const annotationSelectorSchema = z.union([
  z.object({ op: z.enum(['first', 'last', 'max', 'min']), field: z.string().min(1), orderBy: z.string().min(1).optional() }).strict(),
  z.object({ op: z.literal('threshold'), field: z.string().min(1), comparison: z.enum(['gt', 'gte', 'lt', 'lte']), value: z.number() }).strict(),
  z.object({ op: z.literal('value'), field: z.string().min(1), value: z.union([z.string(), z.number()]) }).strict(),
  z.object({ op: z.literal('max-change'), mode: z.literal('previous'), field: z.string().min(1), orderBy: z.string().min(1) }).strict(),
  z.object({ op: z.literal('max-change'), mode: z.literal('between-fields'), startField: z.string().min(1), endField: z.string().min(1) }).strict()
])

const chartAnnotationSchema = z.object({
  type: z.enum(['point', 'rule']), selector: annotationSelectorSchema, text: z.string().min(1),
  evidence: z.string().min(1).optional(), priority: z.number().optional(), provenance: provenanceSchema.optional()
}).strict()

const facetSchema = z.object({
  row: fieldEncodingSchema.optional(), column: fieldEncodingSchema.optional(), maxPanels: z.number().int().min(1).max(8).optional(),
  scales: z.enum(['shared', 'independent']).optional()
}).strict().refine(value => Number(Boolean(value.row)) + Number(Boolean(value.column)) === 1, {
  message: 'facet must define exactly one of row or column'
})

const colorScaleSchema = z.object({
  type: z.enum(['qualitative', 'sequential', 'diverging', 'status', 'focus-context']),
  domain: z.array(z.union([z.string(), z.number()])).optional(),
  semantic: z.enum(['unfavorable-neutral-favorable', 'favorable-neutral-unfavorable']).optional(),
  focus: z.array(z.union([z.string(), z.number()])).optional()
}).strict()

const placementSchema = z.object({ span: z.union([z.literal(4), z.literal(6), z.literal(8), z.literal(12)]), emphasis: z.enum(['primary', 'supporting']).optional() }).strict()
const posterCalloutSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('formula'), title: z.string().min(1), body: z.string().min(1) }).strict(),
  z.object({ type: z.literal('note'), text: z.string().min(1) }).strict(),
  z.object({ type: z.literal('threshold'), title: z.string().min(1), body: z.string().min(1) }).strict()
])
const posterSlotSchema = z.object({
  id: z.string().min(1),
  role: z.enum(['hero', 'insight', 'primary-visual', 'ranking', 'footer']),
  block: z.enum(['hero', 'callout', 'chart', 'decorative', 'footer']),
  chartId: z.string().min(1).optional(),
  calloutIndex: z.number().int().nonnegative().optional()
}).strict()
const posterSchema = z.object({
  chartId: z.string().min(1),
  secondaryChartId: z.string().min(1).optional(),
  template: z.enum(['data-poster-ranking', 'data-poster-share', 'data-poster-comparison', 'data-poster-trend', 'data-poster-flow', 'data-poster-geo', 'content-poster-timeline']).optional(),
  share: z.object({ normalize: z.literal('100%'), categoryField: z.string().min(1).optional(), seriesField: z.string().min(1).optional(), valueField: z.string().min(1).optional() }).strict().optional(),
  geo: z.object({ resourcePath: z.string().min(1).optional(), nameField: z.string().min(1).optional(), coverageThreshold: z.number().min(0).max(1).optional() }).strict().optional(),
  timeline: z.object({ roles: z.object({ order: z.string().min(1), timeLabel: z.string().min(1), title: z.string().min(1), description: z.string().min(1), era: z.string().min(1).optional(), mediaPath: z.string().min(1).optional(), source: z.string().min(1).optional() }).strict() }).strict().optional(),
  composition: z.string().min(1).optional(),
  theme: z.string().min(1).optional(),
  themeOverride: z.object({
    mood: z.string().min(1).optional(),
    palette: z.string().min(1).optional(),
    density: z.enum(['compact', 'balanced', 'airy']).optional()
  }).strict().optional(),
  selection: z.object({
    source: z.enum(['user', 'auto']),
    rationale: z.array(z.string().min(1)).optional(),
    confidence: z.number().min(0).max(1).optional()
  }).strict().optional(),
  slots: z.array(posterSlotSchema).max(8).optional(),
  canvas: z.object({ width: z.number().positive().default(1080), height: z.number().positive().default(1350) }).strict().default({ width: 1080, height: 1350 }),
  hero: z.object({ eyebrow: z.string().optional(), title: z.string().min(1), subtitle: z.string().optional() }).strict(),
  footer: z.object({ source: z.string().min(1), date: z.string().optional() }).strict(),
  chart: z.object({ sort: z.enum(['asc', 'desc']).default('desc'), maxItems: z.number().int().min(3).max(12).default(10), yDomain: z.tuple([z.number().finite(), z.number().finite()]).optional(), valueFormat: z.string().max(32).optional() }).strict().default({ sort: 'desc', maxItems: 10 }),
  callouts: z.array(posterCalloutSchema).max(3).optional()
}).strict().superRefine((poster, ctx) => {
  if (poster.canvas.width >= poster.canvas.height) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['canvas'], message: 'poster canvas must be portrait (height greater than width)' })
  }
  if (poster.chart.yDomain && poster.chart.yDomain[0] >= poster.chart.yDomain[1]) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['chart', 'yDomain'], message: 'poster chart yDomain must be ascending' })
  }
})
const qualitySchema = z.object({
  sampleSizeField: z.string().min(1).optional(), estimatedField: z.string().min(1).optional(), incompleteField: z.string().min(1).optional(),
  lowSampleThreshold: z.number().nonnegative().optional(), missingRateThreshold: z.number().min(0).max(1).optional()
}).strict()

const insightSchema = z.union([
  z.string(),
  z.object({
    text: z.string().min(1),
    type: insightTypeSchema.optional(),
    evidence: z.array(z.string().min(1)).optional(),
    derivedFrom: z.array(z.string().min(1)).optional(),
    check: insightCheckSchema.optional(),
    claimArgs: insightClaimArgsSchema.optional(),
    caveat: z.string().optional(),
    severity: z.enum(['info', 'warning']).optional(),
    provenance: provenanceSchema.optional()
  })
])

const cssColorSchema = z.string().min(1).refine(
  value => /^(#[0-9a-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-z]+)$/i.test(value),
  'Expected a CSS color value.'
)

const chartStyleSchema = z.object({
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  xDomainMin: z.number().finite().optional(),
  xDomainMax: z.number().finite().optional(),
  yDomainMin: z.number().finite().optional(),
  yDomainMax: z.number().finite().optional(),
  barMode: z.literal('stacked').optional(),
  divergingSort: z.enum(['asc', 'desc', 'none']).optional(),
  rowHeight: z.number().min(16).max(80).optional(),
  showGrid: z.boolean().optional(),
  showValueLabels: z.boolean().optional(),
  positiveColor: cssColorSchema.optional(),
  negativeColor: cssColorSchema.optional(),
  valueDecimals: z.number().int().min(0).max(6).optional(),
  valueSuffix: z.string().max(12).optional(),
  axisTitle: z.string().max(160).optional()
}).catchall(z.unknown())

export const chartSpecSchema: z.ZodType<AgentChartSpec> = z.object({
  id: z.string().min(1).optional(),
  type: z.enum(MVP_CHART_TYPES),
  variant: z.string().min(1).optional(),
  title: z.string().optional(),
  sortable: z.boolean().optional(),
  interaction: chartInteractionSchema.optional(),
  drilldownPreset: z.enum(['category-detail']).optional(),
  drilldownChart: z.string().optional(),
  data: z.object({
    source: z.string().optional(),
    transform: z.array(transformSchema).optional()
  }).optional(),
  encoding: z.object({
    x: fieldEncodingSchema.optional(),
    y: fieldEncodingSchema.optional(),
    color: fieldEncodingSchema.optional(),
    size: fieldEncodingSchema.optional(),
    label: fieldEncodingSchema.optional(),
    value: fieldEncodingSchema.optional()
  }).catchall(fieldEncodingSchema.optional()).optional(),
  references: z.array(referenceLayerSchema).optional(),
  annotations: z.array(chartAnnotationSchema).optional(),
  facet: facetSchema.optional(),
  colorScale: colorScaleSchema.optional(),
  placement: placementSchema.optional(),
  quality: qualitySchema.optional(),
  style: chartStyleSchema.optional(),
  provenance: provenanceSchema.optional()
}).strict()

export const reportSpecSchema: z.ZodType<AgentReportSpec> = z.object({
  specVersion: z.literal(1).optional(),
  layout: z.object({ preset: z.enum(['narrative', 'executive', 'analytical', 'mosaic', 'poster']), maxColumns: z.literal(12).optional() }).strict().optional(),
  poster: posterSchema.optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  theme: z.enum(['standard-white', 'magazine', 'standard-dark', 'minimal', 'nyt', 'bloomberg', 'tableau']).optional(),
  locale: z.enum(['en', 'zh-CN']).optional(),
  interactions: z.object({
    globalFilters: z.array(globalFilterSchema).max(2).optional(),
    dataPolicy: z.object({
      mode: z.enum(['minimal', 'detail-safe', 'full']),
      detailFields: z.array(z.string().min(1)).max(64).optional(),
      excludeFields: z.array(z.string().min(1)).optional()
    }).strict().optional(),
    currentView: z.object({
      summaries: z.array(z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        recipe: queryRecipeSchema,
        format: z.enum(['currency', 'integer', 'number', 'percentage', 'text']).optional()
      }).strict()).max(8)
    }).strict().optional()
  }).strict().optional(),
  insights: z.array(insightSchema).optional(),
  charts: z.array(chartSpecSchema).min(1)
}).strict()

export const singleOrReportSpecSchema = z.union([
  reportSpecSchema,
  chartSpecSchema.transform(chart => ({
    title: chart.title,
    charts: [chart]
  }))
])

export const outputFormatSchema = z.enum(OUTPUT_FORMATS)

export function parseOutputFormats(value: string | undefined): AgentOutputFormat[] {
  if (!value) return ['html']
  const formats = value.split(',').map(format => format.trim()).filter(Boolean)
  const parsed = z.array(outputFormatSchema).safeParse(formats)
  if (!parsed.success) {
    throw new Error(`Unsupported output format: ${value}`)
  }
  return parsed.data
}
