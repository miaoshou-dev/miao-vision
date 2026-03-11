/**
 * Infographic Template Classification Index
 *
 * Template registry for AI-assisted template selection.
 * Maps data characteristics to appropriate visualization templates.
 *
 * @module plugins/data-display/infographic/templates
 */

/**
 * Re-export shared template contracts from types/ layer.
 * Both TemplateCategory and TemplateDefinition live in types/ so core/ can
 * depend on them without a layer violation.
 */
export type { TemplateCategory, TemplateDefinition } from '@/types/infographic-template'
import type { TemplateCategory, TemplateDefinition } from '@/types/infographic-template'

export { INFOGRAPHIC_TEMPLATES } from './data'
export type { DataCharacteristics, TemplateRecommendation } from './recommend'
export { recommendTemplate } from './recommend'

import { INFOGRAPHIC_TEMPLATES } from './data'

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
  // For sequential processes with icons
  processWithIcons: 'list-row-horizontal-icon-arrow',
  // For sequential processes
  process: 'list-zigzag-badge-card',
  // For linear numbered flows
  linearFlow: 'flow-linear-numbered',
  // For circular/cycle processes
  cycle: 'cycle-radial-process',
  // For longer snake-pattern flows
  snakeFlow: 'sequence-snake-flow',
  // For timeline events
  timeline: 'sequence-timeline-badge-card',
  // For comparison
  compare: 'list-row-horizontal-comparison',
  // For VS comparison
  vsCompare: 'compare-binary-vs',
  // For quadrant/matrix analysis
  quadrant: 'compare-quadrant-matrix',
  // For SWOT analysis
  swot: 'compare-swot-analysis',
  // For project roadmaps
  roadmap: 'sequence-roadmap-horizontal',
  // For stair-step progression
  stairs: 'sequence-stairs-progression',
  // For ascending growth
  ascending: 'sequence-ascending-bars',
  // For mind maps
  mindMap: 'mind-map-radial',
  // For network graphs
  network: 'relation-network-circular',
  // For pie/sector charts
  pie: 'list-sector-pie',
  // For Venn diagrams
  venn: 'relation-venn-diagram',
  // For circular relationships
  circleRelations: 'relation-circle-connections',
  // For bar charts
  barChart: 'chart-bar-horizontal',
  barChartVertical: 'chart-bar-vertical',
  // For line charts
  lineChart: 'chart-line-trend',
  multiLineChart: 'chart-line-multi-series',
  // For funnel charts
  funnel: 'chart-funnel-conversion',
  // For comparison tables
  comparisonTable: 'compare-table-features'
}
