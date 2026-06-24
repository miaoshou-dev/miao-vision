---
name: new-chart
description: Create new pure SVG chart components following project specifications. Use when adding new visualization types like bar chart, line chart, pie chart, radar, heatmap to data-display plugins. Includes types, definition, registration, and tests.
---

# Create New Chart Component

Create compliant pure SVG chart components for the project.

## Prerequisites

Confirm the following:
1. Chart name in English (kebab-case, e.g., `radar-chart`)
2. Chart name in Chinese
3. Chart type description

## Directory Structure

Create in `src/plugins/data-display/`:

```
{chart-name}/
├── index.ts              # Export entry
├── {ChartName}.svelte    # Main component (PascalCase)
├── definition.ts         # Component registration
├── types.ts              # Type definitions
└── {chart-name}.test.ts  # Test file
```

## Step 1: Type Definitions (types.ts)

```typescript
/**
 * {ChartName} Chart Type Definitions
 */

export interface {ChartName}DataPoint {
  label: string
  value: number
}

export interface {ChartName}Data {
  columns: string[]
  data: Record<string, unknown>[]
}

export interface {ChartName}Config {
  /** Data column names */
  x?: string
  y?: string
  /** Chart dimensions */
  width?: number
  height?: number
  /** Display options */
  showLabels?: boolean
  showGrid?: boolean
}
```

## Step 2: Main Component ({ChartName}.svelte)

```svelte
<script lang="ts">
  /**
   * {ChartName} - {Chinese Name}
   */
  import type { {ChartName}Data, {ChartName}Config } from './types'

  interface Props {
    data: {ChartName}Data
    config?: {ChartName}Config
  }

  let { data, config = {} }: Props = $props()

  // Default config
  const width = config.width ?? 600
  const height = config.height ?? 400
  const padding = { top: 20, right: 20, bottom: 40, left: 50 }

  // Calculate plot area
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  // Use $derived for data processing
  let processedData = $derived.by(() => {
    if (!data?.data || data.data.length === 0) return []
    return data.data
  })

  // Scale calculations
  let scales = $derived.by(() => {
    return { x: null, y: null }
  })
</script>

{#if processedData.length === 0}
  <div class="chart-empty">
    <p>No data available</p>
  </div>
{:else}
  <svg {width} {height} class="chart-{chart-name}">
    <g transform="translate({padding.left}, {padding.top})">
      <!-- Grid lines -->
      {#if config.showGrid !== false}
        <g class="grid">
          <!-- Horizontal grid lines -->
        </g>
      {/if}

      <!-- Data elements -->
      <g class="data-elements">
        {#each processedData as item, i}
          <!-- Render chart elements -->
        {/each}
      </g>

      <!-- Axes -->
      <g class="axis axis-x" transform="translate(0, {plotHeight})">
        <!-- X axis -->
      </g>
      <g class="axis axis-y">
        <!-- Y axis -->
      </g>

      <!-- Labels -->
      {#if config.showLabels !== false}
        <g class="labels">
          {#each processedData as item, i}
            <!-- Data labels -->
          {/each}
        </g>
      {/if}
    </g>
  </svg>
{/if}

<style>
  .chart-{chart-name} {
    font-family: system-ui, -apple-system, sans-serif;
  }

  .chart-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: #6b7280;
  }

  .grid line {
    stroke: #e5e7eb;
    stroke-dasharray: 2, 2;
  }

  .axis line,
  .axis path {
    stroke: #d1d5db;
  }

  .axis text {
    fill: #6b7280;
    font-size: 12px;
  }
</style>
```

## Step 3: Component Definition (definition.ts)

```typescript
/**
 * {ChartName} Component Registration
 */
import { defineComponent } from '@core/registry'
import type { ConfigSchema } from '@core/registry'
import {ChartName} from './{ChartName}.svelte'
import type { {ChartName}Data, {ChartName}Config } from './types'

export const {ChartName}Metadata = {
  type: 'data-viz' as const,
  language: '{chart-name}',
  displayName: '{Chinese Name}',
  description: '{Chart description}',
  category: 'chart',
  icon: 'chart-line',
  props: [
    { name: 'x', type: 'string', description: 'X axis column' },
    { name: 'y', type: 'string', description: 'Y axis column' },
    { name: 'width', type: 'number', description: 'Chart width' },
    { name: 'height', type: 'number', description: 'Chart height' }
  ]
}

export const {ChartName}Schema: ConfigSchema = {
  fields: [
    { name: 'data', type: 'string', required: true },
    { name: 'x', type: 'string' },
    { name: 'y', type: 'string' },
    { name: 'width', type: 'number', default: 600 },
    { name: 'height', type: 'number', default: 400 },
    { name: 'showLabels', type: 'boolean', default: true },
    { name: 'showGrid', type: 'boolean', default: true }
  ]
}

export const {chartName}Registration = defineComponent<{ChartName}Config, { data: {ChartName}Data }>({
  metadata: {ChartName}Metadata,
  configSchema: {ChartName}Schema,
  component: {ChartName},

  dataBinding: {
    sourceField: 'data',
    transform: (queryResult, config) => {
      return {
        columns: queryResult.columns,
        data: queryResult.data
      }
    }
  },

  buildProps: (config, extractedData) => {
    if (!extractedData) return null
    return {
      data: extractedData as {ChartName}Data,
      config
    }
  }
})
```

## Step 4: Export Entry (index.ts)

```typescript
export { default as {ChartName} } from './{ChartName}.svelte'
export * from './types'
export { {chartName}Registration } from './definition'
```

## Step 5: Register in Bootstrap

File: `src/bootstrap/init-plugins.ts`

```typescript
// Add import
import { {chartName}Registration } from '@plugins/data-display/{chart-name}'

// Add to registerDataDisplayPlugins()
registry.register({chartName}Registration)
```

## Step 6: Basic Tests ({chart-name}.test.ts)

```typescript
import { describe, it, expect } from 'vitest'

describe('{ChartName}', () => {
  describe('data validation', () => {
    it('should handle empty data', () => {
      // Test empty data handling
    })

    it('should process valid data', () => {
      // Test normal data processing
    })
  })
})
```

## Verification Checklist

- [ ] `npm run check` - No TypeScript errors
- [ ] `npm run dev` - Component renders correctly
- [ ] All files < 500 lines
- [ ] Works in BI Report code blocks
- [ ] Basic tests pass

## Reference Implementations

- Bar chart: `src/plugins/data-display/bar-chart/`
- Line chart: `src/plugins/data-display/line-chart/`
- Pie chart: `src/plugins/data-display/pie-chart/`
- Radar chart: `src/plugins/data-display/radar/`
