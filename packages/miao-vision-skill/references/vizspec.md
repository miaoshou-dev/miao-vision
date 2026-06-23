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

## Rules

- Only reference fields present in the profile or created by prior transforms.
- Use `bar` for rankings, `line` for temporal trends, `bigvalue` for KPIs, and `table` for row previews.
- Default to `theme: editorial` for all user-facing HTML reports.
- Render HTML unless the user asks for SVG.

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
