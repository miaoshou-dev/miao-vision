/**
 * BigValue Component Definition (Adapter Layer)
 *
 * Declarative component definition using the new adapter layer.
 */

import { defineComponent, BigValueSchema, dataResolver } from '@core/registry'
import { BigValueMetadata } from './metadata'
import BigValue from './BigValue.svelte'
import { formatValue, calculateComparison } from './formatter'
import type { BigValueConfig, BigValueData, ComparisonData } from './types'

/**
 * Palette color mapping - first color of each palette
 */
const PALETTE_COLORS: Record<string, string> = {
  vibrant: '#6366f1',
  business: '#3b82f6',
  ocean: '#0ea5e9',
  sunset: '#f43f5e',
  forest: '#22c55e',
  categorical: '#3b82f6',
  pastel: '#c4b5fd',
  darkMode: '#818cf8'
}

/**
 * Get color from palette name or return direct color
 */
function resolveColor(color?: string, palette?: string): string | undefined {
  if (color) return color
  if (palette && PALETTE_COLORS[palette]) return PALETTE_COLORS[palette]
  return undefined
}

/**
 * Props passed to BigValue.svelte
 */
interface BigValueProps {
  data: BigValueData
}

/**
 * BigValue component registration using adapter layer
 */
export const bigValueRegistration = defineComponent<BigValueConfig, BigValueProps>({
  metadata: BigValueMetadata,
  configSchema: BigValueSchema,
  component: BigValue,
  containerClass: 'bigvalue-wrapper',

  // Data binding: extract value from SQL query result
  dataBinding: {
    sourceField: 'query',
    transform: (queryResult, config) => {
      const { columns, data } = queryResult

      // Check if value column exists
      if (!columns.includes(config.value)) {
        console.error(`[BigValue] Column "${config.value}" not found`)
        return null
      }

      // Extract value from first row
      if (data.length === 0) {
        console.warn('[BigValue] Query result is empty')
        return null
      }

      const rawValue = data[0][config.value]
      const value = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue))

      if (isNaN(value)) {
        console.error(`[BigValue] Value "${rawValue}" is not a number`)
        return null
      }

      return {
        value,
        column: config.value,
        format: config.format || 'number'
      }
    }
  },

  // Build props with comparison logic
  buildProps: (config, extractedData, context) => {
    if (!extractedData) return null

    const { value, format } = extractedData as { value: number; column: string; format: string }
    const title = config.title || config.value
    const formatted = formatValue(value, format as 'number' | 'currency' | 'percent')

    // Handle comparison if specified
    let comparison: ComparisonData | undefined

    if (config.comparison) {
      const compResult = dataResolver.resolveSingleValue<number>(
        config.comparison,
        context.blocks,
        { column: config.value }
      )

      if (compResult.success && compResult.data !== null) {
        const compValue = typeof compResult.data === 'number'
          ? compResult.data
          : parseFloat(String(compResult.data))

        if (!isNaN(compValue)) {
          const label = config.comparisonLabel || 'vs previous'
          comparison = calculateComparison(value, compValue, label, format as 'number' | 'currency' | 'percent')
        }
      }
    }

    // Resolve accent color from color or palette
    const accentColor = resolveColor(config.color, config.palette)

    return {
      data: {
        value,
        title,
        formatted,
        comparison,
        color: accentColor
      }
    }
  }
})

export default bigValueRegistration
