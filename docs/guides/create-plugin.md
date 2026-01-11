# Creating a Plugin

This guide walks you through creating a new plugin component.

## Quick Start with Scaffolding

Use the plugin scaffolding script to generate all required files:

```bash
npm run create-plugin <plugin-name> <category>
```

**Example:**
```bash
npm run create-plugin funnel-chart data-display
```

**Available categories:**
- `data-display` - Charts, tables, visualizations
- `inputs` - Form controls, filters
- `ui` - General UI components
- `layout` - Layout components

## Generated Files

The script creates 7 files in `src/plugins/<category>/<plugin-name>/`:

| File | Purpose |
|------|---------|
| `index.ts` | Public exports |
| `types.ts` | TypeScript interfaces |
| `metadata.ts` | Component metadata for registry |
| `definition.ts` | Component registration |
| `logic.ts` | Pure data processing functions |
| `logic.test.ts` | Unit tests for logic |
| `<Name>.svelte` | Svelte component |

## Manual Registration

After generating, register the plugin in `src/plugins/<category>/index.ts`:

```typescript
import { myChartRegistration } from './my-chart'

// Add to registrations export
export { myChartRegistration }

// Add to components export
export { default as MyChart } from './my-chart/MyChart.svelte'

// Add to register function
registry.register(myChartRegistration)
```

## Plugin Structure

### Types (`types.ts`)

Define your data interfaces:

```typescript
export interface MyChartConfig {
  data: string      // Query name
  title?: string
  height?: number
}

export interface MyChartData {
  items: MyChartItem[]
  config: MyChartConfig
}

export interface MyChartItem {
  id: string
  label: string
  value: number
}
```

### Logic (`logic.ts`)

Pure functions for data processing:

```typescript
export function processMyChartData(
  rows: Record<string, unknown>[] | null,
  config: MyChartConfig
): MyChartData {
  if (!rows || rows.length === 0) {
    return { items: [], config }
  }

  const items = rows.map((row, i) => ({
    id: String(i),
    label: String(row['label'] ?? ''),
    value: Number(row['value'] ?? 0)
  }))

  return { items, config }
}
```

### Component (`MyChart.svelte`)

Use Svelte 5 runes and pure SVG:

```svelte
<script lang="ts">
  import type { MyChartData } from './types'

  interface Props {
    data: MyChartData
  }

  let { data }: Props = $props()

  const items = $derived(data.items)
  const maxValue = $derived(Math.max(...items.map(i => i.value)))
</script>

<div class="my-chart">
  <svg viewBox="0 0 400 300">
    {#each items as item, i}
      <rect
        x={i * 50}
        y={300 - (item.value / maxValue) * 280}
        width="40"
        height={(item.value / maxValue) * 280}
        fill="#667EEA"
      />
    {/each}
  </svg>
</div>
```

## Best Practices

1. **Pure SVG rendering** - No external chart libraries
2. **Use `$derived`** - For reactive computations
3. **Keep logic pure** - Data processing in `logic.ts`
4. **Write tests** - Cover logic functions with unit tests
5. **Follow conventions** - Match existing plugin patterns

## Testing

Run tests for your new plugin:

```bash
npm run test -- src/plugins/data-display/my-chart
```

## Examples

See existing plugins for reference:

- `src/plugins/data-display/bar-chart/` - Basic bar chart
- `src/plugins/data-display/pie-chart/` - Pie chart with legend
- `src/plugins/data-display/sankey/` - Complex flow diagram
- `src/plugins/inputs/dropdown/` - Input component
