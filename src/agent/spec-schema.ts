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
  'bigvalue'
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

export const chartSpecSchema: z.ZodType<AgentChartSpec> = z.object({
  type: z.enum(MVP_CHART_TYPES),
  title: z.string().optional(),
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
  }).catchall(fieldEncodingSchema.optional()),
  style: z.record(z.string(), z.unknown()).optional()
})

export const reportSpecSchema: z.ZodType<AgentReportSpec> = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
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
