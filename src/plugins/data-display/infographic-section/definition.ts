/**
 * InfographicSection Component Definition (Adapter Layer)
 *
 * Declarative component definition for Markdown integration.
 * Supports both direct YAML data and SQL query data binding.
 */

import { defineComponent } from '@core/registry'
import type { ConfigSchema } from '@core/registry'
import InfographicSection from './InfographicSection.svelte'
import type { InfographicSectionData, SectionItem } from './types'
import { getTemplateNames } from './templates/registry'

/**
 * Component metadata
 */
export const InfographicSectionMetadata = {
  type: 'data-viz' as const,
  language: 'infographic-section',
  displayName: 'Infographic Section',
  description: 'Rich infographic section with heading, insight, chart, and footnote',
  category: 'visualization',
  icon: 'chart-box-outline',
  props: [
    { name: 'template', type: 'string', required: true, description: 'Template name' },
    { name: 'title', type: 'string', description: 'Section title' },
    { name: 'subtitle', type: 'string', description: 'Section subtitle' },
    { name: 'insight', type: 'string', description: 'Insight text' },
    { name: 'items', type: 'array', description: 'Data items' }
  ]
}

/**
 * InfographicSection config from YAML
 */
export interface InfographicSectionConfig {
  /** Template name (e.g., 'kpi-row-badge', 'flow-timeline') */
  template: string

  /** Section title */
  title?: string
  /** Section subtitle */
  subtitle?: string

  /** Insight text */
  insight?: string
  /** Text to highlight in insight */
  highlight?: string

  /** Footnote text */
  footnote?: string
  /** Data source attribution */
  source?: string

  /** Data source (SQL query reference or inline items) */
  data?: string
  /** Inline items (when not using SQL query) */
  items?: SectionItem[]

  /** Column mappings for SQL data */
  label?: string
  value?: string
  desc?: string
  icon?: string
  trend?: string

  /** Theme name */
  theme?: string
  /** Color palette */
  palette?: string
  /** Width in pixels */
  width?: number
  /** Height in pixels */
  height?: number
}

/**
 * Props passed to InfographicSection.svelte
 */
export interface InfographicSectionProps {
  data: InfographicSectionData
}

/**
 * Configuration schema
 */
export const InfographicSectionSchema: ConfigSchema = {
  fields: [
    { name: 'template', type: 'enum', enum: getTemplateNames(), required: true },
    { name: 'title', type: 'string' },
    { name: 'subtitle', type: 'string' },
    { name: 'insight', type: 'string' },
    { name: 'highlight', type: 'string' },
    { name: 'footnote', type: 'string' },
    { name: 'source', type: 'string' },
    { name: 'data', type: 'string' },
    { name: 'items', type: 'array' },
    { name: 'label', type: 'string' },
    { name: 'value', type: 'string' },
    { name: 'desc', type: 'string' },
    { name: 'icon', type: 'string' },
    { name: 'trend', type: 'string' },
    { name: 'theme', type: 'string', default: 'dark-vibrant' },
    { name: 'palette', type: 'string', default: 'vibrant' },
    { name: 'width', type: 'number', default: 800 },
    { name: 'height', type: 'number' }
  ]
}

/**
 * InfographicSection component registration
 */
export const infographicSectionRegistration = defineComponent<
  InfographicSectionConfig,
  InfographicSectionProps
>({
  metadata: InfographicSectionMetadata,
  configSchema: InfographicSectionSchema,
  component: InfographicSection,
  containerClass: 'infographic-section-wrapper',

  // Data binding: extract items from SQL query result
  dataBinding: {
    sourceField: 'data',
    transform: (queryResult, config) => {
      // If inline items provided, skip SQL transform
      if (config.items && config.items.length > 0) {
        return config.items
      }

      const { columns, data } = queryResult

      // Validate label column exists
      const labelCol = config.label || 'label'
      if (!columns.includes(labelCol)) {
        console.error(`[InfographicSection] Column "${labelCol}" not found`)
        return null
      }

      // Transform rows to items
      const items: SectionItem[] = data.map((row: Record<string, unknown>) => {
        const item: SectionItem = {
          label: String(row[labelCol] ?? '')
        }

        const valueCol = config.value || 'value'
        if (columns.includes(valueCol) && row[valueCol] !== undefined) {
          item.value = row[valueCol] as string | number
        }

        const descCol = config.desc || 'desc'
        if (columns.includes(descCol) && row[descCol]) {
          item.desc = String(row[descCol])
        }

        const iconCol = config.icon || 'icon'
        if (columns.includes(iconCol) && row[iconCol]) {
          item.icon = String(row[iconCol])
        }

        const trendCol = config.trend || 'trend'
        if (columns.includes(trendCol) && row[trendCol]) {
          const trendValue = String(row[trendCol]).toLowerCase()
          if (['up', 'down', 'flat'].includes(trendValue)) {
            item.trend = trendValue as 'up' | 'down' | 'flat'
          }
        }

        return item
      })

      return items
    }
  },

  // Build props for the component
  buildProps: (config, extractedData) => {
    // Use inline items if provided, otherwise use extracted data
    const items = config.items && config.items.length > 0
      ? config.items
      : (extractedData as SectionItem[] | null)

    if (!items || !Array.isArray(items) || items.length === 0) {
      return null
    }

    // Build InfographicSectionData
    const sectionData: InfographicSectionData = {
      template: config.template,
      items,
      theme: config.theme || 'dark-vibrant',
      palette: config.palette || 'vibrant',
      width: config.width || 800,
      height: config.height
    }

    // Add heading if title provided
    if (config.title) {
      sectionData.heading = {
        title: config.title,
        subtitle: config.subtitle
      }
    }

    // Add insight if provided
    if (config.insight) {
      sectionData.insight = {
        text: config.insight,
        highlight: config.highlight
      }
    }

    // Add footnote if provided
    if (config.footnote) {
      sectionData.footnote = {
        text: config.footnote,
        source: config.source
      }
    }

    return { data: sectionData }
  }
})

export default infographicSectionRegistration
