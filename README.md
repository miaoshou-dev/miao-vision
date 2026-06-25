# Miao Vision

> AI-first local visualization artifacts from data files and documents.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Svelte 5](https://img.shields.io/badge/Svelte-5-orange)](https://svelte.dev/)

Miao Vision is a local-first visualization toolkit centered on `miao-viz`, a CLI designed for AI agents and developers. It turns local data files into polished chart reports and browser-presentable slide decks, and turns local article Markdown/text into static infographic artifacts.

It is not a full BI workspace. The product is focused on static, shareable, high-quality visual artifacts that are easy for AI to generate and easy for users to like.

The recommended user experience is agent-led: install the `miao-vision` skill in Codex or Claude, then ask the agent to create a report, infographic, or deck. The skill decides when to call `miao-viz profile`, `catalog`, `validate`, `render`, `article`, or `deck`.

## Vision

Miao Vision is the visual artifact engine for AI agents, turning local data and documents into polished reports, infographics, and presentation decks.

The long-term goal is for every AI agent to work like a capable data designer: understand the source material, choose the right visual form, generate a compact spec, and produce an artifact that is clear, credible, and ready to share.

## Product Tracks

### 1. Data Display

Turn local data files into KPI, chart, table, annotation, and insight artifacts.

```text
CSV / TSV / XLSX / JSON
  -> miao-viz profile
  -> AI writes VizSpec
  -> miao-viz validate
  -> miao-viz render
  -> self-contained HTML report
```

### 2. Article-to-Infographic

Turn article URLs, Markdown files, or long-form text into static infographic artifacts through an agent-led workflow.

```text
article URL / Markdown
  -> agent reads and normalizes content
  -> miao-viz article
  -> infographic artifact
```

`miao-viz article` accepts local Markdown/text input. URL fetching stays in the agent or skill layer, which normalizes the page into a local Markdown file before calling the CLI.

### 3. Presentation Deck

Turn local data files into browser-presentable slide decks.

```text
CSV / TSV / XLSX / JSON
  -> miao-viz profile
  -> AI writes DeckSpec
  -> miao-viz deck
  -> browser slide deck
```

## Why Miao Vision

- **Agent skill included**: `packages/miao-vision-skill` teaches Codex or Claude how to choose the right workflow and call the CLI.
- **Agent-friendly specs**: YAML/JSON VizSpec and DeckSpec are small, explicit, and easy for AI to repair.
- **Local-first data**: input data stays on the machine by default.
- **Static-first output**: generated HTML can be opened, shared, archived, and printed without a backend.
- **Rich data display**: KPI cards, charts, tables, annotations, insights, and editorial layouts.
- **Presentation-ready decks**: browser slides with keyboard navigation, fullscreen, and print-to-PDF.
- **Pure visual runtime**: charts are rendered with Svelte/SVG instead of a heavy BI workspace runtime.

## Quick Start

```bash
npm install
npm run build:cli
```

Inspect a data file:

```bash
npm run miao-viz -- profile ./packages/miao-viz-cli/examples/sales.csv
```

List supported chart types:

```bash
npm run miao-viz -- catalog
```

Validate a report spec:

```bash
npm run miao-viz -- validate \
  --spec ./packages/miao-viz-cli/examples/sales-dashboard.yaml \
  --profile ./profile.json
```

Render a data display report:

```bash
npm run miao-viz -- render \
  --input ./packages/miao-viz-cli/examples/sales.csv \
  --spec ./packages/miao-viz-cli/examples/sales-dashboard.yaml \
  --theme editorial \
  --output /tmp/miao-report.html
```

Generate a presentation deck:

```bash
npm run miao-viz -- deck \
  --input ./packages/miao-viz-cli/examples/sales.csv \
  --spec ./packages/miao-viz-cli/examples/sales-deck.yaml \
  --theme editorial \
  --output /tmp/miao-deck.html
```

Open the generated HTML file in a browser. Deck output supports arrow-key navigation, fullscreen, and browser print/PDF export.

Generate an article infographic:

```bash
npm run miao-viz -- article ./test_data/article-editorial.md \
  --style editorial \
  --format html \
  --output /tmp/miao-infographic.html
```

Additional deck examples:

```bash
npm run miao-viz -- deck \
  --input ./packages/miao-viz-cli/examples/product-metrics.csv \
  --spec ./packages/miao-viz-cli/examples/product-metrics-deck.yaml \
  --theme editorial \
  --output /tmp/product-metrics-deck.html

npm run miao-viz -- deck \
  --input ./packages/miao-viz-cli/examples/finance-review.csv \
  --spec ./packages/miao-viz-cli/examples/finance-review-deck.yaml \
  --theme editorial \
  --output /tmp/finance-review-deck.html

npm run miao-viz -- deck \
  --input ./packages/miao-viz-cli/examples/ops-update.csv \
  --spec ./packages/miao-viz-cli/examples/ops-update-deck.yaml \
  --theme editorial \
  --output /tmp/ops-update-deck.html
```

## Agent Skill

Miao Vision ships with an agent skill for Codex and Claude-style local coding agents. The skill is the product layer above the CLI: it reads the user request, profiles local data when needed, writes VizSpec or DeckSpec, runs the correct `miao-viz` command, and returns the generated artifact path.

Install the CLI first:

```bash
npm install -g @miao-vision/cli
miao-viz catalog
```

Install the skill for Codex from a local checkout:

```bash
mkdir -p ~/.codex/skills
cp -R packages/miao-vision-skill ~/.codex/skills/miao-vision
```

Then restart Codex and ask for an artifact:

```text
Use miao-vision to analyze ~/data/sales.csv and generate an editorial HTML report.
```

```text
Use miao-vision to turn ~/data/sales.csv into a presentation deck for an executive review.
```

```text
Use miao-vision to turn this article Markdown file into an infographic.
```

The skill uses this decision framework:

| User intent | Skill workflow | CLI command |
| --- | --- | --- |
| report, analysis, chart, dashboard-like artifact | Data Display | `miao-viz profile` -> `validate` -> `render` |
| slides, presentation, PPT, deck, executive briefing | Presentation Deck | `miao-viz profile` -> `deck` |
| article URL, Markdown, long-form text, infographic | Article-to-Infographic | agent normalizes text -> `miao-viz article` |

See [packages/miao-vision-skill](./packages/miao-vision-skill) and [Agent Install Guide](./docs/miao-vision-agent-install.md) for details.

## VizSpec Example

```yaml
title: Sales Dashboard
description: Local sales report generated by Miao Viz
theme: editorial
charts:
  - type: bigvalue
    title: Total Sales
    data:
      transform:
        - type: aggregate
          measures:
            - field: sales
              op: sum
              as: total_sales
    encoding:
      value:
        field: total_sales

  - type: bar
    title: Sales by Region
    data:
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
      y:
        field: total_sales
```

## DeckSpec Example

```yaml
title: Sales Review
theme: editorial
slides:
  - layout: cover
    eyebrow: Q4 Review
    title: Sales Momentum Is Concentrated In Key Regions
    claim: Revenue is growing, but performance is not evenly distributed.

  - layout: metrics-chart
    eyebrow: Executive Snapshot
    title: Quarter At A Glance
    metrics:
      - label: Total Revenue
        format: "$,.0f"
        data:
          transform:
            - type: aggregate
              measures:
                - field: sales
                  op: sum
                  as: total_sales
    charts:
      - type: line
        title: Monthly Sales Trend
        data:
          transform:
            - type: derive-month
              field: order_date
              as: month
            - type: aggregate
              groupBy: [month]
              measures:
                - field: sales
                  op: sum
                  as: total_sales
            - type: sort
              field: month
              order: asc
        encoding:
          x:
            field: month
          y:
            field: total_sales
```

Supported deck layouts include `cover`, `title-only`, `text-points`, `text-chart`, `metrics-chart`, `chart-full`, `table-full`, and `ending`.

DeckSpec validation returns structured repair information. `INVALID_DECK_SPEC` includes an `errors` array with `path`, `message`, and `hint`; `DECK_FIELD_NOT_FOUND` points to the slide/chart/metric field that is missing from the input profile or transform chain.

## CLI Commands

| Command | Purpose |
| --- | --- |
| `profile` | Inspect fields, types, quality, distributions, temporal spans, and chart hints. |
| `catalog` | List chart types and AI-readable usage guidance. |
| `validate` | Validate VizSpec fields, encodings, chart types, and transforms. |
| `render` | Render a self-contained HTML data display report. |
| `deck` | Render a browser-presentable slide deck from DeckSpec. |
| `article` | Convert local Markdown/text into a static infographic artifact. |

## Repository Layout

```text
apps/web/src/              Landing page and lightweight web surface
packages/miao-viz-cli/src/ CLI profiling, validation, rendering, and deck generation
packages/miao-viz-cli/src/themes/
                           Report and deck themes
packages/shared/src/types/ Shared type definitions retained from the old app
packages/miao-viz-cli/     CLI package wrapper and examples
packages/miao-vision-skill/
                           Agent skill instructions for using miao-viz
docs/                      Product, architecture, roadmap, and agent documentation
```

## Development

```bash
npm run dev          # Start the Svelte preview app
npm run build        # Build the web app
npm run build:cli    # Build the miao-viz CLI package
npm run check        # TypeScript and Svelte diagnostics
npm run test         # Run unit tests
npm run check:size   # Check 500-line file limit
```

The web app is a preview, gallery, and debugging surface. The main product path is CLI plus agent-generated specs.

## Documentation

- [Documentation Index](./docs/README.md)
- [Product Overview](./docs/PRODUCT_OVERVIEW.md)
- [Product Restructure Direction](./docs/miao-viz-product-restructure-direction.md)
- [Evidence-Grounded Visualization Generation](./docs/evidence-grounded-visualization-generation.md)
- [Feature Roadmap](./docs/roadmap/FEATURE_ROADMAP.md)
- [Backlog Disposition](./docs/backlog-disposition.md)

## Non-Goals

Miao Vision is intentionally not investing in these as primary product paths:

- Full SQL Workspace.
- Manual SQL authoring with query tabs and snippets.
- General BI dashboard builder.
- Database connector management as the default workflow.
- Global CrossFilter or Drilldown runtime.
- Mosaic/vgplot compatibility runtime.

## License

License to be finalized before public release.
