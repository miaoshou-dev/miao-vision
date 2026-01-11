# Miao Vision Framework Architecture

## Overview

This document outlines the architectural vision for transforming Miao Vision from a monolithic application into a reusable framework/library.

## Current State

Miao Vision is currently a **Monolithic Application**:

```
miaoshou-vision/
├── src/
│   ├── core/          # Framework capabilities
│   ├── plugins/       # Component library
│   ├── app/           # Application state
│   ├── components/    # UI components
│   ├── App.svelte     # Application entry ← coupling point
│   └── main.ts        # Bootstrap entry ← coupling point
└── index.html
```

**Problem**: Core capabilities (DuckDB, Chart, Markdown) are mixed with application shell (App.svelte, routing, demos).

## Target Architecture: Monorepo + Framework

```
miaoshou/
├── packages/
│   ├── core/                    # @miaoshou/core
│   │   ├── database/            # DuckDB-WASM wrapper
│   │   ├── engine/              # Execution engine
│   │   └── index.ts             # Export API
│   │
│   ├── components/              # @miaoshou/components
│   │   ├── inputs/              # Input components
│   │   ├── charts/              # Chart components
│   │   ├── data-display/        # Data display
│   │   └── index.ts
│   │
│   ├── markdown/                # @miaoshou/markdown
│   │   ├── parser/              # Markdown parsing
│   │   ├── renderer/            # Renderer
│   │   └── index.ts
│   │
│   └── vue-adapter/             # @miaoshou/vue (optional)
│       └── index.ts
│
├── apps/
│   ├── playground/              # Current Demo application
│   │   └── src/
│   │       ├── App.svelte
│   │       └── demos/
│   │           ├── StockDemo.svelte
│   │           └── StreamingDemo.svelte
│   │
│   └── weather-app/             # Business application example
│       └── src/
│           ├── App.svelte
│           ├── services/
│           │   └── weather-api.ts
│           └── pages/
│               └── TemperatureAnalysis.svelte
│
└── package.json                 # Monorepo root
```

## Framework API Design

### @miaoshou/core

```typescript
export {
  // Database
  createDuckDB,
  useDuckDB,

  // Query
  query,
  createTable,
  loadCSV,
  loadParquet,

  // Reactive
  createReactiveQuery,

  // Types
  type QueryResult,
  type TableSchema
} from './database'

export {
  // Execution engine
  createExecutionEngine,
  type ExecutionContext
} from './engine'
```

### @miaoshou/components

```typescript
export {
  // Input components
  Dropdown,
  DateRangePicker,
  Slider,
  TextInput,

  // Chart components
  LineChart,
  BarChart,
  AreaChart,
  Heatmap,

  // Data display
  DataTable,
  BigValue,
  Sparkline,

  // Hooks
  useInput,
  useChart,
  useQuery
} from './index'
```

## Usage Patterns

### Pattern A: Component-based Usage

```svelte
<script lang="ts">
  import { useDuckDB, query, createTable } from '@miaoshou/core'
  import { LineChart, DataTable, DateRangePicker } from '@miaoshou/components'
  import { fetchWeatherData } from '../services/weather-api'

  const db = useDuckDB()

  let dateRange = $state({ start: '2024-01-01', end: '2024-12-31' })
  let city = $state('Beijing')

  async function loadWeatherData() {
    const data = await fetchWeatherData(city, dateRange)
    await createTable(db, 'weather', data)
  }

  const temperatureData = $derived(
    query(db, `
      SELECT date, avg_temp, max_temp, min_temp
      FROM weather
      WHERE date BETWEEN '${dateRange.start}' AND '${dateRange.end}'
      ORDER BY date
    `)
  )
</script>

<div class="weather-dashboard">
  <DateRangePicker bind:value={dateRange} />

  <LineChart
    data={temperatureData}
    x="date"
    y={['avg_temp', 'max_temp', 'min_temp']}
    title="Temperature Trend"
  />

  <DataTable data={temperatureData} />
</div>
```

### Pattern B: Markdown Report Usage

```svelte
<script lang="ts">
  import { MarkdownReport } from '@miaoshou/markdown'
  import { useDuckDB } from '@miaoshou/core'

  const db = useDuckDB()

  const reportContent = `
# Weather Analysis

\`\`\`sql name=monthly_avg
SELECT DATE_TRUNC('month', date) as month, AVG(temperature) as avg_temp
FROM weather
GROUP BY 1
ORDER BY 1
\`\`\`

\`\`\`line-chart
data: monthly_avg
x: month
y: avg_temp
\`\`\`
  `
</script>

<MarkdownReport {db} content={reportContent} />
```

## Migration Path

### Phase 1: Export API (Low Cost)

Add export entry point without restructuring:

```typescript
// src/lib.ts
export { duckDBManager } from './core/database'
export { HybridGNode, HybridView } from './core/engine'
export { default as LineChart } from './plugins/viz/line-chart/LineChart.svelte'
export { default as BarChart } from './plugins/viz/bar-chart/BarChart.svelte'
export { default as DataTable } from './plugins/data-display/datatable/DataTable.svelte'
// ... other components
```

### Phase 2: Create Business Applications

```
miaoshou-vision/
├── src/                         # Framework code
├── apps/                        # Business applications
│   └── weather/
│       ├── package.json
│       └── src/
└── package.json
```

### Phase 3: Full Monorepo (Optional)

Use pnpm workspace or turborepo to split packages.

## Comparison: Usage Modes

| Feature | Component-based | Markdown Report |
|---------|----------------|-----------------|
| **Use Case** | Complex interaction, custom UI | Data analysis, rapid prototyping |
| **Flexibility** | High | Medium |
| **Dev Speed** | Medium | Fast |
| **Code Volume** | More | Less |
| **Type Safety** | Complete | Partial |

## Recommendation

For business applications, recommend **Phase 1 + Component-based Usage**:

1. **Minimal changes**: Only need to add export file
2. **Immediately usable**: Business code can directly import
3. **Preserve structure**: Does not affect existing demos
4. **Progressive evolution**: Can continue splitting later

---

**Last Updated**: 2024-12-30
**Status**: Proposal - Pending Review
