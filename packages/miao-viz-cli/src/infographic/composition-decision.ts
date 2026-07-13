import { z } from 'zod'
import { INFOGRAPHIC_VISUAL_TYPES, type InfographicVisualType } from './types'

export const COMPOSITION_CONFIDENCE_THRESHOLD = 0.65

export const COMPOSITION_TYPES = [
  'article-linear',
  'lifecycle-curve',
  'strategy-dashboard',
  'explainer-map',
  'comparison-matrix'
] as const

export type InfographicCompositionType = (typeof COMPOSITION_TYPES)[number]

export interface CompositionAlternative {
  type: InfographicCompositionType
  reason: string
}

export interface CompositionDecision {
  recommended: InfographicCompositionType
  selected: InfographicCompositionType
  confidence: number
  rationale: string
  signals: string[]
  dataShape: string[]
  alternatives: CompositionAlternative[]
  visualRecommendations?: VisualRecommendation[]
  needsUserChoice: boolean
}

export interface VisualRecommendation {
  visualType: InfographicVisualType
  score: number
  reason: string
  signals: string[]
  blockedReason?: string
}

export const compositionTypeSchema = z.enum(COMPOSITION_TYPES)

export const compositionDecisionSchema = z.object({
  recommended: compositionTypeSchema,
  selected: compositionTypeSchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1),
  signals: z.array(z.string().min(1)).min(1),
  dataShape: z.array(z.string().min(1)).min(1),
  alternatives: z.array(z.object({
    type: compositionTypeSchema,
    reason: z.string().min(1)
  })).default([]),
  visualRecommendations: z.array(z.object({
    visualType: z.enum(INFOGRAPHIC_VISUAL_TYPES),
    score: z.number().min(0).max(1),
    reason: z.string().min(1),
    signals: z.array(z.string().min(1)).default([]),
    blockedReason: z.string().optional()
  })).default([]),
  needsUserChoice: z.boolean()
})
