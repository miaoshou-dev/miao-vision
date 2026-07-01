import { readFileSync } from 'node:fs'
import { extname, basename } from 'node:path'
import { z } from 'zod'
import { agentError, ok } from './errors'
import type { AgentResult } from './types'

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

export type InfographicVisualType =
  | 'kpi-strip'
  | 'metric-bars'
  | 'process-flow'
  | 'concept-contrast'
  | 'timeline-path'
  | 'part-to-whole'
  | 'before-after'
  | 'tradeoff-matrix'
  | 'ranked-list-chart'
  | 'system-diagram'
  | 'callout-diagram'
  | 'icon-cluster'

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

export interface InfographicSpec {
  title: string
  subtitle?: string
  source?: string
  style: InfographicStyle
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

const infographicVisualSchema = z.object({
  type: z.union([
    z.literal('kpi-strip'), z.literal('metric-bars'), z.literal('process-flow'),
    z.literal('concept-contrast'), z.literal('timeline-path'), z.literal('part-to-whole'),
    z.literal('before-after'), z.literal('tradeoff-matrix'), z.literal('ranked-list-chart'),
    z.literal('system-diagram'), z.literal('callout-diagram'), z.literal('icon-cluster')
  ]),
  data: z.record(z.string(), z.unknown()),
  caption: z.string().optional()
})

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

export const infographicSpecSchema = z.object({
  title: z.string().min(1, 'title must not be empty'),
  subtitle: z.string().optional(),
  source: z.string().optional(),
  style: z.union([z.literal('editorial'), z.literal('executive'), z.literal('minimal')]).default('editorial'),
  summary: z.string().min(1, 'summary must not be empty'),
  sections: z.array(infographicSectionSchema).min(1, 'sections must have at least one entry'),
  metadata: z.object({
    inputFile: z.string().default(''),
    generatedAt: z.string().default(() => new Date().toISOString()),
    wordCount: z.number().int().min(0).default(0)
  }).default(() => ({ inputFile: '', generatedAt: new Date().toISOString(), wordCount: 0 }))
})

export function loadInfographicSpec(file: string): AgentResult<InfographicSpec> {
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    return agentError('ARTICLE_INPUT_UNREADABLE', error instanceof Error ? error.message : 'Spec file could not be read.', { file })
  }
  const parsed = infographicSpecSchema.safeParse(raw)
  if (!parsed.success) {
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

const DATE_PATTERN = /\b(?:\d{4}(?:[-/]\d{1,2}(?:[-/]\d{1,2})?)?|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b/i
const NUMBER_PATTERN = /(?:[$¥€]\s?\d[\d,.]*|\b\d+(?:\.\d+)?%?\b)/

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

function extractUnit(value: string): string {
  return value.replace(/[0-9,.\-]/g, '').replace(/[^a-zA-Z%\/\u4e00-\u9fff]/g, '').trim()
}

function detectSameUnit(items: InfographicSectionItem[]): boolean {
  const units = items
    .filter(f => f.value)
    .map(f => extractUnit(f.value!))
    .filter(u => u.length > 0)
  if (units.length < 2) return false
  const first = units[0]
  return units.every(u => u === first)
}

function buildFactsVisual(facts: InfographicSectionItem[]): InfographicVisual | undefined {
  const numeric = facts.filter(f => f.value && /[\d]/.test(f.value))
  if (numeric.length < 2) return undefined

  const rankingPattern = /\b(top|rank|#1|#2|leading|biggest|largest|highest|most|best|领先|最大|最高|排名)\b/i
  const pctItems = numeric.filter(f => f.value?.includes('%'))

  if (pctItems.length >= 2) {
    return {
      type: 'part-to-whole',
      data: { items: pctItems.slice(0, 6).map(f => ({ label: f.text, value: Number.parseFloat(f.value!.replace(/[^0-9.\-]/g, '')) || 0, text: f.text })) },
      caption: 'Proportional breakdown of key metrics.'
    }
  }

  if (numeric.some(f => rankingPattern.test(f.text)) && numeric.length >= 3) {
    return {
      type: 'ranked-list-chart',
      data: { items: numeric.slice(0, 8).map(f => ({ label: f.text, value: Number.parseFloat(f.value!.replace(/[^0-9.\-]/g, '')) || 0, text: f.text })) },
      caption: 'Ranked metrics from the article.'
    }
  }

  const sameUnit = detectSameUnit(numeric)
  if (sameUnit && numeric.length >= 2 && numeric.length <= 8) {
    return {
      type: 'metric-bars',
      data: { items: numeric.slice(0, 6).map(f => ({ label: f.text, value: Number.parseFloat(f.value!.replace(/[^0-9.\-]/g, '')) || 0, unit: extractUnit(f.value!) })) },
      caption: 'Key metrics compared side by side.'
    }
  }

  return {
    type: 'kpi-strip',
    data: { items: numeric.slice(0, 6).map(f => ({ label: f.text, value: Number.parseFloat(f.value!.replace(/[^0-9.\-]/g, '')) || 0, unit: extractUnit(f.value!) || undefined })) }
  }
}

function buildTimelineVisual(timeline: InfographicSectionItem[]): InfographicVisual | undefined {
  if (timeline.length >= 2) {
    return {
      type: 'timeline-path',
      data: { items: timeline.slice(0, 6).map(f => ({ label: f.label || '', text: f.text })) }
    }
  }
  return undefined
}

function detectProcess(listItems: string[], evidence: string[]): InfographicSectionItem[] {
  const stepPattern = /\b(step|stage|phase|first|then|next|finally|步骤|阶段|首先|然后|最后)\b/i
  const candidates = [...listItems, ...evidence]
    .filter(text => stepPattern.test(text))
    .map(text => ({ text: compactText(text, 150) }))
  return uniqueItems(candidates)
}

function buildInfographicSpec(parsed: ParsedArticle, style: InfographicStyle, file: string): InfographicSpec {
  const evidence = [...parsed.listItems, ...sentences(parsed.paragraphs.join(' '))]
  const facts = collectFacts(evidence)
  const timeline = collectTimeline(evidence)
  const comparison = collectComparison(evidence, parsed.tableRows)
  const takeaways = collectTakeaways(evidence, facts)
  const process = detectProcess(parsed.listItems, evidence)
  const summary = parsed.subtitle ?? takeaways[0]?.text ?? facts[0]?.text ?? 'A concise visual summary of the source article.'

  const sections: InfographicSection[] = [
    {
      type: 'hero',
      title: parsed.title,
      emphasis: summary,
      items: [{ text: summary }]
    }
  ]

  if (process.length >= 3) {
    sections.push({
      type: 'process',
      title: 'Process',
      items: process.slice(0, 6),
      visual: {
        type: 'process-flow',
        data: { items: process.slice(0, 6).map((item, i) => ({ label: `Step ${i + 1}`, text: item.text })) }
      }
    })
  }

  if (facts.length > 0) {
    const v = buildFactsVisual(facts)
    sections.push({ type: 'facts', title: 'Key Facts', items: facts.slice(0, 6), ...(v ? { visual: v } : {}) })
  }
  if (timeline.length > 1) {
    const v = buildTimelineVisual(timeline)
    sections.push({ type: 'timeline', title: 'Timeline', items: timeline.slice(0, 6), ...(v ? { visual: v } : {}) })
  }
  if (comparison.length > 1) {
    sections.push({ type: 'comparison', title: 'Comparison', items: comparison.slice(0, 6) })
  }
  if (parsed.quotes.length > 0) {
    sections.push({
      type: 'quote',
      title: 'Notable Quote',
      emphasis: parsed.quotes[0],
      items: parsed.quotes.slice(0, 3).map(text => ({ text }))
    })
  }
  if (takeaways.length > 0) sections.push({ type: 'takeaways', title: 'Takeaways', items: takeaways.slice(0, 5) })

  return {
    title: parsed.title,
    subtitle: parsed.subtitle,
    source: parsed.source,
    style,
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

function collectFacts(candidates: string[]): InfographicSectionItem[] {
  return uniqueItems(candidates
    .filter(text => NUMBER_PATTERN.test(text))
    .map(text => ({
      value: text.match(NUMBER_PATTERN)?.[0],
      text: compactText(text, 150)
    })))
}

function collectTimeline(candidates: string[]): InfographicSectionItem[] {
  return uniqueItems(candidates
    .filter(text => DATE_PATTERN.test(text))
    .map(text => ({
      label: text.match(DATE_PATTERN)?.[0],
      text: compactText(text, 150)
    })))
}

function collectComparison(candidates: string[], tableRows: string[][]): InfographicSectionItem[] {
  const tableItems = tableRows.slice(1).map(row => ({
    label: row[0],
    text: row.slice(1).join(' — ')
  }))
  const textItems = candidates
    .filter(text => /\b(vs\.?|versus|compared with|compared to|whereas|while)\b/i.test(text))
    .map(text => ({ text: compactText(text, 160) }))
  return uniqueItems([...tableItems, ...textItems])
}

function collectTakeaways(candidates: string[], facts: InfographicSectionItem[]): InfographicSectionItem[] {
  const explicit = candidates
    .filter(text => /\b(key|takeaway|therefore|recommend|should|must|need to|in summary|conclusion|next)\b/i.test(text))
    .map(text => ({ text: compactText(text, 160) }))
  if (explicit.length > 0) return uniqueItems(explicit)
  return facts.slice(0, 3).map(item => ({ text: item.text }))
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

function uniqueItems(items: InfographicSectionItem[]): InfographicSectionItem[] {
  const seen = new Set<string>()
  return items.filter(item => {
    const key = item.text.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function compactText(text: string, max: number): string {
  const clean = cleanMarkdown(text)
  return clean.length > max ? `${clean.slice(0, max - 1).trim()}...` : clean
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
