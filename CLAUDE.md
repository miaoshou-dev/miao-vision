# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Miaoshou Vision** is a local-first BI analytics platform with two core product engines:

### Product Engines

| Engine | Purpose | Status |
|--------|---------|--------|
| **SQL Workspace** | Interactive SQL query & analysis | ✅ Production |
| **BI Report** | Data-driven documents (Manual + AI) | ✅ Production |

### Technology Stack

- **DuckDB-WASM v1.29** - Browser SQL engine with OPFS persistence
- **Svelte 5 + SVG** - Primary visualization (27 chart types, pure SVG)
- **AI Report Generation** - LLM-powered report creation
- **Markdown Report System** - Evidence.dev-style documents
- **43+ Plugin Components** - Extensible component architecture

### Key Features

- 🔒 **Privacy-first**: All processing in browser, zero backend
- ⚡ **High Performance**: WebAssembly SQL, pure SVG charts
- 💾 **Persistent Storage**: OPFS cross-session data retention
- 🤖 **AI Report**: Auto-generate reports from data + prompts
- 📝 **Template Syntax**: Variables, conditionals, loops in Markdown

## Development Commands

```bash
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build
npm run check        # TypeScript/Svelte type checking
npm run check:size   # Check for files exceeding 500 lines
npm run test         # Run tests
npm run test:coverage # Test coverage report
```

**⚠️ Critical:** Always use `npm run dev` - requires CORS headers for DuckDB-WASM SharedArrayBuffer.

## Architecture

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 4: Application Entry (main.ts, App.svelte)              │
│                              │                                   │
│                              ▼                                   │
│  Layer 3: Bootstrap (Composition Root)                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ bootstrap/  - Wires all dependencies (DI)                   ││
│  │   ├── init-services.ts  (DI adapters)                       ││
│  │   └── init-plugins.ts   (plugin registration)               ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│              ┌───────────────┼───────────────┐                  │
│              ▼               ▼               ▼                  │
│  Layer 2: Features                                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │  plugins/   │ │    app/     │ │ components/ │                │
│  │  (43 comp)  │ │  (stores)   │ │  (UI)       │                │
│  └─────────────┘ └─────────────┘ └─────────────┘                │
│              │               │               │                   │
│              └───────────────┼───────────────┘                  │
│                              ▼                                   │
│  Layer 1: Core (Pure logic, interface-only dependencies)        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ core/  - connectors, database, markdown, engine, ai, shared ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼                                   │
│  Layer 0: Types / Contracts                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ types/  - interfaces, type definitions                      ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
src/
├── bootstrap/         # Composition Root
│   ├── index.ts           # initializeApp()
│   ├── init-services.ts   # DI adapters
│   └── init-plugins.ts    # Plugin registration
│
├── core/              # Core engine
│   ├── ai/            # AI Report Generation
│   │   ├── report-planner.ts    # Report planning
│   │   ├── report-generator.ts  # Markdown generation
│   │   ├── prompts/             # LLM prompts
│   │   └── types.ts             # AI types
│   ├── connectors/    # Data connectors (WASM, MotherDuck, HTTP)
│   ├── database/      # DuckDB-WASM, table loading
│   ├── engine/        # Report execution engine
│   ├── markdown/      # Markdown processing
│   ├── registry/      # Component registry
│   └── shared/        # Utilities, DI, format
│
├── plugins/           # Pluggable components (43+)
│   ├── inputs/        # 8 input components
│   │   ├── dropdown/
│   │   ├── buttongroup/
│   │   ├── slider/
│   │   ├── daterange/
│   │   └── ...
│   ├── data-display/  # 27 data display components (ALL pure SVG)
│   │   ├── bigvalue/       # KPI card
│   │   ├── datatable/      # Data table
│   │   ├── bar-chart/      # Bar chart (Svelte + SVG)
│   │   ├── line-chart/     # Line chart (Svelte + SVG)
│   │   ├── pie-chart/      # Pie chart (Svelte + SVG)
│   │   ├── area-chart/     # Area chart (Svelte + SVG)
│   │   ├── scatter-chart/  # Scatter (Svelte + SVG)
│   │   ├── histogram/      # Histogram
│   │   ├── sankey/         # Sankey diagram (Svelte + SVG)
│   │   ├── treemap/        # Treemap
│   │   ├── radar/          # Radar chart (Svelte + SVG)
│   │   ├── gauge/          # Gauge (Svelte + SVG)
│   │   ├── heatmap/        # Heatmap (Svelte + SVG)
│   │   ├── funnel/         # Funnel chart
│   │   ├── waterfall/      # Waterfall chart
│   │   └── ...
│   ├── ui/            # UI components (alert, tabs, modal...)
│   └── layout/        # Layout components (grid)
│
├── components/        # Application UI
│   ├── ai-report/     # AI Report Generator UI
│   │   ├── ReportGeneratorWizard.svelte
│   │   ├── DataSourceSelector.svelte
│   │   ├── PlanPreview.svelte
│   │   └── GenerationProgress.svelte
│   ├── sql-workspace/ # SQL Editor UI
│   └── ...
│
├── app/               # Application state
│   └── stores/        # Svelte 5 stores (Runes)
│
└── types/             # Type definitions
```

### Dependency Rules (CRITICAL)

| From Layer | Can Depend On | FORBIDDEN |
|------------|---------------|-----------|
| **plugins/** | core, types | ❌ app, components, other plugins |
| **core/** | types ONLY | ❌ plugins, app, components |
| **types/** | NOTHING | ❌ everything |

## Visualization Architecture

### Chart Rendering: Pure Svelte + SVG

**All 27 chart types in `plugins/data-display/` use pure Svelte + SVG rendering:**

```svelte
<!-- Example: BarChart.svelte -->
<script lang="ts">
  interface Props {
    data: BarChartData
  }
  let { data }: Props = $props()

  let bars = $derived(data.bars)
  let maxValue = $derived(data.maxValue)
</script>

<svg viewBox="0 0 {width} {height}">
  {#each bars as bar, i}
    <rect
      x={bar.x}
      y={bar.y}
      width={bar.width}
      height={bar.height}
      fill={bar.color}
    />
  {/each}
</svg>
```

**Benefits:**
- ✅ Zero external dependencies
- ✅ Full Svelte reactivity with `$derived`
- ✅ Excellent performance
- ✅ Easy to customize and extend

### Chart Types Summary

| Category | Components | Rendering |
|----------|------------|-----------|
| **Basic Charts** | bar, line, area, pie, scatter | Svelte + SVG |
| **Statistical** | histogram, boxplot, bubble | Svelte + SVG |
| **Flow/Hierarchy** | sankey, treemap, funnel | Svelte + SVG |
| **Metrics** | gauge, progress, sparkline, delta | Svelte + SVG |
| **Heatmaps** | heatmap, calendar-heatmap | Svelte + SVG |
| **Comparison** | radar, bullet, waterfall | Svelte + SVG |
| **KPI** | bigvalue, value, kpigrid | Svelte + HTML |
| **Table** | datatable | Svelte + HTML |

## AI Report System

### Architecture

```
User Prompt + Data Sources
         │
         ▼
┌─────────────────────────────┐
│      ReportPlanner          │
│  (LLM: analyze data →       │
│   generate ReportPlan)      │
└──────────────┬──────────────┘
               │
               ▼
        ReportPlan {
          title: string
          sections: [
            { type: 'kpi', ... },
            { type: 'trend', ... },
            { type: 'ranking', ... },
            { type: 'insight', ... }
          ]
        }
               │
               ▼
┌─────────────────────────────┐
│     ReportGenerator         │
│  (Generate Markdown per     │
│   section, stream output)   │
└──────────────┬──────────────┘
               │
               ▼
        Markdown Output
        (with SQL blocks,
         chart blocks)
               │
               ▼
┌─────────────────────────────┐
│     ReportRenderer          │
│  (Parse → Execute SQL →     │
│   Mount components)         │
└─────────────────────────────┘
```

### Section Types

| Type | Output | Visualization |
|------|--------|---------------|
| `kpi` | BigValue cards | bigvalue component |
| `trend` | Time series | line-chart / area-chart |
| `ranking` | Top N | bar-chart |
| `comparison` | Categories | bar-chart / pie-chart |
| `distribution` | Histogram | histogram |
| `table` | Data table | datatable |
| `insight` | AI text | Markdown paragraphs |

### AI Report Files

```
src/core/ai/
├── types.ts              # ReportPlan, ReportSection types
├── report-planner.ts     # Generate ReportPlan from data + prompt
├── report-generator.ts   # Generate Markdown from plan
└── prompts/
    ├── report-planner.ts # Planner system/user prompts
    ├── section-generator.ts # Section markdown templates
    └── index.ts
```

## Technology Stack

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **Svelte 5** | ^5.15 | UI Framework (Runes mode) |
| **TypeScript** | ^5.7 | Type safety |
| **DuckDB-WASM** | ^1.29 | SQL engine |
| **Monaco Editor** | ^0.52 | SQL editor |
| **Unified/Remark** | ^11.0 | Markdown |
| **Vite** | ^6.0 | Build tool |

### Key Patterns

**1. Svelte 5 Runes**
```typescript
let count = $state(0)
let doubled = $derived(count * 2)
$effect(() => { console.log(count) })
```

**2. Result Pattern**
```typescript
const result = await connector.query(sql)
if (!result.ok) {
  handleError(result.error)
  return
}
const data = result.value
```

**3. Component Data Flow**
```typescript
// Plugin component receives resolved data
interface Props {
  data: ChartData  // Already resolved from SQL
}
let { data }: Props = $props()
let bars = $derived(data.bars)  // Reactive derivation
```

## Adding New Chart Types

### Step 1: Create Plugin Directory

```
src/plugins/data-display/my-chart/
├── index.ts
├── MyChart.svelte
├── definition.ts
├── types.ts
└── data-resolver.ts
```

### Step 2: Create Svelte Component

```svelte
<!-- MyChart.svelte -->
<script lang="ts">
  import type { MyChartData } from './types'

  interface Props {
    data: MyChartData
  }

  let { data }: Props = $props()

  // Use $derived for reactive computations
  let processedData = $derived(
    data.items.map(item => ({
      ...item,
      scaled: item.value / data.maxValue * 100
    }))
  )
</script>

<div class="my-chart">
  <svg viewBox="0 0 400 300">
    {#each processedData as item}
      <!-- Render SVG elements -->
    {/each}
  </svg>
</div>

<style>
  .my-chart {
    width: 100%;
  }
</style>
```

### Step 3: Register Component

```typescript
// definition.ts
import { defineComponent } from '@core/registry'
import { z } from 'zod'
import MyChart from './MyChart.svelte'

export const myChartRegistration = defineComponent({
  metadata: {
    type: 'data-viz',
    language: 'mychart',
    displayName: 'My Chart',
    // ...
  },
  schema: z.object({
    data: z.string(),
    // ...
  }),
  component: MyChart
})
```

## CLI Package (`@miao-vision/cli`)

The CLI lives in `packages/miao-viz-cli/` and is published to npm as `@miao-vision/cli`.

### Package Structure

```
packages/miao-viz-cli/
├── scripts/build.mjs   # esbuild bundler (entry: src/agent/cli.ts → dist/cli.cjs)
├── examples/           # Sample CSV/YAML files for smoke test
├── dist/               # Built output (not committed)
└── package.json
```

### Build & Publish Commands

```bash
npm run build:cli       # Build only (from repo root)
npm run publish:cli     # Build + publish manually (requires npm login)
```

```bash
# Inside packages/miao-viz-cli/
npm run build           # esbuild bundle
npm run smoke           # Quick sanity check: profile examples/sales.csv
```

### Automated Publishing via GitHub Actions

Workflow: `.github/workflows/publish-cli.yml`

Trigger: push a tag in the format `cli-v<semver>`:

```bash
git tag cli-v0.1.1
git push origin cli-v0.1.1
```

```yaml
# .github/workflows/publish-cli.yml
name: Publish CLI to npm

on:
  push:
    tags:
      - 'cli-v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write  # for npm provenance

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
          cache: 'npm'

      - name: Install root dependencies
        run: npm ci

      - name: Build CLI
        run: npm run build:cli

      - name: Smoke test
        run: cd packages/miao-viz-cli && npm run smoke

      - name: Sync version from tag
        run: |
          TAG="${GITHUB_REF_NAME#cli-v}"
          cd packages/miao-viz-cli
          npm version "$TAG" --no-git-tag-version

      - name: Publish to npm
        run: cd packages/miao-viz-cli && npm publish --provenance
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Prerequisites for Publishing

- GitHub secret `NPM_TOKEN` must be set (Settings → Secrets → `NPM_TOKEN`)
- Token type: **Automation** (generated at npmjs.com → Account → Access Tokens)
- First publish must be done manually (`npm login` + `npm run publish:cli`)
- The `prepublishOnly` hook runs the build automatically before every `npm publish`

## Skill Package (`miao-vision-skill`)

The skill lives in `packages/miao-vision-skill/` and is distributed as a **ZIP via GitHub Releases** — it is not an npm package.

### Package Structure

```
packages/miao-vision-skill/
├── SKILL.md                  # Agent instructions (entry point)
├── references/
│   ├── vizspec.md            # Chart spec reference
│   └── examples.md           # Example specs
├── scripts/
│   └── check-miao-viz.mjs    # Verify miao-viz is on PATH
└── install/
    ├── README.md             # Install overview
    ├── claude.md             # Claude Code install steps
    └── codex.md              # Codex install steps
```

### Build & Pack

```bash
npm run pack:skill    # Produces dist/skills/miao-vision-skill.zip
```

### Automated Publishing via GitHub Actions

Workflow: `.github/workflows/publish-skill.yml`

Trigger: push a tag in the format `skill-v<semver>`:

```bash
git tag skill-v0.1.1
git push origin skill-v0.1.1
```

```yaml
# .github/workflows/publish-skill.yml
name: Publish Skill to GitHub Release

on:
  push:
    tags:
      - 'skill-v*'

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write  # required for creating releases and uploading assets

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Pack skill ZIP
        run: npm run pack:skill

      - name: Extract version from tag
        id: version
        run: echo "version=${GITHUB_REF_NAME#skill-v}" >> "$GITHUB_OUTPUT"

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          name: "Miao Vision Skill v${{ steps.version.outputs.version }}"
          tag_name: ${{ github.ref_name }}
          body: |
            ## Install

            **Step 1 — Install the CLI**
            ```bash
            npm install -g @miao-vision/cli
            ```

            **Step 2 — Install the skill**

            For Claude Code:
            ```bash
            mkdir -p ~/.claude/skills
            unzip miao-vision-skill.zip -d ~/.claude/skills/
            ```

            For Codex:
            ```bash
            mkdir -p ~/.codex/skills
            unzip miao-vision-skill.zip -d ~/.codex/skills/
            ```
          files: dist/skills/miao-vision-skill.zip
          draft: false
          prerelease: false
```

No `NPM_TOKEN` needed — only the default `GITHUB_TOKEN` (already available in Actions).

### User Install (from a Release)

```bash
# Claude Code
mkdir -p ~/.claude/skills
unzip miao-vision-skill.zip -d ~/.claude/skills/

# Codex
mkdir -p ~/.codex/skills
unzip miao-vision-skill.zip -d ~/.codex/skills/
```

## Code Quality

### File Size Limits

- **Maximum:** 500 lines per file
- **Check:** `npm run check:size`

### TypeScript Strict Mode

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

## Troubleshooting

### Common Issues

**1. DuckDB-WASM fails**
```
Error: SharedArrayBuffer is not defined
```
**Fix:** Use `npm run dev`, check CORS headers

**2. Component not rendering**
```
Component 'xxx' not found in registry
```
**Fix:** Check registration in `bootstrap/init-plugins.ts`

**3. Chart data not updating**
```
// ❌ Wrong: Direct mutation
data.items.push(newItem)

// ✅ Correct: Create new reference
data = { ...data, items: [...data.items, newItem] }
```

## Summary

**Key Takeaways:**

1. **Charts use pure Svelte + SVG** - No vgplot/D3 in plugins
2. **AI Report generates Markdown** - ReportPlan → Markdown → Render
3. **Svelte 5 Runes for reactivity** - `$state`, `$derived`, `$effect`
4. **Strict layer dependencies** - Core never imports plugins
5. **All charts are plugins** - Easy to add new chart types

**When Adding Features:**

- ✅ Check existing chart patterns in `plugins/data-display/`
- ✅ Use pure SVG for new visualizations
- ✅ Follow plugin structure conventions
- ✅ Run `npm run check` before commit

---

**Last Updated:** 2026-06-22
**Architecture Version:** v1.1 (Pure Svelte + SVG Charts)
