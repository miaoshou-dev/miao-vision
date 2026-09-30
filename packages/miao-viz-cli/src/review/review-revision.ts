import { createHash, randomUUID } from 'node:crypto'
import { z } from 'zod'
import type { ReviewRunSnapshot } from './review-events'
import { artifactSpecMap } from './review-p2'

const targetSchema = z.object({
  id: z.string().min(1).max(300),
  kind: z.enum(['title', 'section', 'kpi', 'table', 'chart', 'insight', 'slide', 'slideTitle', 'slideClaim', 'posterTitle', 'posterSubtitle', 'posterMetric', 'posterChart', 'posterCopy', 'posterFooter']),
  path: z.string().min(1).max(300),
  title: z.string().max(1000).optional(),
  evidenceIds: z.array(z.string().min(1).max(300)).max(30).default([])
})

export const revisionRequestSchema = z.object({
  revisionId: z.string().uuid(),
  parentRunId: z.string().min(1).max(160),
  kind: z.enum(['report', 'deck']),
  sourceSpecPath: z.string().min(1).max(4096),
  instruction: z.string().min(1).max(6000),
  targets: z.array(targetSchema).min(1).max(40),
  theme: z.object({ id: z.string().min(1).max(120), path: z.enum(['theme', 'poster.theme']) }).optional(),
  evidenceIds: z.array(z.string().min(1).max(300)).max(200),
  createdAt: z.string().datetime()
})

export const patchSetSchema = z.object({
  operations: z.array(z.object({
    op: z.literal('replace'),
    path: z.string().min(1).max(300),
    value: z.union([z.string().max(4000), z.number().finite(), z.boolean(), z.null()])
  })).min(1).max(80)
})

export const revisionPlanSchema = z.object({
  revisionId: z.string().uuid(),
  parentRunId: z.string().min(1),
  summary: z.string().min(1).max(2000),
  changes: z.array(z.string().min(1).max(1000)).min(1).max(60),
  preserved: z.array(z.string().min(1).max(1000)).min(1).max(30),
  validations: z.array(z.string().min(1).max(1000)).min(1).max(30),
  risks: z.array(z.string().min(1).max(1000)).max(30),
  status: z.enum(['draft', 'confirmed', 'applied', 'failed']),
  patchSet: patchSetSchema.optional(),
  childRunId: z.string().min(1).optional()
})

export type RevisionRequest = z.infer<typeof revisionRequestSchema>
export type RevisionPlan = z.infer<typeof revisionPlanSchema>
export type PatchSet = z.infer<typeof patchSetSchema>

type SpecMap = { sourceSpecPath?: string, items?: Array<z.infer<typeof targetSchema>> }

export function createRevisionRequest(run: ReviewRunSnapshot, input: Omit<RevisionRequest, 'revisionId' | 'parentRunId' | 'kind' | 'sourceSpecPath' | 'evidenceIds' | 'createdAt'>): RevisionRequest {
  if (run.kind === 'article') throw new Error('Article artifacts do not support controlled Spec revisions.')
  const map = artifactSpecMap(run) as SpecMap
  if (!map.sourceSpecPath) throw new Error('The selected run has no source Spec path.')
  const available = new Map((map.items ?? []).map(item => [`${item.kind}:${item.id}`, item]))
  const targets = input.targets.map(target => {
    const current = available.get(`${target.kind}:${target.id}`)
    if (!current || current.path !== target.path) throw new Error(`Unknown revision target: ${target.kind}:${target.id}`)
    return current
  })
  const evidenceIds = [...new Set(targets.flatMap(target => target.evidenceIds ?? []))]
  return revisionRequestSchema.parse({
    revisionId: randomUUID(), parentRunId: run.runId, kind: run.kind, sourceSpecPath: map.sourceSpecPath,
    instruction: input.instruction, targets, ...(input.theme ? { theme: input.theme } : {}), evidenceIds, createdAt: new Date().toISOString()
  })
}

export function planRevision(request: RevisionRequest): RevisionPlan {
  const themeChange = request.theme ? [`将整份产物主题替换为 ${request.theme.id}。`] : []
  const targetChanges = request.targets.map(target => `按请求修改 ${target.kind}「${target.title ?? target.id}」。`)
  const dataRisk = /\b(data|dataset|source|evidence|number|metric)\b|数据|数字|指标|证据|数据源/i.test(request.instruction)
  return revisionPlanSchema.parse({
    revisionId: request.revisionId, parentRunId: request.parentRunId,
    summary: `受控修订 ${request.targets.length} 个模块，${request.theme ? '并更换主题。' : '不更换主题。'}`,
    changes: [...themeChange, ...targetChanges],
    preserved: ['原始输入数据与父版本产物保持不变。', '未经明确允许的证据、provenance 与字段编码保持不变。'],
    validations: ['校验 PatchSet 仅触及选中模块或主题字段。', '运行对应 Spec 验证和交付验证后才发布子版本。'],
    risks: dataRisk ? ['请求涉及数据或证据语义，不能通过局部修订改变数据，需重跑数据工作流。'] : [],
    status: 'draft'
  })
}

export function validatePatchSet(request: RevisionRequest, patchSet: PatchSet, themeIds: readonly string[]): PatchSet {
  const allowed = new Set(request.targets.flatMap(target => allowedPaths(target)))
  if (request.theme) allowed.add(request.theme.path)
  for (const operation of patchSet.operations) {
    if (/\b(evidence|provenance|encoding|data|input)\b/i.test(operation.path)) throw new Error(`Patch path is protected: ${operation.path}`)
    if (!allowed.has(operation.path)) throw new Error(`Patch path is not allowed by this revision request: ${operation.path}`)
    if ((operation.path === 'theme' || operation.path === 'poster.theme') && (typeof operation.value !== 'string' || !themeIds.includes(operation.value))) throw new Error(`Theme is not registered: ${String(operation.value)}`)
  }
  return patchSetSchema.parse(patchSet)
}

function allowedPaths(target: z.infer<typeof targetSchema>): string[] {
  if (target.kind === 'title' || target.kind === 'posterTitle' || target.kind === 'posterSubtitle' || target.kind === 'posterCopy' || target.kind === 'posterFooter') return [target.path]
  if (target.kind === 'insight') return [target.path, `${target.path}.text`]
  if (target.kind === 'slideTitle') return [target.path]
  if (target.kind === 'slideClaim') return [target.path]
  if (target.kind === 'slide') return [`${target.path}.title`, `${target.path}.claim`, `${target.path}.layout`]
  if (target.kind === 'chart' || target.kind === 'kpi' || target.kind === 'table' || target.kind === 'posterChart') return [`${target.path}.title`, `${target.path}.type`, `${target.path}.style`, `${target.path}.layout`]
  if (target.kind === 'posterMetric') return [target.path]
  return [target.path]
}

export function revisionDigest(request: RevisionRequest): string {
  return createHash('sha256').update(JSON.stringify(request)).digest('hex')
}
