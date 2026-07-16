import { z } from 'zod'

const deckPlanClaimSchema = z.object({
  text: z.string().min(1),
  claimType: z.enum([
    'descriptive', 'rank', 'delta', 'trend', 'share',
    'comparative', 'evaluative', 'causal', 'predictive'
  ]),
  evidence: z.array(z.string().min(1)).min(1),
  derivedFrom: z.array(z.string().min(1)).min(1),
  check: z.enum([
    'evidence_ref_exists', 'value_match', 'rank_position', 'delta_formula',
    'trend_periods', 'share_formula', 'benchmark_present', 'caveat_present'
  ]),
  caveat: z.string().min(1).optional()
})

export const deckPlanSchema = z.object({
  deckPlan: z.object({
    intent: z.enum(['executive-brief', 'business-review']),
    audience: z.string().min(1),
    primaryQuestion: z.string().min(1),
    mainClaim: deckPlanClaimSchema.optional(),
    slideOutline: z.array(z.object({
      role: z.enum([
        'cover-claim', 'kpi-snapshot', 'trend-overview-slide',
        'ranking-slide', 'data-quality-slide'
      ]),
      purpose: z.string().min(1),
      evidence: z.array(z.string().min(1)).optional(),
      warningRefs: z.array(z.string().min(1)).optional()
    })).min(1),
    blockedClaims: z.array(z.object({
      text: z.string().min(1),
      reasonCode: z.string().min(1),
      reason: z.string().min(1)
    })),
    assumptions: z.array(z.object({
      key: z.string().min(1),
      value: z.string().min(1),
      reason: z.string().min(1)
    })),
    warningRefs: z.array(z.string().min(1)).optional()
  })
})

export type DeckPlanDocument = z.infer<typeof deckPlanSchema>
