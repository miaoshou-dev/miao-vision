import * as YAML from 'yaml'
import { getBlockById } from './report-block-registry'
import type { BlockMatchContext } from './report-block-registry'
import type { AgentReportSpec } from './types'
import type { CatalogTemplateEntry } from './context-schema'
import type { VisualIntentFamily } from './types'

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
  intents?: VisualIntentFamily[]
  layoutPreset?: 'narrative' | 'executive' | 'analytical' | 'mosaic'
  canUse(ctx: BlockMatchContext): TemplateDecision
  instantiate(ctx: BlockMatchContext): AgentReportSpec
}

function p1Fields(ctx: BlockMatchContext) {
  return {
    measures: ctx.fields.filter(field => field.role === 'measure' || field.role === 'score'),
    dimension: ctx.fields.find(field => ['dimension', 'status', 'flag', 'geo'].includes(field.role)),
    time: ctx.fields.find(field => field.role === 'time')
  }
}

function p1Spec(ctx: BlockMatchContext, kind: string): AgentReportSpec {
  const { measures, dimension, time } = p1Fields(ctx); const m = measures[0]?.name ?? ''; const m2 = measures[1]?.name ?? m; const d = dimension?.name ?? ''; const t = time?.name ?? d
  const table = { type: 'table' as const, title: 'Evidence detail', encoding: {} }
  const configs: Record<string, AgentReportSpec> = {
    'executive-scorecard': { layout: { preset: 'executive', maxColumns: 12 }, charts: [
      { type: 'bullet', title: 'Actual versus target', encoding: { value: { field: m }, target: { field: m2 } }, placement: { span: 4, emphasis: 'primary' } },
      { type: 'bar', variant: 'horizontal', title: 'Performance ranking', encoding: { x: { field: d }, y: { field: m } }, placement: { span: 8, emphasis: 'supporting' } }, table] },
    'distribution-diagnostics': { layout: { preset: 'analytical', maxColumns: 12 }, charts: [
      { type: 'histogram', title: 'Distribution', encoding: { x: { field: m } }, placement: { span: 6, emphasis: 'primary' } },
      { type: 'boxplot', title: 'Grouped distribution', encoding: { x: { field: d }, y: { field: m } }, placement: { span: 6, emphasis: 'supporting' } }, table] },
    'conversion-journey': { layout: { preset: 'narrative', maxColumns: 12 }, charts: [
      { type: 'funnel', title: 'Stage conversion', encoding: { x: { field: d }, y: { field: m } }, placement: { span: 12, emphasis: 'primary' } },
      { type: 'bar', variant: 'horizontal', title: 'Stage detail', encoding: { x: { field: d }, y: { field: m } }, placement: { span: 12, emphasis: 'supporting' } }, table] },
    'variance-bridge': { layout: { preset: 'analytical', maxColumns: 12 }, charts: [
      { type: 'waterfall', title: 'Variance bridge', encoding: { x: { field: d }, y: { field: m } }, placement: { span: 6, emphasis: 'primary' } },
      { type: 'bar', variant: 'diverging', title: 'Positive and negative contribution', encoding: { x: { field: d }, y: { field: m } }, placement: { span: 6, emphasis: 'supporting' } }, table] },
    'cohort-comparison': { layout: { preset: 'mosaic', maxColumns: 12 }, charts: [
      { type: 'line', title: 'Cohort trends', encoding: { x: { field: t }, y: { field: m } }, facet: { column: { field: d }, maxPanels: 8, scales: 'shared' }, placement: { span: 12, emphasis: 'primary' } },
      { type: 'heatmap', title: 'Cohort matrix', encoding: { x: { field: t }, y: { field: d }, value: { field: m } }, placement: { span: 12, emphasis: 'supporting' } }, table] },
    'relationship-analysis': { layout: { preset: 'analytical', maxColumns: 12 }, charts: [
      { type: 'scatter', title: 'Measure relationship', encoding: { x: { field: m }, y: { field: m2 }, label: { field: d } }, placement: { span: 8, emphasis: 'primary' } },
      { type: 'bubble', title: 'Weighted relationship', encoding: { x: { field: m }, y: { field: m2 }, size: { field: m } }, placement: { span: 4, emphasis: 'supporting' } }, table] }
  }
  return { title: 'Miao Vision Report', insights: [], ...configs[kind] }
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
  intents?: VisualIntentFamily[]
  layoutPreset?: 'narrative' | 'executive' | 'analytical' | 'mosaic'
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
  ,...([
    ['executive-scorecard', ['summary', 'target-attainment'], ['measure', 'dimension'], ['kpi-summary', 'snapshot-ranking'], 'executive'],
    ['distribution-diagnostics', ['distribution'], ['measure', 'dimension'], ['distribution-diagnostics'], 'analytical'],
    ['conversion-journey', ['flow'], ['measure', 'dimension'], ['conversion-journey'], 'narrative'],
    ['variance-bridge', ['change'], ['measure', 'dimension'], ['variance-bridge'], 'analytical'],
    ['cohort-comparison', ['comparison', 'trend'], ['measure', 'dimension', 'time'], ['cohort-comparison'], 'mosaic'],
    ['relationship-analysis', ['relationship'], ['measure', 'dimension'], ['relationship-analysis'], 'analytical']
  ] as const).map(([id, intents, requires, blocks, layoutPreset]) => ({
    id, intents: [...intents], bestFor: [...intents], requires: [...requires], blocks: [...blocks], density: 'full' as const, layoutPreset,
    qualityNotes: ['Use only when the declared intent and required roles are present.'], requiredEvidence: ['total'], qualityConstraints: ['All metrics must remain evidence-grounded.'],
    canUse: (ctx: BlockMatchContext) => scoreForRequirements(ctx, [...requires]), instantiate: (ctx: BlockMatchContext) => p1Spec(ctx, id)
  }))
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
    ,intents: template.intents
    ,layoutPreset: template.layoutPreset
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
    ,intents: resolver.intents
    ,layoutPreset: resolver.layoutPreset
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
