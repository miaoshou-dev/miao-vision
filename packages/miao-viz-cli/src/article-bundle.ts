import { readFileSync } from 'node:fs'
import { z } from 'zod'
import { agentError, ok } from './errors'
import type { AgentResult } from './types'
import type { InfographicStyle, InfographicVisual } from './article-infographic'
import {
  beforeAfterDataSchema,
  calloutDiagramDataSchema,
  conceptContrastDataSchema,
  iconClusterDataSchema,
  kpiStripDataSchema,
  metricBarsDataSchema,
  partToWholeDataSchema,
  gridListDataSchema,
  hierarchyTreeDataSchema,
  pyramidListDataSchema,
  processFlowDataSchema,
  quadrantPriorityDataSchema,
  rankedListChartDataSchema,
  relationFlowDataSchema,
  roadmapSequenceDataSchema,
  systemDiagramDataSchema,
  timelinePathDataSchema,
  tradeoffMatrixDataSchema
} from './infographic/schemas'

export type InfographicBundleLayout = 'stacked' | 'grid'

export interface InfographicBundleBlock {
  id: string
  order: number
  title: string
  claim: string
  explanation: string
  visual: InfographicVisual
  evidenceIds?: string[]
  notes?: string | string[]
}

export interface InfographicBundleSpec {
  title: string
  summary: string
  source?: string
  style: InfographicStyle
  layout: InfographicBundleLayout
  blocks: InfographicBundleBlock[]
  metadata?: {
    inputFile?: string
    generatedAt?: string
    wordCount?: number
  }
}

const bundleVisualSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('kpi-strip'), data: kpiStripDataSchema, caption: z.string().optional() }),
  z.object({ type: z.literal('metric-bars'), data: metricBarsDataSchema, caption: z.string().optional() }),
  z.object({ type: z.literal('process-flow'), data: processFlowDataSchema, caption: z.string().optional() }),
  z.object({ type: z.literal('concept-contrast'), data: conceptContrastDataSchema, caption: z.string().optional() }),
  z.object({ type: z.literal('timeline-path'), data: timelinePathDataSchema, caption: z.string().optional() }),
  z.object({ type: z.literal('part-to-whole'), data: partToWholeDataSchema, caption: z.string().optional() }),
  z.object({ type: z.literal('before-after'), data: beforeAfterDataSchema, caption: z.string().optional() }),
  z.object({ type: z.literal('tradeoff-matrix'), data: tradeoffMatrixDataSchema, caption: z.string().optional() }),
  z.object({ type: z.literal('ranked-list-chart'), data: rankedListChartDataSchema, caption: z.string().optional() }),
  z.object({ type: z.literal('system-diagram'), data: systemDiagramDataSchema, caption: z.string().optional() }),
  z.object({ type: z.literal('callout-diagram'), data: calloutDiagramDataSchema, caption: z.string().optional() }),
  z.object({ type: z.literal('icon-cluster'), data: iconClusterDataSchema, caption: z.string().optional() }),
  z.object({ type: z.literal('quadrant-priority'), data: quadrantPriorityDataSchema, caption: z.string().optional() }),
  z.object({ type: z.literal('roadmap-sequence'), data: roadmapSequenceDataSchema, caption: z.string().optional() }),
  z.object({ type: z.literal('hierarchy-tree'), data: hierarchyTreeDataSchema, caption: z.string().optional() }),
  z.object({ type: z.literal('relation-flow'), data: relationFlowDataSchema, caption: z.string().optional() }),
  z.object({ type: z.literal('pyramid-list'), data: pyramidListDataSchema, caption: z.string().optional() }),
  z.object({ type: z.literal('grid-list'), data: gridListDataSchema, caption: z.string().optional() }),
])

const bundleBlockSchema = z.object({
  id: z.string().regex(/^fig-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/, 'block id must look like fig-01-market-timeline'),
  order: z.number().int().min(1),
  title: z.string().min(1, 'block.title must not be empty'),
  claim: z.string().min(1, 'block.claim must not be empty'),
  explanation: z.string().min(1, 'block.explanation must not be empty'),
  visual: bundleVisualSchema,
  evidenceIds: z.array(z.string().min(1)).optional(),
  notes: z.union([z.string(), z.array(z.string())]).optional()
})

export const infographicBundleSpecSchema = z.object({
  title: z.string().min(1, 'title must not be empty'),
  summary: z.string().min(1, 'summary must not be empty'),
  source: z.string().optional(),
  style: z.enum(['editorial', 'executive', 'minimal']).default('editorial'),
  layout: z.enum(['stacked', 'grid']).default('stacked'),
  blocks: z.array(bundleBlockSchema).min(1, 'blocks must have at least one entry'),
  metadata: z.object({
    inputFile: z.string().optional(),
    generatedAt: z.string().optional(),
    wordCount: z.number().int().min(0).optional()
  }).optional()
}).superRefine((spec, ctx) => {
  const ids = new Set<string>()
  const orders = new Set<number>()
  for (const [index, block] of spec.blocks.entries()) {
    if (ids.has(block.id)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['blocks', index, 'id'], message: `duplicate block id: ${block.id}` })
    }
    ids.add(block.id)
    if (orders.has(block.order)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['blocks', index, 'order'], message: `duplicate block order: ${block.order}` })
    }
    orders.add(block.order)

    const idOrder = Number(block.id.match(/^fig-(\d{2})-/)?.[1])
    if (idOrder !== block.order) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['blocks', index, 'id'],
        message: `block id number must match order (${block.id} !== ${String(block.order).padStart(2, '0')})`
      })
    }
  }
})

export function loadInfographicBundleSpec(file: string): AgentResult<InfographicBundleSpec> {
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    return agentError('ARTICLE_INPUT_UNREADABLE', error instanceof Error ? error.message : 'Bundle file could not be read.', { file })
  }
  const parsed = infographicBundleSpecSchema.safeParse(raw)
  if (!parsed.success) {
    return agentError(
      'INVALID_INFOGRAPHIC_BUNDLE_SPEC',
      `Bundle validation failed: ${parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
      { issues: parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) }
    )
  }
  return ok(parsed.data as InfographicBundleSpec)
}

export function renderInfographicBundleMarkdown(spec: InfographicBundleSpec): string {
  const lines = [`# ${spec.title}`, '', spec.summary, '']
  if (spec.source) lines.push(`Source: ${spec.source}`, '')
  for (const block of [...spec.blocks].sort((a, b) => a.order - b.order)) {
    lines.push(`## FIG ${String(block.order).padStart(2, '0')} ${block.title}`, '')
    lines.push(`- Block: ${block.id}`)
    lines.push(`- Visual: ${block.visual.type}`)
    lines.push(`- Claim: ${block.claim}`)
    lines.push(`- Explanation: ${block.explanation}`)
    if (block.evidenceIds?.length) lines.push(`- Evidence: ${block.evidenceIds.join(', ')}`)
    lines.push('')
  }
  return `${lines.join('\n')}\n`
}
