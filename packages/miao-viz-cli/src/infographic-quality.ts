import type { InfographicSpec, InfographicVisualType } from './article-infographic'
import { countOrderedPhasePoints, hasKpiVisual, hasCompositionType } from './infographic/compositions/helpers'

export type InfographicWarningCode =
  | 'low_visual_density'
  | 'numeric_claims_not_visualized'
  | 'timeline_rendered_as_text'
  | 'comparison_rendered_as_text'
  | 'text_heavy_infographic'
  | 'composition_fallback_used'
  | 'lifecycle_requires_ordered_points'
  | 'lifecycle_requires_numeric_values'
  | 'lifecycle_missing_actions'
  | 'dashboard_missing_kpis'
  | 'comparison_missing_criteria'

export interface InfographicWarning {
  code: InfographicWarningCode
  message: string
}

export interface InfographicQualityReport {
  visualComponentCount: number
  svgVisualCount: number
  textOnlySectionCount: number
  quantifiedVisualCount: number
  averageWordsPerSection: number
  warnings: InfographicWarning[]
}

const SVG_VISUAL_TYPES: InfographicVisualType[] = ['metric-bars', 'process-flow', 'concept-contrast', 'timeline-path', 'part-to-whole', 'before-after', 'tradeoff-matrix', 'ranked-list-chart', 'system-diagram', 'callout-diagram', 'icon-cluster']
const QUANTIFIED_VISUAL_TYPES: InfographicVisualType[] = ['kpi-strip', 'metric-bars', 'part-to-whole', 'ranked-list-chart']

export function assessInfographicQuality(spec: InfographicSpec): InfographicQualityReport {
  const sections = spec.sections
  const visualSections = sections.filter(s => s.visual)
  const textOnlySections = sections.filter(s => !s.visual && s.type !== 'hero' && s.type !== 'quote')

  const visualComponentCount = visualSections.length
  const svgVisualCount = visualSections.filter(s => SVG_VISUAL_TYPES.includes(s.visual!.type)).length
  const quantifiedVisualCount = visualSections.filter(s => QUANTIFIED_VISUAL_TYPES.includes(s.visual!.type)).length

  const totalWords = sections.reduce((sum, s) => {
    const itemWords = (s.items ?? []).reduce((w, i) => w + (i.text?.split(/\s+/).filter(Boolean).length ?? 0), 0)
    return sum + itemWords
  }, 0)
  const averageWordsPerSection = sections.length > 0 ? Math.round(totalWords / sections.length) : 0

  const warnings: InfographicWarning[] = []

  if (visualComponentCount < 4) {
    warnings.push({ code: 'low_visual_density', message: `Only ${visualComponentCount} visual components (recommended ≥ 4). Consider adding more visual sections.` })
  }

  if (svgVisualCount < 2) {
    warnings.push({ code: 'text_heavy_infographic', message: `Only ${svgVisualCount} SVG visuals (recommended ≥ 2). Consider converting text sections to graphic components.` })
  }

  if (textOnlySections.length > 3) {
    warnings.push({ code: 'text_heavy_infographic', message: `${textOnlySections.length} text-only sections exceed the recommended limit of 3.` })
  }

  const hasNumericClaims = sections.some(s =>
    (s.items ?? []).some(i => /\d/.test(i.text ?? ''))
  )
  if (hasNumericClaims && quantifiedVisualCount < 1) {
    warnings.push({ code: 'numeric_claims_not_visualized', message: 'Article has numeric claims but no quantified visual (kpi-strip or metric-bars).' })
  }

  const hasTimelineText = sections.some(s => s.type === 'timeline' && !s.visual)
  if (hasTimelineText) {
    warnings.push({ code: 'timeline_rendered_as_text', message: 'Timeline section is rendered as text list. Consider adding a timeline-path visual.' })
  }

  const hasComparisonText = sections.some(s => s.type === 'comparison' && !s.visual)
  if (hasComparisonText) {
    warnings.push({ code: 'comparison_rendered_as_text', message: 'Comparison section is rendered as text cards. Consider adding a concept-contrast visual.' })
  }

  if (averageWordsPerSection > 90) {
    warnings.push({ code: 'text_heavy_infographic', message: `Average ${averageWordsPerSection} words per section (recommended ≤ 90). Sections are too text-heavy.` })
  }

  if (hasCompositionType(spec, 'lifecycle-curve')) {
    const phaseCount = countOrderedPhasePoints(spec)
    if (phaseCount < 3) {
      warnings.push({ code: 'lifecycle_requires_ordered_points', message: `lifecycle-curve requires at least 3 ordered phase points, found ${phaseCount}. Falling back to article-linear.` })
    } else {
      const hasNumeric = spec.sections.some(s =>
        s.visual?.type === 'metric-bars' &&
        (s.visual.data as { items?: Array<{ value?: number }> })?.items?.some(i => typeof i.value === 'number')
      )
      if (!hasNumeric) {
        warnings.push({ code: 'lifecycle_requires_numeric_values', message: 'lifecycle-curve phase points should have numeric values for the curve rendering.' })
      }
      const actionCount = spec.sections.reduce((sum, s) =>
        sum + s.items.filter(i => i.label && i.text).length, 0
      )
      if (actionCount < 2) {
        warnings.push({ code: 'lifecycle_missing_actions', message: `lifecycle-curve has only ${actionCount} actionable items (recommended ≥ 2 per phase).` })
      }
    }
  }

  if (hasCompositionType(spec, 'strategy-dashboard') && !hasKpiVisual(spec)) {
    warnings.push({ code: 'dashboard_missing_kpis', message: 'strategy-dashboard requires at least one kpi-strip visual for the KPI header.' })
  }

  return { visualComponentCount, svgVisualCount, textOnlySectionCount: textOnlySections.length, quantifiedVisualCount, averageWordsPerSection, warnings }
}
