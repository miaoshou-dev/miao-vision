import type { InfographicVisualType } from './types'

export type ArticleInfographicCategory =
  | 'comparison'
  | 'sequence'
  | 'hierarchy'
  | 'relation'
  | 'list'
  | 'quadrant'
  | 'metric-highlight'

export interface ArticleInfographicTemplateEntry {
  id: string
  category: ArticleInfographicCategory
  visualType: InfographicVisualType
  bestFor: string[]
  dataShape: string[]
  requires: string[]
  density: 'compact' | 'standard' | 'dense'
  minItems: number
  maxItems: number
  avoidWhen: string[]
}

export const ARTICLE_INFOGRAPHIC_TEMPLATES: ArticleInfographicTemplateEntry[] = [
  {
    id: 'kpi-strip',
    category: 'metric-highlight',
    visualType: 'kpi-strip',
    bestFor: ['key metrics', 'headline numbers', 'executive summary'],
    dataShape: ['numeric facts with labels'],
    requires: ['1+ numeric item'],
    density: 'compact',
    minItems: 1,
    maxItems: 12,
    avoidWhen: ['items are prose-only', 'metrics need trend context']
  },
  {
    id: 'process-flow',
    category: 'sequence',
    visualType: 'process-flow',
    bestFor: ['workflow', 'steps', 'how-it-works explanation'],
    dataShape: ['ordered text items'],
    requires: ['3+ step-like items'],
    density: 'standard',
    minItems: 1,
    maxItems: 8,
    avoidWhen: ['items are unordered', 'step labels are longer than one sentence']
  },
  {
    id: 'timeline-path',
    category: 'sequence',
    visualType: 'timeline-path',
    bestFor: ['dates', 'milestones', 'chronological events'],
    dataShape: ['ordered events with optional date labels'],
    requires: ['2+ time-like items'],
    density: 'standard',
    minItems: 1,
    maxItems: 10,
    avoidWhen: ['no sequence or time signal exists']
  },
  {
    id: 'tradeoff-matrix',
    category: 'quadrant',
    visualType: 'tradeoff-matrix',
    bestFor: ['risk matrix', 'tradeoff framing', 'two-axis decisions'],
    dataShape: ['exactly four quadrant items'],
    requires: ['4 comparison items'],
    density: 'standard',
    minItems: 4,
    maxItems: 4,
    avoidWhen: ['there are fewer than four distinct items']
  },
  {
    id: 'quadrant-priority',
    category: 'quadrant',
    visualType: 'quadrant-priority',
    bestFor: ['priority matrix', 'impact versus effort', 'risk versus likelihood'],
    dataShape: ['four quadrant items with optional x/y labels'],
    requires: ['4 priority or risk items'],
    density: 'standard',
    minItems: 4,
    maxItems: 4,
    avoidWhen: ['items do not map to two axes']
  },
  {
    id: 'roadmap-sequence',
    category: 'sequence',
    visualType: 'roadmap-sequence',
    bestFor: ['roadmap', 'phased plan', 'launch stages'],
    dataShape: ['3-8 ordered stages'],
    requires: ['3+ phase, stage, or milestone items'],
    density: 'standard',
    minItems: 3,
    maxItems: 8,
    avoidWhen: ['items are not ordered', 'more than eight stages are needed']
  },
  {
    id: 'hierarchy-tree',
    category: 'hierarchy',
    visualType: 'hierarchy-tree',
    bestFor: ['taxonomy', 'organization structure', 'concept hierarchy'],
    dataShape: ['root plus children with optional parent indexes'],
    requires: ['2+ hierarchical items'],
    density: 'dense',
    minItems: 2,
    maxItems: 12,
    avoidWhen: ['relationships are cyclic', 'hierarchy is deeper than three levels']
  },
  {
    id: 'relation-flow',
    category: 'relation',
    visualType: 'relation-flow',
    bestFor: ['cause-effect chain', 'dependency map', 'system relation'],
    dataShape: ['nodes and directed edges'],
    requires: ['2+ related nodes'],
    density: 'dense',
    minItems: 2,
    maxItems: 12,
    avoidWhen: ['more than 18 edges are needed', 'node labels are long paragraphs']
  },
  {
    id: 'pyramid-list',
    category: 'list',
    visualType: 'pyramid-list',
    bestFor: ['layered model', 'strategic hierarchy', 'maturity ladder'],
    dataShape: ['3-6 levels with labels'],
    requires: ['3+ ordered levels'],
    density: 'compact',
    minItems: 3,
    maxItems: 6,
    avoidWhen: ['levels are not ordered by importance or maturity']
  },
  {
    id: 'grid-list',
    category: 'list',
    visualType: 'grid-list',
    bestFor: ['feature grid', 'checklist summary', 'multi-card explanation'],
    dataShape: ['2-12 labeled text cards'],
    requires: ['2+ list items'],
    density: 'standard',
    minItems: 2,
    maxItems: 12,
    avoidWhen: ['items need explicit ordering or relationships']
  }
]

export function getArticleInfographicTemplate(id: string): ArticleInfographicTemplateEntry | undefined {
  return ARTICLE_INFOGRAPHIC_TEMPLATES.find(template => template.id === id)
}

export function compactArticleInfographicTemplates(): Array<[string, ArticleInfographicCategory, InfographicVisualType, string[], string[], number, number]> {
  return ARTICLE_INFOGRAPHIC_TEMPLATES.map(template => [
    template.id,
    template.category,
    template.visualType,
    template.bestFor,
    template.requires,
    template.minItems,
    template.maxItems
  ])
}
