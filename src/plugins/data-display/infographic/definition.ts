/**
 * Infographic Component Definition (Adapter Layer)
 *
 * Declarative component definition for Markdown integration.
 */

import { defineComponent } from '@core/registry'
import type { ConfigSchema } from '@core/registry'
import { InfographicMetadata } from './metadata'
import InfographicRenderer from './InfographicRenderer.svelte'

/**
 * Infographic config from YAML
 */
export interface InfographicConfig {
  data: string
  label: string
  icon?: string
  desc?: string
  value?: string
  layout?: 'row' | 'zigzag' | 'grid'
  theme?: string
  palette?: string
  showArrows?: boolean
  width?: number
  height?: number
  itemType?: 'icon-node' | 'badge-card' | 'value-card'
}

/**
 * Item data extracted from query
 */
export interface InfographicItem {
  label: string
  icon?: string
  desc?: string
  value?: string | number
  color?: string
}

/**
 * Props passed to InfographicRenderer.svelte
 */
export interface InfographicProps {
  items: InfographicItem[]
  config: InfographicConfig
}

/**
 * Infographic configuration schema
 */
export const InfographicSchema: ConfigSchema = {
  fields: [
    { name: 'data', type: 'string', required: true },
    { name: 'label', type: 'string', required: true },
    { name: 'icon', type: 'string' },
    { name: 'desc', type: 'string' },
    { name: 'value', type: 'string' },
    {
      name: 'layout',
      type: 'enum',
      enum: ['row', 'zigzag', 'grid'],
      default: 'row'
    },
    { name: 'theme', type: 'string', default: 'dark-vibrant' },
    { name: 'palette', type: 'string', default: 'vibrant' },
    { name: 'showArrows', type: 'boolean', default: true },
    { name: 'width', type: 'number', default: 800 },
    { name: 'height', type: 'number', default: 200 },
    {
      name: 'itemType',
      type: 'enum',
      enum: ['icon-node', 'badge-card', 'value-card'],
      default: 'icon-node'
    }
  ]
}

/**
 * Infographic component registration
 */
export const infographicRegistration = defineComponent<InfographicConfig, InfographicProps>({
  metadata: InfographicMetadata,
  configSchema: InfographicSchema,
  component: InfographicRenderer,
  containerClass: 'infographic-wrapper',

  // Data binding: extract items from SQL query result
  dataBinding: {
    sourceField: 'data',
    transform: (queryResult, config) => {
      const { columns, data } = queryResult

      // Check if label column exists
      if (!columns.includes(config.label)) {
        console.error(`[Infographic] Column "${config.label}" not found`)
        return null
      }

      // Transform rows to items
      const items: InfographicItem[] = data.map((row: Record<string, unknown>) => {
        const item: InfographicItem = {
          label: String(row[config.label] ?? '')
        }

        if (config.icon && row[config.icon]) {
          item.icon = String(row[config.icon])
        }

        if (config.desc && row[config.desc]) {
          item.desc = String(row[config.desc])
        }

        if (config.value && row[config.value] !== undefined) {
          item.value = row[config.value] as string | number
        }

        return item
      })

      return items
    }
  },

  // Build props for the component
  buildProps: (config, extractedData) => {
    if (!extractedData || !Array.isArray(extractedData)) {
      return null
    }

    return {
      items: extractedData as InfographicItem[],
      config: {
        ...config,
        layout: config.layout || 'row',
        theme: config.theme || 'dark-vibrant',
        palette: config.palette || 'vibrant',
        showArrows: config.showArrows !== false,
        width: config.width || 800,
        height: config.height || 200,
        itemType: config.itemType || 'icon-node'
      }
    }
  }
})

export default infographicRegistration
