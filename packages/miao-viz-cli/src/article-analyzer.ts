import { readFileSync } from 'node:fs'
import { extname, basename } from 'node:path'
import { agentError, ok } from './errors'
import type { AgentResult } from './types'

export interface ArticleHeading {
  level: number
  text: string
}

export interface ArticleSection {
  heading: string | null
  content: string
  wordCount: number
}

export interface ArticleContext {
  title: string
  source?: string
  headings: ArticleHeading[]
  sections: ArticleSection[]
  paragraphs: string[]
  listItems: string[]
  quotes: string[]
  tables: string[][]
  metadata: {
    inputFile: string
    wordCount: number
    estimatedReadingMinutes: number
    lineCount: number
  }
  termCandidates: string[]
}

const ACRONYM_PATTERN = /\b[A-Z]{2,}(?:s)?\b/g
const TECHNICAL_PATTERN = /\b(?:[A-Z][a-z]+[A-Z]\w*|[a-z]+[A-Z]\w*)\b/g
const NUMBERED_TERM_PATTERN = /\b[A-Za-z]+(?:\s+\d+(?:\.\d+)?){1,2}\b/g

function extractTermCandidates(text: string): string[] {
  const candidates = new Set<string>()
  const lines = text.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('>') || trimmed.startsWith('|') || trimmed.startsWith('#')) continue

    const matches = trimmed.matchAll(ACRONYM_PATTERN)
    for (const m of matches) {
      if (m[0].length >= 2 && !['I', 'II', 'III', 'IV', 'VI'].includes(m[0])) {
        candidates.add(m[0])
      }
    }

    const techMatches = trimmed.matchAll(TECHNICAL_PATTERN)
    for (const m of techMatches) {
      if (m[0].length >= 6) candidates.add(m[0])
    }

    const numberedMatches = trimmed.matchAll(NUMBERED_TERM_PATTERN)
    for (const m of numberedMatches) {
      if (m[0].length >= 5) candidates.add(m[0])
    }
  }

  return [...candidates].sort()
}

function extractHeadings(lines: string[]): ArticleHeading[] {
  return lines
    .map(line => line.trim().match(/^(#{1,6})\s+(.+)/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map(m => ({ level: m[1].length, text: m[2].replace(/[`*_]/g, '').trim() }))
}

function extractSections(lines: string[]): ArticleSection[] {
  const sections: ArticleSection[] = []
  let currentHeading: string | null = null
  let currentContent: string[] = []

  function flush() {
    const text = currentContent.join(' ').replace(/\s+/g, ' ').trim()
    if (text) {
      sections.push({
        heading: currentHeading,
        content: text,
        wordCount: text.split(/\s+/).filter(Boolean).length
      })
    }
    currentContent = []
  }

  for (const line of lines) {
    const headingMatch = line.trim().match(/^#{1,6}\s+/)
    if (headingMatch) {
      flush()
      currentHeading = line.trim().replace(/^#+\s*/, '').replace(/[`*_]/g, '').trim()
    } else {
      const stripped = line.trim()
      if (stripped) currentContent.push(stripped)
    }
  }
  flush()

  return sections
}

function stripFrontmatter(lines: string[]): string[] {
  if (lines.length > 0 && lines[0].trim() === '---') {
    const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---')
    if (end > 0) return lines.slice(end + 1)
  }
  return lines
}

function extractMetadata(lines: string[]): { source?: string; title?: string } {
  const sourceLine = lines.find(line => line.match(/^(source|url):\s*/i))
  const titleLine = lines.find(line => line.match(/^title:\s*/i))
  return {
    source: sourceLine?.replace(/^(source|url):\s*/i, '').replace(/^["\s]+|["\s]+$/g, '').trim(),
    title: titleLine?.replace(/^title:\s*/i, '').replace(/^["\s]+|["\s]+$/g, '').trim()
  }
}

function findTitle(lines: string[], frontmatterTitle?: string, file?: string): string {
  if (frontmatterTitle) return frontmatterTitle
  const heading = lines.find(line => line.trim().match(/^#\s+\S/))
  if (heading) return heading.replace(/^#\s+/, '').replace(/[`*_]/g, '').trim()
  if (file) {
    return basename(file, extname(file)).replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }
  return 'Untitled'
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

function extractTableRows(lines: string[]): string[][] {
  return lines
    .filter(line => line.includes('|') && !line.match(/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/))
    .map(line => line.split('|').map(cell => cleanMarkdown(cell)).filter(Boolean))
    .filter(row => row.length > 1)
}

export function analyzeArticle(file: string): AgentResult<ArticleContext> {
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
    return agentError('ARTICLE_INPUT_UNREADABLE', error instanceof Error ? error.message : 'Article input could not be read.', { file })
  }

  const normalized = raw
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .split('\n')
    .map(line => line.replace(/[ \u00a0]+$/g, ''))
    .join('\n')
    .trim()

  if (!normalized) {
    return agentError('EMPTY_ARTICLE_INPUT', 'Article input is empty after normalization.', { file })
  }

  const lines = normalized.split('\n')
  const bodyLines = stripFrontmatter(lines)
  const metadata = extractMetadata(lines)
  const title = findTitle(bodyLines, metadata.title, file)

  const contentLines = bodyLines.filter(line => {
    const trimmed = line.trim()
    return !trimmed.match(/^#\s+/) && !trimmed.match(/^(source|url|author|date|title|published|created|tags?|description):\s*/i)
  })

  const quotes = contentLines
    .filter(line => line.trim().startsWith('>'))
    .map(line => cleanMarkdown(line.replace(/^>\s?/, '')))
    .filter(Boolean)

  const listItems = contentLines
    .filter(line => line.trim().match(/^[-*+]\s+/) || line.trim().match(/^\d+\.\s+/))
    .map(line => cleanMarkdown(line.replace(/^\s*(?:[-*+]|\d+\.)\s+/, '')))
    .filter(Boolean)

  const tables = extractTableRows(contentLines)

  const paragraphs = contentLines
    .join('\n')
    .split(/\n{2,}/)
    .map(block => cleanMarkdown(block.replace(/\n/g, ' ')))
    .filter(block => block.length > 0 && !block.startsWith('|') && !block.match(/^[-*+]\s+/))

  const headings = extractHeadings(bodyLines)
  const sections = extractSections(bodyLines)

  const allText = paragraphs.join(' ')
  const wordCount = allText.split(/\s+/).filter(Boolean).length

  const termCandidates = extractTermCandidates(normalized)

  return ok({
    title,
    source: metadata.source,
    headings,
    sections,
    paragraphs,
    listItems,
    quotes,
    tables,
    metadata: {
      inputFile: file,
      wordCount,
      estimatedReadingMinutes: Math.max(1, Math.round(wordCount / 200)),
      lineCount: lines.length
    },
    termCandidates
  })
}
