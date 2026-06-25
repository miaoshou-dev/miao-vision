# Miao Viz Interactive Runtime PRD

> Status: Proposal
> Scope: `miao-viz render` and `miao-viz deck`
> Goal: add lightweight, offline interactions to generated HTML artifacts without turning Miao Viz into a BI workspace.

## 1. Background

`miao-viz` currently focuses on static HTML/SVG reports and deck artifacts generated from local data files and agent-written specs. Static artifacts are stable, easy to share, and agent-friendly, but common analysis workflows still need basic interaction:

- filter by region, product, segment, or time
- switch Top N values
- click a chart element to inspect detail rows
- show tooltips and toggle series
- let one chart selection update nearby charts or tables

The goal is not to rebuild a dashboard builder or SQL workspace. The product should remain local-first, artifact-first, and easy for agents to operate through short specs.

## 2. Product Goals

- Generated HTML reports and decks can support lightweight interactions.
- Agents declare intent in VizSpec/DeckSpec and do not generate JavaScript.
- The CLI injects a fixed, tested runtime into generated HTML.
- Artifacts remain local and offline by default.
- The default runtime does not depend on DuckDB-WASM.
- Interactions are preset-driven and validateable.

## 3. Non-Goals

- No arbitrary SQL editor in the generated HTML.
- No dashboard builder or layout editor.
- No saved user state.
- No login, permissions, sharing, or collaboration model.
- No multi-source live connectors.
- No default DuckDB-WASM runtime.
- No agent-generated interaction JavaScript.

## 4. User Value

For end users:

- Open one report and answer follow-up questions through filters and drilldowns.
- Use the same presentation in a meeting without regenerating multiple versions.
- Inspect detail rows behind a chart element without leaving the artifact.

For agents:

- Generate short interaction specs instead of hand-written JS.
- Validate interactions before rendering.
- Reduce chart/spec mismatch by using fixed presets.

For the product:

- Differentiate from static chart/image generators.
- Keep the current local artifact positioning.
- Avoid drifting back into a full BI platform.

## 5. Core Experience

User request:

```text
Build a sales review deck from sales.csv. Let me filter by region and click a bar to see customer-level detail.
```

Agent-written spec:

```yaml
title: Sales Performance Review
interactions:
  globalFilters:
    - field: region
      type: select
    - field: month
      type: range
charts:
  - id: revenue_by_region
    type: bar
    title: Revenue by Region
    interaction:
      tooltip: true
      select: filter
      drilldownPreset: category-detail
```

CLI output behavior:

- Render a normal HTML report or deck.
- Embed compact data JSON.
- Inject the built-in interactive runtime.
- Generate filter controls and bind chart interactions.
- Let the browser apply filters and update charts locally.

## 6. MVP Feature Scope

MVP features:

- Global select filter
- Global range filter for time or numeric fields
- Tooltip on chart marks
- Click chart element to filter or select
- Detail table for selected chart element
- Reset interaction state
- Static fallback when no interaction spec exists

Phase 2 features:

- Cross-chart filtering
- Top N toggle
- Legend toggle
- Metric switch
- Slide-level filters for deck pages
- Compare mode for two selected categories

Out of scope for MVP:

- SQL input in HTML
- Multi-table join at view time
- User-uploaded additional files
- Persisted interaction state
- External network data requests
- DuckDB-WASM-powered runtime

## 7. Spec Design

The spec should stay short and explicit. Prefer presets over free-form behavior graphs.

Global filters:

```yaml
interactions:
  globalFilters:
    - field: region
      type: select
    - field: month
      type: range
```

Chart tooltip and legend:

```yaml
charts:
  - id: monthly_revenue
    type: line
    title: Monthly Revenue
    interaction:
      tooltip: true
      legendToggle: true
```

Click-to-filter:

```yaml
charts:
  - id: revenue_by_category
    type: bar
    interaction:
      select: filter
```

Drilldown preset:

```yaml
charts:
  - id: revenue_by_region
    type: bar
    drilldownPreset: category-detail
```

Top N:

```yaml
charts:
  - id: top_products
    type: bar
    interaction:
      topN:
        options: [5, 10, 20]
        default: 10
```

## 8. Runtime Architecture

Generated HTML embeds:

```text
1. normalized spec JSON
2. compact source rows or chart-ready rows
3. fixed miao-viz interactive runtime JS
```

Runtime flow:

```text
load embedded data
  -> initialize interaction state
  -> apply global filters
  -> apply chart selection
  -> compute chart view data
  -> render or update SVG/table
  -> bind controls and chart events
  -> update dependent views
```

Runtime modules:

- `StateStore`: current filters, selections, Top N, and reset state
- `FilterEngine`: local array filtering
- `AggregateEngine`: lightweight group by, sum, avg, min, max, count
- `ChartRenderer`: SVG chart updates or full chart redraw
- `TableRenderer`: detail table rendering
- `InteractionBus`: chart clicks, filter changes, reset, cross-chart events
- `Formatters`: numbers, dates, percentages, and compact labels

The runtime must be owned by the CLI, not generated by the agent.

## 9. Data Strategy

Default mode: embed compact rows.

```text
HTML = report layout + compact JSON rows + runtime
```

Use this for small and medium data where browser-side filtering is sufficient.

Optimized mode: pre-aggregate plus detail subset.

```text
HTML = report layout + aggregated chart data + relevant detail rows + runtime
```

Use this when the input data is large but the report has fixed analysis views.

Future advanced mode: optional DuckDB-WASM.

```bash
miao-viz deck --runtime duckdb-wasm
```

This should remain an advanced option for large data, Parquet, dynamic aggregation, or SQL-backed drilldown. It should not be the default because it increases bundle size, startup cost, and deployment complexity.

## 10. CLI Behavior

Render command:

```bash
miao-viz render \
  --input sales.csv \
  --spec report.yaml \
  --output report.html \
  --interactive
```

Deck command:

```bash
miao-viz deck \
  --input sales.csv \
  --spec deck.yaml \
  --output deck.html \
  --interactive
```

Default behavior:

- If the spec contains `interactions` or chart-level `interaction`, enable the runtime automatically.
- If no interaction config exists, keep current static output behavior.
- `--interactive` can force runtime inclusion.
- `--no-interactive` can force static output.
- CLI validation should fail fast on invalid fields, invalid filter types, and unsupported presets.

## 11. Validation Rules

The CLI should validate:

- every `globalFilters[].field` exists in the data profile
- filter type is supported for the field role/type
- chart `id` values are unique when interactions are present
- `select: filter` only applies to chart types with selectable marks
- `drilldownPreset` is supported for the chart type
- `topN.default` exists in `topN.options`
- detail table fields exist in the profile

Errors must be structured and agent-fixable.

## 12. Acceptance Criteria

MVP is complete when:

- Agent can declare filters and drilldown with a short spec.
- CLI validates interactive specs.
- Generated HTML opens offline in modern Chrome, Safari, and Edge.
- Global select filter updates all bound charts.
- Global range filter updates all bound charts.
- Clicking a bar or point can show a detail table.
- Reset restores default state.
- Static reports still work when no interactions are configured.
- No DuckDB-WASM is required.
- No generated JavaScript is required from the agent.
- 10k to 50k rows remain responsive for common filters on a modern laptop.

## 13. Risks

- HTML file size may grow when embedding rows.
- Chart redraw logic may duplicate static SVG renderer behavior.
- Too much spec flexibility may make agent output less reliable.
- Large datasets can exceed comfortable browser-side array processing.
- Deck controls can harm presentation aesthetics if visually heavy.

Mitigations:

- Prefer presets over arbitrary interaction graphs.
- Use pre-aggregation for large inputs.
- Keep runtime fixed, tested, and versioned.
- Limit MVP to a small set of interaction types.
- Use compact, presentation-friendly controls.

## 14. Milestones

Phase 1: MVP

- Add spec fields for `interactions`, chart `interaction`, and `drilldownPreset`
- Add validation for fields and presets
- Add global select filter
- Add range filter
- Add tooltip support
- Add click-to-detail table
- Add reset
- Inject runtime into `render` and `deck` HTML output

Phase 2: Linked interactions

- Cross-chart filtering
- Top N toggle
- Legend toggle
- Metric switch
- Slide-level deck filters

Phase 3: Large data mode

- Pre-aggregation strategy
- Detail row sampling or partitioning
- Optional `--runtime duckdb-wasm`
- Optional directory output for wasm/data assets

## 15. Recommended Priority

Recommended first build order:

1. Global select filters
2. Tooltip
3. `drilldownPreset: category-detail`
4. Reset
5. Top N toggle

This set creates clear user-visible value while keeping the engineering surface small.
