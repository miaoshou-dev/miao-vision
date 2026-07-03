import { readFileSync } from 'node:fs'
import { extname, basename } from 'node:path'
import { z } from 'zod'
import { agentError, ok } from './errors'
import type { AgentResult } from './types'
import type { InfographicVisualType } from './infographic/types'
export type { InfographicVisualType } from './infographic/types'
import {
  collectFacts, collectTimeline, collectComparison, collectTakeaways,
  detectLifecyclePoints, detectProcessItems, selectFactsVisual, selectTimelineVisual, selectProcessVisual,
  selectSequenceVisual, selectComparisonVisual, selectListVisual, selectRelationVisual
} from './infographic/planner'
import { planComposition } from './infographic/composition-planner'
import {
  COMPOSITION_CONFIDENCE_THRESHOLD,
  compositionDecisionSchema,
  compositionTypeSchema,
  type CompositionDecision,
  type InfographicCompositionType
} from './infographic/composition-decision'
import {
  kpiStripDataSchema, metricBarsDataSchema, processFlowDataSchema,
  conceptContrastDataSchema, timelinePathDataSchema, partToWholeDataSchema,
  beforeAfterDataSchema, tradeoffMatrixDataSchema, rankedListChartDataSchema,
  systemDiagramDataSchema, calloutDiagramDataSchema, iconClusterDataSchema,
  quadrantPriorityDataSchema, roadmapSequenceDataSchema, hierarchyTreeDataSchema,
  relationFlowDataSchema, pyramidListDataSchema, gridListDataSchema
} from './infographic/schemas'
import { countOrderedPhasePoints, hasKpiVisual } from './infographic/compositions/helpers'

export const ARTICLE_STYLES = ['editorial', 'executive', 'minimal'] as const
export const ARTICLE_FORMATS = ['html', 'json', 'markdown', 'png', 'pdf'] as const

export type InfographicStyle = (typeof ARTICLE_STYLES)[number]
export type ArticleOutputFormat = (typeof ARTICLE_FORMATS)[number]
export type InfographicSectionType = 'hero' | 'facts' | 'timeline' | 'comparison' | 'quote' | 'takeaways' | 'process' | 'pros-cons' | 'stat-grid' | 'risk-matrix' | 'checklist'

export interface InfographicSectionItem {
  label?: string
  value?: string
  text: string
  detail?: string
}

export interface InfographicVisual {
  type: InfographicVisualType
  data: Record<string, unknown>
  caption?: string
}

export interface InfographicSection {
  type: InfographicSectionType
  title: string
  items: InfographicSectionItem[]
  emphasis?: string
  notes?: string | string[]
  visual?: InfographicVisual
}

export interface InfographicComposition {
  type: InfographicCompositionType
  density?: 'compact' | 'standard' | 'long'
  emphasis?: 'narrative' | 'metrics' | 'actions' | 'structure'
}

export interface InfographicSpec {
  title: string
  subtitle?: string
  source?: string
  style: InfographicStyle
  composition: InfographicComposition
  compositionDecision: CompositionDecision
  summary: string
  sections: InfographicSection[]
  metadata: {
    inputFile: string
    generatedAt: string
    wordCount: number
  }
}

const infographicSectionItemSchema = z.object({
  label: z.string().optional(),
  value: z.string().optional(),
  text: z.string().min(1, 'item.text must not be empty'),
  detail: z.string().optional()
})

const visualSchemas = [
  { type: z.literal('kpi-strip'), data: kpiStripDataSchema },
  { type: z.literal('metric-bars'), data: metricBarsDataSchema },
  { type: z.literal('process-flow'), data: processFlowDataSchema },
  { type: z.literal('concept-contrast'), data: conceptContrastDataSchema },
  { type: z.literal('timeline-path'), data: timelinePathDataSchema },
  { type: z.literal('part-to-whole'), data: partToWholeDataSchema },
  { type: z.literal('before-after'), data: beforeAfterDataSchema },
  { type: z.literal('tradeoff-matrix'), data: tradeoffMatrixDataSchema },
  { type: z.literal('ranked-list-chart'), data: rankedListChartDataSchema },
  { type: z.literal('system-diagram'), data: systemDiagramDataSchema },
  { type: z.literal('callout-diagram'), data: calloutDiagramDataSchema },
  { type: z.literal('icon-cluster'), data: iconClusterDataSchema },
  { type: z.literal('quadrant-priority'), data: quadrantPriorityDataSchema },
  { type: z.literal('roadmap-sequence'), data: roadmapSequenceDataSchema },
  { type: z.literal('hierarchy-tree'), data: hierarchyTreeDataSchema },
  { type: z.literal('relation-flow'), data: relationFlowDataSchema },
  { type: z.literal('pyramid-list'), data: pyramidListDataSchema },
  { type: z.literal('grid-list'), data: gridListDataSchema }
] as const

const infographicVisualSchema = z.discriminatedUnion('type', visualSchemas.map(s =>
  z.object({ type: s.type, data: s.data, caption: z.string().optional() })
) as any)

const infographicSectionSchema = z.object({
  type: z.union([
    z.literal('hero'), z.literal('facts'), z.literal('timeline'),
    z.literal('comparison'), z.literal('quote'), z.literal('takeaways'),
    z.literal('process'), z.literal('pros-cons'), z.literal('stat-grid'),
    z.literal('risk-matrix'), z.literal('checklist')
  ]),
  title: z.string().min(1, 'section.title must not be empty'),
  items: z.array(infographicSectionItemSchema).min(1, 'section.items must have at least one item'),
  emphasis: z.string().optional(),
  notes: z.union([z.string(), z.array(z.string())]).optional(),
  visual: infographicVisualSchema.optional()
})

const infographicCompositionSchema = z.object({
  type: compositionTypeSchema,
  density: z.enum(['compact', 'standard', 'long']).optional(),
  emphasis: z.enum(['narrative', 'metrics', 'actions', 'structure']).optional(),
})

const baseSpecSchema = z.object({
  title: z.string().min(1, 'title must not be empty'),
  subtitle: z.string().optional(),
  source: z.string().optional(),
  style: z.enum(['editorial', 'executive', 'minimal']).default('editorial'),
  composition: infographicCompositionSchema,
  compositionDecision: compositionDecisionSchema,
  summary: z.string().min(1, 'summary must not be empty'),
  sections: z.array(infographicSectionSchema).min(1, 'sections must have at least one entry'),
  metadata: z.object({
    inputFile: z.string().default(''),
    generatedAt: z.string().default(() => new Date().toISOString()),
    wordCount: z.number().int().min(0).default(0)
  }).default(() => ({ inputFile: '', generatedAt: new Date().toISOString(), wordCount: 0 }))
}).superRefine((spec, ctx) => {
  if (spec.composition.type !== spec.compositionDecision.selected) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['compositionDecision', 'selected'],
      message: `composition.type must match compositionDecision.selected (${spec.composition.type} !== ${spec.compositionDecision.selected})`
    })
  }
  if (spec.compositionDecision.confidence < COMPOSITION_CONFIDENCE_THRESHOLD && !spec.compositionDecision.needsUserChoice) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['compositionDecision', 'needsUserChoice'],
      message: `confidence below ${COMPOSITION_CONFIDENCE_THRESHOLD} requires needsUserChoice: true`
    })
  }
})

export const infographicSpecSchema = baseSpecSchema

export const strictInfographicSpecSchema = baseSpecSchema.superRefine((spec, ctx) => {
  if (spec.composition?.type === 'lifecycle-curve') {
    const count = countOrderedPhasePoints(spec)
    if (count < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['composition', 'type'],
        message: `lifecycle-curve requires at least 3 ordered phase points with numeric values, found ${count}`,
      })
    }
  }
  if (spec.composition?.type === 'strategy-dashboard') {
    if (!hasKpiVisual(spec)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['composition', 'type'],
        message: 'strategy-dashboard requires at least one kpi-strip visual in sections',
      })
    }
  }
})

export function loadInfographicSpec(file: string): AgentResult<InfographicSpec> {
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    return agentError('ARTICLE_INPUT_UNREADABLE', error instanceof Error ? error.message : 'Spec file could not be read.', { file })
  }
  if (!raw || typeof raw !== 'object' || !('compositionDecision' in raw)) {
    return agentError('MISSING_COMPOSITION_DECISION', 'InfographicSpec must include compositionDecision. Regenerate the spec with the current article workflow.', { file })
  }
  const parsed = infographicSpecSchema.safeParse(raw)
  if (!parsed.success) {
    const mismatch = parsed.error.issues.find(i => i.path.join('.') === 'compositionDecision.selected')
    if (mismatch) {
      return agentError('COMPOSITION_DECISION_MISMATCH', mismatch.message, { file, issues: parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) })
    }
    return agentError(
      'INVALID_INFOGRAPHIC_SPEC',
      `Spec validation failed: ${parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
      { issues: parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) }
    )
  }
  return ok(parsed.data as InfographicSpec)
}

interface ParsedArticle {
  title: string
  subtitle?: string
  source?: string
  paragraphs: string[]
  listItems: string[]
  quotes: string[]
  tableRows: string[][]
}



export function parseArticleStyle(value: string | undefined): InfographicStyle | undefined {
  if (!value) return 'editorial'
  return ARTICLE_STYLES.includes(value as InfographicStyle) ? value as InfographicStyle : undefined
}

export function parseArticleFormat(value: string | undefined): ArticleOutputFormat | undefined {
  if (!value) return 'html'
  return ARTICLE_FORMATS.includes(value as ArticleOutputFormat) ? value as ArticleOutputFormat : undefined
}

export function generateInfographicFromFile(
  file: string,
  style: InfographicStyle
): AgentResult<{ spec: InfographicSpec; markdown: string }> {
  const extension = extname(file).toLowerCase()
  if (extension && !['.md', '.markdown', '.txt'].includes(extension)) {
    return agentError('UNSUPPORTED_ARTICLE_INPUT', 'Article input must be a Markdown or plain-text file.', {
      supportedExtensions: ['.md', '.markdown', '.txt']
    })
  }

  let raw: string
  try {
    raw = readFileSync(file, 'utf8')
  } catch (error) {
    return agentError('ARTICLE_INPUT_UNREADABLE', error instanceof Error ? error.message : 'Article input could not be read.', {
      file
    })
  }

  const normalized = normalizeArticleText(raw)
  if (!normalized) {
    return agentError('EMPTY_ARTICLE_INPUT', 'Article input is empty after normalization.', { file })
  }

  const parsed = parseArticle(normalized, file)
  const spec = buildInfographicSpec(parsed, style, file)
  return ok({ spec, markdown: renderInfographicMarkdown(spec) })
}

function normalizeArticleText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .split('\n')
    .map(line => line.replace(/[ \u00a0]+$/g, ''))
    .join('\n')
    .trim()
}

function parseArticle(text: string, file: string): ParsedArticle {
  const lines = text.split('\n')
  const bodyLines = stripFrontmatter(lines)
  const metadata = extractMetadata(lines)
  const title = findTitle(bodyLines, metadata.title) ?? titleFromFilename(file)
  const contentLines = bodyLines.filter(line => {
    const trimmed = line.trim()
    return trimmed !== title && !trimmed.match(/^#\s+/) && !trimmed.match(/^(source|url|author|date|title|published|created|tags?|description):\s*/i)
  })

  const quotes = contentLines
    .filter(line => line.trim().startsWith('>'))
    .map(line => cleanMarkdown(line.replace(/^>\s?/, '')))
    .filter(Boolean)

  const listItems = contentLines
    .filter(line => line.trim().match(/^[-*+]\s+/) || line.trim().match(/^\d+\.\s+/))
    .map(line => cleanMarkdown(line.replace(/^\s*(?:[-*+]|\d+\.)\s+/, '')))
    .filter(Boolean)

  const tableRows = extractTableRows(contentLines)
  const paragraphs = contentLines
    .join('\n')
    .split(/\n{2,}/)
    .map(block => cleanMarkdown(block.replace(/\n/g, ' ')))
    .filter(block => block.length > 0 && !block.startsWith('|') && !block.match(/^[-*+]\s+/))

  return {
    title,
    subtitle: metadata.subtitle ?? firstUsefulParagraph(paragraphs),
    source: metadata.source,
    paragraphs,
    listItems,
    quotes,
    tableRows
  }
}

function buildInfographicSpec(parsed: ParsedArticle, style: InfographicStyle, file: string): InfographicSpec {
  const evidence = [...parsed.listItems, ...sentences(parsed.paragraphs.join(' '))]
  const corpus = [...parsed.paragraphs, ...parsed.listItems].join(' ')
  const lifecycleFacts = detectLifecyclePoints(evidence)
  const facts = lifecycleFacts.length >= 3 ? lifecycleFacts : collectFacts(evidence)
  const timeline = collectTimeline(evidence)
  const comparison = collectComparison(evidence, parsed.tableRows)
  const takeaways = collectTakeaways(evidence, facts)
  const processItems = detectProcessItems(parsed.listItems, evidence)
  const summary = parsed.subtitle ?? takeaways[0]?.text ?? facts[0]?.text ?? 'A concise visual summary of the source article.'
  const useLifecycleComposition = lifecycleFacts.length >= 3
  const compositionDecision = planComposition({
    facts,
    timeline,
    comparison,
    takeaways,
    processItems,
    quotes: parsed.quotes,
    paragraphs: parsed.paragraphs,
    tableRows: parsed.tableRows,
    lifecycleFacts
  })

  const sections: InfographicSection[] = [
    {
      type: 'hero',
      title: parsed.title,
      emphasis: summary,
      items: [{ text: summary }]
    }
  ]

  const processVisual = selectSequenceVisual(processItems, corpus) ?? selectProcessVisual(processItems)
  if (processVisual) {
    sections.push({
      type: 'process',
      title: 'Process',
      items: processItems.slice(0, 6),
      visual: processVisual
    })
  }

  if (facts.length > 0) {
    const v = useLifecycleComposition
      ? {
          type: 'metric-bars' as const,
          data: {
            items: facts.slice(0, 6).map(f => ({
              label: f.label || f.text,
              value: Number.parseFloat((f.value ?? '').replace(/[^0-9.\-]/g, '')) || 0,
              unit: f.value?.includes('%') ? '%' : undefined
            }))
          },
          caption: 'Lifecycle phase metrics compared side by side.'
        }
      : selectFactsVisual(facts)
    sections.push({ type: 'facts', title: 'Key Facts', items: facts.slice(0, 6), ...(v ? { visual: v } : {}) })
  }
  if (timeline.length > 1) {
    const v = selectTimelineVisual(timeline)
    sections.push({ type: 'timeline', title: 'Timeline', items: timeline.slice(0, 6), ...(v ? { visual: v } : {}) })
  }
  if (comparison.length > 1) {
    const v = selectComparisonVisual(comparison, corpus)
    sections.push({ type: 'comparison', title: 'Comparison', items: comparison.slice(0, 6), ...(v ? { visual: v } : {}) })
  }
  if (parsed.quotes.length > 0) {
    sections.push({
      type: 'quote',
      title: 'Notable Quote',
      emphasis: parsed.quotes[0],
      items: parsed.quotes.slice(0, 3).map(text => ({ text }))
    })
  }
  if (takeaways.length > 0) {
    const v = selectRelationVisual(takeaways, corpus) ?? selectListVisual(takeaways, corpus)
    sections.push({ type: 'takeaways', title: 'Takeaways', items: takeaways.slice(0, 5), ...(v ? { visual: v } : {}) })
  }

  return {
    title: parsed.title,
    subtitle: parsed.subtitle,
    source: parsed.source,
    style,
    composition: {
      type: compositionDecision.selected,
      density: compositionDecision.selected === 'article-linear' ? 'long' : 'compact',
      emphasis: compositionDecision.selected === 'strategy-dashboard'
        ? 'actions'
        : compositionDecision.selected === 'explainer-map'
          ? 'structure'
          : compositionDecision.selected === 'lifecycle-curve' || useLifecycleComposition
            ? 'metrics'
            : 'narrative'
    },
    compositionDecision,
    summary,
    sections,
    metadata: {
      inputFile: file,
      generatedAt: new Date().toISOString(),
      wordCount: parsed.paragraphs.join(' ').split(/\s+/).filter(Boolean).length
    }
  }
}

export function renderInfographicMarkdown(spec: InfographicSpec): string {
  const lines = [`# ${spec.title}`, '']
  if (spec.subtitle) lines.push(spec.subtitle, '')
  if (spec.source) lines.push(`Source: ${spec.source}`, '')
  lines.push(`Style: ${spec.style}`, '', `## Summary`, '', spec.summary, '')
  for (const section of spec.sections.filter(section => section.type !== 'hero')) {
    lines.push(`## ${section.title}`, '')
    for (const item of section.items) {
      const prefix = item.label ? `**${item.label}:** ` : ''
      lines.push(`- ${prefix}${item.value ? `${item.value} — ` : ''}${item.text}`)
    }
    lines.push('')
  }
  return lines.join('\n').trimEnd() + '\n'
}

function stripFrontmatter(lines: string[]): string[] {
  if (lines.length > 0 && lines[0].trim() === '---') {
    const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---')
    if (end > 0) return lines.slice(end + 1)
  }
  return lines
}

function extractMetadata(lines: string[]): { source?: string; subtitle?: string; title?: string } {
  const sourceLine = lines.find(line => line.match(/^(source|url):\s*/i))
  const subtitleLine = lines.find(line => line.match(/^subtitle:\s*/i))
  const titleLine = lines.find(line => line.match(/^title:\s*/i))
  return {
    source: sourceLine?.replace(/^(source|url):\s*/i, '').replace(/^["\s]+|["\s]+$/g, '').trim(),
    subtitle: subtitleLine?.replace(/^subtitle:\s*/i, '').replace(/^["\s]+|["\s]+$/g, '').trim(),
    title: titleLine?.replace(/^title:\s*/i, '').replace(/^["\s]+|["\s]+$/g, '').trim()
  }
}

function findTitle(lines: string[], frontmatterTitle?: string): string | undefined {
  if (frontmatterTitle) return frontmatterTitle
  const heading = lines.find(line => line.trim().match(/^#\s+\S/))
  if (heading) return cleanMarkdown(heading.replace(/^#\s+/, ''))
  const first = lines.find(line => line.trim() && !line.match(/^(source|url|author|date|title|published|created|tags?|description):\s*/i))
  return first ? cleanMarkdown(first).slice(0, 120) : undefined
}

function titleFromFilename(file: string): string {
  return basename(file, extname(file)).replace(/[-_]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}

function extractTableRows(lines: string[]): string[][] {
  return lines
    .filter(line => line.includes('|') && !line.match(/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/))
    .map(line => line.split('|').map(cell => cleanMarkdown(cell)).filter(Boolean))
    .filter(row => row.length > 1)
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。！？])\s+/)
    .map(cleanMarkdown)
    .filter(sentence => sentence.length > 20)
}

function firstUsefulParagraph(paragraphs: string[]): string | undefined {
  return paragraphs.find(paragraph => paragraph.length > 40)?.slice(0, 220)
}

function cleanMarkdown(value: string): string {
  return value
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#+\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
}
