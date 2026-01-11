#!/usr/bin/env npx ts-node

/**
 * Plugin Scaffolding Script
 *
 * Creates a new plugin with all required files following the standard structure.
 *
 * Usage:
 *   npm run create-plugin <plugin-name> <category>
 *
 * Example:
 *   npm run create-plugin my-chart data-display
 *   npm run create-plugin date-picker inputs
 *
 * Categories:
 *   - data-display: Charts, tables, visualizations
 *   - inputs: Form controls, filters
 *   - ui: General UI components
 *   - layout: Layout components
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

// ============================================================================
// Configuration
// ============================================================================

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PLUGINS_DIR = path.resolve(__dirname, '../src/plugins')

const VALID_CATEGORIES = ['data-display', 'inputs', 'ui', 'layout']

// ============================================================================
// Template Functions
// ============================================================================

function toPascalCase(str: string): string {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str)
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

function toKebabCase(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-')
}

// ============================================================================
// File Templates
// ============================================================================

function generateIndexTs(name: string, pascalName: string, camelName: string): string {
  return `/**
 * ${pascalName} Plugin
 *
 * TODO: Add description
 */

// Registration
export { ${camelName}Registration } from './definition'
export { ${camelName}Registration as default } from './definition'

// Component
export { default as ${pascalName} } from './${pascalName}.svelte'

// Metadata
export { ${pascalName}Metadata } from './metadata'

// Types
export type { ${pascalName}Config, ${pascalName}Data } from './types'

// Logic
export * from './logic'
`
}

function generateTypesTs(pascalName: string): string {
  return `/**
 * ${pascalName} Component Types
 */

/**
 * Configuration for the ${pascalName} component
 */
export interface ${pascalName}Config {
  /** Query name providing the data */
  data: string

  // TODO: Add configuration options
  /** Chart title */
  title?: string
  /** Chart height in pixels */
  height?: number
  /** Custom CSS class */
  class?: string
}

/**
 * Processed data for rendering
 */
export interface ${pascalName}Data {
  /** Items to render */
  items: ${pascalName}Item[]
  /** Configuration */
  config: ${pascalName}Config
}

/**
 * A single item in the component
 */
export interface ${pascalName}Item {
  /** Unique identifier */
  id: string
  /** Label */
  label: string
  /** Value */
  value: number
  /** Formatted value for display */
  formatted: string
}
`
}

function generateMetadataTs(name: string, pascalName: string): string {
  return `/**
 * ${pascalName} Component Metadata
 */

import { createMetadata } from '@core/registry'

export const ${pascalName}Metadata = createMetadata({
  type: 'data-viz',
  language: '${name}',
  displayName: '${pascalName.replace(/([A-Z])/g, ' $1').trim()}',
  description: 'TODO: Add description',
  icon: '📊',
  category: 'visualization',
  tags: ['chart', 'visualization'],
  props: [
    {
      name: 'data',
      type: 'query',
      required: true,
      description: 'SQL query name providing the data',
      examples: ['my_query']
    },
    {
      name: 'title',
      type: 'string',
      required: false,
      description: 'Chart title'
    },
    {
      name: 'height',
      type: 'number',
      required: false,
      default: 300,
      description: 'Chart height in pixels'
    }
  ],
  examples: [
    \`\\\`\\\`\\\`${name}
data: my_query
title: My ${pascalName}
\\\`\\\`\\\`\`
  ]
})
`
}

function generateDefinitionTs(name: string, pascalName: string, camelName: string): string {
  return `/**
 * ${pascalName} Component Definition
 *
 * Transforms SQL query results into component data.
 */

import { defineComponent } from '@core/registry'
import { ${pascalName}Metadata } from './metadata'
import ${pascalName} from './${pascalName}.svelte'
import type { ${pascalName}Config, ${pascalName}Data } from './types'
import { process${pascalName}Data } from './logic'

/**
 * Props passed to ${pascalName}.svelte
 */
interface ${pascalName}Props {
  data: ${pascalName}Data
}

/**
 * Config schema for ${name}
 */
const ${pascalName}Schema = {
  fields: [
    { name: 'data', type: 'string' as const, required: true },
    { name: 'title', type: 'string' as const, required: false },
    { name: 'height', type: 'number' as const, required: false, default: 300 }
  ]
}

/**
 * ${pascalName} component registration
 */
export const ${camelName}Registration = defineComponent<${pascalName}Config, ${pascalName}Props>({
  metadata: ${pascalName}Metadata,
  configSchema: ${pascalName}Schema,
  component: ${pascalName},
  containerClass: '${name}-wrapper',

  // Data binding: extract rows from SQL query
  dataBinding: {
    sourceField: 'data',
    transform: (queryResult, _config) => {
      if (!queryResult.data || queryResult.data.length === 0) {
        console.warn('[${pascalName}] No data available')
        return null
      }
      return queryResult.data
    }
  },

  // Build props from extracted data
  buildProps: (config, rawData, _context): ${pascalName}Props => {
    const rows = rawData as Record<string, unknown>[] | null
    return {
      data: process${pascalName}Data(rows, config)
    }
  }
})

export default ${camelName}Registration
`
}

function generateLogicTs(pascalName: string): string {
  return `/**
 * ${pascalName} Logic
 *
 * Pure functions for data processing.
 */

import type { ${pascalName}Config, ${pascalName}Data, ${pascalName}Item } from './types'

/**
 * Process raw data into component data
 */
export function process${pascalName}Data(
  rows: Record<string, unknown>[] | null,
  config: ${pascalName}Config
): ${pascalName}Data {
  // Empty state
  if (!rows || rows.length === 0) {
    return {
      items: [],
      config
    }
  }

  // TODO: Implement data transformation
  const items: ${pascalName}Item[] = rows.map((row, index) => ({
    id: String(index),
    label: String(row['label'] ?? ''),
    value: Number(row['value'] ?? 0),
    formatted: formatValue(Number(row['value'] ?? 0))
  }))

  return {
    items,
    config
  }
}

/**
 * Format a value for display
 */
export function formatValue(value: number): string {
  return value.toLocaleString()
}

/**
 * Calculate statistics from items
 */
export function calculateStats(items: ${pascalName}Item[]): {
  total: number
  average: number
  min: number
  max: number
} {
  if (items.length === 0) {
    return { total: 0, average: 0, min: 0, max: 0 }
  }

  const values = items.map(item => item.value)
  const total = values.reduce((sum, v) => sum + v, 0)

  return {
    total,
    average: total / values.length,
    min: Math.min(...values),
    max: Math.max(...values)
  }
}
`
}

function generateLogicTestTs(pascalName: string): string {
  return `/**
 * ${pascalName} Logic Tests
 */

import { describe, it, expect } from 'vitest'
import { process${pascalName}Data, formatValue, calculateStats } from './logic'
import type { ${pascalName}Config } from './types'

const mockConfig: ${pascalName}Config = {
  data: 'test_query',
  title: 'Test Chart'
}

describe('process${pascalName}Data', () => {
  it('returns empty items for null data', () => {
    const result = process${pascalName}Data(null, mockConfig)
    expect(result.items).toEqual([])
  })

  it('returns empty items for empty array', () => {
    const result = process${pascalName}Data([], mockConfig)
    expect(result.items).toEqual([])
  })

  it('processes data correctly', () => {
    const rows = [
      { label: 'A', value: 10 },
      { label: 'B', value: 20 }
    ]
    const result = process${pascalName}Data(rows, mockConfig)

    expect(result.items).toHaveLength(2)
    expect(result.items[0].label).toBe('A')
    expect(result.items[0].value).toBe(10)
  })
})

describe('formatValue', () => {
  it('formats numbers with locale', () => {
    expect(formatValue(1000)).toBe('1,000')
    expect(formatValue(1234567)).toBe('1,234,567')
  })
})

describe('calculateStats', () => {
  it('returns zeros for empty array', () => {
    const stats = calculateStats([])
    expect(stats).toEqual({ total: 0, average: 0, min: 0, max: 0 })
  })

  it('calculates stats correctly', () => {
    const items = [
      { id: '1', label: 'A', value: 10, formatted: '10' },
      { id: '2', label: 'B', value: 20, formatted: '20' },
      { id: '3', label: 'C', value: 30, formatted: '30' }
    ]
    const stats = calculateStats(items)

    expect(stats.total).toBe(60)
    expect(stats.average).toBe(20)
    expect(stats.min).toBe(10)
    expect(stats.max).toBe(30)
  })
})
`
}

function generateComponentSvelte(name: string, pascalName: string): string {
  return `<script lang="ts">
  /**
   * ${pascalName} Component
   *
   * TODO: Add description
   */
  import type { ${pascalName}Data } from './types'
  import { calculateStats } from './logic'

  interface Props {
    data: ${pascalName}Data
  }

  let { data }: Props = $props()

  // Derived values
  const items = $derived(data.items)
  const config = $derived(data.config)
  const stats = $derived(calculateStats(items))

  // Dimensions
  const width = 400
  const height = $derived(config.height || 300)
  const padding = { top: 40, right: 20, bottom: 30, left: 40 }
  const chartWidth = $derived(width - padding.left - padding.right)
  const chartHeight = $derived(height - padding.top - padding.bottom)
</script>

<div class="${name}">
  {#if config.title}
    <h3 class="title">{config.title}</h3>
  {/if}

  {#if items.length === 0}
    <div class="empty-state">
      <span class="icon">📊</span>
      <span class="text">No data available</span>
    </div>
  {:else}
    <svg {width} {height} viewBox="0 0 {width} {height}">
      <g transform="translate({padding.left}, {padding.top})">
        <!-- TODO: Implement visualization -->
        <text x={chartWidth / 2} y={chartHeight / 2} text-anchor="middle" fill="#9CA3AF">
          {items.length} items • Total: {stats.total.toLocaleString()}
        </text>
      </g>
    </svg>
  {/if}
</div>

<style>
  .${name} {
    font-family: system-ui, -apple-system, sans-serif;
    background: #1F2937;
    border-radius: 8px;
    padding: 1rem;
  }

  .title {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: #F3F4F6;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    color: #6B7280;
    gap: 0.5rem;
  }

  .empty-state .icon {
    font-size: 2rem;
    opacity: 0.5;
  }

  .empty-state .text {
    font-size: 0.875rem;
  }

  svg {
    display: block;
    max-width: 100%;
    height: auto;
  }
</style>
`
}

// ============================================================================
// Main Script
// ============================================================================

function main() {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.log(`
Usage: npm run create-plugin <plugin-name> <category>

Example:
  npm run create-plugin my-chart data-display
  npm run create-plugin date-picker inputs

Categories:
  ${VALID_CATEGORIES.join(', ')}
`)
    process.exit(1)
  }

  const pluginName = toKebabCase(args[0])
  const category = args[1]

  // Validate category
  if (!VALID_CATEGORIES.includes(category)) {
    console.error(`❌ Invalid category: ${category}`)
    console.error(`   Valid categories: ${VALID_CATEGORIES.join(', ')}`)
    process.exit(1)
  }

  const pascalName = toPascalCase(pluginName)
  const camelName = toCamelCase(pluginName)
  const pluginDir = path.join(PLUGINS_DIR, category, pluginName)

  // Check if plugin already exists
  if (fs.existsSync(pluginDir)) {
    console.error(`❌ Plugin already exists: ${pluginDir}`)
    process.exit(1)
  }

  console.log(`\n📦 Creating plugin: ${pascalName}`)
  console.log(`   Category: ${category}`)
  console.log(`   Location: ${pluginDir}\n`)

  // Create directory
  fs.mkdirSync(pluginDir, { recursive: true })

  // Generate files
  const files: Record<string, string> = {
    'index.ts': generateIndexTs(pluginName, pascalName, camelName),
    'types.ts': generateTypesTs(pascalName),
    'metadata.ts': generateMetadataTs(pluginName, pascalName),
    'definition.ts': generateDefinitionTs(pluginName, pascalName, camelName),
    'logic.ts': generateLogicTs(pascalName),
    'logic.test.ts': generateLogicTestTs(pascalName),
    [`${pascalName}.svelte`]: generateComponentSvelte(pluginName, pascalName)
  }

  for (const [filename, content] of Object.entries(files)) {
    const filePath = path.join(pluginDir, filename)
    fs.writeFileSync(filePath, content)
    console.log(`   ✓ Created ${filename}`)
  }

  // Instructions for manual registration
  console.log(`
✅ Plugin created successfully!

Next steps:
1. Implement the component in ${pascalName}.svelte
2. Update types.ts with your data structure
3. Implement data processing in logic.ts
4. Add tests in logic.test.ts

To register the plugin, add to src/plugins/${category}/index.ts:

  import { ${camelName}Registration } from './${pluginName}'

  // Add to registrations export
  export { ${camelName}Registration }

  // Add to components export
  export { default as ${pascalName} } from './${pluginName}/${pascalName}.svelte'

  // Add to registerDataDisplayPlugins function
  registry.register(${camelName}Registration)
`)
}

main()
