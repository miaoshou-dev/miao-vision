/**
 * Style Variant System
 *
 * Implements three distinct narrative styles for infographic generation:
 * - Executive: Conclusion-first, KPI-focused, minimal
 * - Storytelling: Timeline-based, journey narrative, process-oriented
 * - Analytical: Comprehensive, multi-dimensional, detailed
 *
 * @module core/ai/agents/infographic/variants
 */

import type {
  ArticleOutline,
  NarrativePlan,
  StyleVariantId,
  InfographicVariant,
  InfographicOutput
} from './types'
import {
  STYLE_CONFIGS,
  ExecutivePlanner,
  StorytellingPlanner,
  AnalyticalPlanner
} from './variant-planners'

// Re-export planners and configs for consumers that imported them from this module
export { STYLE_CONFIGS, ExecutivePlanner, StorytellingPlanner, AnalyticalPlanner }

// ============================================================================
// Variant Generator
// ============================================================================

/**
 * Generate all three style variants from an outline
 */
export function generateStyleVariants(
  outline: ArticleOutline,
  generator: {
    generateFromPlan: (plan: NarrativePlan, language: 'zh' | 'en') => InfographicOutput
  },
  language: 'zh' | 'en' = 'en'
): InfographicVariant[] {
  const planners = {
    executive: new ExecutivePlanner(),
    storytelling: new StorytellingPlanner(),
    analytical: new AnalyticalPlanner()
  }

  const variants: InfographicVariant[] = []

  for (const [id, planner] of Object.entries(planners)) {
    const styleId = id as StyleVariantId
    const config = STYLE_CONFIGS[styleId]

    // Generate narrative plan using style-specific planner
    const plan = planner.plan(outline)

    // Generate infographic from plan
    const infographic = generator.generateFromPlan(plan, language)

    // Create preview data
    const preview = {
      sectionCount: infographic.sections.length,
      templateIds: infographic.sections.map(s => s.templateId),
      hasTimeline: infographic.sections.some(s =>
        s.templateId.includes('flow') || s.templateId.includes('timeline')
      ),
      hasKPI: infographic.sections.some(s =>
        s.templateId.includes('kpi') || s.templateId.includes('badge')
      ),
      hasComparison: infographic.sections.some(s =>
        s.templateId.includes('compare') || s.templateId.includes('vs')
      )
    }

    variants.push({
      id: styleId,
      name: config.name,
      description: config.description,
      infographic,
      preview
    })
  }

  return variants
}
