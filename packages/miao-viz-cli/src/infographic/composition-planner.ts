import type { InfographicSectionItem } from '../article-infographic'
import {
  COMPOSITION_CONFIDENCE_THRESHOLD,
  type CompositionDecision,
  type InfographicCompositionType
} from './composition-decision'

export interface CompositionPlannerInput {
  facts: InfographicSectionItem[]
  timeline: InfographicSectionItem[]
  comparison: InfographicSectionItem[]
  takeaways: InfographicSectionItem[]
  processItems: InfographicSectionItem[]
  quotes: string[]
  paragraphs: string[]
  tableRows: string[][]
  lifecycleFacts: InfographicSectionItem[]
}

interface CandidateScore {
  type: InfographicCompositionType
  score: number
  signals: string[]
  dataShape: string[]
}

function textCorpus(input: CompositionPlannerInput): string {
  return [
    ...input.paragraphs,
    ...input.facts.map(i => `${i.label ?? ''} ${i.value ?? ''} ${i.text}`),
    ...input.takeaways.map(i => i.text),
    ...input.processItems.map(i => i.text),
    ...input.comparison.map(i => `${i.label ?? ''} ${i.text}`)
  ].join(' ').toLowerCase()
}

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(text))
}

function candidate(type: InfographicCompositionType): CandidateScore {
  return { type, score: 0, signals: [], dataShape: [] }
}

function add(c: CandidateScore, points: number, signal: string, dataShape?: string): void {
  c.score += points
  c.signals.push(signal)
  if (dataShape) c.dataShape.push(dataShape)
}

export function planComposition(input: CompositionPlannerInput): CompositionDecision {
  const text = textCorpus(input)
  const candidates = [
    candidate('article-linear'),
    candidate('lifecycle-curve'),
    candidate('strategy-dashboard'),
    candidate('explainer-map'),
    candidate('comparison-matrix')
  ]

  const byType = Object.fromEntries(candidates.map(c => [c.type, c])) as Record<InfographicCompositionType, CandidateScore>

  if (input.lifecycleFacts.length >= 3) {
    add(byType['lifecycle-curve'], 6, 'ordered lifecycle phases detected', '3+ ordered phase points')
  }
  if (hasAny(text, [/导入期|启动期|成长期|扩张期|成熟期|稳定期|平台期|衰退期|下降期|试点|推广|收缩/, /\b(launch|adoption|growth|scaling|maturity|plateau|decline|churn)\b/])) {
    add(byType['lifecycle-curve'], 1, 'lifecycle language detected')
  }
  if (input.timeline.length >= 3) {
    add(byType['lifecycle-curve'], 1, 'timeline progression detected', '3+ sequential milestones')
  }

  const numericFacts = input.facts.filter(f => f.value || /\d/.test(f.text))
  if (numericFacts.length >= 3) {
    add(byType['strategy-dashboard'], 1.5, 'multiple KPI-like metrics detected', '3+ numeric measures')
  }
  if (hasAny(text, [/kpi|roi|conversion|priority|risk|recommend|action|next step|cost|revenue/, /指标|目标|建议|行动|优先级|风险|成本|收入|转化率|下一步/])) {
    add(byType['strategy-dashboard'], 3, 'decision brief language detected')
  }
  if (input.takeaways.length >= 2) {
    add(byType['strategy-dashboard'], 1, 'actionable takeaways detected', '2+ recommendation items')
  }

  if (input.processItems.length >= 3) {
    add(byType['explainer-map'], 3, 'process structure detected', '3+ process steps')
  }
  if (hasAny(text, [/because|causes?|depends?|component|mechanism|workflow|system|how it works/, /因为|导致|依赖|机制|组件|流程|系统|原理|如何工作/])) {
    add(byType['explainer-map'], 3, 'mechanism or system explanation detected')
  }
  if (input.timeline.length >= 2 && input.processItems.length >= 2) {
    add(byType['explainer-map'], 1, 'sequence plus process shape detected')
  }

  if (input.comparison.length >= 2) {
    add(byType['comparison-matrix'], 2, 'explicit comparison items detected', '2+ comparable options')
  }
  if (input.tableRows.length >= 3) {
    add(byType['comparison-matrix'], 3, 'table structure detected', 'tabular comparison data')
  }
  if (hasAny(text, [/\b(vs\.?|versus|compared|trade-?off|pros?|cons?|before|after|alternative)\b/, /对比|比较|权衡|优缺点|前后|方案|取舍/])) {
    add(byType['comparison-matrix'], 1, 'comparison or tradeoff language detected')
  }

  const wordCount = input.paragraphs.join(' ').split(/\s+/).filter(Boolean).length
  if (wordCount > 240 || input.quotes.length > 0) {
    add(byType['article-linear'], 3, 'long-form editorial structure detected', 'multi-paragraph narrative')
  }
  if (input.facts.length + input.timeline.length + input.comparison.length + input.takeaways.length >= 6) {
    add(byType['article-linear'], 2, 'mixed article sections detected', 'varied article section mix')
  }
  if (candidates.every(c => c.type === 'article-linear' || c.score < 3)) {
    add(byType['article-linear'], 2, 'no strong structured composition shape detected')
  }

  candidates.sort((a, b) => b.score - a.score)
  if (candidates[0].type !== 'article-linear' && candidates[0].score < 5 && byType['article-linear'].score >= 3) {
    byType['article-linear'].score = candidates[0].score + 0.5
    byType['article-linear'].signals.push('structured signal is secondary to article narrative')
    byType['article-linear'].dataShape.push('mixed article sections')
    candidates.sort((a, b) => b.score - a.score)
  }
  const winner = candidates[0]
  const runnerUp = candidates[1]
  const margin = winner.score - runnerUp.score
  const confidence = Math.max(0.35, Math.min(0.95, 0.58 + winner.score * 0.035 + margin * 0.08))
  const needsUserChoice = confidence < COMPOSITION_CONFIDENCE_THRESHOLD

  return {
    recommended: winner.type,
    selected: winner.type,
    confidence: Number(confidence.toFixed(2)),
    rationale: `${winner.type} best matches the detected narrative and data shape.`,
    signals: winner.signals.length > 0 ? winner.signals : ['default article structure'],
    dataShape: winner.dataShape.length > 0 ? winner.dataShape : ['sectioned article content'],
    alternatives: candidates.slice(1, 4).map(c => ({
      type: c.type,
      reason: c.signals[0] ?? 'Available alternate composition'
    })),
    needsUserChoice
  }
}
