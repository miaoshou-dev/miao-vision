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
