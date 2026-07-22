# Chart Selection

Use `catalog.charts` and `catalog.blockedCharts` from `context.json` as the source of truth.

## Core Rules

- KPI/bigvalue: use for totals, averages, rates, and period changes with clear evidence.
- Bar: use for category comparison, ranking, and Top N.
- Line/area: use only when a time field has at least 3 periods; sort ascending.
- Pie/donut: use only for small part-to-whole views; avoid more than 7 slices.
- Scatter: use only for two measure fields; avoid strong relationship language unless evidence supports it.
- Histogram: use only for measure distribution with enough rows.
- Table: use for detail, audit, or evidence; avoid making it the only summary unless the dataset is very small.
- Dot/lollipop: use for compact category comparison; dumbbell only for two comparable endpoints and at most 20 categories.
- Diverging bar: use only when a signed measure has a meaningful zero baseline.
- Bullet: use for actual versus an explicit target; ranges are optional context, not extra reference overlays.
- Range: use for explicit lower/upper intervals where every row satisfies lower <= upper.
- Pareto: use for non-negative ranked contribution plus cumulative share; sort descending.
- Bar + line combo: use only for one ordered dimension and two measures with explicitly different units; otherwise split the views.

## Analysis Layers And Facets

- Use `references` for explicit benchmark lines or bands. A data-derived aggregate reference must bind an evidence id.
- Use at most 3 reference lines, 2 bands, and 4 overlays total.
- Use deterministic annotations only: first, last, min, max, threshold, explicit value, or a fully specified max-change selector.
- Use a single row or column facet with at most 8 panels. Shared scales are the default for comparison.
- Treat independent facet scales as unsuitable for direct magnitude comparisons.
- Use `layout.preset` and chart `placement` to establish hierarchy; do not encode meaning through visual position alone.
- Use semantic `colorScale` values rather than arbitrary per-chart palettes so categories remain stable across a report.
- Use `quality` fields only when sample, estimated, or incomplete flags exist in structured data.

## Field Compatibility

- Quantitative channels need `measure` or `score` fields.
- Grouping channels need `dimension`, `status`, `flag`, or `geo` fields.
- Time axes need `time` fields or explicit ordinal encodings.
- Fields with `chartUsage.asMeasure: forbidden` cannot be used as metrics.

## Repair Defaults

- If a line chart is blocked by missing/insufficient time, use a bar chart or table.
- If a pie chart has too many slices, use a Top N bar chart or table.
- If a chart uses an ID as a measure, replace it with a measure field or use row count.
- If a chart type appears in `catalog.blockedCharts`, choose from `catalog.charts`.
- If dumbbell endpoints are unavailable, use grouped bar; if a bullet target is unavailable, use progress or bigvalue.
- If interval endpoints are invalid, use line for a central estimate or table for exact values.
