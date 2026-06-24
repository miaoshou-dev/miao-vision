# Miao Vision VizSpec Reference

## Report Shape

```yaml
title: Sales Dashboard
description: Optional summary
charts:
  - type: bar
    title: Sales by Region
    data:
      transform: []
    encoding:
      x:
        field: region
      y:
        field: total_sales
```

## Supported Chart Types

| Type | Required Encodings | Typical Use |
| --- | --- | --- |
| `bar` | `x`, `y` | category ranking or comparison |
| `line` | `x`, `y` | time trend |
| `area` | `x`, `y` | cumulative or volume trend |
| `pie` | `label`, `value` | share of whole |
| `scatter` | `x`, `y` | numeric relationship |
| `histogram` | `x` | distribution |
| `heatmap` | `x`, `y`, `value` | matrix intensity |
| `table` | none | row-level preview |
| `bigvalue` | `value` | KPI |

## Encodings

Each encoding references a field from the input data or a field produced by transforms.

```yaml
encoding:
  x:
    field: order_month
    type: temporal
  y:
    field: total_sales
    type: quantitative
```

## Transforms

Derive month:

```yaml
- type: derive-month
  field: order_date
  as: order_month
```

Aggregate:

```yaml
- type: aggregate
  groupBy: [region]
  measures:
    - field: sales
      op: sum
      as: total_sales
```

Sort and limit:

```yaml
- type: sort
  field: total_sales
  order: desc
- type: limit
  value: 10
```

## Theme

Add an optional `theme` field to the report spec:

```yaml
title: Sales Dashboard
theme: editorial
charts: [...]
```

| Value | Layout | Description |
| --- | --- | --- |
| `editorial` | editorial | Warm paper background, serif headings, muted palette, chart captions. Recommended for user-facing reports. |
| `dark` | editorial | Dark background (`#0f1117`), light-blue accent, same card layout as editorial. For night-mode or developer-facing reports. |
| `default` | standard | Plain blue/white SaaS palette. Simple stacked layout. |
| `minimal` | standard | Pure white, no shadows, thin dividers only. Maximum readability, minimum decoration. |

The theme can also be set via CLI flag (`--theme dark`), which takes precedence over the spec field.

## Insights Field

The `insights` field holds 2–4 sentences shown to the reader below the charts.

```yaml
charts:
  - type: bar
    title: Sales by Region
    insights:
      - "East region leads with ¥420K total sales — 1.5× West's ¥280K."
      - "North contributes only 16% of total revenue; it may need targeted promotion."
    data:
      transform: [...]
    encoding:
      x: { field: region }
      y: { field: total_sales }
```

### Grounding rules — mandatory

Every insight sentence must trace to one of these sources:

| Source | Allowed |
| --- | --- |
| `miao-viz query` real aggregated value | ✅ Yes |
| Profile statistic with sufficient sample (rows ≥ 30 for skewness; n ≥ 10 for correlation) | ✅ Yes |
| User's own statement in the request | ✅ Yes |
| `profile.topSharePct` used as a value-share % | ❌ No — it is row frequency |
| Profile statistic with rows < 30 (skewness) or n < 10 (correlation) | ❌ No — unreliable |
| `temporal.gapCount` asserted as "missing data" | ❌ No — note in caption only |

### Narrative Plan example

Before writing insights, produce a Narrative Plan with real query results:

```
NARRATIVE PLAN
══════════════════════════════════════════════════════════
Main story   : East region dominates with ¥420K (51% of total). Q4 2024
               marks the first quarter-on-quarter decline (−8.2%).

Data evidence: (from miao-viz query)
  - East total_sales:  420,000  (50.6%)
  - West total_sales:  280,000  (33.7%)
  - North total_sales: 130,000  (15.7%)
  - Grand total:       830,000
  - East Q4 QoQ:       −8.2%

Chart intents:
  Chart 1 (bigvalue): Anchor the reader with total revenue scale
  Chart 2 (bar):      Show regional gap — East dominance is the story
  Chart 3 (line):     East quarterly trend to highlight Q4 inflection

Excluded charts:
  - histogram: region is categorical, not distributional
  - pie: bar already shows comparison; pie is redundant
  - scatter: no meaningful second numeric dimension

Insight drafts:
  - "East region recorded ¥420K in sales — 51% of the total and 1.5× West."
  - "Q4 2024 saw East's first quarter-on-quarter decline (−8.2%) — worth monitoring."
══════════════════════════════════════════════════════════
```

These insight drafts become the `insights` field values in the spec. Numbers must match the query output exactly — do not round or paraphrase figures.

### Forbidden insight patterns

```yaml
# ❌ topSharePct misread as value share
- "East accounts for 50% of sales."  # topSharePct=0.5 is row frequency, not revenue share

# ❌ Small-sample skewness
- "Data is strongly right-skewed (skewness=2.1)."  # rows=8 — statistically meaningless

# ❌ gapCount as missing-data assertion
- "The time series has 29 days of missing data."  # gapCount may include weekends
```

## Narrative Plan

A Narrative Plan is the required intermediate step between data profiling and spec writing. It ties every chart and insight to a real query result.

### Format

```
NARRATIVE PLAN
══════════════════════════════════════════════════════════
Main story   : [1–2 sentences. Use real numbers from query results.]

Data evidence: (from miao-viz query — list actual computed values)
  - [field or group]: [value] ([share or change, if applicable])

Chart intents:
  Chart 1 ([type]): [analytical goal this chart serves]
  Chart 2 ([type]): [analytical goal this chart serves]
  Chart 3 ([type]): [analytical goal this chart serves]

Excluded charts: [chart types skipped and why]

Insight drafts:
  - "[statement referencing a data evidence value above]"
  - "[statement referencing a data evidence value above]"
══════════════════════════════════════════════════════════
```

### Full example — regional sales analysis

Queries run before writing this plan:

```bash
miao-viz query sales.csv --groupby region \
  --measure "sum(sales) as total_sales, count(*) as orders" \
  --orderby total_sales

miao-viz query sales.csv --measure "sum(sales) as grand_total"
```

Resulting Narrative Plan:

```
NARRATIVE PLAN
══════════════════════════════════════════════════════════
Main story   : East region dominates with ¥420K (51% of total), 1.5× West's
               ¥280K. Q4 2024 shows East's first quarter-on-quarter decline (−8.2%).

Data evidence: (from miao-viz query)
  - East   total_sales: 420,000  (50.6%)
  - West   total_sales: 280,000  (33.7%)
  - North  total_sales: 130,000  (15.7%)
  - Grand total:        830,000
  - East Q4 QoQ:        −8.2%

Chart intents:
  Chart 1 (bigvalue): Anchor the reader with total revenue — establishes scale
  Chart 2 (bar):      Compare three regions — East's dominance is the story
  Chart 3 (line):     East quarterly trend — surfaces the Q4 inflection point

Excluded charts:
  - histogram: region is categorical, distributional view adds nothing
  - pie: bar already shows the regional comparison; pie is redundant
  - scatter: no meaningful second numeric dimension in this dataset

Insight drafts:
  - "East region recorded ¥420K — 51% of total revenue, 1.5× West's ¥280K."
  - "Q4 2024 was East's first quarter-on-quarter decline (−8.2%) — worth monitoring."
══════════════════════════════════════════════════════════
```

The insight drafts become the `insights` field in the spec. Numbers must match the query output exactly.

## Rules

- Only reference fields present in the profile or created by prior transforms.
- Use `bar` for rankings, `line` for temporal trends, `bigvalue` for KPIs, and `table` for row previews.
- Default to `theme: editorial` for all user-facing HTML reports.
- Render HTML unless the user asks for SVG.
- Insights must be grounded in real aggregated values from `miao-viz query` or reliable profile statistics. See grounding rules above.

## DeckSpec (Presentation Deck)

Use DeckSpec when the user asks for slides, a presentation, a deck, PPT-like output, 演示文稿, 汇报材料, or a browser-presentable executive briefing.

Render with:

```bash
miao-viz deck \
  --input /path/to/data.csv \
  --spec /tmp/miao-vision/deck.yaml \
  --theme editorial \
  --output /tmp/miao-vision/deck.html
```

Do not run `miao-viz validate` for DeckSpec. The `deck` command validates DeckSpec with its own schema.

Validation rules:

- `text-chart`, `metrics-chart`, and `chart-full` slides require at least one chart.
- `metrics-chart` slides require 1-4 metrics.
- `table-full` slides may omit `charts` for a default table, but any explicit chart must use `type: table`.
- All chart and metric fields must exist in the input profile or be created by an earlier transform in the same chain.
- `derive-month` creates its `as` field for later transforms and encodings.

### Deck Shape

```yaml
title: Sales Executive Briefing
description: Optional deck summary
theme: editorial
slides:
  - layout: cover
    eyebrow: Q4 Business Review
    title: Sales Momentum Is Concentrated In Enterprise
    claim: Enterprise accounts grew faster than the rest of the portfolio.
```

### Slide Fields

| Field | Type | Use |
| --- | --- | --- |
| `layout` | enum | Required. One of the supported slide layouts below. |
| `eyebrow` | string | Small context label above the title. |
| `title` | string | Main slide headline. |
| `claim` | string | Single-sentence takeaway. Use this as the slide's argument. |
| `bullets` | string[] | Supporting points. Keep to 2-4 bullets. |
| `metrics` | metric[] | KPI cards for the slide. Supports static values or data transforms. |
| `charts` | chart[] | Same chart spec shape as report `charts[]`. |
| `annotation` | string | Short chart annotation or interpretation. |
| `callout` | string | Emphasized message, recommendation, or next step. |

### Slide Layouts

| Layout | Typical Use |
| --- | --- |
| `cover` | Opening slide with eyebrow, title, and claim. |
| `title-only` | Section break or transition. |
| `text-points` | Narrative slide with bullets and optional callout. |
| `text-chart` | Explanation on one side, chart on the other. Good for insight + evidence. |
| `metrics-chart` | KPI metrics plus one supporting chart. Best for executive status. |
| `chart-full` | One large chart with annotation. Best for a main proof slide. |
| `table-full` | Table-heavy detail slide. Use sparingly. |
| `ending` | Closing recommendation, next step, or summary claim. |

### Metrics

Metrics can use a fixed value:

```yaml
metrics:
  - label: Total Sales
    value: "$1.2M"
```

Metrics can also derive values from the input data using transforms:

```yaml
metrics:
  - label: Total Sales
    format: "$,.0f"
    data:
      transform:
        - type: aggregate
          measures:
            - field: sales
              op: sum
              as: total_sales
```

The deck renderer resolves the first measure output for the metric value. Use clear `as` names such as `total_sales`, `avg_order_value`, or `order_count`.

### Charts In Decks

Deck slide `charts` use the same chart spec fields as report charts:

```yaml
charts:
  - type: line
    title: Monthly Sales Trend
    data:
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
        - type: sort
          field: order_month
          order: asc
    encoding:
      x:
        field: order_month
      y:
        field: total_sales
```

### Deck Themes

Deck themes are the same as report themes:

| Value | Use |
| --- | --- |
| `editorial` | Default for user-facing presentation decks. |
| `dark` | Good for technical or high-contrast presentations. |
| `minimal` | Clean white slides with minimal decoration. |
| `default` | Plain baseline style. |

Prefer `theme: editorial` unless the user asks otherwise.

### Deck Error Handling

`INVALID_DECK_SPEC` includes an `errors` array with `path`, `message`, and `hint`. Fix the first error path before regenerating the deck.

`DECK_FIELD_NOT_FOUND` includes the failing `path` and `field`. Use profile column names exactly, or add the missing derived field in an earlier transform.

### Deck Examples

Use these CLI examples as starting points:

| Scenario | Data | DeckSpec |
| --- | --- | --- |
| Sales executive review | `examples/sales.csv` | `examples/sales-deck.yaml` |
| Product metrics review | `examples/product-metrics.csv` | `examples/product-metrics-deck.yaml` |
| Finance review | `examples/finance-review.csv` | `examples/finance-review-deck.yaml` |
| Ops update | `examples/ops-update.csv` | `examples/ops-update-deck.yaml` |
