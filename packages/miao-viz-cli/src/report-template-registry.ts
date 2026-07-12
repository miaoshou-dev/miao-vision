import * as YAML from 'yaml'
import { getBlockById } from './report-block-registry'
import type { BlockMatchContext } from './report-block-registry'
import type { AgentReportSpec } from './types'
import type { CatalogTemplateEntry } from './context-schema'

export interface TemplateDecision {
  ok: boolean
  score: number
  reason?: string
}

export interface ReportTemplateResolver {
  id: string
  bestFor: string[]
  requires: Array<'measure' | 'dimension' | 'time'>
  blocks: string[]
  density: 'compact' | 'medium' | 'full'
  qualityNotes: string[]
  requiredEvidence: string[]
  qualityConstraints: string[]
  canUse(ctx: BlockMatchContext): TemplateDecision
  instantiate(ctx: BlockMatchContext): AgentReportSpec
}

export interface ReportTemplateInfo {
  id: string
  bestFor: string[]
  requires: Array<'measure' | 'dimension' | 'time'>
  blocks: string[]
  density: 'compact' | 'medium' | 'full'
  qualityNotes: string[]
  requiredEvidence: string[]
  qualityConstraints: string[]
}

function scoreForRequirements(ctx: BlockMatchContext, requires: ReportTemplateResolver['requires']): TemplateDecision {
  for (const role of requires) {
    if (role === 'measure' && !ctx.fields.some(f => f.role === 'measure' || f.role === 'score')) {
      return { ok: false, score: 0, reason: 'missing required measure' }
    }
    if (role === 'dimension' && !ctx.fields.some(f => f.role === 'dimension' || f.role === 'status' || f.role === 'geo' || f.role === 'flag')) {
      return { ok: false, score: 0, reason: 'missing required dimension' }
    }
    if (role === 'time') {
      const time = ctx.fields.find(f => f.role === 'time')
      if (!time) return { ok: false, score: 0, reason: 'missing required time' }
      const periods = time.timePeriods ?? 0
      if (periods < 3) return { ok: false, score: 0, reason: `timePeriods=${periods} < 3` }
    }
  }
  return { ok: true, score: Math.min(0.65 + requires.length * 0.1 + (ctx.evidence.length > 0 ? 0.05 : 0), 1) }
}

function compileBlocks(blockIds: string[], ctx: BlockMatchContext): AgentReportSpec {
  const charts: AgentReportSpec['charts'] = []
  for (const id of blockIds) {
    const block = getBlockById(id)
    if (!block) continue
    const decision = block.canUse(ctx)
    if (!decision.ok) continue
    const variables = block.defaultVariables(ctx)
    charts.push(...block.compile(variables, ctx).charts)
  }
  const seen = new Set<string>()
  return {
    title: 'Miao Vision Report',
    insights: [],
    charts: charts.map(chart => {
      if (!chart.id || !seen.has(chart.id)) {
        if (chart.id) seen.add(chart.id)
        return chart
      }
      const next = { ...chart, id: `${chart.id}_${seen.size + 1}` }
      seen.add(next.id)
      return next
    })
  }
}

export const TEMPLATE_REGISTRY: ReportTemplateResolver[] = [
  {
    id: 'snapshot-overview',
    bestFor: ['static comparison', 'category ranking', 'no time axis'],
    requires: ['measure', 'dimension'],
    blocks: ['kpi-summary', 'snapshot-ranking'],
    density: 'compact',
    qualityNotes: ['Use for static comparisons without requiring a trend.', 'Add sample caveats when sampleWarnings are present.'],
    requiredEvidence: ['total', 'by_dimension'],
    qualityConstraints: ['requires one measure and one readable dimension'],
    canUse: ctx => scoreForRequirements(ctx, ['measure', 'dimension']),
    instantiate: ctx => compileBlocks(['kpi-summary', 'snapshot-ranking'], ctx)
  },
  {
    id: 'trend-ranking-overview',
    bestFor: ['executive trend with category ranking', 'monthly review'],
    requires: ['measure', 'dimension', 'time'],
    blocks: ['trend-ranking'],
    density: 'full',
    qualityNotes: ['Requires at least 3 time periods.', 'Combines KPI, trend, and ranking views.'],
    requiredEvidence: ['total', 'by_time', 'by_dimension'],
    qualityConstraints: ['requires at least 3 time periods'],
    canUse: ctx => scoreForRequirements(ctx, ['measure', 'dimension', 'time']),
    instantiate: ctx => compileBlocks(['trend-ranking'], ctx)
  },
  {
    id: 'full-detail-report',
    bestFor: ['comprehensive business review', 'trend plus ranking plus table'],
    requires: ['measure', 'dimension', 'time'],
    blocks: ['full-detail-report'],
    density: 'full',
    qualityNotes: ['Use for comprehensive reviews where detail table is acceptable.', 'Keep total chart count within report limits.'],
    requiredEvidence: ['total', 'by_time', 'by_dimension'],
    qualityConstraints: ['requires at least 3 time periods and a readable dimension'],
    canUse: ctx => scoreForRequirements(ctx, ['measure', 'dimension', 'time']),
    instantiate: ctx => compileBlocks(['full-detail-report'], ctx)
  },
  {
    id: 'composition-review',
    bestFor: ['share analysis', 'part-to-whole breakdown', 'composition report'],
    requires: ['measure', 'dimension'],
    blocks: ['kpi-summary', 'comparison-breakdown'],
    density: 'medium',
    qualityNotes: ['Use for share or composition analysis.', 'Avoid when the primary dimension has too many categories for pie.'],
    requiredEvidence: ['total', 'by_dimension'],
    qualityConstraints: ['requires small category count for part-to-whole view'],
    canUse: ctx => scoreForRequirements(ctx, ['measure', 'dimension']),
    instantiate: ctx => compileBlocks(['kpi-summary', 'comparison-breakdown'], ctx)
  }
]

export function getTemplateById(id: string): ReportTemplateResolver | undefined {
  return TEMPLATE_REGISTRY.find(template => template.id === id)
}

export function templateInfo(template: ReportTemplateResolver): ReportTemplateInfo {
  return {
    id: template.id,
    bestFor: template.bestFor,
    requires: template.requires,
    blocks: template.blocks,
    density: template.density,
    qualityNotes: template.qualityNotes,
    requiredEvidence: template.requiredEvidence,
    qualityConstraints: template.qualityConstraints
  }
}

export function toCatalogTemplateEntry(
  resolver: ReportTemplateResolver,
  decision: TemplateDecision
): CatalogTemplateEntry {
  return {
    id: resolver.id,
    score: decision.score,
    bestFor: resolver.bestFor,
    requires: resolver.requires,
    blocks: resolver.blocks,
    density: resolver.density,
    requiredEvidence: resolver.requiredEvidence,
    qualityConstraints: resolver.qualityConstraints
  }
}

export function templateSpecToYaml(spec: AgentReportSpec): string {
  return YAML.stringify(spec)
}

export function buildTemplateCatalog(ctx: BlockMatchContext): {
  templates: CatalogTemplateEntry[]
  blockedTemplates: Array<{ id: string; reason: string }>
} {
  const templates: CatalogTemplateEntry[] = []
  const blockedTemplates: Array<{ id: string; reason: string }> = []
  for (const template of TEMPLATE_REGISTRY) {
    const decision = template.canUse(ctx)
    if (decision.ok && decision.score >= 0.5) {
      templates.push(toCatalogTemplateEntry(template, decision))
    } else {
      blockedTemplates.push({ id: template.id, reason: decision.reason ?? `score=${decision.score.toFixed(2)} < 0.5` })
    }
  }
  templates.sort((a, b) => b.score - a.score)
  return { templates, blockedTemplates }
}
