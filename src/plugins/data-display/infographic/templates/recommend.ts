/**
 * Infographic Template Recommendation
 *
 * Scores and ranks templates based on data characteristics.
 */
import type { TemplateDefinition } from '@/types/infographic-template'
import { INFOGRAPHIC_TEMPLATES } from './data'

function getAllTemplates(): TemplateDefinition[] {
  return Object.values(INFOGRAPHIC_TEMPLATES).flat()
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
      score -= 10
    } else if (characteristics.rowCount > maxRows) {
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

    if (characteristics.hasIcon && template.optionalFields?.includes('icon')) {
      score += 10
      reasons.push('Icon data can enhance visualization')
    }

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

  return recommendations
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
}
