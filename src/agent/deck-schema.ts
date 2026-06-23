import { z } from 'zod'
import { chartSpecSchema } from './spec-schema'
import type { DeckSpec, SlideMetric, SlideSpec } from './deck-types'

const SLIDE_LAYOUTS = [
  'cover', 'title-only', 'text-points', 'text-chart',
  'metrics-chart', 'chart-full', 'table-full', 'ending'
] as const

const metricTransformSchema = z.object({
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

const slideMetricSchema: z.ZodType<SlideMetric> = z.object({
  label: z.string().min(1),
  value: z.union([z.string(), z.number()]).optional(),
  format: z.string().optional(),
  data: z.object({
    transform: z.array(metricTransformSchema).optional()
  }).optional()
})

const slideSpecSchema: z.ZodType<SlideSpec> = z.object({
  layout: z.enum(SLIDE_LAYOUTS),
  eyebrow: z.string().optional(),
  title: z.string().optional(),
  claim: z.string().optional(),
  bullets: z.array(z.string()).optional(),
  callout: z.string().optional(),
  annotation: z.string().optional(),
  metrics: z.array(slideMetricSchema).optional(),
  charts: z.array(chartSpecSchema).optional()
})

export const deckSpecSchema: z.ZodType<DeckSpec> = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  theme: z.enum(['default', 'editorial', 'dark', 'minimal']).optional(),
  slides: z.array(slideSpecSchema).min(1, 'Deck must have at least one slide')
})
