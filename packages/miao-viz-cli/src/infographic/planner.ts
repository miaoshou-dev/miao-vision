import type { InfographicSectionItem, InfographicVisual } from '../article-infographic'
import type { InfographicWarning } from '../infographic-quality'

const DATE_PATTERN = /\b(?:\d{4}(?:[-/]\d{1,2}(?:[-/]\d{1,2})?)?|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b/i
const NUMBER_PATTERN = /(?:[$¥€]\s?\d[\d,.]*|\b\d+(?:\.\d+)?%?\b)/
const NUMBER_GLOBAL_PATTERN = /[$¥€]?\s?\d[\d,.]*%?/g

const LIFECYCLE_PHASES = [
  { label: 'Introduction', regex: /\b(introduction|intro(?:ductory)?|launch)\b/i },
  { label: 'Growth', regex: /\b(growth|expansion|scaling)\b/i },
  { label: 'Maturity', regex: /\b(maturity|mature|peak|plateau|stable)\b/i },
  { label: 'Decline', regex: /\b(decline|drop|fall|downturn|erosion)\b/i }
] as const

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

function compactText(text: string, max: number): string {
  const clean = cleanMarkdown(text)
  return clean.length > max ? `${clean.slice(0, max - 1).trim()}...` : clean
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

function extractUnit(value: string): string {
  return value.replace(/[0-9,.\-]/g, '').replace(/[^a-zA-Z%\/\u4e00-\u9fff]/g, '').trim()
}

function detectSameUnit(items: { value?: string }[]): boolean {
  const units = items
    .filter(f => f.value)
    .map(f => extractUnit(f.value!))
    .filter(u => u.length > 0)
  if (units.length < 2) return false
  const first = units[0]
  return units.every(u => u === first)
}

export function collectFacts(candidates: string[]): InfographicSectionItem[] {
  return uniqueItems(candidates
    .filter(text => NUMBER_PATTERN.test(text))
    .map(text => ({
      value: text.match(NUMBER_PATTERN)?.[0],
      text: compactText(text, 150)
    })))
}

export function collectTimeline(candidates: string[]): InfographicSectionItem[] {
  return uniqueItems(candidates
    .filter(text => DATE_PATTERN.test(text))
    .map(text => ({
      label: text.match(DATE_PATTERN)?.[0],
      text: compactText(text, 150)
    })))
}

export function collectComparison(candidates: string[], tableRows: string[][]): InfographicSectionItem[] {
  const tableItems = tableRows.slice(1).map(row => ({
    label: row[0],
    text: row.slice(1).join(' — ')
  }))
  const textItems = candidates
    .filter(text => /\b(vs\.?|versus|compared with|compared to|whereas|while)\b/i.test(text))
    .map(text => ({ text: compactText(text, 160) }))
  return uniqueItems([...tableItems, ...textItems])
}

export function collectTakeaways(candidates: string[], facts: InfographicSectionItem[]): InfographicSectionItem[] {
  const explicit = candidates
    .filter(text => /\b(key|takeaway|therefore|recommend|should|must|need to|in summary|conclusion|next)\b/i.test(text))
    .map(text => ({ text: compactText(text, 160) }))
  if (explicit.length > 0) return uniqueItems(explicit)
  return facts.slice(0, 3).map(item => ({ text: item.text }))
}

export function detectProcessItems(listItems: string[], evidence: string[]): InfographicSectionItem[] {
  const stepPattern = /\b(step|stage|phase|first|then|next|finally|步骤|阶段|首先|然后|最后)\b/i
  const candidates = [...listItems, ...evidence]
    .filter(text => stepPattern.test(text))
    .map(text => ({ text: compactText(text, 150) }))
  return uniqueItems(candidates)
}

export function detectLifecyclePoints(candidates: string[]): InfographicSectionItem[] {
  const found = new Map<string, InfographicSectionItem>()

  for (const raw of candidates) {
    const text = compactText(raw, 180)
    if (!text) continue

    const numbers = Array.from(text.matchAll(NUMBER_GLOBAL_PATTERN)).map(match => match[0].trim())
    if (numbers.length === 0) continue

    const matchedPhases = LIFECYCLE_PHASES.filter(phase => phase.regex.test(text))
    if (matchedPhases.length === 0) continue

    if (
      matchedPhases.length >= 2 &&
      numbers.length >= 2 &&
      matchedPhases[0]?.label === 'Introduction' &&
      matchedPhases[1]?.label === 'Growth'
    ) {
      const phaseText = raw.toLowerCase().includes('from') && raw.toLowerCase().includes('to')
        ? text
        : `${matchedPhases[0].label} to ${matchedPhases[1].label}: ${text}`
      if (!found.has('Introduction')) {
        found.set('Introduction', { label: 'Introduction', value: numbers[0], text: phaseText })
      }
      if (!found.has('Growth')) {
        found.set('Growth', { label: 'Growth', value: numbers[1], text: phaseText })
      }
      continue
    }

    for (const phase of matchedPhases) {
      if (found.has(phase.label)) continue
      const value = numbers[numbers.length - 1]
      found.set(phase.label, { label: phase.label, value, text })
    }
  }

  return LIFECYCLE_PHASES
    .map(phase => found.get(phase.label))
    .filter((item): item is InfographicSectionItem => Boolean(item))
}

export interface PlannedVisual {
  visual?: InfographicVisual
  warnings: InfographicWarning[]
  reason: string
}

export function selectFactsVisual(facts: InfographicSectionItem[]): InfographicVisual | undefined {
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

export function selectTimelineVisual(timeline: InfographicSectionItem[]): InfographicVisual | undefined {
  if (timeline.length >= 2) {
    return {
      type: 'timeline-path',
      data: { items: timeline.slice(0, 6).map(f => ({ label: f.label || '', text: f.text })) }
    }
  }
  return undefined
}

export function selectProcessVisual(processItems: InfographicSectionItem[]): InfographicVisual | undefined {
  if (processItems.length >= 3) {
    return {
      type: 'process-flow',
      data: { items: processItems.slice(0, 6).map((item, i) => ({ label: `Step ${i + 1}`, text: item.text })) }
    }
  }
  return undefined
}
