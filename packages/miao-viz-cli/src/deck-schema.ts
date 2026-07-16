import { z } from 'zod'
import { chartSpecSchema, globalFilterSchema } from './spec-schema'
import type { DeckSpec, SlideMetric, SlideSpec } from './deck-types'

const SLIDE_LAYOUTS = [
  'cover', 'title-only', 'text-points', 'text-chart',
  'metrics-chart', 'chart-full', 'table-full', 'ending'
] as const

const deckClaimTypeSchema = z.enum([
  'descriptive', 'rank', 'delta', 'trend', 'share',
  'comparative', 'evaluative', 'causal', 'predictive'
])

const deckClaimCheckSchema = z.enum([
  'evidence_ref_exists', 'value_match', 'rank_position', 'delta_formula',
  'trend_periods', 'share_formula', 'benchmark_present', 'caveat_present'
])

const deckRecommendationSchema = z.object({
  text: z.string().min(1),
  kind: z.enum(['analytical-next-step', 'operational-recommendation']),
  evidence: z.array(z.string().min(1)).optional(),
  derivedFrom: z.array(z.string().min(1)).optional(),
  caveat: z.string().min(1)
})

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
  slideRole: z.string().min(1).optional(),
  eyebrow: z.string().optional(),
  title: z.string().optional(),
  claim: z.string().optional(),
  claimType: deckClaimTypeSchema.optional(),
  evidence: z.array(z.string().min(1)).optional(),
  derivedFrom: z.array(z.string().min(1)).optional(),
  check: deckClaimCheckSchema.optional(),
  caveat: z.string().min(1).optional(),
  warningRefs: z.array(z.string().min(1)).optional(),
  recommendation: deckRecommendationSchema.optional(),
  bullets: z.array(z.string()).optional(),
  callout: z.string().optional(),
  annotation: z.string().optional(),
  metrics: z.array(slideMetricSchema).optional(),
  charts: z.array(chartSpecSchema).optional()
})

const deckInteractionsSchema = z.object({
  globalFilters: z.array(globalFilterSchema).optional()
})

export const deckSpecSchema: z.ZodType<DeckSpec> = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  intent: z.enum(['executive-brief', 'business-review']).optional(),
  caveats: z.array(z.object({
    text: z.string().min(1),
    warningRefs: z.array(z.string().min(1)).min(1)
  })).optional(),
  theme: z.enum(['standard-white', 'magazine', 'standard-dark', 'minimal', 'nyt', 'bloomberg', 'tableau']).optional(),
  interactions: deckInteractionsSchema.optional(),
  slides: z.array(slideSpecSchema).min(1, 'Deck must have at least one slide')
})
