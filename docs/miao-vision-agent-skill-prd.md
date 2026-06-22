# Miao Vision Agent Skill PRD

## 1. Background

Miao Vision is currently a local-first BI analytics application built around DuckDB-WASM, Svelte 5, SVG visualization plugins, SQL Workspace, and BI Report generation. The next product direction is to make Miao Vision usable as an AI agent skill: an agent should be able to read a user-specified local data file and a natural language visualization request, then generate a viewable visualization artifact.

The intended agent usage is:

```text
Use Miao Vision to read /Users/guming/data/sales.xlsx and generate an HTML report showing monthly sales trend, sales by region, and top product categories.
```

The agent should handle data inspection, visualization planning, rendering, and artifact delivery without requiring the user to know Svelte, DuckDB, chart component props, or VizSpec.

## 2. Goals

- Enable Miao Vision to run as a headless visualization engine inside AI agent workflows.
- Accept local file paths and natural language requirements as primary inputs.
- Generate HTML as the default output artifact for agent and TUI-friendly usage.
- Preserve optional export paths for PNG, SVG, and PDF.
- Reuse the existing chart/plugin architecture rather than rebuilding visualization components.
- Keep the existing web BI application intact.

## 3. Non-Goals

- Replacing the current Miao Vision web application.
- Making every existing plugin available in the first agent release.
- Building a cloud backend.
- Requiring users to write SQL or chart configuration for normal usage.
- Making terminal image rendering the primary experience.

## 4. Target Users

### Primary User

An AI agent user who has local data files and wants visual analysis through natural language.

Example:

```text
Analyze ./orders.csv and create an HTML visualization report for revenue trend and category performance.
```

### Secondary User

A developer or analyst who wants to use Miao Vision directly from the command line.

Example:

```bash
miao-viz render \
  --input ./orders.csv \
  --prompt "Show monthly order amount trend grouped by channel" \
  --output ./outputs/orders-trend.html
```

## 5. Product Principle: HTML First

In agent and TUI environments, image output is often unfriendly because terminal image display depends on terminal-specific protocols and is not consistently available. HTML is a better default because it can be opened in a browser, embedded in previews, inspected by agents, and upgraded to interactivity.

Default output should be:

```text
HTML
```

Optional outputs should be:

```text
SVG, PNG, PDF
```

The first implementation should prioritize self-contained static HTML:

- no dev server required
- no external runtime required for viewing
- inline CSS
- inline SVG charts
- embedded metadata such as VizSpec and data profile

## 6. User Experience

### 6.1 Agent Natural Language Usage

User says:

```text
Use Miao Vision to read /Users/guming/data/ecommerce.xlsx and generate an HTML business report with GMV trend, order trend, region ranking, and category share.
```

Agent performs:

```bash
miao-viz profile /Users/guming/data/ecommerce.xlsx

miao-viz render \
  --input /Users/guming/data/ecommerce.xlsx \
  --prompt "Generate an HTML business report with GMV trend, order trend, region ranking, and category share" \
  --format html \
  --output /tmp/miao-vision/ecommerce-report.html
```

Agent returns:

```text
Generated HTML report:
/tmp/miao-vision/ecommerce-report.html
```

### 6.2 CLI Usage

Single chart:

```bash
miao-viz render \
  --input ./revenue.csv \
  --prompt "Draw a 2025 monthly revenue trend chart" \
  --format html \
  --output ./revenue-trend.html
```

Multiple chart report:

```bash
miao-viz render \
  --input ./sales.xlsx \
  --prompt "Create a sales dashboard with monthly trend, region ranking, and top 10 categories by average order value" \
  --format html \
  --output ./sales-dashboard.html
```

HTML plus PNG:

```bash
miao-viz render \
  --input ./orders.csv \
  --prompt "Show sales ranking by region as a bar chart" \
  --format html,png \
  --output ./outputs/region-ranking
```

Expected outputs:

```text
./outputs/region-ranking.html
./outputs/region-ranking.png
```

### 6.3 Data-First Exploration

User says:

```text
Read ./user_behavior.csv, decide which charts fit the data, and generate an HTML visualization report.
```

Agent performs:

```bash
miao-viz profile ./user_behavior.csv
```

Then uses the profile to plan visualizations and render:

```bash
miao-viz render \
  --input ./user_behavior.csv \
  --prompt "Choose suitable charts based on the data structure and generate an HTML visualization report" \
  --format html \
  --output ./user-behavior-report.html
```

## 7. Functional Requirements

### 7.1 File Input

MVP should support:

- CSV
- TSV
- XLSX
- JSON

Later versions may support:

- Parquet
- Arrow
- DuckDB database files
- SQLite
- remote HTTP data sources

### 7.2 Data Profiling

The `profile` command should inspect the input file and return a compact JSON summary.

Example:

```json
{
  "file": "/Users/guming/data/sales.xlsx",
  "rows": 15842,
  "columns": [
    {
      "name": "order_date",
      "type": "date",
      "samples": ["2025-01-01", "2025-01-02"],
      "nullRate": 0.01
    },
    {
      "name": "sales",
      "type": "number",
      "min": 1200,
      "max": 98000,
      "nullRate": 0
    },
    {
      "name": "region",
      "type": "string",
      "samples": ["East", "South", "North"],
      "distinctCount": 6
    }
  ]
}
```

The profile should be small enough for an agent to read into context.

### 7.3 Natural Language to Visualization Plan

The agent should translate user requirements into a structured visualization plan. The core intermediate format should be VizSpec or a thin report wrapper around multiple VizSpecs.

Example:

```yaml
title: Sales Dashboard
charts:
  - type: line
    title: Monthly Sales Trend
    data:
      source: input
      transform:
        - type: derive-month
          field: order_date
          as: order_month
        - type: aggregate
          groupBy: [order_month]
          measures:
            - field: sales
              op: sum
              as: total_sales
    encoding:
      x:
        field: order_month
        type: temporal
      y:
        field: total_sales
        type: quantitative

  - type: bar
    title: Sales by Region
    data:
      source: input
      transform:
        - type: aggregate
          groupBy: [region]
          measures:
            - field: sales
              op: sum
              as: total_sales
        - type: sort
          field: total_sales
          order: desc
    encoding:
      x:
        field: region
        type: nominal
      y:
        field: total_sales
        type: quantitative
```

### 7.4 Rendering

The renderer should support:

- rendering one chart
- rendering multiple charts into one report
- extracting SVG from chart components
- exporting self-contained HTML
- optionally exporting PNG via headless browser screenshot
- optionally exporting PDF from HTML

### 7.5 HTML Output

The default output should be a self-contained HTML file.

Required contents:

- report title
- chart titles
- rendered SVG charts
- basic responsive layout
- inline CSS
- embedded VizSpec as JSON
- embedded data profile summary
- generation timestamp

Example structure:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Sales Dashboard</title>
    <style>
      /* inline report styles */
    </style>
  </head>
  <body>
    <main class="miao-viz-report">
      <section class="chart-block">
        <h2>Monthly Sales Trend</h2>
        <svg><!-- chart --></svg>
      </section>
    </main>

    <script type="application/json" id="miao-viz-spec">
      {}
    </script>
  </body>
</html>
```

### 7.6 Error Handling

Errors should be actionable for an agent.

Examples:

```json
{
  "ok": false,
  "code": "FIELD_NOT_FOUND",
  "message": "Field 'revenue' was not found in the input data.",
  "availableFields": ["order_date", "sales", "region", "category"]
}
```

```json
{
  "ok": false,
  "code": "UNSUPPORTED_CHART_TYPE",
  "message": "Chart type 'candlestick' is not supported in the MVP.",
  "supportedTypes": ["bar", "line", "area", "pie", "scatter", "histogram", "heatmap", "table", "bigvalue"]
}
```

## 8. Proposed Architecture

### 8.1 High-Level Architecture

```text
User prompt + file path
        |
        v
Agent skill workflow
        |
        v
miao-viz profile
        |
        v
Data profile JSON
        |
        v
Agent creates VizSpec/report spec
        |
        v
miao-viz render
        |
        v
HTML / SVG / PNG / PDF artifact
```

### 8.2 Repository Additions

```text
src/
├── agent/
│   ├── cli.ts
│   ├── data-loader.ts
│   ├── data-profiler.ts
│   ├── spec-validator.ts
│   ├── render-job.ts
│   ├── html-export.ts
│   └── exports.ts
│
├── agent-renderer/
│   ├── AgentRenderApp.svelte
│   └── main.ts
│
└── bootstrap/
    └── init-runtime.ts

skills/
└── miao-vision/
    ├── SKILL.md
    ├── scripts/
    │   └── miao-viz.mjs
    └── references/
        ├── vizspec.md
        └── examples.md
```

### 8.3 Runtime Initialization

Current app initialization is browser-app oriented. Add a shared runtime initializer:

```ts
export function initializeMiaoRuntime(): void {
  registerServices()
  registerVgplotCharts()
  registerPlugins()
  initializeCatalog()
  initializeVizCatalog()
}
```

Usage:

```ts
// Existing web app
initializeApp()

// CLI/headless renderer
initializeMiaoRuntime()
```

### 8.4 Headless Rendering Strategy

Svelte chart components require DOM rendering. The recommended approach is:

1. CLI writes a render job JSON file.
2. CLI starts or invokes a local rendering page.
3. Playwright opens the render page.
4. `AgentRenderApp.svelte` loads the render job.
5. Existing registry and chart plugins render into DOM.
6. CLI extracts SVG/HTML or screenshots PNG.

This avoids forcing all Svelte components into server-side rendering and preserves compatibility with existing chart behavior.

## 9. CLI Specification

### 9.1 `profile`

```bash
miao-viz profile <input-file> [--sheet <sheet-name>] [--limit <rows>]
```

Returns JSON to stdout.

Example:

```bash
miao-viz profile ./sales.xlsx --sheet Orders
```

### 9.2 `render`

```bash
miao-viz render \
  --input <input-file> \
  (--prompt <natural-language> | --spec <spec-file>) \
  --format <html|svg|png|pdf|html,png> \
  --output <output-file-or-prefix>
```

Examples:

```bash
miao-viz render \
  --input ./sales.csv \
  --prompt "Show monthly sales trend" \
  --format html \
  --output ./sales-trend.html
```

```bash
miao-viz render \
  --input ./sales.csv \
  --spec ./sales-dashboard.yaml \
  --format html,png \
  --output ./outputs/sales-dashboard
```

### 9.3 `validate`

```bash
miao-viz validate --spec <spec-file> --profile <profile-json>
```

Validates that:

- chart types are supported
- referenced fields exist
- required encodings are present
- output mode is supported

### 9.4 `catalog`

```bash
miao-viz catalog
```

Outputs supported chart types, required encodings, optional style fields, and examples. This is mainly for agents and skill references.

## 10. Skill Design

The Codex skill should be thin. It should not duplicate all implementation details. It should instruct the agent to:

1. Run `miao-viz profile` on the user-provided file.
2. Read the compact profile.
3. Generate a VizSpec or report spec from the user request.
4. Validate the spec.
5. Render HTML by default.
6. Return the output path.
7. If rendering fails, use structured error output to repair the spec and retry.

### 10.1 Skill Trigger Description

The skill should trigger when the user asks to:

- use Miao Vision
- generate charts from local files
- create an HTML visualization report
- visualize CSV/XLSX/JSON data through natural language
- inspect data and choose charts automatically

### 10.2 Example Skill Workflow

```text
User: Use Miao Vision to read ./marketing.csv and create a funnel chart for visits, signups, trials, and paid users.

Agent:
1. miao-viz profile ./marketing.csv
2. Generate funnel VizSpec from fields.
3. miao-viz validate --spec /tmp/marketing-funnel.yaml --profile /tmp/marketing-profile.json
4. miao-viz render --input ./marketing.csv --spec /tmp/marketing-funnel.yaml --format html --output ./marketing-funnel.html
5. Return ./marketing-funnel.html
```

## 11. MVP Scope

### 11.1 Inputs

- CSV
- TSV
- XLSX
- JSON

### 11.2 Outputs

- HTML
- SVG
- PNG

PDF can be added after HTML export is stable.

### 11.3 Chart Types

MVP chart types:

- bar
- line
- area
- pie
- scatter
- histogram
- heatmap
- table
- bigvalue

Deferred chart types:

- map components
- sankey
- treemap
- funnel
- waterfall
- radar
- infographic templates

## 12. Implementation Phases

### Phase 1: Headless Core

- Add `initializeMiaoRuntime()`.
- Add `src/agent/data-loader.ts`.
- Add `src/agent/data-profiler.ts`.
- Add `miao-viz profile`.
- Add basic CLI packaging.

### Phase 2: Spec and Validation

- Define report spec wrapper around VizSpec.
- Add `spec-validator`.
- Add `miao-viz validate`.
- Add `miao-viz catalog`.
- Generate agent-friendly catalog docs from existing component registry.

### Phase 3: HTML Rendering

- Add `AgentRenderApp.svelte`.
- Add render job JSON format.
- Add static HTML export with inline SVG/CSS.
- Add `miao-viz render --format html`.

### Phase 4: Optional Exports

- Add SVG extraction.
- Add PNG screenshot export through Playwright.
- Add PDF export from generated HTML.

### Phase 5: Codex Skill

- Add `skills/miao-vision/SKILL.md`.
- Add skill wrapper script.
- Add VizSpec reference and examples.
- Validate with realistic local CSV and XLSX examples.

## 13. Acceptance Criteria

### Agent UX

- Given a CSV path and natural language request, the agent can generate an HTML chart artifact without user-written config.
- Given an XLSX path and multi-chart request, the agent can generate one HTML report containing multiple charts.
- The agent returns a concrete output file path.
- If a field is missing, the error message lists available fields.

### CLI

- `miao-viz profile ./data.csv` returns compact JSON.
- `miao-viz render --input ./data.csv --prompt "..." --output ./chart.html` creates a viewable HTML file.
- `miao-viz render --input ./data.csv --spec ./chart.yaml --output ./chart.html` creates a viewable HTML file.
- `miao-viz validate` catches missing fields and unsupported chart types.

### HTML Output

- HTML opens through `file://` without a dev server.
- Charts render as visible SVG.
- Report layout is readable on desktop.
- VizSpec is embedded in the HTML for inspection/debugging.

### Compatibility

- Existing `npm run dev`, `npm run build`, and existing web app behavior remain intact.
- Existing chart plugin architecture remains the source of rendering truth.

## 14. Open Questions

- Should natural language to VizSpec happen inside `miao-viz render --prompt`, or should the skill always generate `--spec` before rendering?
- Should DuckDB-WASM remain the transformation engine for agent mode, or should Node-side DuckDB/Arquero be introduced for headless data transforms?
- Should interactive HTML be part of MVP or deferred until static HTML is stable?
- How large can input files be before profiling and rendering need sampling by default?
- Should output files default to `/tmp/miao-vision` or the current working directory?

## 15. Recommended Defaults

- Default output format: `html`
- Default output mode: `static`
- Default output directory for agent usage: `/tmp/miao-vision`
- Default chart selection: agent chooses from MVP chart types based on data profile
- Default artifact naming: slug from prompt plus timestamp
- Default retry behavior: repair spec once when validation/rendering returns structured errors

