# Miao Vision Getting Started

Miao Vision is being refocused around `miao-viz-cli`: local data files go in, AI-friendly VizSpec comes out, and the final artifact is a static, shareable visualization report.

## Prerequisites

- Node.js 18+
- npm 9+

## Install

```bash
npm install
```

## Run the Web Preview

```bash
npm run dev
```

Open `http://localhost:5173`.

The Web app is now a preview, gallery, and report debugging surface. It is not the primary SQL analysis workspace.

## Use the CLI

List available visualization components:

```bash
npm run miao-viz -- catalog
```

Render a local dataset with a VizSpec:

```bash
npm run miao-viz -- render \
  --input packages/miao-viz-cli/examples/sales.csv \
  --spec packages/miao-viz-cli/examples/sales-dashboard.yaml \
  --theme editorial \
  --output /tmp/miao-viz-report.html
```

## Product Flow

```text
local CSV/JSON/TSV
  -> profile data
  -> choose chart/catalog patterns
  -> generate VizSpec
  -> validate
  -> render static HTML/SVG report
```

## What To Build Against

- `packages/miao-viz-cli/` for command-line report generation
- `packages/miao-viz-cli/src/` for profiling, planning, validation, rendering, and export logic
- `src/core/catalog/` for chart/component catalog metadata
- `src/plugins/data-display/` for pure Svelte + SVG visual components

## Development Commands

```bash
npm run dev          # Web preview
npm run build        # Production build
npm run check        # Type/Svelte diagnostics
npm run test         # Tests
npm run miao-viz -- catalog
```

## Current Direction

Keep investing in:

- static reports
- rich chart variety
- infographic sections
- annotations and insight text
- themes and visual styles
- exportable HTML/SVG artifacts
- AI-readable VizSpec and catalog metadata

Do not invest in:

- full SQL Workspace
- query tabs, snippets, and SQL history
- remote connection management
- streaming dashboard demos
- heavy crossfilter/drilldown dashboard behavior

## Troubleshooting

If the Web preview fails to load, use `npm run dev` instead of opening `dist/index.html` directly. DuckDB-WASM based preview paths still need the development server headers.

If CLI rendering fails, verify the input file path, the VizSpec YAML path, and the requested theme name.
