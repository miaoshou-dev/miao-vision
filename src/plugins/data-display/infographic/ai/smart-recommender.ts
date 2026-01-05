/**
 * Smart Template Recommender (v2)
 *
 * Enhanced template recommendation using text analysis and data characteristics.
 * Combines pattern detection with data-driven scoring.
 */

import type { TemplateDefinition, TemplateCategory } from '../templates'
import { getAllTemplates, TEMPLATE_QUICK_REFERENCE } from '../templates'
import type { TextAnalysisResult } from './text-analyzer'
import { analyzeText } from './text-analyzer'
import type { DataExtractionResult } from './data-extractor'
import { extractData } from './data-extractor'

/**
 * Smart recommendation result
 */
export interface SmartRecommendation {
  /** Recommended template */
  template: TemplateDefinition
  /** Match score (0-100) */
  score: number
  /** Reasons for recommendation */
  reasons: string[]
  /** Extracted data for this template */
  extractedData?: Record<string, unknown>
}

/**
 * Recommendation request
 */
export interface RecommendationRequest {
  /** Input text to analyze */
  text?: string
  /** Pre-analyzed text result */
  analysis?: TextAnalysisResult
  /** Pre-extracted data */
  extraction?: DataExtractionResult
  /** Preferred category (optional) */
  preferredCategory?: TemplateCategory
  /** Expected item count */
  itemCount?: number
  /** Has numeric data */
  hasNumbers?: boolean
  /** Has time/date data */
  hasTemporal?: boolean
}

/**
 * Category to template mapping for quick lookup
 */
const CATEGORY_BEST_TEMPLATES: Record<TemplateCategory, string[]> = {
  kpi: ['list-row-badge-card', 'list-grid-badge-card', 'list-grid-circular-progress'],
  ranking: ['list-pyramid-badge-card', 'list-pyramid-value-card'],
  flow: ['flow-linear-numbered', 'cycle-radial-process', 'sequence-timeline-badge-card', 'sequence-roadmap-horizontal', 'sequence-stairs-progression'],
  hierarchy: ['hierarchy-tree-org', 'mind-map-radial'],
  comparison: ['compare-binary-vs', 'compare-quadrant-matrix', 'compare-swot-analysis', 'compare-table-features'],
  distribution: ['list-sector-pie', 'list-pyramid-distribution'],
  relation: ['relation-network-circular', 'relation-venn-diagram', 'relation-circle-connections'],
  statistical: ['chart-bar-horizontal', 'chart-line-trend', 'chart-funnel-conversion']
}

/**
 * Score a template based on analysis and extraction results
 */
function scoreTemplate(
  template: TemplateDefinition,
  analysis: TextAnalysisResult,
  extraction: DataExtractionResult,
  request: RecommendationRequest
): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  // Category match (highest weight)
  if (template.category === analysis.primaryCategory) {
    score += 40
    reasons.push(`Category match: ${template.category}`)
  } else if (template.category === extraction.category) {
    score += 35
    reasons.push(`Extraction category match: ${extraction.category}`)
  }

  // Preferred category bonus
  if (request.preferredCategory && template.category === request.preferredCategory) {
    score += 20
    reasons.push('Matches preferred category')
  }

  // Item count fit
  const itemCount = request.itemCount || analysis.estimatedItemCount || extraction.items?.length || 4
  const [minRows, maxRows] = template.optimalRows

  if (itemCount >= minRows && itemCount <= maxRows) {
    score += 25
    reasons.push(`Item count (${itemCount}) fits optimal range [${minRows}-${maxRows}]`)
  } else if (itemCount < minRows) {
    score -= 10
    reasons.push(`Item count below optimal (${itemCount} < ${minRows})`)
  } else if (itemCount > maxRows) {
    score -= 5
    reasons.push(`Item count above optimal (${itemCount} > ${maxRows})`)
  }

  // Data characteristics bonuses
  if (analysis.hasNumericData || request.hasNumbers) {
    if (['kpi', 'distribution', 'ranking'].includes(template.category)) {
      score += 15
      reasons.push('Numeric data suits this template')
    }
  }

  if (analysis.hasPercentageData) {
    if (template.category === 'distribution' || template.id.includes('progress')) {
      score += 15
      reasons.push('Percentage data detected')
    }
  }

  if (analysis.hasTemporalData || request.hasTemporal) {
    if (['flow', 'sequence'].some(cat => template.category === cat) || template.id.includes('timeline') || template.id.includes('roadmap')) {
      score += 20
      reasons.push('Temporal data suits timeline/flow')
    }
  }

  // Confidence adjustment
  score *= (0.5 + analysis.primaryConfidence * 0.5)

  // Extracted data availability bonus
  if (extraction.comparison && template.category === 'comparison') {
    score += 10
    reasons.push('Comparison data extracted')
  }
  if (extraction.flow && template.category === 'flow') {
    score += 10
    reasons.push('Flow/sequence data extracted')
  }
  if (extraction.hierarchy && template.category === 'hierarchy') {
    score += 10
    reasons.push('Hierarchy data extracted')
  }
  if (extraction.relation && template.category === 'relation') {
    score += 10
    reasons.push('Relation data extracted')
  }

  return { score: Math.round(score), reasons }
}

/**
 * Get smart template recommendations
 */
export function getSmartRecommendations(request: RecommendationRequest): SmartRecommendation[] {
  // Analyze text if not provided
  const analysis = request.analysis || (request.text ? analyzeText(request.text) : {
    originalText: '',
    patterns: [],
    primaryCategory: 'kpi' as TemplateCategory,
    primaryConfidence: 0.5,
    estimatedItemCount: request.itemCount || 4,
    hasNumericData: request.hasNumbers || false,
    hasPercentageData: false,
    hasTemporalData: request.hasTemporal || false
  })

  // Extract data if not provided
  const extraction = request.extraction || (request.text ? extractData(request.text, analysis) : {
    category: analysis.primaryCategory === 'unknown' ? 'kpi' : analysis.primaryCategory,
    items: [],
    confidence: 0.5
  })

  // Get all templates
  const allTemplates = getAllTemplates()

  // Score each template
  const scored: SmartRecommendation[] = allTemplates.map(template => {
    const { score, reasons } = scoreTemplate(template, analysis, extraction, request)
    return {
      template,
      score,
      reasons
    }
  })

  // Sort by score and return top 5
  return scored
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
}

/**
 * Get the best template for given text
 */
export function getBestTemplate(text: string): SmartRecommendation | null {
  const recommendations = getSmartRecommendations({ text })
  return recommendations[0] || null
}

/**
 * Quick template suggestion based on category
 */
export function suggestTemplateByCategory(category: TemplateCategory): string {
  const templates = CATEGORY_BEST_TEMPLATES[category]
  return templates?.[0] || TEMPLATE_QUICK_REFERENCE.fewKpis
}

/**
 * Get template for specific use case
 */
export function getTemplateForUseCase(useCase: string): string {
  const useCaseLower = useCase.toLowerCase()

  // Map common use cases to templates
  const useCaseMap: Record<string, string> = {
    // KPI use cases
    'metrics': TEMPLATE_QUICK_REFERENCE.fewKpis,
    'kpi': TEMPLATE_QUICK_REFERENCE.fewKpis,
    'dashboard': TEMPLATE_QUICK_REFERENCE.manyKpis,
    'stats': TEMPLATE_QUICK_REFERENCE.fewKpis,

    // Flow use cases
    'process': TEMPLATE_QUICK_REFERENCE.linearFlow,
    'workflow': TEMPLATE_QUICK_REFERENCE.linearFlow,
    'steps': TEMPLATE_QUICK_REFERENCE.stairs,
    'procedure': TEMPLATE_QUICK_REFERENCE.linearFlow,
    'timeline': TEMPLATE_QUICK_REFERENCE.timeline,
    'roadmap': TEMPLATE_QUICK_REFERENCE.roadmap,
    'cycle': TEMPLATE_QUICK_REFERENCE.cycle,

    // Comparison use cases
    'compare': TEMPLATE_QUICK_REFERENCE.vsCompare,
    'vs': TEMPLATE_QUICK_REFERENCE.vsCompare,
    'pros cons': TEMPLATE_QUICK_REFERENCE.vsCompare,
    'swot': TEMPLATE_QUICK_REFERENCE.swot,
    'matrix': TEMPLATE_QUICK_REFERENCE.quadrant,

    // Hierarchy use cases
    'org chart': 'hierarchy-tree-org',
    'organization': 'hierarchy-tree-org',
    'mindmap': TEMPLATE_QUICK_REFERENCE.mindMap,
    'brainstorm': TEMPLATE_QUICK_REFERENCE.mindMap,

    // Relation use cases
    'network': TEMPLATE_QUICK_REFERENCE.network,
    'connections': TEMPLATE_QUICK_REFERENCE.circleRelations,
    'venn': TEMPLATE_QUICK_REFERENCE.venn,
    'overlap': TEMPLATE_QUICK_REFERENCE.venn,

    // Distribution use cases
    'pie': TEMPLATE_QUICK_REFERENCE.pie,
    'distribution': TEMPLATE_QUICK_REFERENCE.pie,
    'breakdown': TEMPLATE_QUICK_REFERENCE.pie,

    // Ranking use cases
    'ranking': TEMPLATE_QUICK_REFERENCE.ranking,
    'leaderboard': TEMPLATE_QUICK_REFERENCE.ranking,
    'top': TEMPLATE_QUICK_REFERENCE.ranking
  }

  // Find matching use case
  for (const [key, templateId] of Object.entries(useCaseMap)) {
    if (useCaseLower.includes(key)) {
      return templateId
    }
  }

  // Default
  return TEMPLATE_QUICK_REFERENCE.fewKpis
}

/**
 * Analyze text and return full recommendation with extracted data
 */
export function analyzeAndRecommend(text: string): {
  analysis: TextAnalysisResult
  extraction: DataExtractionResult
  recommendations: SmartRecommendation[]
  bestTemplate: SmartRecommendation | null
} {
  const analysis = analyzeText(text)
  const extraction = extractData(text, analysis)
  const recommendations = getSmartRecommendations({ text, analysis, extraction })

  return {
    analysis,
    extraction,
    recommendations,
    bestTemplate: recommendations[0] || null
  }
}
