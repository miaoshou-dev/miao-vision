/**
 * Infographic Section Types
 *
 * Type definitions for the InfographicSection component system.
 * Provides structured data model for creating rich infographic sections
 * with heading, insight, chart, and footnote areas.
 */

import type { Component } from 'svelte'

/**
 * Trend direction for KPI items
 */
export type TrendDirection = 'up' | 'down' | 'flat'

/**
 * Individual data item for infographic sections
 */
export interface SectionItem {
  /** Display label */
  label: string
  /** Value (string for formatted values like "$12M", number for calculations) */
  value?: string | number
  /** Description text */
  desc?: string
  /** Icon name from MDI icon set */
  icon?: string
  /** Trend direction indicator */
  trend?: TrendDirection
  /** Optional color override */
  color?: string
}

/**
 * Heading configuration for section
 */
export interface SectionHeading {
  /** Main title */
  title: string
  /** Optional subtitle */
  subtitle?: string
}

/**
 * Insight configuration for section
 * Displays contextual description above the chart
 */
export interface SectionInsight {
  /** Insight text content */
  text: string
  /** Text to highlight (will be wrapped in <strong>) */
  highlight?: string
}

/**
 * Footnote configuration for section
 */
export interface SectionFootnote {
  /** Footnote text */
  text: string
  /** Data source attribution */
  source?: string
}

/**
 * Main data structure for InfographicSection component
 */
export interface InfographicSectionData {
  /** Template identifier (e.g., 'kpi-row-badge', 'flow-timeline') */
  template: string

  /** Section heading (title + subtitle) */
  heading?: SectionHeading

  /** Insight text displayed above chart */
  insight?: SectionInsight

  /** Data items to visualize */
  items: SectionItem[]

  /** Footnote with source attribution */
  footnote?: SectionFootnote

  /** Theme name (default: 'dark-vibrant') */
  theme?: string

  /** Color palette name (default: 'vibrant') */
  palette?: string

  /** Width in pixels (default: 800) */
  width?: number

  /** Height in pixels (uses template default if not specified) */
  height?: number
}

/**
 * Props passed to template renderer components
 */
export interface TemplateRendererProps {
  /** Adapted items ready for the structure component */
  items: unknown[]
  /** Available width for chart content */
  width: number
  /** Available height for chart content */
  height: number
  /** Color palette name */
  palette?: string
}

/**
 * Template renderer configuration
 */
export interface TemplateRenderer {
  /** Svelte component for rendering this template */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: Component<any>
  /** Function to adapt raw items to structure-specific format */
  adapter: (items: SectionItem[]) => unknown[]
  /** Default height when not specified */
  defaultHeight: number
  /** Human-readable template name */
  displayName: string
  /** Template description */
  description: string
}

/**
 * Template registry type - maps template names to their configurations
 */
export type TemplateRegistry = Record<string, TemplateRenderer>

/**
 * Available template names (union type for type safety)
 * This will be expanded as more templates are added
 */
export type TemplateName =
  | 'kpi-row-badge'
  | 'flow-timeline'
  | 'pie-distribution'
  | 'grid-comparison'

/**
 * Helper type to extract template names from registry
 */
export type TemplateNameFromRegistry<T extends TemplateRegistry> = keyof T & string
