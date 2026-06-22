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

## Rules

- Only reference fields present in the profile or created by prior transforms.
- Use `bar` for rankings, `line` for temporal trends, `bigvalue` for KPIs, and `table` for row previews.
- Render HTML unless the user asks for SVG.
