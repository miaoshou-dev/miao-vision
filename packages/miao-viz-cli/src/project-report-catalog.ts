import type { ReportBlockResolver, BlockMatchContext } from './report-block-registry'
import type { ReportTemplateResolver } from './report-template-registry'
import type { AgentReportSpec } from './types'
const configFrom = (ctx: BlockMatchContext) => ctx.evidence.find(item => item.recipe?.project)?.recipe?.project?.config
export function projectReportSpec(ctx: BlockMatchContext): AgentReportSpec {
  const config = configFrom(ctx)
  if (!config) throw new Error('Project report requires project-snapshot evidence.')
  const f = config.fields
  return { title: `${config.name} · 项目周期报告`, locale: 'zh-CN', interactions: { dataPolicy: { mode: 'full' } }, layout: { preset: 'narrative', maxColumns: 12 }, charts: [
    { id: 'project-schedule', type: 'gantt', title: '排期与里程碑', encoding: {
      label: { field: f.title }, end: { field: f.due_date, type: 'temporal' }, color: { field: f.status },
      ...(f.start_date ? { start: { field: f.start_date, type: 'temporal' as const } } : {})
    }, provenance: { evidence: ['project_tasks'], derivedFrom: ['$evidence:project_tasks.rows'] }, placement: { span: 12, emphasis: 'primary' } },
    { id: 'project-state', type: 'bar', variant: 'horizontal', title: '状态分布', encoding: { x: { field: f.status }, y: { field: f.task_id, aggregate: 'count' } }, provenance: { evidence: ['project_states'], derivedFrom: ['$evidence:project_states.rows'] }, placement: { span: 12, emphasis: 'supporting' } }
  ], insights: [] }
}
export const PROJECT_REPORT_BLOCK: ReportBlockResolver = {
  id: 'project-status', description: 'Project snapshot: schedule, milestones, states, problems and actions.', bestFor: ['项目周报', '项目月报'], density: 'full', examplePrompt: '沿用口径更新项目周报', variables: {}, qualityChecks: ['Explicit task IDs and dates', 'Completion ratio is task-based'], requiredEvidence: ['project_summary', 'project_tasks', 'project_states'], validInsightTypes: ['total'], dataQualityConstraints: ['Complete task snapshot and explicit status mapping'], provenanceRecipes: [],
  canUse: ctx => ({ ok: Boolean(configFrom(ctx)), score: configFrom(ctx) ? 0.98 : 0, reason: configFrom(ctx) ? undefined : 'Provide --project-config and explicit period dates during data analyze.' }),
  defaultVariables: () => ({}), compile: (_, ctx) => ({ charts: projectReportSpec(ctx).charts, insights: [] })
}
export const PROJECT_REPORT_TEMPLATE: ReportTemplateResolver = {
  id: 'project-periodic', bestFor: ['项目周期报告'], requires: [], blocks: ['project-status'], density: 'full', qualityNotes: ['Facts use explicit cutoff dates'], requiredEvidence: ['project_summary', 'project_tasks', 'project_states'], qualityConstraints: ['Stable task IDs'], layoutPreset: 'narrative', canUse: PROJECT_REPORT_BLOCK.canUse, instantiate: projectReportSpec
}
