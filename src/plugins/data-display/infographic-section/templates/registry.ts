/**
 * Template Registry
 *
 * Central registry for all infographic section templates.
 * Each template maps to a renderer component and data adapter.
 *
 * To add a new template:
 * 1. Create renderer in ./renderers/MyTemplate.svelte
 * 2. Create adapter in ../adapters/my-adapter.ts
 * 3. Register here with component, adapter, and metadata
 */

import type { TemplateRegistry } from '../types'

// Import renderers
import KpiRowBadge from './renderers/KpiRowBadge.svelte'
import FlowTimeline from './renderers/FlowTimeline.svelte'
import PieDistribution from './renderers/PieDistribution.svelte'
import GridComparison from './renderers/GridComparison.svelte'

// Import adapters
import { adaptToRow } from '../adapters/row-adapter'
import { adaptToFlow } from '../adapters/flow-adapter'
import { adaptToSector } from '../adapters/sector-adapter'
import { adaptToGrid } from '../adapters/grid-adapter'

/**
 * Template Registry
 *
 * Maps template names to their configurations:
 * - component: Svelte component for rendering
 * - adapter: Function to transform items to structure-specific format
 * - defaultHeight: Default height when not specified
 * - displayName: Human-readable name
 * - description: Template description
 */
export const templateRegistry: TemplateRegistry = {
  /**
   * KPI Row with Badge Cards
   * Use for: Key metrics display (revenue, users, growth rates)
   * Structure: ListRowHorizontal + BadgeCard
   */
  'kpi-row-badge': {
    component: KpiRowBadge,
    adapter: adaptToRow,
    defaultHeight: 150,
    displayName: 'KPI Row (Badge)',
    description: 'Horizontal row of KPI badges with labels, values, and trends'
  },

  /**
   * Flow Timeline
   * Use for: Process steps, timelines, workflows
   * Structure: FlowLinear + IconArrowNode
   */
  'flow-timeline': {
    component: FlowTimeline,
    adapter: adaptToFlow,
    defaultHeight: 200,
    displayName: 'Flow Timeline',
    description: 'Linear flow of steps with arrows connecting them'
  },

  /**
   * Pie Distribution
   * Use for: Market share, budget allocation, percentage breakdown
   * Structure: ListSector
   */
  'pie-distribution': {
    component: PieDistribution,
    adapter: adaptToSector,
    defaultHeight: 350,
    displayName: 'Pie Distribution',
    description: 'Pie/donut chart for showing proportional distribution'
  },

  /**
   * Grid Comparison
   * Use for: Feature comparison, multi-metric display
   * Structure: ListGrid + BadgeCard
   */
  'grid-comparison': {
    component: GridComparison,
    adapter: adaptToGrid,
    defaultHeight: 250,
    displayName: 'Grid Comparison',
    description: 'Grid layout for comparing multiple items'
  }
}

/**
 * Get template configuration by name
 * Returns undefined if template not found
 */
export function getTemplate(name: string) {
  return templateRegistry[name]
}

/**
 * Check if a template exists
 */
export function hasTemplate(name: string): boolean {
  return name in templateRegistry
}

/**
 * Get all available template names
 */
export function getTemplateNames(): string[] {
  return Object.keys(templateRegistry)
}

/**
 * Get template metadata for UI display
 */
export function getTemplateMetadata(): Array<{
  name: string
  displayName: string
  description: string
  defaultHeight: number
}> {
  return Object.entries(templateRegistry).map(([name, config]) => ({
    name,
    displayName: config.displayName,
    description: config.description,
    defaultHeight: config.defaultHeight
  }))
}

// Type helper: Extract valid template names
export type RegisteredTemplateName = keyof typeof templateRegistry
