/**
 * MultiChartPlanner Types and Constants
 *
 * Shared types and template rules for chart planning.
 *
 * @module core/ai/infographic/planner-types
 */

import type { TemplateCategory } from '@plugins/data-display/infographic/templates'

/**
 * Layout configuration
 */
export interface LayoutConfig {
  /** Maximum columns */
  maxColumns: 1 | 2 | 3
  /** Maximum sections */
  maxSections: number
  /** Include hero section */
  includeHero: boolean
  /** Preferred style */
  style: 'compact' | 'spacious' | 'dashboard'
  /** Color palette */
  palette: string
  /** Theme */
  theme: string
}

/**
 * Planned chart
 */
export interface PlannedChart {
  /** Section ID */
  sectionId: string
  /** Chart title */
  title: string
  /** Template to use */
  templateId: string
  /** Formatted data */
  data: Record<string, unknown>[]
  /** Layout position */
  layout: {
    column: number
    row: number
    width: 'full' | 'half' | 'third'
    height: number
  }
  /** Priority (higher = more important) */
  priority: number
}

/**
 * Multi-chart report plan
 */
export interface MultiChartPlan {
  /** Report title */
  title: string
  /** Report summary */
  summary: string
  /** Planned charts */
  charts: PlannedChart[]
  /** Layout grid */
  grid: {
    columns: number
    rows: number
    gap: number
  }
  /** Hero section (if any) */
  hero?: PlannedChart
  /** KPI section (if any) */
  kpiRow?: PlannedChart
}

/**
 * Default layout config
 */
export const DEFAULT_LAYOUT: LayoutConfig = {
  maxColumns: 2,
  maxSections: 8,
  includeHero: true,
  style: 'spacious',
  palette: 'vibrant',
  theme: 'dark-vibrant'
}

/**
 * Template selection rules by visualization type
 */
export const TEMPLATE_RULES: Record<TemplateCategory, {
  small: string    // 1-3 items
  medium: string   // 4-6 items
  large: string    // 7+ items
}> = {
  kpi: {
    small: 'list-row-badge-card',
    medium: 'list-grid-badge-card',
    large: 'list-grid-badge-card'
  },
  ranking: {
    small: 'list-pyramid-badge-card',
    medium: 'chart-bar-horizontal',
    large: 'chart-bar-horizontal'
  },
  flow: {
    small: 'flow-linear-numbered',
    medium: 'list-row-horizontal-icon-arrow',
    large: 'sequence-snake-flow'
  },
  hierarchy: {
    small: 'list-pyramid-value-card',
    medium: 'hierarchy-tree-org',
    large: 'mind-map-radial'
  },
  comparison: {
    small: 'compare-binary-vs',
    medium: 'compare-quadrant-matrix',
    large: 'compare-table-features'
  },
  distribution: {
    small: 'list-sector-pie',
    medium: 'list-sector-pie',
    large: 'chart-bar-horizontal'
  },
  relation: {
    small: 'relation-venn-diagram',
    medium: 'relation-circle-connections',
    large: 'relation-network-circular'
  },
  statistical: {
    small: 'chart-bar-horizontal',
    medium: 'chart-line-trend',
    large: 'chart-line-multi-series'
  }
}

/**
 * Base heights for chart types
 */
export const BASE_HEIGHTS: Record<TemplateCategory, number> = {
  kpi: 150,
  ranking: 300,
  flow: 250,
  hierarchy: 400,
  comparison: 350,
  distribution: 300,
  relation: 400,
  statistical: 300
}
