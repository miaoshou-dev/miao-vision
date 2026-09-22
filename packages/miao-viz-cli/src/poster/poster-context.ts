import { z } from 'zod'
import type { AnalyzeContext, AnalyzeField } from '../context-schema'
import type { BlockMatchContext } from '../report-block-registry'
import { POSTER_THEME_REGISTRY } from './poster-theme'
import { resolvePosterStyle, type PosterStyleDecision } from './poster-style-resolver'
import { POSTER_TEMPLATE_REGISTRY, type PosterDataRole, type PosterTemplateIntent } from './poster-template-registry'

export interface PosterTemplateRecommendation {
  id: string
  score: number
  status: 'available' | 'blocked'
  matchedIntent: PosterTemplateIntent
  matchedRoles: PosterDataRole[]
  missingRoles: PosterDataRole[]
  rationale: string[]
  reasonCode?: string
  warnings?: string[]
  recommendedTheme: string
  fallbackTemplateId?: string
}

export interface PosterContext {
  intent: PosterTemplateIntent
  rationale: string[]
  confidence: number
  roleBindings: Partial<Record<PosterDataRole, string[]>>
  templates: PosterTemplateRecommendation[]
  style: PosterStyleDecision
}

export type CompactPosterTemplateRecommendation = [
  id: string,
  score: number,
  status: 'available' | 'blocked',
  matchedIntent: PosterTemplateIntent,
  matchedRoles: PosterDataRole[],
  missingRoles: PosterDataRole[],
  rationale: string[],
  reasonCode: string | null,
  warnings: string[] | null,
  recommendedTheme: string,
  fallbackTemplateId: string | null
]

export interface CompactPosterContext {
  intent: PosterTemplateIntent
  rationale: string[]
  confidence: number
  roles: Array<[PosterDataRole, string[]]>
  templates: CompactPosterTemplateRecommendation[]
  style: [string, string, string[], number, boolean, string[] | null]
}

const intentValues = ['ranking', 'share', 'comparison', 'trend', 'flow', 'geo', 'timeline'] as const
const roleValues = ['measure', 'dimension', 'geo', 'stage'] as const

const styleSchema = z.object({
  compositionId: z.string().min(1), themeId: z.string().min(1), rationale: z.array(z.string()),
  confidence: z.number().min(0).max(1), overrideable: z.boolean(), warnings: z.array(z.string()).optional()
})

const recommendationSchema = z.object({
  id: z.string().min(1), score: z.number().min(0).max(1), status: z.enum(['available', 'blocked']),
  matchedIntent: z.enum(intentValues), matchedRoles: z.array(z.enum(roleValues)), missingRoles: z.array(z.enum(roleValues)),
  rationale: z.array(z.string()), reasonCode: z.string().optional(), warnings: z.array(z.string()).optional(),
  recommendedTheme: z.string().min(1), fallbackTemplateId: z.string().optional()
})

export const posterContextSchema: z.ZodType<PosterContext> = z.object({
  intent: z.enum(intentValues), rationale: z.array(z.string()), confidence: z.number().min(0).max(1),
  roleBindings: z.object({
    measure: z.array(z.string()).optional(), dimension: z.array(z.string()).optional(),
    geo: z.array(z.string()).optional(), stage: z.array(z.string()).optional()
  }),
  templates: z.array(recommendationSchema), style: styleSchema
})

const compactRecommendationSchema = z.tuple([
  z.string(), z.number(), z.enum(['available', 'blocked']), z.enum(intentValues), z.array(z.enum(roleValues)),
  z.array(z.enum(roleValues)), z.array(z.string()), z.string().nullable(), z.array(z.string()).nullable(),
  z.string(), z.string().nullable()
])

export const compactPosterContextSchema: z.ZodType<CompactPosterContext> = z.object({
  intent: z.enum(intentValues), rationale: z.array(z.string()), confidence: z.number(),
  roles: z.array(z.tuple([z.enum(roleValues), z.array(z.string())])),
  templates: z.array(compactRecommendationSchema),
  style: z.tuple([z.string(), z.string(), z.array(z.string()), z.number(), z.boolean(), z.array(z.string()).nullable()])
})

function fieldsForRole(fields: AnalyzeField[], role: PosterDataRole): string[] {
  if (role === 'measure') return fields.filter(field => field.role === 'measure' || field.role === 'score').map(field => field.name)
  if (role === 'geo') return fields.filter(field => field.role === 'geo').map(field => field.name)
  if (role === 'stage') return fields.filter(field => ['dimension', 'status'].includes(field.role)).map(field => field.name)
  return fields.filter(field => ['dimension', 'status', 'flag', 'geo'].includes(field.role)).map(field => field.name)
}

function chooseIntent(ctx: BlockMatchContext): { intent: PosterTemplateIntent; rationale: string[]; confidence: number } {
  const family = ctx.intent?.visualTasks?.[0]?.family
  if (family === 'geo') return { intent: 'geo', rationale: ['geo visual intent detected'], confidence: 0.9 }
  if (family === 'flow') return { intent: 'flow', rationale: ['flow visual intent detected'], confidence: 0.9 }
  if (family === 'comparison') return { intent: 'comparison', rationale: ['comparison visual intent detected'], confidence: 0.82 }
  return { intent: 'ranking', rationale: ['ranking is the compatible poster fallback'], confidence: family === 'ranking' ? 0.9 : 0.62 }
}

function reasonCode(reason?: string): string | undefined {
  if (!reason) return undefined
  if (reason.includes('measure')) return 'POSTER_MEASURE_MISSING'
  if (reason.includes('geo')) return 'POSTER_GEO_FIELD_MISSING'
  if (reason.includes('flow intent')) return 'POSTER_FLOW_INTENT_MISSING'
  if (reason.includes('category count')) return 'POSTER_CATEGORY_COUNT_UNSUPPORTED'
  return 'POSTER_TEMPLATE_NOT_APPLICABLE'
}

export function buildPosterContext(ctx: BlockMatchContext): PosterContext {
  const selected = chooseIntent(ctx)
  const availableCompositions = POSTER_TEMPLATE_REGISTRY.filter(template => template.canUse(ctx).ok).map(template => template.compositionId)
  const style = resolvePosterStyle({
    intent: ctx.intent ?? { raw: '', coverage: 'full', assumptions: [] }, userBrief: ctx.userBrief,
    fields: ctx.fields, evidence: ctx.evidence, availableCompositions,
    availableThemes: POSTER_THEME_REGISTRY.map(theme => theme.id)
  })
  const roles = [...new Set(POSTER_TEMPLATE_REGISTRY.flatMap(template => template.requiredRoles))]
  const roleBindings = Object.fromEntries(roles.map(role => [role, fieldsForRole(ctx.fields, role)]).filter(([, fields]) => fields.length))
  const templates = POSTER_TEMPLATE_REGISTRY.map(template => {
    const decision = template.canUse(ctx)
    const matchedRoles = template.requiredRoles.filter(role => fieldsForRole(ctx.fields, role).length > 0)
    const missingRoles = template.requiredRoles.filter(role => !matchedRoles.includes(role))
    const isIntentMatch = template.intent === selected.intent
    const score = decision.ok ? Math.min(1, decision.score + (isIntentMatch ? 0.05 : 0)) : 0
    return {
      id: template.id, score, status: decision.ok ? 'available' as const : 'blocked' as const,
      matchedIntent: template.intent, matchedRoles, missingRoles,
      rationale: decision.ok ? [`${template.intent} requirements matched`] : [decision.reason ?? 'template requirements not met'],
      ...(decision.reason ? { reasonCode: reasonCode(decision.reason) } : {}),
      recommendedTheme: style.themeId,
      ...(template.fallback?.templateId ? { fallbackTemplateId: template.fallback.templateId } : {})
    }
  }).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
  return { ...selected, roleBindings, templates, style }
}

export function toCompactPosterContext(poster: PosterContext): CompactPosterContext {
  return {
    intent: poster.intent, rationale: poster.rationale, confidence: poster.confidence,
    roles: Object.entries(poster.roleBindings).map(([role, fields]) => [role as PosterDataRole, fields ?? []]),
    templates: poster.templates.map(item => [
      item.id, item.score, item.status, item.matchedIntent, item.matchedRoles, item.missingRoles, item.rationale,
      item.reasonCode ?? null, item.warnings ?? null, item.recommendedTheme, item.fallbackTemplateId ?? null
    ]),
    style: [poster.style.compositionId, poster.style.themeId, poster.style.rationale, poster.style.confidence, poster.style.overrideable, poster.style.warnings ?? null]
  }
}

export function fromCompactPosterContext(poster: CompactPosterContext): PosterContext {
  return {
    intent: poster.intent, rationale: poster.rationale, confidence: poster.confidence,
    roleBindings: Object.fromEntries(poster.roles),
    templates: poster.templates.map(([id, score, status, matchedIntent, matchedRoles, missingRoles, rationale, code, warnings, recommendedTheme, fallback]) => ({
      id, score, status, matchedIntent, matchedRoles, missingRoles, rationale,
      ...(code ? { reasonCode: code } : {}), ...(warnings ? { warnings } : {}), recommendedTheme,
      ...(fallback ? { fallbackTemplateId: fallback } : {})
    })),
    style: { compositionId: poster.style[0], themeId: poster.style[1], rationale: poster.style[2], confidence: poster.style[3], overrideable: poster.style[4], ...(poster.style[5] ? { warnings: poster.style[5] } : {}) }
  }
}

export function attachPosterContext(context: AnalyzeContext): AnalyzeContext {
  return { ...context, poster: buildPosterContext({ fields: context.fields, evidence: context.evidence, catalog: context.catalog, sampleWarnings: context.sampleWarnings, metricCandidates: context.metricCandidates, intent: context.intent, userBrief: context.intent.raw }) }
}
