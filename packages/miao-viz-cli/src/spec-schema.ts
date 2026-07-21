import { z } from 'zod'
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
  'infographic-comparison'
] as const

export const OUTPUT_FORMATS = ['html', 'svg', 'png', 'pdf'] as const

const fieldEncodingSchema = z.object({
  field: z.string().min(1),
  type: z.enum(['quantitative', 'nominal', 'temporal', 'ordinal']).optional(),
  aggregate: z.enum(['sum', 'avg', 'count', 'min', 'max']).optional(),
  format: z.string().optional()
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
})

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
    severity: z.enum(['info', 'warning']).optional()
  })
])

export const chartSpecSchema: z.ZodType<AgentChartSpec> = z.object({
  id: z.string().min(1).optional(),
  type: z.enum(MVP_CHART_TYPES),
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
  style: z.record(z.string(), z.unknown()).optional()
})

export const reportSpecSchema: z.ZodType<AgentReportSpec> = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  theme: z.enum(['standard-white', 'magazine', 'standard-dark', 'minimal', 'nyt', 'bloomberg', 'tableau']).optional(),
  interactions: z.object({
    globalFilters: z.array(globalFilterSchema).optional()
  }).optional(),
  insights: z.array(insightSchema).optional(),
  charts: z.array(chartSpecSchema).min(1)
})

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
