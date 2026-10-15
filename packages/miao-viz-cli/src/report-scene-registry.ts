import type { AnalyzeField, CatalogSceneEntry } from './context-schema'
import type { BlockMatchContext } from './report-block-registry'
import { getTemplateById } from './report-template-registry'
import type { AgentReportSpec } from './types'

export type ReportSceneId =
  | 'project-periodic'
  | 'business-overview'
  | 'sales-analysis'
  | 'marketing-performance'
  | 'financial-summary'
  | 'survey-analysis'
  | 'ab-test'
  | 'data-quality-audit'

export interface SceneDecision {
  ok: boolean
  score: number
  reason?: string
  missing?: string[]
  clarificationQuestions?: string[]
}

export interface ReportScene {
  id: ReportSceneId
  name: string
  keywords: string[]
  requiredRoles: Array<'measure' | 'dimension' | 'time'>
  metricSemantics: string[]
  templates: string[]
  blocks: string[]
  description: string
  canUse(ctx: BlockMatchContext): SceneDecision
}

const fieldText = (field: AnalyzeField): string =>
  [field.name, ...(field.semanticTags ?? [])].join(' ').toLowerCase()

function hasRole(ctx: BlockMatchContext, role: 'measure' | 'dimension' | 'time'): boolean {
  if (role === 'measure') return ctx.fields.some(field => field.role === 'measure' || field.role === 'score')
  if (role === 'dimension') return ctx.fields.some(field => ['dimension', 'status', 'flag', 'geo'].includes(field.role))
  return ctx.fields.some(field => field.role === 'time' && (field.timePeriods ?? 0) >= 3)
}

function decision(
  ctx: BlockMatchContext,
  requiredRoles: ReportScene['requiredRoles'],
  semanticGroups: string[][] = []
): SceneDecision {
  const missing = requiredRoles.filter(role => !hasRole(ctx, role)).map(role => `role:${role}`)
  for (const group of semanticGroups) {
    if (!ctx.fields.some(field => group.some(token => fieldText(field).includes(token)))) {
      missing.push(`metric:${group.join('|')}`)
    }
  }
  if (missing.length) {
    return {
      ok: false,
      score: 0,
      reason: `missing ${missing.join(', ')}`,
      missing,
      clarificationQuestions: missing.filter(item => item.startsWith('metric:'))
        .map(item => `Which source field represents ${item.slice(7)}?`)
    }
  }
  return { ok: true, score: Math.min(0.68 + requiredRoles.length * 0.08 + semanticGroups.length * 0.06, 0.98) }
}

export const REPORT_SCENES: ReportScene[] = [
  { id: 'project-periodic', name: '项目周期报告', keywords: ['项目周报', '项目月报', 'project report'], requiredRoles: [], metricSemantics: [], templates: ['project-periodic'], blocks: ['project-status'], description: 'Task snapshots, schedule, milestones and period changes.', canUse: ctx => ({ ok: ctx.evidence.some(item => Boolean(item.recipe?.project)), score: 0.98, reason: 'Requires explicit project configuration and period dates.' }) },
  {
    id: 'business-overview', name: 'Business Overview',
    keywords: ['business overview', 'operating review', '经营', '经营概览'],
    requiredRoles: ['measure', 'dimension'], metricSemantics: [],
    templates: ['trend-ranking-overview', 'snapshot-overview'], blocks: ['trend-ranking', 'snapshot-ranking'],
    description: 'Executive KPI, trend, and ranking overview.',
    canUse: ctx => decision(ctx, ['measure', 'dimension'])
  },
  {
    id: 'sales-analysis', name: 'Sales Analysis',
    keywords: ['sales', 'revenue', 'orders', '销售', '营收', '订单'],
    requiredRoles: ['measure', 'dimension'], metricSemantics: ['sales', 'revenue', 'amount', '订单', '销售额', '营收'],
    templates: ['trend-ranking-overview', 'snapshot-overview'], blocks: ['trend-ranking', 'snapshot-ranking'],
    description: 'Sales KPI, category ranking, and time trend.',
    canUse: ctx => decision(ctx, ['measure', 'dimension'], [['sales', 'revenue', 'amount', '订单', '销售额', '营收']])
  },
  {
    id: 'marketing-performance', name: 'Marketing Performance',
    keywords: ['marketing', 'campaign', 'ctr', 'cpa', '营销', '投放'],
    requiredRoles: ['measure', 'dimension'], metricSemantics: ['click', 'impression', 'ctr', 'cpa', 'campaign', 'spend'],
    templates: ['conversion-journey', 'trend-ranking-overview'], blocks: ['comparison-breakdown', 'trend-ranking'],
    description: 'Campaign spend, response, conversion, and channel performance.',
    canUse: ctx => decision(ctx, ['measure', 'dimension'], [
      ['click', 'impression', 'ctr', 'conversion', '转化', '点击', '曝光'],
      ['campaign', 'channel', 'spend', 'cost', '渠道', '投放', '费用']
    ])
  },
  {
    id: 'financial-summary', name: 'Financial Summary',
    keywords: ['finance', 'profit', 'margin', 'cost', '财务', '利润', '成本'],
    requiredRoles: ['measure', 'dimension'], metricSemantics: ['revenue', 'cost', 'profit', 'margin', '收入', '成本', '利润'],
    templates: ['variance-bridge', 'trend-ranking-overview'], blocks: ['comparison-breakdown', 'trend-ranking'],
    description: 'Revenue, cost, profit, margin, and variance summary.',
    canUse: ctx => decision(ctx, ['measure', 'dimension'], [
      ['revenue', 'income', '收入', '营收'],
      ['cost', 'expense', 'profit', 'margin', '成本', '费用', '利润', '毛利']
    ])
  },
  {
    id: 'survey-analysis', name: 'Survey Analysis',
    keywords: ['survey', 'questionnaire', '问卷', '调研'],
    requiredRoles: ['measure', 'dimension'], metricSemantics: ['score', 'rating', 'response', '评分', '答案'],
    templates: ['composition-review', 'distribution-diagnostics'], blocks: ['comparison-breakdown', 'distribution-diagnostics'],
    description: 'Response distribution, cross-tabulation, and sample caveats.',
    canUse: ctx => decision(ctx, ['measure', 'dimension'], [['score', 'rating', 'response', '评分', '答案']])
  },
  {
    id: 'ab-test', name: 'A/B Test',
    keywords: ['a/b', 'experiment', 'variant', '实验', '对照组'],
    requiredRoles: ['measure', 'dimension'], metricSemantics: ['variant', 'group', 'conversion', 'sample'],
    templates: ['cohort-comparison', 'snapshot-overview'], blocks: ['comparison-breakdown'],
    description: 'Descriptive experiment comparison; inferential claims require sample and outcome fields.',
    canUse: ctx => decision(ctx, ['measure', 'dimension'], [
      ['variant', 'group', 'treatment', '实验组', '对照组'],
      ['conversion', 'outcome', 'result', '转化', '结果']
    ])
  },
  {
    id: 'data-quality-audit', name: 'Data Quality Audit',
    keywords: ['data quality', 'missing', 'duplicate', '数据质量', '缺失', '重复'],
    requiredRoles: [], metricSemantics: [],
    templates: ['snapshot-overview', 'distribution-diagnostics'], blocks: ['snapshot-ranking', 'distribution-diagnostics'],
    description: 'Field completeness, duplicates, type consistency, and outlier diagnostics.',
    canUse: ctx => decision(ctx, ['measure', 'dimension'])
  }
]

export function getScene(id: string): ReportScene | undefined {
  return REPORT_SCENES.find(scene => scene.id === id)
}

export function sceneInfo(scene: ReportScene, decision?: SceneDecision): CatalogSceneEntry {
  return {
    id: scene.id, name: scene.name, description: scene.description,
    score: decision?.score ?? 0, keywords: scene.keywords, requiredRoles: scene.requiredRoles,
    metricSemantics: scene.metricSemantics, templates: scene.templates, blocks: scene.blocks
  }
}

export function buildSceneCatalog(ctx: BlockMatchContext): {
  scenes: CatalogSceneEntry[]
  blockedScenes: Array<{ id: ReportSceneId; reason: string; missing?: string[]; clarificationQuestions?: string[] }>
} {
  const scenes: CatalogSceneEntry[] = []
  const blockedScenes: Array<{ id: ReportSceneId; reason: string; missing?: string[]; clarificationQuestions?: string[] }> = []
  for (const scene of REPORT_SCENES) {
    const match = scene.canUse(ctx)
    if (match.ok) scenes.push(sceneInfo(scene, match))
    else blockedScenes.push({
      id: scene.id, reason: match.reason ?? 'scene requirements are not satisfied',
      ...(match.missing ? { missing: match.missing } : {}),
      ...(match.clarificationQuestions ? { clarificationQuestions: match.clarificationQuestions } : {})
    })
  }
  scenes.sort((a, b) => b.score - a.score)
  return { scenes, blockedScenes }
}

export function instantiateScene(scene: ReportScene, ctx: BlockMatchContext): AgentReportSpec | null {
  for (const templateId of scene.templates) {
    const template = getTemplateById(templateId)
    if (template?.canUse(ctx).ok) {
      const spec = template.instantiate(ctx)
      spec.title = scene.name
      return spec
    }
  }
  return null
}
