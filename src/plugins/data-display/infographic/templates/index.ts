/**
 * Infographic Template Classification Index
 *
 * Template registry for AI-assisted template selection.
 * Maps data characteristics to appropriate visualization templates.
 *
 * @module plugins/data-display/infographic/templates
 */

/**
 * Template category definitions
 */
export type TemplateCategory =
  | 'kpi'
  | 'ranking'
  | 'flow'
  | 'hierarchy'
  | 'comparison'
  | 'distribution'

/**
 * Structure-Item combination definition
 */
export interface TemplateDefinition {
  /** Unique template identifier */
  id: string
  /** Display name */
  name: string
  /** Template category */
  category: TemplateCategory
  /** Structure component name */
  structure: string
  /** Item component name */
  item: string
  /** Optimal data row count range */
  optimalRows: [number, number]
  /** Required data fields */
  requiredFields: string[]
  /** Optional data fields */
  optionalFields?: string[]
  /** Description for AI selection */
  description: string
}

/**
 * Infographic template registry
 * Structure + Item combinations for different use cases
 */
export const INFOGRAPHIC_TEMPLATES: Record<TemplateCategory, TemplateDefinition[]> = {
  // KPI/Metrics display - best for 1-4 items
  kpi: [
    {
      id: 'list-row-badge-card',
      name: 'Horizontal Badge Cards',
      category: 'kpi',
      structure: 'ListRowHorizontal',
      item: 'BadgeCard',
      optimalRows: [2, 4],
      requiredFields: ['label', 'value'],
      optionalFields: ['icon', 'description', 'trend'],
      description: 'Horizontal row of badge cards, ideal for KPI overview'
    },
    {
      id: 'list-row-value-card',
      name: 'Horizontal Value Cards',
      category: 'kpi',
      structure: 'ListRowHorizontal',
      item: 'ValueCard',
      optimalRows: [2, 5],
      requiredFields: ['label', 'value'],
      optionalFields: ['format', 'color'],
      description: 'Simple value cards in horizontal layout'
    },
    {
      id: 'list-grid-badge-card',
      name: 'Grid Badge Cards',
      category: 'kpi',
      structure: 'ListGrid',
      item: 'BadgeCard',
      optimalRows: [4, 8],
      requiredFields: ['label', 'value'],
      optionalFields: ['icon', 'description'],
      description: '2x2 or 2x4 grid of badge cards for multiple KPIs'
    },
    {
      id: 'list-grid-circular-progress',
      name: 'Grid Circular Progress',
      category: 'kpi',
      structure: 'ListGrid',
      item: 'CircularProgress',
      optimalRows: [2, 6],
      requiredFields: ['label', 'value', 'max'],
      optionalFields: ['icon', 'color'],
      description: 'Grid of circular progress indicators'
    }
  ],

  // Ranking/Comparison - best for 3-10 items
  ranking: [
    {
      id: 'list-pyramid-badge-card',
      name: 'Pyramid Ranking',
      category: 'ranking',
      structure: 'ListPyramid',
      item: 'BadgeCard',
      optimalRows: [3, 7],
      requiredFields: ['label', 'value'],
      optionalFields: ['rank', 'icon'],
      description: 'Pyramid layout showing hierarchy or ranking'
    },
    {
      id: 'list-zigzag-icon-arrow',
      name: 'Zigzag Arrow Flow',
      category: 'ranking',
      structure: 'ListZigzag',
      item: 'IconArrowNode',
      optimalRows: [3, 6],
      requiredFields: ['label'],
      optionalFields: ['icon', 'value'],
      description: 'Zigzag layout with arrow connections'
    }
  ],

  // Flow/Process - best for sequential data
  flow: [
    {
      id: 'sequence-timeline-badge-card',
      name: 'Timeline Flow',
      category: 'flow',
      structure: 'SequenceTimeline',
      item: 'BadgeCard',
      optimalRows: [3, 8],
      requiredFields: ['label', 'date'],
      optionalFields: ['description', 'icon', 'status'],
      description: 'Horizontal timeline showing chronological events'
    },
    {
      id: 'list-zigzag-badge-card',
      name: 'Zigzag Process',
      category: 'flow',
      structure: 'ListZigzag',
      item: 'BadgeCard',
      optimalRows: [4, 8],
      requiredFields: ['label', 'step'],
      optionalFields: ['description', 'icon'],
      description: 'Zigzag path showing process steps'
    }
  ],

  // Hierarchy - best for tree/org structures
  hierarchy: [
    {
      id: 'list-pyramid-value-card',
      name: 'Hierarchy Pyramid',
      category: 'hierarchy',
      structure: 'ListPyramid',
      item: 'ValueCard',
      optimalRows: [3, 6],
      requiredFields: ['label', 'level'],
      optionalFields: ['value', 'description'],
      description: 'Pyramid showing organizational hierarchy'
    }
  ],

  // Comparison - best for A vs B or multiple options
  comparison: [
    {
      id: 'list-row-horizontal-comparison',
      name: 'Side-by-Side Comparison',
      category: 'comparison',
      structure: 'ListRowHorizontal',
      item: 'ValueCard',
      optimalRows: [2, 3],
      requiredFields: ['label', 'value'],
      optionalFields: ['description', 'highlight'],
      description: 'Horizontal comparison of options'
    }
  ],

  // Distribution - best for proportional data
  distribution: [
    {
      id: 'list-pyramid-distribution',
      name: 'Distribution Pyramid',
      category: 'distribution',
      structure: 'ListPyramid',
      item: 'BadgeCard',
      optimalRows: [3, 5],
      requiredFields: ['label', 'percentage'],
      optionalFields: ['value', 'color'],
      description: 'Pyramid showing distribution proportions'
    }
  ]
}

/**
 * Get all template definitions as flat array
 */
export function getAllTemplates(): TemplateDefinition[] {
  return Object.values(INFOGRAPHIC_TEMPLATES).flat()
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): TemplateDefinition | undefined {
  return getAllTemplates().find((t) => t.id === id)
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: TemplateCategory): TemplateDefinition[] {
  return INFOGRAPHIC_TEMPLATES[category] || []
}

/**
 * Data characteristics for template recommendation
 */
export interface DataCharacteristics {
  /** Number of data rows */
  rowCount: number
  /** Has numeric value column */
  hasNumericValue: boolean
  /** Has text description column */
  hasDescription: boolean
  /** Has icon/image column */
  hasIcon: boolean
  /** Has time/date column */
  hasTimeColumn: boolean
  /** Has hierarchy/level column */
  hasHierarchy: boolean
  /** Has percentage/ratio values */
  hasPercentage: boolean
  /** Column names available */
  columns: string[]
}

/**
 * Template recommendation result
 */
export interface TemplateRecommendation {
  template: TemplateDefinition
  score: number
  reason: string
}

/**
 * Recommend templates based on data characteristics
 *
 * @param characteristics - Data analysis results
 * @returns Ranked list of recommended templates
 */
export function recommendTemplate(
  characteristics: DataCharacteristics
): TemplateRecommendation[] {
  const recommendations: TemplateRecommendation[] = []
  const allTemplates = getAllTemplates()

  for (const template of allTemplates) {
    let score = 0
    const reasons: string[] = []

    // Check optimal row count range
    const [minRows, maxRows] = template.optimalRows
    if (characteristics.rowCount >= minRows && characteristics.rowCount <= maxRows) {
      score += 30
      reasons.push(`Row count (${characteristics.rowCount}) fits optimal range`)
    } else if (characteristics.rowCount < minRows) {
      // Penalize templates designed for more data
      score -= 10
    } else if (characteristics.rowCount > maxRows) {
      // Slight penalty for exceeding, but still usable
      score -= 5
    }

    // Check required fields availability
    const availableColumns = new Set(characteristics.columns.map((c) => c.toLowerCase()))
    const hasAllRequired = template.requiredFields.every((field) =>
      availableColumns.has(field.toLowerCase()) ||
      characteristics.columns.some((c) => c.toLowerCase().includes(field.toLowerCase()))
    )

    if (hasAllRequired) {
      score += 25
      reasons.push('All required fields available')
    } else {
      score -= 20
      reasons.push('Missing required fields')
    }

    // Category-specific scoring
    if (template.category === 'kpi' && characteristics.hasNumericValue) {
      score += 15
      reasons.push('Numeric data suitable for KPI display')
    }

    if (template.category === 'flow' && characteristics.hasTimeColumn) {
      score += 20
      reasons.push('Time column detected - flow/timeline recommended')
    }

    if (template.category === 'hierarchy' && characteristics.hasHierarchy) {
      score += 20
      reasons.push('Hierarchy data detected')
    }

    if (template.category === 'distribution' && characteristics.hasPercentage) {
      score += 15
      reasons.push('Percentage data suitable for distribution')
    }

    // Bonus for matching optional fields
    if (template.optionalFields) {
      const optionalMatches = template.optionalFields.filter((field) =>
        availableColumns.has(field.toLowerCase()) ||
        characteristics.columns.some((c) => c.toLowerCase().includes(field.toLowerCase()))
      )
      if (optionalMatches.length > 0) {
        score += optionalMatches.length * 5
        reasons.push(`Optional fields available: ${optionalMatches.join(', ')}`)
      }
    }

    // Add icon bonus
    if (characteristics.hasIcon && template.optionalFields?.includes('icon')) {
      score += 10
      reasons.push('Icon data can enhance visualization')
    }

    // Add description bonus
    if (characteristics.hasDescription && template.optionalFields?.includes('description')) {
      score += 5
      reasons.push('Description text enhances detail')
    }

    recommendations.push({
      template,
      score,
      reason: reasons.join('; ')
    })
  }

  // Sort by score descending and return top results
  return recommendations
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
}

/**
 * Quick template lookup for AI prompts
 */
export const TEMPLATE_QUICK_REFERENCE = {
  // For 2-4 KPI metrics
  fewKpis: 'list-row-badge-card',
  // For 4-8 KPI metrics
  manyKpis: 'list-grid-badge-card',
  // For progress/completion percentages
  progress: 'list-grid-circular-progress',
  // For ranking data
  ranking: 'list-pyramid-badge-card',
  // For sequential processes
  process: 'list-zigzag-badge-card',
  // For timeline events
  timeline: 'sequence-timeline-badge-card',
  // For comparison
  compare: 'list-row-horizontal-comparison'
}
